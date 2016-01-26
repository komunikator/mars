var bus = require('../lib/system/bus'),
        config = bus.config;

bus.on('tts', function (data) {
    var sox = require('sox-stream');
    var transcode = sox({
        bits: 8,
        rate: 8000,
        channels: 1,
        encoding: 'u-law',
        type: 'wav'
    });

    var file_name = 'media/temp/' + data.text.replace(/[^a-zA-Zа-яА-Я0-9]/g, '_') + '.wav';
    transcode.on('error', function (err) {
        data.cb(file_name);
        data.cb = function () {
        };
        //consolbus.log(err.message)
    });

    // если файл file_name не существует, посылаем текст на синтез речи, если существует и правильного формата просто его проигрываем
    if (data.rewrite || !require('fs').existsSync(file_name) || !require('../lib/rtp/wav').checkFormat(file_name))
    {
        function ttsDone() {
            //consolbus.log('done');
            bus.emit('message', {category: 'call', sessionID: data.sessionID, type: 'debug', msg: 'tts file "' + file_name + '"'});
            data.cb(file_name);
        }
        bus.emit('ttsLaunch', {type: data.type, text: data.text, file: file_name, transcode: transcode, cb: ttsDone});
    } else
        data.cb(file_name);
})
require('require-dir')('speech')