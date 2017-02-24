/**
 * To run:
 *   DEBUG=loopback:connector:*,loopback:datasource,boot:test:* slc run
 * or
 *   DEBUG=loopback:connector:*,loopback:datasource,boot:test:* node server/server.js
 */

var _ = require('lodash');
var Promise = require('bluebird');

var path = require('path');
var fileName = path.basename(__filename, '.js'); // gives the filename without the .js extension
var debug = require('debug')('boot:test:'+fileName);

module.exports = function(app) {
    var UserModel = app.models.UserModel;

    var userWithStringId4 = {
        id: '4',
        realm: 'portal',
        username: 'userWithStringId4@shoppinpal.com',
        email: 'userWithStringId4@shoppinpal.com',
        password: 'userWithStringId4'
    };
    var userWithNumericId5 = {
        id: 5,
        realm: 'portal',
        username: 'userWithNumericId5@shoppinpal.com',
        email: 'userWithNumericId5@shoppinpal.com',
        password: 'userWithNumericId5'
    };
    var userWithoutAnyId6 = {
        realm: 'portal',
        username: 'userWithoutAnyId6@shoppinpal.com',
        email: 'userWithoutAnyId6@shoppinpal.com',
        password: 'userWithoutAnyId6'
    };

    var users = [userWithStringId4, userWithNumericId5, userWithoutAnyId6];

    Promise.map(
        users,
        function (user) {
            return UserModel.createAsync(user)
                .then(function (resolvedData) {
                    debug(JSON.stringify(resolvedData,null,2));
                    return Promise.resolve();
                },
                function (err) {
                    console.error(err);
                    return Promise.reject();
                });
        },
        {concurrency: 1}
    )
        .then(function () {
            debug('all work for UserModels finished');
        },
        function (err) {
            console.error(err);
        });
};