'use strict';

var util = require('util');
var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var Promise = require('bluebird');

var debug = require('debug')('loopback:connector:elasticsearch');

var elasticsearch = require('elasticsearch');
var Connector = require('loopback-connector').Connector;

/**
 * Initialize connector with datasource, configure settings and return
 * @param {object} dataSource
 * @param {function} done callback
 */
module.exports.initialize = function (dataSource, done) {
    var settings = dataSource.settings || {};
    var connector = new ESConnector(settings);
    connector.connectToElasticClient(settings, dataSource);
    dataSource.connector = connector;
    if(settings.mappings) {
        connector.setupMappings(settings, done);
    }
    else {
    process.nextTick(done);
    }
};

/**
 * Connector constructor
 * @param {object} datasource settings
 * @param {object} dataSource
 * @constructor
 */
var ESConnector = function (settings) {
    this.name = 'elastic-search';
    this._models = {};
    this.settings = settings;
    this.searchIndex = settings.index || '';
    this.searchType = settings.type || '';
    this.defaultSize = (settings.defaultSize || 10);
    this.idField = '_id';

    this.debug = settings.debug || debug.enabled;
    if (this.debug) {
        debug('Settings: %j', settings);
    }
};

/**
 * Inherit the prototype methods
 */
util.inherits(ESConnector, Connector);

/**
 * Get client URL from settings
 * @param {object} settings of data source
 * @returns {object} host: string, requestTimeout: number, suggestCompression: boolean, log: string
 */
ESConnector.prototype.getESClientURL = function (settings) {
    var defaultHost = {
        host: '127.0.0.1',
        port: 9200
    };
    var options = {
        hosts: settings.hosts || defaultHost,
        requestTimeout: settings.requestTimeout || 1000,
        apiVersion: settings.apiVersion,
        log: settings.log || 'error',
        suggestCompression: true
    };
    if (settings.ssl) {
        options.ssl = {
            ca: fs.readFileSync( path.normalize(settings.ssl.ca) || path.join(__dirname, '..', 'cacert.pem') ),
            rejectUnauthorized: settings.ssl.rejectUnauthorized || true
        };
    }
    return options;
};

/**
 * Connect to elastic search client
 * @param {object} settings of data source
 * @param {object} dataSource
 */
ESConnector.prototype.connectToElasticClient = function (settings, dataSource) {
    this.elasticServer = new elasticsearch.Client(this.getESClientURL(settings));
    this.dataSource = dataSource;
};

ESConnector.prototype.setupMappings = function (settings, done) {
    var elasticServer = this.elasticServer;
    Promise.map(
        settings.mappings,
        function (mapping) {
            return elasticServer.indices.putMapping(
                {
                    index: settings.index,
                    type: mapping.name,
                    body: {properties: mapping.properties}
                }
            ).then(
                function (body) {
                    debug('setupMappings', mapping.name, body);
                    return Promise.resolve();
                }, function (err) {
                    console.trace(err.message);
                    if (err) {
                        return done(err, null);
                    }
                }
            );
        },
        {concurrency: 1}
    )
        .then(function () {
            debug('all setupMappings finished');
            done(); // TODO: what does the connector framework want back as arguments here?
        }, function (err) {
            console.trace(err.message);
            if (err) {
                return done(err, null);
            }
        });
};

/**
 * Ping to test elastic connection
 * @returns {String} with ping result
 */
ESConnector.prototype.ping = function () {
    this.elasticServer.ping({
        requestTimeout : 1000
    }, function (error) {
        if (error) {
            return 'nok';
        } else {
            return 'ok';
        }
    });
};

/**
 * Return connector type
 * @returns {String} type description
 */
ESConnector.prototype.getTypes = function () {
    return [this.name];
};

/**
 * Get value from property checking type
 * @param {object} property
 * @param {String} value
 * @returns {object}
 */
ESConnector.prototype.getValueFromProperty = function (property, value) {
    if (property.type instanceof Array) {
        if (!value || (value.length === 0)) {
            return new Array();
        } else {
            return new Array(value.toString());
        }
    } else if (property.type === String) {
        return value.toString();
    } else if (property.type === Number) {
        return Number(value);
    } else {
        return value;
    }
};

/**
 * Match and transform data structure to model
 * @param {String} model name
 * @param {Object} data from DB
 * @returns {object} modeled document
 */
