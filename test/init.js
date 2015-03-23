'use strict';

var chai = require('chai');
global.expect = chai.expect;
global.assert = chai.assert;
global.should = chai.should; // had to run `npm install --save-dev should` ... why didn't this suffice?

global._ = require('lodash');

var settings = require('./resource/datasource.json');
global.getSettings = function() {
    return _.cloneDeep(settings);
};

var DataSource = require('loopback-datasource-juggler').DataSource;
global.getDataSource = global.getSchema = global.getConnector = function (customConfig) {
    return new DataSource(require('../'), customConfig || getSettings());
};
