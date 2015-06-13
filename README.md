# loopback-connector-elastic-search

[![Join the chat at https://gitter.im/strongloop-community/loopback-connector-elastic-search](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/strongloop-community/loopback-connector-elastic-search?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

Basic Elasticsearch datasource connector for [Loopback](http://strongloop.com/node-js/loopback/).

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [loopback-connector-elastic-search](#loopback-connector-elastic-search)
  - [Install connector from NPM](#install-connector-from-npm)
  - [Configuring connector](#configuring-connector)
    - [Required:](#required)
    - [Optional:](#optional)
  - [Run example](#run-example)
  - [Hosted ElasticSearch](#hosted-elasticsearch)
  - [Release notes](#release-notes)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Install connector from NPM

    npm install loopback-connector-es --save

## Configuring connector

1 . Edit **datasources.json** and set:

  ```
"<ConnectorEntry>": {
    "connector": "es",
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
3. Services that provide ES as a hosted solution and offer an indefinite free plan for tinkering with ES:
  1. https://app.bonsai.io/plans
    * $0 per month
    * 1GB memory, 1GB storage
    * no CC required
  2. https://facetflow.com/#plans
    * $0/month
    * 5,000 documents, 500 MB storage
    * 1 primary shard, 0 replicas
    * Sandbox (not for production use)
  3. `Free + Hosted` translates to quick success in the quest to learn ES.

### Required:
- **host:** Elasticsearch engine host address.
- **port:** Elasticsearch engine port.
- **name:** Connector name.
- **connector:** Elasticsearch driver.
- **index:** Search engine specific index.

### Optional:
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
  git clone https://github.com/strongloop-community/loopback-connector-elastic-search.git myEsConnector
  cd myEsConnector/examples
  npm install
  ```
2. [Configure the connector](#configuring-connector)
  * Don't forget to create an index in your ES instance: `curl -X POST https://username:password@my.es.cluster.com/shakespeare`
  * If you mess up and want to delete, you can use: `curl -X DELETE https://username:password@my.es.cluster.com/shakespeare`
3. Set up a `cacert.pem` file for communicating securely (https) with your ES instance. Download the certificate chain for your ES server using this **sample** (will need to be edited to *use* your provider) command:

  ```
  cd myEsConnector
  openssl s_client -connect my.es.cluster.com:9243 -showcerts | tee cacert.pem
  ```
  It will be saved at the base of your cloned project.
4. Run:

  ```
  cd myEsConnector/examples
  DEBUG=boot:test:* node server/server.js
  ```
  * The `examples/server/boot/boot.js` file will automatically populate data for UserModels on your behalf when the server starts.
5. Open this URL in your browser: [http://localhost:3000/explorer](http://localhost:3000/explorer)
  * Try fetching all the users via the rest api console
  * You can dump all the data from your ES index, via cmd-line too: `curl -X POST username:password@my.es.cluster.com/shakespeare/_search -d '{"query": {"match_all": {}}}'`
6. To test a specific filter via GET method, use for example: `{"q" : "friends, romans, countrymen"}`

## Hosted ElasticSearch
Services that provide ES as a hosted solution and offer an indefinite free plan for tinkering with ES:
  1. https://app.bonsai.io/plans
    * $0 per month
    * 1GB memory, 1GB storage
    * no CC required
  2. https://facetflow.com/#plans
    * $0/month
    * 5,000 documents, 500 MB storage
    * 1 primary shard, 0 replicas
    * Sandbox (not for production use)
  3. `Free + Hosted` translates to quick success in the quest to learn ES.

## Release notes

  * For this connector, you can configure an `index` name for your ES instance and the loopback model's name is conveniently/automatically mapped as the ES `type`.
  * Users must setup `string` fields as `not_analyzed` by default for predictable matches just like other loopback backends. And if more flexibility is required, multi-field mappings can be used too.

    ```
    "name" : {
        "type" : "multi_field",
        "fields" : {
            "name" : {"type" : "string", "index" : "not_analyzed"},
            "native" : {"type" : "string", "index" : "analyzed"}
        }
    }
    ...
    // this will treat 'George Harrison' as 'George Harrison' in a search
    User.find({order: 'name'}, function (err, users) {..}
    // this will treat 'George Harrison' as two tokens: 'george' and 'harrison' in a search
    User.find({order: 'name', where: {'name.native': 'Harrison'}}, function (err, users) {..}
    ```
  * TBD
