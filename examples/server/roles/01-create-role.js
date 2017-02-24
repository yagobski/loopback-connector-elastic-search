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
    var Role = app.models.Role;
    var RoleMapping = app.models.RoleMapping;

    var userWithStringId1 = {
        id: '1',
        realm: 'portal',
        username: 'userWithStringId1@shoppinpal.com',
        email: 'userWithStringId1@shoppinpal.com',
        password: 'userWithStringId1'
    };
    var userWithNumericId2 = {
        id: 2,
        realm: 'portal',
        username: 'userWithNumericId2@shoppinpal.com',
        email: 'userWithNumericId2@shoppinpal.com',
        password: 'userWithNumericId2'
    };
    var userWithoutAnyId3 = {
        realm: 'portal',
        username: 'userWithoutAnyId3@shoppinpal.com',
        email: 'userWithoutAnyId3@shoppinpal.com',
        password: 'userWithoutAnyId3'
    };
    var users = [userWithStringId1, userWithNumericId2, userWithoutAnyId3];

    Role.create(
        {name: 'admin'},
        function(err, role) {
            if (err) {
                return debug(err);
            }
            debug(role);
            //make admin an admin
            role.principals.create({
                    principalType: RoleMapping.USER,
                    principalId: userWithStringId1.id
                },
                function (err, principal) {
                    if (err) {
                        return debug(err);
                    }
                    debug(principal);
                    debug(userWithStringId1.username + ' now has role: ' + role.name);
                });
        }
    );
};