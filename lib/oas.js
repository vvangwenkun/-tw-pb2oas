'use strict';

const path = require('path');

/**
 * open api specification doc object.
 * @param {Object} options
 * @param {string} options.title
 * @param {string} options.description
 * @param {Object[]} options.servers
 * @param {string} options.servers[].url
 * @param {string=} options.servers[].description
 * @param {string=} options.email
 *  
 * @returns {Object}
 */
function json({ title, description, servers, email = '' }) {
  return {
    openapi: '3.0.1',
    info: {
      title: title || 'Open API Specification',
      description: description || '',
      termsOfService: '',
      ...(email && {
        contact: {
          email,
        },
      }),
      license: {
        name: 'Apache 2.0',
        url: 'http://www.apache.org/licenses/LICENSE-2.0.html',
      },
      version: '1.0.0',
    },
    externalDocs: {
      description: '',
      url: '',
    },
    servers: servers.map((s) => ({ url: s.url, description: s.description })),
    tags: [],
    paths: {},
    components: {
      schemas: {},
    },
  };
}

/**
 * custom http routes.
 * 
 * @param {string} tag 
 * @param {string} serviceName 
 * @param {string} methodName 
 * @param {map<string, string>} routes
 * 
 * @returns {Object}
 */
function toHttpRoute(tag, serviceName, methodName, routes) {
  function getPathParams(path) {
    const params = []
    const paramsRegexp = /:([\w-]+)/g

    let match
    while ((match = paramsRegexp.exec(path)) !== null) {
      params.push(match[1])
    }

    return params
  }

  if (routes && routes[`${serviceName}.${methodName}`]) {
    const [method, path] = routes[`${serviceName}.${methodName}`].split(' ');

    return {
      method,
      path: path.trim().replace(/:([^\/]+)/g, '{$1}'),
      params: getPathParams(path),
    }
  }

  return {
    method: 'post',
    path: `/${tag}/${methodName}`,
    params: [],
  };
}

/**
 * generate swagger data type.
 * 
 * @param {string} fieldType
 * @param {any} fieldValue
 * @returns {Object}
 */
function toDataType(fieldType, fieldValue) {
  switch (fieldType) {
    case 'int32':
      return {
        type: 'integer',
        format: 'int32',
        ...(fieldValue && { default: fieldValue }),
      };
    case 'uint32':
    case 'int64':
    case 'uint64':
      return {
        type: 'integer',
        format: 'int64',
        ...(fieldValue && { default: fieldValue }),
      };
    case 'float':
      return {
        type: 'number',
        format: 'float',
        ...(fieldValue && { default: fieldValue }),
      };
    case 'double':
      return {
        type: 'number',
        format: 'double',
        ...(fieldValue && { default: fieldValue }),
      };
    case 'bool':
      return {
        type: 'boolean',
        ...(fieldValue && { default: fieldValue }),
      };
    case 'bytes':
      return {
        type: 'string',
        format: 'binary',
        ...(fieldValue && { default: fieldValue }),
      };
    case 'Timestamp':
      return {
        type: 'string',
        format: 'date',
        ...(fieldValue && { default: fieldValue }),
      };
    case 'string':
      return {
        type: 'string',
        ...(fieldValue && { default: fieldValue }),
      }
    default:
      return fieldType.includes('.') ? {
        $ref: `#/components/schemas/${fieldType}`,
      } : {
        $ref: `#/components/schemas/${getNamespace(this.lookupTypeOrEnum(fieldType))}${fieldType}`,
      };
  }
}

/**
 * get object namespace.
 * 
 * @param {protobuf.Type|protobuf.Field} obj
 * @param {string} ns value of the last iteration.
 * 
 * @returns {string}
 */
function getNamespace(obj, ns = '') {
  if (!obj || !obj.parent || !obj.parent.name) {
    return `${ns}`;
  }

  return getNamespace(obj.parent, `${obj.parent.name}.${ns}`);
}

/** generate swagger object component.
 * 
 * @param {protobuf.Root} root
 * @param {protobuf.Type} message
 * 
 * @returns {Object}
 */
