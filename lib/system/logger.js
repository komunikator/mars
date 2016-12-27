var bus = require('./bus'),
        config = bus.config;
var fs = require('fs');
var log4js = require('log4js');
var log4jsConfig = {
    "levels": {
        "[all]": "trace",
        "http": "error"
    },
    "replaceConsole": "false",
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
                "sip_proxy"
            ]
        },
        {
            "type": "file",
            "filename": "logs/error.log",
            "maxLogSize": 1048576,
            "backups": 3,
            "category": "error"
        },
        {
            "type": "file",
            "filename": "logs/server.log",
            "maxLogSize": 1048576,
            "backups": 3,
            "category": "server"
        },
        {
            "type": "file",
            "filename": "logs/ua.log",
            "maxLogSize": 1048576,
            "backups": 10,
            "category": "ua"
        },
        {
            "type": "file",
            "filename": "logs/sip.log",
            "maxLogSize": 1048576,
            "backups": 10,
            "category": "sip"
        },
        {
            "type": "file",
            "filename": "logs/call.log",
            "maxLogSize": 1048576,
            "backups": 10,
            "category": "call"
        },
        {
            "type": "file",
            "filename": "logs/remoteClient.log",
            "maxLogSize": 1048576,
            "backups": 10,
            "category": "remoteClient"
        },
        {
            "type": "file",
            "filename": "logs/task.log",
            "maxLogSize": 1048576,
            "backups": 10,
            "category": "task"
        },
        {
            "type": "file",
            "filename": "logs/http.log",
            "maxLogSize": 1048576,
            "backups": 10,
            "category": "http"
        },
        {
            "type": "file",
            "filename": "logs/cdr.log",
            "maxLogSize": 1048576,
            "backups": 10,
            "category": "cdr"
        },
        {
            "type": "file",
            "filename": "logs/rotation.log",
            "maxLogSize": 1048576,
            "backups": 10,
            "category": "rotation"
        },
        {
            "type": "file",
            "filename": "logs/sip_proxy.log",
            "maxLogSize": 1048576,
            "backups": 10,
            "category": "sip_proxy"
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