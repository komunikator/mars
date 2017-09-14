'use strict';
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
process.on('message', (data) => {
    if (!data)
        return;
    process.send(data.action);
    let params = data.params;
    if (data.action === 'audioBuffer' && params.sessionID && params.data.length) {
        rtp.addAudioBuffer(params);
    }
    if (data.action === 'rtpInPort') {
        let Rtp = require('./rtpClass').Rtp;
        rtp = new Rtp(data.params.sessionID);
        let Player = require('./rtpPlayer').RtpPlayer;
        player = new Player(data.params.sessionID);
        player.on('buffer', (buffer) => {
            rtp.emit('addBuffer', buffer);
        });
        rtp.rtpInPort(params);
    }
    if (data.action === 'init') {
        rtp.init(params, () => {
            data.action = 'stop';
            process.send(data);
        });
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
    }
});