function toObjectComponent(root, message) {
  if (!message.fieldsArray.length) {
    return {}
  }

  const properties = message.fieldsArray.reduce((props, field) => {
    const dataType = toDataType.call(
      message,
      field.type,
      field.options && field.options.default,
    );

    if (field.map) {
      return {
        ...props,
        [field.name]: {
          type: 'object',
          description: field.comment || '',
          additionalProperties: dataType,
        },
      };
    }

    if (field.rule === 'repeated') {
      return {
        ...props,
        [field.name]: {
          type: 'array',
          description: field.comment || '',
          items: {
            ...dataType,
          },
        },
      };
    }

    return {
      ...props,
      [field.name]: {
        ...dataType,
        ...(!dataType.$ref && { description: field.comment || '' }),
      },
    }
  }, {});
  const required = message.fieldsArray.filter((field) => field.required)
    .map((field) => field.name);

  return {
    [`${getNamespace(message)}${message.name}`]: {
      type: 'object',
      description: message.comment || '',
      properties,
      ...(required.length && { required }),
    },
  };
}

/**
 * generate swagger object component.
 * @param {protobuf.Enum} enume
 * 
 * @returns {Object}
 */
function toEnumComponent(enume) {
  const valueDesc = Object.keys(enume.comments)
    .map((key) => ` * \`${enume.values[key]}\` - ${key}, ${enume.comments[key] || ''}`)
    .join('\n');

  return {
    [`${getNamespace(enume)}${enume.name}`]: {
      ...toDataType('uint32'),
      enum: Object.values(enume.values),
      description: `${enume.comment || 'definitions'}\n ` + valueDesc,
    }
  };
}

/**
 * generate swagger path.
 * 
 * @param {protobuf.Root} root
 * @param {protobuf.Service} service
 * @param {Object} options
 * @param {map<string, string>} options.routes
 * 
 * @returns {Object}
 */
function toPaths(root, service, options) {
  const {
    routes,
  } = options;
  const tag = service.fullName.substring(1);

  return service.methodsArray.reduce((pathsSpec, method) => {
    const {
      path,
      method: action,
      params,
    } = toHttpRoute(tag, service.name, method.name, routes);

    const requestType = root.lookupType(
      method.requestType
      // method.requestType.includes('.') ? method.requestType : `${service.parent.name}.${method.requestType}`,
    );
    const responseType = root.lookupType(
      method.responseType
      // method.responseType.includes('.') ? method.responseType : `${service.parent.name}.${method.responseType}`,
    );

    const pathSpec = {
      [action]: {
        tags: [tag],
        summary: method.comment || '',
        operationId: method.fullName.substring(1),
      },
    };

    if (requestType.fieldsArray.length) {
      if (['get', 'delete'].includes(action)) {
        if (params.length < requestType.fieldsArray.length) {
          pathSpec[action].parameters = [
            ...(pathSpec[action].parameters || []),
            {
              name: requestType.name,
              in: 'query',
              description: requestType.comment || '',
              required: false,
              schema: {
                $ref: `#/components/schemas/${getNamespace(requestType)}${requestType.name}`,
              },
            },
          ];
        }
      } else {
        pathSpec[action].requestBody = {
          description: requestType.comment || '',
          content: {
            'application/json': {
              schema: {
                $ref: `#/components/schemas/${getNamespace(requestType)}${requestType.name}`,
              },
            },
          },
          required: true,
        }
      }
    }

    if (params.length) {
      params.forEach((param) => {
        const field = requestType.fieldsArray.find((f) => f.name === param);

        pathSpec[action].parameters = [
          ...(pathSpec[action].parameters || []),
          {
            name: param,
            in: 'path',
            description: field.comment || '',
            required: true,
            schema: toDataType(field.type),
          },
        ];
      });
    }

    if (responseType.fieldsArray.length) {
      pathSpec[action].responses = {
        200: {
          description: responseType.comment || '',
          content: {
            'application/json': {
              schema: {
                $ref: `#/components/schemas/${getNamespace(responseType)}${responseType.name}`,
              },
            },
          }
        },
      };
    } else {
      pathSpec[action].responses = {
        200: {
          description: responseType.comment || '',
        },
      };
    }

    return {
      ...pathsSpec,
      [path]: {
        ...pathsSpec[path],
        ...pathSpec,
      },
    };
  }, {});
}

/**
 * generate swagger tag.
 * @param {protobuf.Service} service
 * 
 * @returns {Object}
 */
function toTag(service) {
  const name = service.fullName.substring(1);

  return {
    name,
    description: service.comment || '',
    externalDocs: {
      description: '',
      url: '',
    },
  };
}

module.exports = {
  json,
  toTag,
  toPaths,
  toEnumComponent,
  toObjectComponent,
};
