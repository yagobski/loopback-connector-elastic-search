# loopback-connector-elastic-search

Basic Elasticsearch datasource connector for [Loopback](http://strongloop.com/node-js/loopback/).

NOTE: You can configure the index name for your ES instance and the model name is automatically mapped as the ES type.

## Install connector from NPM

    npm install loopback-connector-es --save

## Configuring connector

1 . Edit **datasources.json** and set:

  ```
"<ConnectorEntry>": {
    "connector": "elasticsearch",
    "name": "<name>",
    "index": "<index>",
    "hosts": [
      {
        "host": "127.0.0.1",
        "port": 9200
      }
    ],
    "apiVersion": "<apiVersion>",
    "log": "trace",
    "defaultSize": <Rows>
}
  ```
2. You can peek at `/examples/server/datasources.json` for more hints.

Required:
---------
- **host:** Elasticsearch engine host address.
- **port:** Elasticsearch engine port.
- **name:** Connector name.
- **connector:** Elasticsearch driver.
- **index:** Search engine specific index.

Optional:
---------
- **apiVersion:** specify the major version of the Elasticsearch nodes you will be connecting to.
- **log:** logging option.
- **defaultSize:** Rows to return per page.

## Run example

1. Install dependencies and start the example server

  ```
cd examples
npm install
node server/server.js
  ```
2. Open this URL in your browser: http://localhost:3000/explorer
3. To test a specific filter via GET method, use for example: `{"q" : "friends, romans, countrymen"}`

## Release notes

  * First beta version
