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
            return UserModel.findAsync({
                where: {username: user.username}
            })
                .then(function (resolvedData) {
                    debug('findAsync', user.username, 'results:', JSON.stringify(resolvedData,null,2));
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