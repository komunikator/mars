var bus = require('../lib/system/bus'),
        config = bus.config;

try {
    var Recognizer = require('./recognize/'),
            recognizer = new Recognizer(config.get("recognize"));

    bus.on('stt', function (data) {
        recognizer.recognize(data.file, function (err, result) {
            //consolbus.log('recognizeCallback', err, result);
            //callback(err, result);
            //consolbus.log(result);
            if (!err)
                bus.emit('message', {category: 'call', sessionID: data.sessionID, type: 'debug', msg: 'tts text "' + result.text + '"'});
	    else
               console.log(err, result);
            data.cb(result && result.text);
        });

    });
} catch (e) {
 console.log(e);
}

