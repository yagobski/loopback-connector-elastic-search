'use strict';

var _ = null;
var log = null;
var Promise = null;

var setupMapping = function (modelName) {
  if(!modelName) {
    return Promise.reject('missing modelName');
  }
  var self = this;
  var db = self.db;
  var settings = self.settings;

  // validate that a `mapping` for the `modelName` has been provided in datasource.<env>.json
  // TODO: key/value pairs in `mappings` where modelName is the key,
  //       may be more useful ... rather than `mappings` as an array of objects in datasource.<env>.json
  var mappingsFromDatasource = _.filter(settings.mappings, function(mapping){
    return mapping.name === modelName;
  });
  log('ESConnector.prototype.setupMapping', 'mappingsFromDatasource:', mappingsFromDatasource);

  var mappingFromDatasource;
  if(mappingsFromDatasource.length === 0) {
    log('ESConnector.prototype.setupMapping', 'missing mapping for modelName:', modelName,
        ' ... this usecase is legitimate if you want elasticsearch to take care of mapping dynamically');
    return Promise.resolve();
  }
  else if(mappingsFromDatasource.length > 1) {
    return Promise.reject('more than one mapping for modelName:', modelName);
    // TODO: dynamic index/type mapping would be better via a dev provided function to determine what to use,
    //       if same model is present across different indexes
  }
  else {
    log('ESConnector.prototype.setupMapping', 'found mapping for modelName:', modelName);
    mappingFromDatasource = mappingsFromDatasource[0];
  }

  var defaults = self.addDefaults(mappingFromDatasource.name); // NOTE: this is where the magic happens
  var mapping = _.clone(mappingFromDatasource);

  // TODO: create a method called cleanUpMapping or something like that to blackbox this stuff
  delete mapping.name;
  delete mapping.index;
  delete mapping.type;

  log('ESConnector.prototype.setupMapping', 'will setup mapping for modelName:', mappingFromDatasource.name);

  //return self.setupIndices(defaults.index)
  return self.setupIndex(defaults.index)
      .then(function(){
        log('ESConnector.prototype.setupMapping', 'db.indices.putMapping', 'modelName:', modelName, 'start');
        return db.indices.putMapping(_.defaults({body: mapping}, defaults))
            .then(function (body) {
              log('ESConnector.prototype.setupMapping', 'db.indices.putMapping', 'modelName:', modelName, 'response', body);
              return Promise.resolve();
            }, function (err) {
              log('ESConnector.prototype.setupMapping', 'db.indices.putMapping', 'modelName:', modelName, 'failed', err);
              //console.trace(err.message);
              return Promise.reject(err);
            });
      });
};

module.exports = function(dependencies) {
  log = (dependencies) ? (dependencies.log || console.log) : console.log; /*eslint no-console: ["error", { allow: ["log"] }] */
  _ = (dependencies) ? (dependencies.lodash ||  require('lodash')) : require('lodash');
  Promise = (dependencies) ? (dependencies.bluebird ||  require('bluebird')) : require('bluebird');
  return setupMapping;
};
