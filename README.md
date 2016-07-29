# loopback-connector-elastic-search

[![Join the chat at https://gitter.im/strongloop-community/loopback-connector-elastic-search](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/strongloop-community/loopback-connector-elastic-search?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

Basic Elasticsearch datasource connector for [Loopback](http://strongloop.com/node-js/loopback/).

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [Overview](#overview)
- [Install this connector in your loopback app](#install-this-connector-in-your-loopback-app)
- [Configuring connector](#configuring-connector)
  - [Required properties](#required)
  - [Optional properties](#optional)
- [Run example](#run-example)
- [Troubleshooting](#troubleshooting)
- [Developers](#developers)
- [Testing](#testing)
- [Contributing](#contributing)
- [Release notes](#release-notes)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Overview

1. `lib` directory has the entire source code for this connector
  1. this is what gets downloaded to your `node_modules` folder when you run `npm install loopback-connector-es --save --save-exact`
1. `examples` directory has a loopback app which uses this connector
  1. this is not published to NPM, it is only here for demo purposes
    1. it will not be downloaded to your `node_modules` folder!
    1. similarly the `examples/server/datasources.json` file is there for this demo app to use
    1. you can copy it over to your `<yourApp>/server/datasources.json` if you want and edit it there but don't start editing `examples/server/datasources.json` itself and expect changes to take place in your app!
1. `test` directory has unit tests
  1. it does not reuse the loopback app from the `examples` folder
  1. instead, loopback and ES/datasource are built and injected programatically
  1. this directory is not published to NPM.
    1. Refer to `.npmignore` if you're still confused about what's part of the *published* connector and what's not.
1. You will find the `datasources.json` files in this repo mention various named configurations:
  1. `elasticsearch-ssl`
  2. `elasticsearch-plain`
  3. `db`
  4. You don't need them all! They are just examples to help you see the various ways in which you can configure a datasource. Delete the ones you don't need and keep the one you want. For example, most people will start off with `elasticsearch-plain` and then move on to configuring the additional properties that are exemplified in `elasticsearch-ssl`. You can mix & match if you'd like to have mongo and es and memory, all three! These are basics of the "connector" framework in loooback and not something we added.
1. Don't forget to edit your `model-config.json` file and point the models at the datasource you want to use. It should be whichever one you've taken the time to properly configure and gotten working: `elasticsearch-ssl` or `elasticsearch-plain`

## Install this connector in your loopback app

```
cd <yourApp>
npm install loopback-connector-es --save --save-exact
```

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
                "email": {"type": "string", "analyzer" : "email" }
            }
        }
    ],
    "settings": {
      "analysis": {
        "filter": {
          "email": {
            "type": "pattern_capture",
            "preserve_original": 1,
            "patterns": [
              "([^@]+)",
              "(\\p{L}+)",
              "(\\d+)",
              "@(.+)"
            ]
          }
        },
        "analyzer": {
          "email": {
            "tokenizer": "uax_url_email",
            "filter": ["email", "lowercase", "unique"]
          }
        }
      }
    }
}
  ```
2. You can peek at `/examples/server/datasources.json` for more hints.

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
  * Don't forget to set a [valid value](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/configuration.html#config-api-version) for `apiVersion` field in `examples/server/datasources.json` that matches the version of ES you are running.
3. Set up a `cacert.pem` file for communicating securely (https) with your ES instance. Download the certificate chain for your ES server using this **sample** (will need to be edited to *use* your provider) command:

  ```
  cd myEsConnector
  openssl s_client -connect my.es.cluster.com:9243 -showcerts | tee cacert.pem
  ```
  1. The command may not self terminate so you may need to use `ctrl+c`
  2. It will be saved at the base of your cloned project
  3. Sometimes extra data is added to the file, you should delete everything after the following lines:

    ```
    ---
    No client certificate CA names sent
    ---
    ```
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

## Troubleshooting

1. Do you have both `elasticsearch-ssl` and `elasticsearch-plain` in your `datasources.json` file? You just need one of them (not both), based on how you've setup your ES instance.
1. Did you forget to set `model-config.json` to point at the datasource you configured? Maybe you are using a different or misspelled name than what you thought you had!
1. Did you forget to set a [valid value](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/configuration.html#config-api-version) for `apiVersion` field in `datasources.json` that matches the version of ES you are running?
1. Maybe the version of ES you are using isn't supported by the client that this project uses. Try removing the `elasticsearch` sub-dependency from `<yourApp>/node_modules/loopback-connector-es/node_modules` folder and then install the latest client:

  ```
  cd <yourApp>/node_modules/loopback-connector-es/node_modules
  rm -rf elasticsearch
  npm install --save --save-exact https://github.com/elastic/elasticsearch-js.git
  cat elasticsearch/package.json | grep -A 5 supported_es_branches
  cd <yourApp>
  ```
  and test. This can easily get washed away so for more permanent fixes, please report it by [Contributing](#contributing).

## Developers

As a developer, you may want a short lived ES instance that is easy to tear down when you're finished dev testing. We recommend docker to facilitate this.

**Pre-requisites**
You will need [docker-engine](https://docs.docker.com/engine/installation/) and [docker-compose](https://docs.docker.com/compose/install/) installed on your system.

**Step-1**
- Set desired versions for **node** and **Elasticsearch**
  - here are the [valid values](https://hub.docker.com/r/library/node/tags/) to use for  **Node**
  - here are the [valid values](https://hub.docker.com/r/library/elasticsearch/tags/) to use for  **Elasticsearch**
```
# combination of node v0.10.46 with elasticsearch v1
export NODE_VERSION=0.10.46
export ES_VERSION=1
echo 'NODE_VERSION' $NODE_VERSION && echo 'ES_VERSION' $ES_VERSION

# similarly feel free to try relevant combinations:
## of node v0.10.46 with elasticsearch v2
## of node v0.12 with elasticsearch v2
## of node v0.4 with elasticsearch v2
## of node v5 with elasticsearch v2
## elasticsearch v5 will probably not work as there isn't an `elasticsearch` client for it, as of this writing
## etc.
```
**Step-2**
- Run the setup with `docker-compose` commands.

```
git clone https://github.com/strongloop-community/loopback-connector-elastic-search.git myEsConnector
cd myEsConnector/examples
npm install
docker-compose up
```

## Testing

1. You can edit `test/resource/datasource-test.json` to point at your ES instance and then run `npm test`
1. If you don't have an ES instance and want to leverage docker based ES instances then:
  1. Start elasticsearch version 1.x and 2.x using: `docker-compose -f docker-compose-for-tests.yml up`
  1. Edit the code to pick which datasource you want to test against in `test/init.js`:

  ```
  var settings = require('./resource/datasource-test.json'); // comment this out if you'll be using either of the following
  //var settings = require('./resource/datasource-test-v1-plain.json');
  //var settings = require('./resource/datasource-test-v2-plain.json');
  ```
  1. Then run `npm test`
  2. When you're finished and want to tear down the docker instances, run: `docker-compose -f docker-compose-for-tests.yml down`

## Contributing

1. Feel free to [contribute via PR](https://github.com/strongloop-community/loopback-connector-elastic-search/pulls) or [open an issue](https://github.com/strongloop-community/loopback-connector-elastic-search/issues) for discussion or jump into the [gitter chat room](https://gitter.im/strongloop-community/loopback-connector-elastic-search) if you have ideas.
1. I recommend that project contributors who are part of the team:
  1. should create `feature` branches from the `develop` branch
  1. should merge `master` into `develop` before starting the `feature` branch
  1. should submit PRs against the `develop` branch from the `feature` branch when its ready
1. For those who use forks:
  1. please submit your PR against the `develop` branch, if possible
  1. if you must submit your PR against the `master` branch ... I understand and I can't stop you. I only hope that there is a good reason like `develop` not being up-to-date with `master` for the work you want to build upon.
1. `npm-release <versionNumber> -m <commit message>` may be used to publish. Pubilshing to NPM should happen from the `master` branch. It should ideally only happen when there is something release worthy. There's no point in publishing just because of changes to `test` or `examples` folder or any other such entities that aren't part of the "published module" (refer to `.npmignore`) to begin with.

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
