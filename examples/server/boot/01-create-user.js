/**
 * To run:
 *   DEBUG=loopback:connector:*,loopback:datasource,boot:test:* slc run
 * or
 *   DEBUG=loopback:connector:*,loopback:datasource,boot:test:* node server/server.js
 */

var debug = require('debug')('boot:test:01-create-user');
var _ = require('lodash');
var Promise = require('bluebird');

module.exports = function(app) {
    var UserModel = app.models.UserModel;


    var userWithStringId = {
        id: '1',
        realm: 'portal',
        username: 'userWithStringId@shoppinpal.com',
        email: 'userWithStringId@shoppinpal.com',
        password: 'userWithStringId'
    };
    var userWithNumericId = {
        id: 2,
        realm: 'portal',
        username: 'userWithNumericId@shoppinpal.com',
        email: 'userWithNumericId@shoppinpal.com',
        password: 'userWithNumericId'
    };
    var userWithoutAnyId = {
        realm: 'portal',
        username: 'userWithoutId@shoppinpal.com',
        email: 'userWithoutId@shoppinpal.com',
        password: 'userWithoutId'
    };

    var users = [userWithStringId, userWithNumericId, userWithoutAnyId];

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