const test = require('ava');
const proto2oas = require('..');

test('throw exception when path is empty', (t) => {
  const error = t.throws(proto2oas.bind(null, ''));
  t.is(error.message, 'proto2oas Error: "path" is required.');
});

test('throw exception when title is empty', (t) => {
  const error = t.throws(proto2oas.bind(null, __dirname + '/protos/pet.proto'));
  t.is(error.message, 'proto2oas Error: "options.title" is required.');
});

test('throw exception when servers is empty', (t) => {
  const error = t.throws(proto2oas.bind(null, __dirname + '/protos/pet.proto', { title: 'Demo Server', servers: [] }));
  t.is(error.message, 'proto2oas Error: "options.servers" must be a non-empty array');
});

test('throw exception when servers[].url is empty', (t) => {
  const error = t.throws(proto2oas.bind(null, __dirname + '/protos/pet.proto', {
    title: 'Demo Server',
    servers: [
      {
        url: 'http://localhost:8080/api-explorer',
      },
      {},
    ],
  }));
  t.is(error.message, 'proto2oas Error: "servers[].url" is required.');
});

test('path is filename', (t) => {
  const options = {
    title: 'PetStore Service APIS',
    servers: [
      {
        url: 'http://localhost:8080/api-explorer',
        "description": "Local Server",
      },
    ],
  };

  t.deepEqual(proto2oas(__dirname + '/protos/pet.proto', options), require('./apis/basic.json'));
});

test('path is directory', (t) => {
  const options = {
    keepCase: true,
    title: 'PetStore Service APIS',
    description: 'Some description of server.',
    routes:  {
      'UserMgnt.getPets': 'get /UserMgnt/pets',
    },
    servers: [
      {
        url: 'http://localhost:8080/api-explorer',
        "description": "Local Server",
      },
    ],
    email: 'support@example.com',
  };

  t.deepEqual(proto2oas(__dirname + '/protos', options), require('./apis/compose.json'));
});