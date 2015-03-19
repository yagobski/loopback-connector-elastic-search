// DEBUG=boot:create-model-instances slc run
var debug = require('debug')('boot:test:01-create-user');

module.exports = function(app) {
    var UserModel = app.models.UserModel;

    // DEBUG=loopback:connector:*,loopback:datasource,boot:test:* node server/server.js

    var userWithStringId = {
        id: '1',
        realm: 'portal',
        username: 'userWithId@shoppinpal.com',
        email: 'userWithId@shoppinpal.com',
        password: 'userWithId'
    };
    var userWithNumericId = {
        id: 1,
        realm: 'portal',
        username: 'userWithId@shoppinpal.com',
        email: 'userWithId@shoppinpal.com',
        password: 'userWithId'
    };
    var userWithoutAnyId = {
        realm: 'portal',
        username: 'userWithoutId@shoppinpal.com',
        email: 'userWithoutId@shoppinpal.com',
        password: 'userWithoutId'
    };

    return UserModel.createAsync(userWithoutAnyId)
        .then(function(resolvedData){
            debug(JSON.stringify(resolvedData,null,2));
        });
};