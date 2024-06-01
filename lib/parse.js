'use strict';

const protobuf = require('protobufjs');
const oas = require('./oas');

function genOpenApiSpec(root, options) {
  const json = oas.json(options);

  function traverseTypes(current) {
    if (current instanceof protobuf.Type) {
      json.components.schemas = Object.assign(
        json.components.schemas,
        oas.toObjectComponent(root, current),
      );
    }
  
    if (current instanceof protobuf.Enum) {
      json.components.schemas = Object.assign(
        json.components.schemas,
        oas.toEnumComponent(current),
      );
    }
  
    if (current instanceof protobuf.Service) {
      json.tags.push(oas.toTag(current, {}));
      json.paths = Object.assign(json.paths, oas.toPaths(root, current, options));
    }
  
    if (current.nestedArray) {
      current.nestedArray.forEach((nested) => traverseTypes(nested));
    }
  }

  traverseTypes(root);

  return json;
}

function parse(filenames, options) {
  const root = new protobuf.Root();
  root.loadSync(filenames, { keepCase: options.keepCase, alternateCommentMode: true });

  return genOpenApiSpec(root, options);
}

module.exports = parse;
