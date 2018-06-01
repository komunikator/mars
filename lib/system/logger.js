var bus = require('./bus'),
        config = bus.config;
var fs = require('fs');
var log4js = require('log4js');
var log4jsConfig = {
    "levels": {
        "[all]": "trace",
        "http": "error"
    },
    "replaceConsole": "true",
    "appenders": [
        {
            "type": "console",
            "category": [
                "console",
                "server",
                "ua",
                "call",
                "task",
                "error",
                "http",
                "rotation",
                "sip_proxy",
                "smsc",                
                "sms"                
            ]
        }
    ]
};

var dir = './logs';
if ( !fs.existsSync(dir) ) {
    fs.mkdirSync(dir);
}

if (config && config.stores && config.stores.file && config.stores.file.file
    && fs.existsSync(config.stores.file.file) ) {
    log4js.configure(config.stores.file.file, {reloadSecs: 300});
} else {
    log4js.configure(log4jsConfig);
}

bus.getLogger = log4js.getLogger;
module.exports = log4js;