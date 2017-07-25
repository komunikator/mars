var bus = require('../../lib/system/bus'),
        config = bus.config;

var yandex_speech = require('./yandexTTSlib/yandexTTS');

bus.on('ttsLaunch', function (data) {
    data.type = data.type || config.get("def_tts");
    if (data.type === 'yandex' || data.type === undefined) {
        var obj = {
            text: data.text,
            format: 'wav',
            file: data.file
        };
        if (data.voice) obj.speaker = data.voice; 
        yandex_speech(obj, data.cb);
    }
});
