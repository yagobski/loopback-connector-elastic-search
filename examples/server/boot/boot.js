module.exports = function(app) {
    //require('./../users/01-find-user.js')(app);
    require('./../users/02-findOrCreate-user.js')(app);
    //require('./../users/03-create-user.js')(app);

    //require('./../roles/01-create-role.js')(app);
    //require('./../roles/02-findOrCreate-role.js')(app);
};
