'use strict';

const fs = require('fs');
const parse = require('./lib/parse');

/**
 * protocol buffers file convert to openapi specification.
 * 
 * @param {string} path - .proto file paths.
 * @param {Object} options - options for generating openapi.
 * @param {boolean} [options.keepCase=true] - Keeps field casing instead of converting to camel case.
 * @param {string} options.title - The title of the API.
 * @param {string=} options.description - A short description of the API.
 * @param {Object[]} options.servers - An Array representing Servers.
 * @param {string} options.servers[].url - A URL to the target host.
 * @param {string=} options.servers[].description - An optional string describing the host designated by the URL.
 * @param {string=} options.email - The email address of the contact person/organization.
 * @param {Map<string, string>=} options.routes - The http route for the gRPC method.
 * 
 * @example
 * proto2oas('user.proto', { routes: { 'User.getUserInfo': 'get /users/:userId' } });
 * 
 * @returns {Object} OpenAPI JSON Object.
 */
 function proto2oas(path, options = {}) {
  if (!path) {
    throw new Error('proto2oas Error: "path" is required.');
  }

  if (!options.title) {
    throw new Error('proto2oas Error: "options.title" is required.');
  }

  if (!Array.isArray(options.servers) || !options.servers.length) {
    throw new Error('proto2oas Error: "options.servers" must be a non-empty array');
  }

  options.servers.forEach((server) => {
    if (!server.url) {
      throw new Error('proto2oas Error: "servers[].url" is required.');
    }
  });

  if (!fs.existsSync(path)) {
    throw new Error(`proto2oas Error: "${path}" does not exists.`);
  }

  const stat = fs.lstatSync(path);
  const filenames = stat.isDirectory() ?
    fs.readdirSync(path).filter((name) => /.+\.proto$/.test(name)).map((name) => path + `/${name}`) : [path];

  if (!filenames.length) {
    throw new Error(`proto2oas Error: .proto files was not found`)
  }

  options.routes = options.routes || {};
  options.keepCase = options.keepCase || true;

  return parse(filenames, options);
}

module.exports = proto2oas;
