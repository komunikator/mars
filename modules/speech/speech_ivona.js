var bus = require('../../lib/system/bus'),
        config = bus.config;

var ivona_speech;

bus.on('ttsLaunch', function (data) {
    data.type = data.type || config.get("def_tts");
    if (data.type === 'ivona') {
        if (!ivona_speech)
            ivona_speech = new (require('ivona-node'))(config.get("ivona_speech") || {});
        var fileWriter = require('fs').createWriteStream(data.file);
        fileWriter.on('finish', data.cb);
        ivona_speech.createVoice(data.text, {
            body: {
                outputFormat: {codec: 'AU'},
                voice: config.get("ivona_speech")
            }
        }).pipe(fileWriter);
    }
});