ESConnector.prototype.matchDataToModel = function (model, data) {
    var self = this;
    if (!data) {
        return null;
    }
    try {
        var properties = this._models[model].properties;
        var document = {};

        for (var propertyName in properties) {
            var propertyValue = data[propertyName];
            if (propertyValue) {
                document[propertyName] = self.getValueFromProperty(properties[propertyName], propertyValue);
            }
        }
        return document;
    } catch (err) {
        console.trace(err.message);
        return null;
    }
};

/**
 * Convert data source to model
 * @param {String} model name
 * @param {Object} data object
 * @returns {object} modeled document
 */
ESConnector.prototype.dataSourceToModel = function (model, data) {
    if ((!data) || (!data.found) && (data.found === false)) {
        return null;
    }
    return this.matchDataToModel(model, data._source);
};

/**
 * @param {String} model name
 * Make filter with index name and type
 * @returns {object} Filter with index and type
 */
ESConnector.prototype.makeFilterIndexAndType = function (model) {
    var filter = {};
    if (this.searchIndex) {
        filter['index'] = this.searchIndex;
    }
    filter['type'] = model;
    return filter;
};

/**
 * Make filter from criteria, data index and type
 * Ex:
 *   {"body": {"query": {"match": {"title": "Futuro"}}}}
 *   {"q" : "Futuro"}
 * @param {String} model filter
 * @param {String} criteria filter
 * @param {number} size of rows to return, if null then skip
 * @param {number} offset to return, if null then skip
 * @returns {object} filter
 */
ESConnector.prototype.makeFilter = function (criteria, size, offset, model) {
    var self = this;
    if (self.debug) {
        debug('makeFilter', 'criteria', criteria, 'model', model);
    }

    var filter = this.makeFilterIndexAndType(model);
    if (size && (size != null)) {
        if (size < 1) {
            if (this.defaultSize) {
                filter['size'] = this.defaultSize;
            }
        } else {
            filter['size'] = size;
        }
    }
    if (offset && (offset != null)) {
        if (offset > 0) {
            filter['from'] = offset;
        }
    }
    if (criteria) {
        for (var criteriaItem in criteria) {
            filter[criteriaItem] = criteria[criteriaItem];
        }
    }
    return filter;
};

/**
 * Return all data from Elastic search
 * @param {String} model The model name
 * @param {Object} filter The filter
 * @param {Function} done callback function
 */
ESConnector.prototype.all = function all(model, filter, done) {
    var self = this;
    if (self.debug) {
        debug('all', 'model', model, 'filter', filter);
    }

    self.elasticServer.search(
        self.makeFilter(filter, 0, 0, model)
    ).then(
        function (body) {
            var result = [];
            body.hits.hits.forEach(function (item) {
                result.push(self.dataSourceToModel(model, item));
            });
            done(null, result);
        }, function (err) {
            console.trace(err.message);
            if (err) {
                return done(err, null);
            }
        }
    );
};

/**
 * Get document Id validating data
 * @param {String} id
 * @returns {Number} Id
 * @constructor
 */
ESConnector.prototype.getDocumentId = function (id) {
    try {
        if (typeof id !== 'string') {
            return id.toString();
        } else {
            return id;
        }
    } catch (e) {
        return id;
    }
};

/**
 * Check for data existence
 * @param {String} model name
 * @param {String} id row identifier
 * @param {function} done callback
 */
ESConnector.prototype.exists = function (model, id, done) {
    var self = this;
    if (self.debug) {
        debug('exists', 'model', model, 'id', id);
    }

    var filter = self.makeFilterIndexAndType(model);
    filter[self.idField] = this.getDocumentId(id);
    if (!filter[self.idField]) {
        throw new Error('Document id not setted!')
    }
    self.elasticServer.exists(
        filter
    ).then(
        function (exists) {
            done(null, exists);
        }, function (err) {
            console.trace(err.message);
            if (err) {
                return done(err, null);
            }
        }
    );
};

/**
 * Find a model instance by id
 * @param {String} model name
 * @param {String} id row identifier
 * @param {Function} done callback
 */
ESConnector.prototype.find = function find(model, id, done) {
    var self = this;
    if (self.debug) {
        debug('find', 'model', model, 'id', id);
    }

    var filter = self.makeFilterIndexAndType(model);
    filter[self.idField] = this.getDocumentId(id);
    if (!filter[self.idField]) {
        throw new Error('Document id not setted!')
    }
    self.elasticServer.get(
        filter
    ).then(
        function (response) {
            done(null, self.dataSourceToModel(model, response));
        }, function (err) {
            console.trace(err.message);
            if (err) {
                return done(err, null);
            }
        }
    );
};

