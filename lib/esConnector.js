'use strict';

var util = require('util');
var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var Promise = require('bluebird');

var log = require('debug')('loopback:connector:elasticsearch');

var elasticsearch = require('elasticsearch');
var Connector = require('loopback-connector').Connector;

/**
 * Initialize connector with datasource, configure settings and return
 * @param {object} dataSource
 * @param {function} done callback
 */
module.exports.initialize = function (dataSource, callback) {
    if (!elasticsearch) {
        return;
    }

    var settings = dataSource.settings || {};

    dataSource.connector = new ESConnector(settings, dataSource);

    if (callback) {
        dataSource.connector.connect(callback);
    }
};

/**
 * Connector constructor
 * @param {object} datasource settings
 * @param {object} dataSource
 * @constructor
 */
var ESConnector = function (settings, dataSource) {
    Connector.call(this, 'elasticsearch', settings);

    this.searchIndex = settings.index || '';
    this.searchType = settings.type || '';
    this.defaultSize = (settings.defaultSize || 10);
    this.idField = 'id';

    this.debug = settings.debug || log.enabled;
    if (this.debug) {
        log('Settings: %j', settings);
    }

    this.dataSource = dataSource;
};

/**
 * Inherit the prototype methods
 */
util.inherits(ESConnector, Connector);

/**
 * Generate a client configuration object based on settings.
 */
ESConnector.prototype.getClientConfig = function () {
    // http://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/configuration.html
    var config = {
        hosts: this.settings.hosts || {host:'127.0.0.1',port:9200},
        requestTimeout: this.settings.requestTimeout,
        apiVersion: this.settings.apiVersion,
        log: this.settings.log || 'error',
        suggestCompression: true
    };
    if (this.settings.ssl) {
        config.ssl = {
            ca: (this.settings.ssl.ca) ? fs.readFileSync(path.normalize(this.settings.ssl.ca)) : fs.readFileSync(path.join(__dirname, '..', 'cacert.pem')),
            rejectUnauthorized: this.settings.ssl.rejectUnauthorized || true
        };
    }
    // Note: http://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/configuration.html
    //       Due to the complex nature of the configuration, the config object you pass in will be modified
    //       and can only be used to create one Client instance.
    //       Related Github issue: https://github.com/elasticsearch/elasticsearch-js/issues/33
    //       Luckily getClientConfig() pretty much clones settings so we shouldn't have to worry about it.
    return config;
};

/**
 * Connect to Elasticsearch client
 * @param {Function} [callback] The callback function
 *
 * @callback callback
 * @param {Error} err The error object
 * @param {Db} db The elasticsearch client
 */
ESConnector.prototype.connect = function (callback) {
    var self = this;
    if (self.db) {
        process.nextTick(function () {
            callback && callback(null, self.db);
        });
    }
    else {
        self.db = new elasticsearch.Client(self.getClientConfig());
        // NOTE: we take the liberty of setting up indices even if dev doesn't call automigrate
        if(self.settings.mappings) {
            self.setupMappings(callback);
        }
        else {
            process.nextTick(function () {
                callback && callback(null, self.db);
            });
        }
    }
};

/**
 * Delete a mapping (type definition) along with its data.
 *
 * @param modelNames
 * @param callback
 */
ESConnector.prototype.removeMappings = function (modelNames, callback) {
    var self = this;
    var db = self.db;
    var settings = self.settings;
    if (_.isFunction(modelNames)) {
        callback = modelNames;
        modelNames = _.pluck(settings.mappings, 'name');
    }
    log('ESConnector.prototype.removeMappings', 'modelNames', modelNames);

    var mappingsToRemove = _.filter(settings.mappings, function(mapping){
        return !modelNames || _.includes(modelNames, mapping.name);
    });
    log('ESConnector.prototype.removeMappings', 'mappingsToRemove', _.pluck(mappingsToRemove, 'name'));

    Promise.map(
        mappingsToRemove,
        function (mapping) {
            return db.indices.deleteMapping({
                index: settings.index,
                type: mapping.name
            })
                .then(function (body) {
                    log('ESConnector.prototype.removeMappings', mapping.name, body);
                    return Promise.resolve();
                },
                function (err) {
                    console.trace(err.message);
                    return Promise.reject(err);
                });
        },
        {concurrency: 1}
    )
        .then(function () {
            log('ESConnector.prototype.removeMappings', 'finished');
            callback(null, self.db); // TODO: what does the connector framework want back as arguments here?
        })
        .catch(function(err){
            log('ESConnector.prototype.removeMappings', 'failed');
            callback(err);
        });
};

