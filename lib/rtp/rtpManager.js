"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rtpClass_1 = require("./rtpClass");
const rtpPlayer_1 = require("./rtpPlayer");
const rtpRecorder_1 = require("./rtpRecorder");
process.on('disconnect', () => {
    process.exit();
});
process.on('uncaughtException', (e) => {
    process.send('uncaughtException pid:' + process.pid + ': stack: ' + e.stack);
    setTimeout(() => {
        process.exit();
    }, 3000);
});
process.on('warning', (e) => {
    process.send('pid:' + process.pid + ': ' + e + ' \r\n stack: ' + e);
});
let rtp;
let player;
let recorder;
process.on('message', (data) => {
    if (!data)
        return;
    process.send(data.action);
    let params = data.params;
    if (data.action === 'audioBuffer' && params.sessionID && params.data.length) {
        rtp.addAudioBuffer(params);
    }
    if (data.action === 'rtpInPort') {
        // ******************** Создание экземпляров ********************
        rtp = new rtpClass_1.Rtp(data.params.sessionID);
        player = new rtpPlayer_1.RtpPlayer(data.params.sessionID);
        recorder = new rtpRecorder_1.RtpRecorder(data.params.sessionID);
        // ******************** Обработчики Плеера ********************
        rtp.on('writeDataIn', (buffer) => {
            recorder.emit('writeDataIn', buffer);
        });
        rtp.on('socketClose', () => {
            recorder.emit('socketClose');
        });
        // ******************** Обработчики Плеера ********************
        player.on('buffer', (buffer) => {
            rtp.emit('addBuffer', buffer);
        });
        player.on('startPlayFile', () => {
            recorder.emit('startPlayFile');
        });
        player.on('writeDataOut', (buffer) => {
            recorder.emit('writeDataOut', buffer);
        });
        rtp.rtpInPort(params);
    }
    if (data.action === 'init') {
        rtp.init(params);
        process.send(data);
    }
    if (data.action === 'close') {
        rtp.close();
    }
    if (data.action === 'stop_play') {
        rtp.stopPlay();
    }
    if ((data.action === 'start_play') && params && (params.file || params.audioBuffer)) {
        player.startPlay(data);
    }
    if (data.action === 'rec' && (params)) {
        process.send(data);
        rtp.rec(params);
        recorder.rec(params);
    }
});
