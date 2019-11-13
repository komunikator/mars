var bus = require('../../lib/system/bus'),
        config = bus.config;

var ivona_speech;
var ivona_cfg;

bus.on('ttsLaunch', function (data) {
    data.type = data.type || config.get("def_tts");
    if (data.type === 'ivona') {

        ivona_cfg = config.get("ivona_speech") || {}; // считывание настроек Ivona по умолчанию
        if (ivona_cfg && ivona_cfg.gender) delete(ivona_cfg.gender);

        if (ivona_cfg && data.voice) // если объект настроек не пуст и задан параметр голос (voice),
        {
            ivona_cfg.name = data.voice; // меняем установленный по умолчанию голос в Ivona
        }

        if (!ivona_speech)
        {
            ivona_speech = new (require('ivona-node'))(ivona_cfg);
        }

        var fileWriter = require('fs').createWriteStream(data.file);
        fileWriter.on('finish', data.cb);
        ivona_speech.createVoice(data.text, {
            body: {
                outputFormat: {codec: 'AU'},
                voice: ivona_cfg // перед произнесением устанавливаем текущий голос
            }
        }).pipe(fileWriter);
    }
});