/**
 * Delete a document by Id
 * @param {String} model name
 * @param {String} id row identifier
 * @param {Function} done callback
 */
ESConnector.prototype.destroy = function destroy(model, id, done) {
    var self = this;
    if (self.debug) {
        debug('destroy', 'model', model, 'id', id);
    }

    var filter = self.makeFilterIndexAndType(model);
    filter[self.idField] = self.getDocumentId(id);
    if (!filter[self.idField]) {
        throw new Error('Document id not setted!')
    }
    self.elasticServer.delete(
        filter
    ).then(
        function (response) {
            done(null, response);
        }, function (err) {
            console.trace(err.message);
            if (err) {
                return done(err, null);
            }
        }
    );
};

/**
 * Delete all documents with param criteria
 * @param {String} model name
 * @param {String} filter criteria
 * @param {Function} done callback
 */
ESConnector.prototype.destroyAll = function destroyAll(model, filter, done) {
    var self = this;
    if (self.debug) {
        debug('destroyAll', 'model', model, 'filter', filter);
    }

    var filter = self.makeFilter(filter, 0, 0, model);
    self.elasticServer.deleteByQuery(
        filter
    ).then(
        function (response) {
            done(null, response);
        }, function (err) {
            console.trace(err.message);
            if (err) {
                return done(err, null);
            }
        }
    );
};

/**
 * Return number of rows by the where criteria
 * @param {String} model name
 * @param {String} filter criteria
 * @param {Function} done callback
 */
ESConnector.prototype.count = function count(model, done, filter) {
    var self = this;
    if (self.debug) {
        debug('count', 'model', model, 'filter', filter);
    }

    self.elasticServer.count(
        self.makeFilter(filter, null, null, model)
    ).then(
        function (response) {
            done(null, response.count);
        }, function (err) {
            console.trace(err.message);
            if (err) {
                return done(err, null);
            }
        }
    );
};

/**
 * Create a new model instance
 * @param {String} model name
 * @param {object} data info
 * @param {Function} done callback
 */
ESConnector.prototype.create = function (model, data, done) {
    var self = this;
    if (self.debug) {
        debug('create', model, data);
    }

    var idValue = self.getIdValue(model, data);
    var idName = self.idName(model);
    debug('create', 'idName', idName, 'idValue', idValue);

    var document = self.makeFilterIndexAndType(model);
    document[self.idField] = self.getDocumentId(idValue);
    document.body = {};
    _.assign(document.body, data);
    debug('create', 'document', document);

    self.elasticServer.create(
        document
    ).then(
        function (response) {
            debug('response', response);
            done(null, response._id); // the connector framework expects the id as a return value
        }, function (err) {
            console.trace(err.message);
            if (err) {
                return done(err, null);
            }
        }
    );
};

/**
 * Update document data
 * @param {String} model name
 * @param {Object} data document
 * @param {Function} done callback
 */
ESConnector.prototype.save = function (model, data, done) {
    var self = this;
    if (self.debug) {
        debug('save', 'model', model, 'data', data);
    }

    var document = self.makeFilterIndexAndType(model);
    document[self.idField] = self.makeId(data.id);
    if (!document[self.idField]) {
        throw new Error('Document id not setted!')
    }
    document["body"] = self.matchDataToModel(model, data);
    self.elasticServer.update(
        document
    ).then(
        function (response) {
            done(null, response);
        }, function (err) {
            console.trace(err.message);
            if (err) {
                return done(err, null);
            }
        }
    );
};

/**
 * Update a model instance or create a new model instance if it doesn't exist
 */
ESConnector.prototype.updateOrCreate = function updateOrCreate(model, data, done) {
    // TODO: fail, test and re test
    var self = this;
    if (self.debug) {
        debug('updateOrCreate', 'model', model, 'data', data);
    }

    var document = self.makeFilterIndexAndType(model);
    document[self.idField] = self.makeId(data.id);
    if (!document[self.idField]) {
        throw new Error('Document id not setted!')
    }
    document["body"] = self.matchDataToModel(model, data);
    self.elasticServer.update(
        document
    ).then(
        function (response) {
            done(null, response);
        }, function (err) {
            console.trace(err.message);
            if (err) {
                return done(err, null);
            }
        }
    );
};

/**
 * Update the attributes for a model instance by id
 */
ESConnector.prototype.updateAttributes = function updateAttrs(model, id, data, done) {
// TODO: make code
};

module.exports.name = ESConnector.name;
module.exports.ESConnector = ESConnector;
