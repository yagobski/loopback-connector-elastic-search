'use strict';

var chai = require('chai');
global.expect = chai.expect;
global.assert = chai.assert;
global.should = chai.should; // had to run `npm install --save-dev should` ... why didn't this suffice?

var DataSource = require('loopback-datasource-juggler').DataSource;
global.getDataSource = global.getSchema = global.getConnector = function (customConfig) {
    var settings = require('./resource/datasource-test.json');
    return new DataSource(require('../'), customConfig || settings);
};