ESConnector.prototype.setupMappings = function (modelNames, callback) {
    var self = this;
    var db = self.db;
    var settings = self.settings;
    if (_.isFunction(modelNames)) {
        callback = modelNames;
        modelNames = _.pluck(settings.mappings, 'name');
    }
    log('ESConnector.prototype.setupMappings', 'modelNames', modelNames);

    var mappingsToSetUp = _.filter(settings.mappings, function(mapping){
        return !modelNames || _.includes(modelNames, mapping.name);
    });
    log('ESConnector.prototype.setupMappings', 'mappingsToSetUp', _.pluck(mappingsToSetUp, 'name'));

    Promise.map(
        mappingsToSetUp,
        function (mapping) {
            return db.indices.putMapping(
                {
                    index: settings.index,
                    type: mapping.name,
                    body: {properties: mapping.properties}
                }
            ).then(
                function (body) {
                    log('ESConnector.prototype.setupMappings', mapping.name, body);
                    return Promise.resolve();
                },
                function (err) {
                    console.trace(err.message);
                    return Promise.reject(err);
                }
            );
        },
        {concurrency: 1}
    )
        .then(function () {
            log('ESConnector.prototype.setupMappings', 'finished');
            callback(null, self.db); // TODO: what does the connector framework want back as arguments here?
        })
        .catch(function(err){
            log('ESConnector.prototype.setupMappings', 'failed');
            callback(err);
        });
};

/**
 * Ping to test elastic connection
 * @returns {String} with ping result
 */
