describe('basic-querying', function () {

    before(function () {
        require('./init.js');
    });

    require('loopback-datasource-juggler/test/basic-querying.test.js');

}); // mimics https://github.com/strongloop/loopback-connector-mongodb/blob/master/test/imported.test.js