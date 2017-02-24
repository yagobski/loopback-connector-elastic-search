'use strict';

var _ = null;
var log = null;
var Promise = null;

var setupMappings = function () {
  var self = this;
  var modelNames = _.pluck(self.settings.mappings, 'name');

  return Promise.map(
      modelNames,
      function (modelName) {
        log('ESConnector.prototype.setupMappings', 'will setup mapping for modelName:', modelName);
        return self.setupMapping(modelName)
            .then(
                function (body) {
                  log('ESConnector.prototype.setupMappings', 'finished mapping for modelName:', modelName, 'response:', body);
                  return Promise.resolve();
                },
                function (err) {
                  log('ESConnector.prototype.setupMappings', 'failed mapping for modelName:', modelName, 'err:', err);
                  return Promise.reject(err);
                }
            );
      },
      {concurrency: 1}
  )
      .then(function(){
        log('ESConnector.prototype.setupMappings', 'finished');
        return Promise.resolve();
      })
      .catch(function(err){
        log('ESConnector.prototype.setupMappings', 'failed', err);
        return Promise.reject(err);
      });
};

module.exports = function(dependencies) {
  log = (dependencies) ? (dependencies.log || console.log) : console.log; /*eslint no-console: ["error", { allow: ["log"] }] */
  _ = (dependencies) ? (dependencies.lodash ||  require('lodash')) : require('lodash');
  Promise = (dependencies) ? (dependencies.bluebird ||  require('bluebird')) : require('bluebird');
  return setupMappings;
};
