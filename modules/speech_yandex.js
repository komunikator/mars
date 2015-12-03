var bus = require('../lib/system/bus'),
        config = bus.config;

var yandex_speech = require('./recognize/yandex-speech');

bus.on('ttsLaunch', function (data) {
    data.type = data.type || config.get("def_tts");
    if (data.type === 'yandex' || data.type === undefined) {
        yandex_speech.TTS({
            text: data.text,
            format: 'wav',
            file: data.file,
            transform: data.transcode
        }, data.cb);
    }
});
