#!/usr/bin/env node
var express = require('express'),
    app = express(),
    nconf = require('nconf'),
    mongoose = require('mongoose'),
    passport = require('passport'),
    auth = require('./api/core/auth'),
    client = require('./client/index'),
    urls = require('./api/urls')
    io = require('socket.io'),
    warserver = require('./warserver/warserver');

nconf.argv().env();
nconf.file({file: 'config.json'});
app.command = nconf.get('c') || nconf.get('command');


app.commands = {

    initDB: function () {
        mongoose.connect(nconf.get('mongodb').url);
        return app;
    },

    build: function () {
        client.build();
        return app;
    },

    runserver: function () {
        this.initDB();
        this.build();
        auth.init();
        app.configure(function () {
            app.set('port', nconf.get('webserver').port);
            app.use(express.logger());
            app.use(express.cookieParser());
            app.use(express.bodyParser());
            app.use(express.methodOverride());
            app.use(express.session({secret: nconf.get('webserver').secret}));
            app.use(passport.initialize());
            app.use(passport.session());
            app.use(app.router);
        });
        urls.registerAll(app);
        auth.listen(app);
        app.get(/^(.+)$/, client.index);
        app.listen(app.get('port'), function(){
            console.log('Server is now running on port %d', app.get('port'));
        });
        io.listen(nconf.get('warserver').port).sockets.on('connection', warserver.start);
        return app;
    }

};

if (app.commands.hasOwnProperty(app.command)) {
    app.commands[app.command]();
}

module.exports = app;