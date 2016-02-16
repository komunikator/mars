var bus = require('./bus'),
        config = bus.config;

var log4js = require('log4js');

log4js.configure(config.stores.file.file, {reloadSecs: 300});

bus.getLogger = log4js.getLogger;
module.exports = log4js;
