var bus = require('../lib/system/bus'),
        config = bus.config,
        audioCodec = config.get("audioCodec"),
        fs = require('fs');

function wavEncode(data, file_name, cb) {
    bus.emit('message', {category: 'call', sessionID: data.sessionID, type: 'debug', msg: 'Start encode file "' + file_name + '"'});

    var spawn = require('child_process').spawn,
            args =
            [file_name, '--bits', 8, '--rate', 8000, '--channels', 1, '--encoding', audioCodec === 'PCMA' ? 'a-law' : 'u-law', '--type', 'wav', file_name.slice(0, -4)],
            sox = spawn('sox', args);

    sox.on('error', function (e) {
        bus.emit('message', {category: 'call', sessionID: data.sessionID, type: 'error', msg: 'Sox Error: ' + e.toString()});
        fs.exists(file_name, function (exist) {
            if (exist)
                fs.unlink(file_name, cb());
            else
                cb();
        });
    });

    sox.stdout.on('finish', function () {
        fs.exists(file_name, function (exist) {
            if (exist)
                fs.unlink(file_name, cb());
            else
                cb();
        });
    });
}

bus.on('tts', function (data) {
    if (!data.text) {
        bus.emit('message', {category: 'call', sessionID: data.sessionID, type: 'error', msg: 'tts text is empty!'});
        data.cb(file_name);
        return;
    }
    var tmp = data.text.replace(/[^a-zA-Zа-яА-Я0-9]/g, '_');
    if (tmp.length > 120)
    {
        tmp = tmp.substring(0, 121);
    }
    var file_name = 'media/temp/' + tmp + '.wav';
    // если файл file_name не существует, посылаем текст на синтез речи, если существует и правильного формата просто его проигрываем
    if (data.rewrite || !fs.existsSync(file_name) || !require('../lib/rtp/wav').checkFormat(file_name, [6, 7]))//6-pcma,7-pcmu
    {
        function ttsDone() {
            wavEncode(data, file_name + '.tmp', function () {
                bus.emit('message', {category: 'call', sessionID: data.sessionID, type: 'debug', msg: 'tts file "' + file_name + '"'});
                data.cb(file_name);
            });
        }
        bus.emit('message', {category: 'call', sessionID: data.sessionID, type: 'debug', msg: 'Start generate speech from text "' + data.text + '"'});
        bus.emit('ttsLaunch', {type: data.type, text: data.text, file: file_name + '.tmp', cb: ttsDone});
    } else
        data.cb(file_name);
})
require('require-dir')('speech')