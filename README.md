# proto2oas

The simply tool to convert .proto to openapi specification.

## Example

```javascript
const proto2oas = require('proto2oas')

proto2oas('petstore.proto', {
  title: 'Open API Specification',
  servers: [
    {
      url: "http://localhost:8080/v1",
    },
  ],
})
```

## Installation

`npm install proto2oas`

## Usage

### proto2oas(protos, options)

* **protos**: *REQUIRED*. The *.proto* file paths. If path is a directory, all *.proto* files in the directory are loaded.
* **options**: Options for generating openapi. Following options are supported:
    * **keepCase**: Keeps field casing instead of converting to camel case.
    * **title**: *REQUIRED*. The title of the API.
    * **description**: A short description of the API.
    * **servers**: *REQUIRED*. An Array representing Servers.
    * **email**: The email address of the contact person/organization.
    * **routes**: The http route for the gRPC method. Example: { 'serviceName.methodName': 'get /path' }

Full example:
```javascript
const proto2oas = require('proto2oas')

proto2oas('petstore.proto', {
  routes: {
    'PetStore.newPet': 'post /pet',
    'PetStore.listPets': 'get /pets',
    'PetStore.getPet': 'get /pets/:id',
    'PetStore.updatePet': 'patch /pets/:id',
    'PetStore.deletePet': 'delete /pets/id',
  },
  title: 'Pet Store Service APIS',
  servers: [
    {
      url: "http://localhost:8080/api-explorer",
      description: 'Local server',
    },
  ],
  email: 'support@example.com',
})
```

## License

This repository is licensed under the MIT license.
The license can be found [here](./LICENSE).