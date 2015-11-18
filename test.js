(function () {

    process.on('uncaughtException', function (e) {
        console.log('uncaughtException', e);
    });

    var libDir = './lib',
            confFile = './config/config.js',
            ua = null,
            dialogs = {},
            OnEvent = {},
            fs = require('fs'),
            sip = require(libDir + '/sip'),
            //config = require('nconf').argv().env().file({file: confFile}),
            config = require('nconf').file({file: confFile}),
            log4js = require('log4js'),
            jobs = [];
    log4js.configure(confFile, {reloadSecs: 300});
    function loggerInit() {
        var logLevels = config.get("logLevel");
        if (logLevels)
            for (var category in logLevels)
                log4js.getLogger(category).setLevel(logLevels[category]);
    }