ESConnector.prototype.ping = function (cb) {
    this.db.ping({
        requestTimeout : 1000
    }, function (error) {
        if (error) {
            log('Could not ping ES.');
            cb(error);
        } else {
            log('Pinged ES successfully.');
            cb();
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
 * Add defaults such as index name and type
 *
 * @param {String} modelName
 * @returns {object} Filter with index and type
 */
ESConnector.prototype.addDefaults = function (modelName) {
    var filter = {};
    if (this.searchIndex) {
        filter.index = this.searchIndex;
    }
    filter.type = modelName;
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
ESConnector.prototype.buildFilter = function (model, idName, criteria, size, offset) {
    var self = this;
    if (self.debug) {
        log('ESConnector.prototype.buildFilter', 'model', model, 'idName', idName, 'criteria', JSON.stringify(criteria,null,0));
    }

    if (idName===undefined || idName===null) {
        throw new Error('idName not set!');
    }

    var filter = this.addDefaults(model);
    filter.body = {};

    if (size!==undefined && size!==null) {
        filter.size = size;
    }
    if (offset!==undefined && offset!==null) {
        filter.from = offset;
    }

    if (criteria) {
        // `criteria` is set by app-devs, therefore, it overrides any connector level arguments
        if (criteria.limit!==undefined && criteria.limit!==null) {
            filter.size = criteria.limit;
        }
        if (criteria.skip!==undefined && criteria.skip!==null)
        {
            filter.from = criteria.skip;
        }
        else if (criteria.offset!==undefined && criteria.offset!==null) { // use offset as an alias for skip
            filter.from = criteria.offset;
        }
        if(criteria.order) {
            filter.body.sort = self.buildOrder(model, idName, criteria.order);
        }
        if (criteria.where) {
            filter.body.query = self.buildWhere(model, idName, criteria.where).query;
        }
        // TODO: Fields filter
        // TODO: Include filter
        // TODO: Order filter
        else if (criteria.suggests) { // TODO: remove HACK!!!
            filter.body = criteria.suggests; // assume that the developer has provided ES compatible DSL
        }
        else if (criteria.native) {
            filter.body = criteria.native; // assume that the developer has provided ES compatible DSL
        }
        else if (_.keys(criteria).length===0) {
            filter.body = {
                'query': {
                    'match_all': {}
                }
            };
        }
    }

    log('ESConnector.prototype.buildFilter', 'constructed', JSON.stringify(filter,null,0));
    return filter;
};

/**
 * Words of wisdom from @doublemarked:
 * When writing a query without an order specified, the author should not assume any reliable order.
 * So if we’re not assuming any order, there is not a compelling reason to potentially slow down
 * the query by enforcing a default order.
 *
 * @param model
 * @param idName
 * @param order
 * @returns {Array}
 */
ESConnector.prototype.buildOrder = function (model, idName, order) {
    var sort = [];

    var keys = order;
    if (typeof keys === 'string') {
        keys = keys.split(',');
    }
    for (var index = 0, len = keys.length; index < len; index++) {
        var m = keys[index].match(/\s+(A|DE)SC$/);
        var key = keys[index];
        key = key.replace(/\s+(A|DE)SC$/, '').trim();
        if(key === idName) {
            key = '_id';
        }
        if (m && m[1] === 'DE') {
            //sort[key] = -1;
            var temp  = {};
            temp[key] = 'desc';
            sort.push(temp);
        } else {
            //sort[key] = 1;
            sort.push(key);
        }
    }

    return sort;
};

ESConnector.prototype.buildWhere = function (model, idName, where) {
    var self = this;
    log('ESConnector.prototype.buildWhere', 'model', model, 'idName', idName, 'where', JSON.stringify(where,null,0));

    var body = {
        query: {
            bool: {
                must: [],
                should: [],
                'must_not': []
            }
        }
    };

    self.buildNestedQueries(body, model, idName, where);

    if(body.query.bool.must.length === 0) {
        delete body.query.bool['must']; // jshint ignore:line
    }
    if(body.query.bool.should.length === 0) {
        delete body.query.bool['should']; // jshint ignore:line
    }
    if(body.query.bool.must_not.length === 0) { // jshint ignore:line
        delete body.query.bool['must_not']; // jshint ignore:line
    }
    return body;
};

ESConnector.prototype.buildNestedQueries = function (body, model, idName, where, parentOperator) {
    var self = this;
    log('ESConnector.prototype.buildNestedQueries',
        'model',  model, 'idName', idName,
        '\nbody', JSON.stringify(body,null,0),
        '\nwhere',  JSON.stringify(where,null,0),
        '\nparentOperator', parentOperator);

    _.forEach(where, function(value, key) {
        var cond = value;
        if(key===idName) {
            //where.match._id = value;
            key = '_id';
        }

        // TODO: or	Logical OR operator
        // TODO: and Logical AND operator
        //   {"where":{"and":[{"id":{"inq":["1","2","3","4"]}},{"vip":true}]}}
        if (key === 'and' || key === 'or' || key === 'nor') {
            if (Array.isArray(cond)) {
                cond = cond.map(function (c) {
                    self.buildNestedQueries(body, model, idName, c, key);
                    log('ESConnector.prototype.buildNestedQueries',
                        'mapped', 'body', JSON.stringify(body,null,0));
                });
            }
            // TODO: distinguish between and/or to populate must/should
            /*query['$' + key ] = cond;
             delete query[key];*/
            return;
        }

        var spec = false;
        var options = null;
        if (cond && cond.constructor.name === 'Object') {
            options = cond.options;
            spec = Object.keys(cond)[0];
            cond = cond[spec];
        }
        log('ESConnector.prototype.buildNestedQueries',
            'spec', spec, 'key', key, 'cond', JSON.stringify(cond,null,0), 'options', options);
        if (spec) {
            if (spec === 'gte' || spec === 'gt' || spec === 'lte' || spec === 'lt') {
                var rangeQuery = {range:{}};
                var rangeQueryGuts = {};
                rangeQueryGuts[spec] = cond;
                rangeQuery.range[key] = rangeQueryGuts;
                self.mergeNestedQueryWithParentOperator(body, rangeQuery, parentOperator);
            }
            // TODO: between - True if the value is between the two specified values: greater than or equal to first value and less than or equal to second value.
            // TODO: inq, nin - In / not in an array of values.
            if (spec === 'inq') {
                cond.map(function (x) {
                    var nestedQuery = {match:{}};
                    nestedQuery.match[key] = x;
                    log('ESConnector.prototype.buildNestedQueries',
                        'nestedQuery', JSON.stringify(nestedQuery,null,0));
                    body.query.bool.should.push(nestedQuery);
                });
            }
            // TODO: near - For geolocations, return the closest points, sorted in order of distance.  Use with limit to return the n closest points.
            // TODO: neq - Not equal (!=)
            // TODO: like, nlike
        }
        else {
            var nestedQuery = {match:{}};
            nestedQuery.match[key] = value;
            log('ESConnector.prototype.buildNestedQueries',
                'parentOperator', parentOperator,
                'nestedQuery', JSON.stringify(nestedQuery,null,0));
            self.mergeNestedQueryWithParentOperator(body, nestedQuery, parentOperator);
            /*if(parentOperator === 'and'){
                body.query.bool.must.push(nestedQuery);
            }
            else if(parentOperator === 'or'){
                body.query.bool.should.push(nestedQuery);
            }
            else if(parentOperator === 'nor'){
                body.query.bool.must_not.push(nestedQuery); // jshint ignore:line
            }
            else {
                body.query.bool.must.push(nestedQuery);
            }*/
        }
    });
};

ESConnector.prototype.mergeNestedQueryWithParentOperator = function (body, nestedQuery, parentOperator) {
    if(parentOperator === 'and'){
        body.query.bool.must.push(nestedQuery);
    }
    else if(parentOperator === 'or'){
        body.query.bool.should.push(nestedQuery);
    }
    else if(parentOperator === 'nor'){
        body.query.bool.must_not.push(nestedQuery); // jshint ignore:line
    }
    else {
        body.query.bool.must.push(nestedQuery);
    }
};

/**
 * Return all data from Elastic search
 * @param {String} model The model name
 * @param {Object} filter The filter
 * @param {Function} done callback function
 */
ESConnector.prototype.all = function all(model, filter, done) {
    var self = this;
    log('ESConnector.prototype.all', 'model', model, 'filter', JSON.stringify(filter,null,0));

    var idName = self.idName(model);

    if(filter && filter.suggests) { // TODO: remove HACK!!!
        self.db.suggest(
            self.buildFilter(model, idName, filter)
        ).then(
            function (body) {
                var result = [];
                if (body.hits) {
                    body.hits.hits.forEach(function (item) {
                        result.push(self.dataSourceToModel(model, item));
                    });
                }
                log('ESConnector.prototype.all', 'model', model, 'result', JSON.stringify(result,null,2));
                done(null, result);
            }, function (err) {
                console.trace(err.message);
                if (err) {
                    return done(err, null);
                }
            }
        );
    }
    else {
        self.db.search(
            self.buildFilter(model, idName, filter)
        ).then(
            function (body) {
                var result = [];
                body.hits.hits.forEach(function (item) {
                    result.push(self.dataSourceToModel(model, item));
                });
                log('ESConnector.prototype.all', 'model', model, 'result', JSON.stringify(result,null,2));
                done(null, result);
            }, function (err) {
                console.trace(err.message);
                if (err) {
                    return done(err, null);
                }
            }
        );
    }
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
        log('exists', 'model', model, 'id', id);
    }

    if (id===undefined || id===null) {
        throw new Error('id not set!');
    }

    self.db.exists({
        index: self.searchIndex,
        type: model,
        id: self.getDocumentId(id)
    }).then(
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
    log('ESConnector.prototype.find', 'model', model, 'id', id);

    if (id===undefined || id===null) {
        throw new Error('id not set!');
    }

    self.db.get({
        index: self.searchIndex,
        type: model,
        id: self.getDocumentId(id)
    }).then(
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
        log('destroy', 'model', model, 'id', id);
    }

    var filter = self.addDefaults(model);
    filter[self.idField] = self.getDocumentId(id);
    if (!filter[self.idField]) {
        throw new Error('Document id not setted!');
    }
    self.db.delete(
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
 * Delete all documents
 * @param {String} model name
 * @param {String} filterClause criteria
 * @param {Function} cb callback
 */
ESConnector.prototype.destroyAll = function destroyAll(model, filterClause, cb) {
    var self = this;

    if ((!cb) && _.isFunction(filterClause)) {
        cb = filterClause;
        filterClause = {
            native: {
                'query': {
                    'match_all': {}
                }
            }
        };
    }
    if (self.debug) {
        log('destroyAll', 'model', model, 'filterClause', JSON.stringify(filterClause,null,0));
    }

    var idName = self.idName(model);
    var filter = self.buildFilter(model, idName, filterClause, 0, 0);
    self.db.deleteByQuery(
        filter
    ).then(
        function (response) {
            cb(null, response);
        },
        function (err) {
            console.trace(err.message);
            if (err) {
                return cb(err, null);
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
        log('count', 'model', model, 'filter', filter);
    }

    var idName = self.idName(model);
    self.db.count(
        self.buildFilter(model, idName, filter)
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
        log('ESConnector.prototype.create', model, data);
    }

    var idValue = self.getIdValue(model, data);
    var idName = self.idName(model);
    log('ESConnector.prototype.create', 'idName', idName, 'idValue', idValue);

    var document = self.addDefaults(model);
    document[self.idField] = self.getDocumentId(idValue);
    document.body = {};
    _.assign(document.body, data);
    log('ESConnector.prototype.create', 'document', document);

    self.db.create(
        document
    ).then(
        function (response) {
            log('ESConnector.prototype.create', 'response', response);
            log('ESConnector.prototype.create', 'will invoke callback with id:', response._id);
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
        log('ESConnector.prototype.save ', 'model', model, 'data', data);
    }

    var document = self.addDefaults(model);
    document[self.idField] = self.makeId(data.id);
    if (!document[self.idField]) {
        throw new Error('Document id not setted!');
    }
    document.body = self.matchDataToModel(model, data);
    self.db.update(
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
        log('ESConnector.prototype.updateOrCreate', 'model', model, 'data', data);
    }

    var document = self.addDefaults(model);
    document[self.idField] = self.makeId(data.id);
    if (!document[self.idField]) {
        throw new Error('Document id not setted!');
    }
    document.body = self.matchDataToModel(model, data);
    self.db.update(
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

/**
 * Perform automigrate for the given models. Create/recreate DB objects
 * (such as table/column/constraint/trigger/index) to match the model definitions
 *  --> Drop the corresponding indices: both mappings and data are done away with
 *  --> create/recreate mappings and indices
 *
 * @param {String[]} [models] A model name or an array of model names. If not present, apply to all models
 * @param {Function} [cb] The callback function
 */
ESConnector.prototype.automigrate = function (models, cb) {
    var self = this;
    if (self.db) {
        if ((!cb) && ('function' === typeof models)) {
            cb = models;
            models = undefined;
        }
        // First argument is a model name
        if ('string' === typeof models) {
            models = [models];
        }
        log('ESConnector.prototype.automigrate', 'models', models);

        models = models || Object.keys(self._models);

        _.forEach(models, function (model){
            log('ESConnector.prototype.automigrate', 'model', model);
        });
        if(self.settings.mappings) {
            self.removeMappings(models,function(err){
                if (err) {
                    cb(err);
                }
                else {
                    self.setupMappings(models, cb);
                }
            });
        }
        else {
            cb();
        }
    }
    else {
        log('ESConnector.prototype.automigrate', 'ERROR', 'Elasticsearch connector has not been initialized');
        cb('Elasticsearch connector has not been initialized');
    }
};

module.exports.name = ESConnector.name;
module.exports.ESConnector = ESConnector;
