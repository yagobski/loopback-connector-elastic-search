module.exports = function(app) {
    require('./../user/01-find-user.js')(app);
    require('./../user/02-findOrCreate-user.js')(app);
    //require('./../user/03-create-user.js')(app);
};