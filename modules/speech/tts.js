var bus = require('../../lib/system/bus'),
        config = bus.config;

let speechLib = require('speech');
let speech = new speechLib();

bus.on('ttsLaunch', function (data) {
    var obj = {
        text: data.text,
        format: 'wav',
        file: data.file,
        key: data.key,
        cb: data.cb
    };
    if (data.voice) obj.speaker = data.voice; 
    speech.textToSpeech(obj);
});