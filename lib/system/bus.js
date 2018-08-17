var EventEmitter = require('events').EventEmitter;
var util = require('util');

function Bus() {
    var self = this;
    EventEmitter.call(this);

    self.OnEvent = {};
    self.jobs = [];

    function loadConfig() {
        return require('nconf').file({file: require('../config')})
    }
    ;
    //console.log("init bas");
    self.config = loadConfig();
    self.config.reload = function () {
        self.config = loadConfig();
    };

    // request && onRequest

    self.request = function (dataType, param, cb) {
        if (!dataType) {
            console.log('!dataType');
            return null;
        }

        //if (!(cb instanceof Function)) {
        if ( typeof(cb) != "function" ) {
            return null;
        }

        param = param || {};
        var requestID = require('node-uuid').v4();

        /*
         if (!(self._events['sys.request.' + dataType])) {
         cb({code: 1, message: 'No listener "' + dataType + '"'});
         return requestID;
         }
         */
        var requestTimeOut = parseInt(param.requestTimeout) || 2000;
        var requestTimer;

        var requestSuccess = function (err, data) {
            if (requestTimer)
                clearTimeout(requestTimer);
            cb(err, data);// function(err, data)
        };

        var requestFailure = function () {
            self.removeListener('sys.response.' + requestID, requestSuccess);
            cb({code: 2, message: 'Request timeout (' + requestTimeOut + ' msec)'});//function(err)
        };
        requestTimer = setTimeout(requestFailure, requestTimeOut);

        self.once('sys.response.' + requestID, requestSuccess);
        self.emit('sys.request.' + dataType, requestID, param);

        return requestID;
    };

    self.onRequest = function (dataType, resultFn) {
        if (!dataType)
            return {code: 3, message: 'dataType is undefined'};
        if (!(resultFn instanceof Function))
            return {code: 4, message: 'resultFn is not a function'};
        if (self._events['sys.request.' + dataType])
            return {code: 5, message: 'Listener "' + dataType + '" is already exists'};

        self.on('sys.request.' + dataType, function (requestID, param) {
            var cb = function (err, data) {
                self.emit('sys.response.' + requestID, err, data);
            };
            resultFn(param, cb);
        })
        return null;
    };
    self.defaultMaxListeners = 20;
}
util.inherits(Bus, EventEmitter);

module.exports = bus = new Bus();

if (process.send) {//запущен как child process
    var _emit = bus.emit; //старая функция emit
    bus.emit = function () {
        _emit.apply(bus, arguments);//выполняем старый вариант
        process.send(arguments);
    };

    process.on('message', function (msg) {
        var args = [];
        Object.keys(msg).forEach(function (key) {
            args.push(msg[key]);
        });
        _emit.apply(bus, args);
    });
}

bus.setWorker = function (worker) {
    var _emit = bus.emit; //старая функция emit
    bus.emit = function () {
        _emit.apply(bus, arguments);//выполняем старый вариант
        worker.send(arguments);
    };

    worker.on('message', function (msg) {
        var args = [];
        Object.keys(msg).forEach(function (key) {
            args.push(msg[key]);
        });
        _emit.apply(bus, args);
    });
}
;

module.exports.emit('ready');
