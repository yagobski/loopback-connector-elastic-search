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
            "protocol": "http",
            "host": "127.0.0.1",
            "port": 9200,
            "auth": "username:password"
          }
    ],
    "apiVersion": "<apiVersion>",
    "log": "trace",
    "defaultSize": <defaultSize>,
    "requestTimeout": 30000,
    "ssl": {
        "ca": "./../cacert.pem",
        "rejectUnauthorized": true
    },
    "mappings": [
        {
            "name": "UserModel",
            "properties": {
                "realm": {"type": "string", "index" : "not_analyzed" },
                "username": {"type": "string", "index" : "not_analyzed" },
                "password": {"type": "string", "index" : "not_analyzed" },
                "email": {"type": "string", "index" : "not_analyzed" }
            }
        }
    ]
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
- **defaultSize:** total number of results to return per page.
- **requestTimeout:** this value is in milliseconds
- **ssl:** useful for setting up a secure channel
- **protocol:** can be `http` or `https` (`http` is the default if none specified) ... *must* be `https` if you're using `ssl` 
- **auth**: useful if you have access control setup via services like `es-jetty` or `found` or `shield`
- **mappings:** an array of elasticsearch mappings for your various loopback models

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
