var bus = require('./system/bus'),
    config = bus.config,
    sip = require('sip'),
    rtpTimeout = config.get("rtpTimeout") || 30; //sec

function setAudioBuffer(data) {
    if (sip.dialogs[data.sessionID])
        sip.dialogs[data.sessionID].audioBuffer = data.data;
    broadcastAudioBuffer(data.sessionID);
}

function broadcastAudioBuffer(_sessionID) {
    for (var sID in sip.dialogs)
        if (sip.dialogs[sID]._worker &&
            (sip.dialogs[sID]._worker.sendAudioBuffer == _sessionID) &&
            sip.dialogs[sip.dialogs[sID]._worker.sendAudioBuffer] &&
            sip.dialogs[sip.dialogs[sID]._worker.sendAudioBuffer].audioBuffer) {
            sip.dialogs[sID]._worker.send({
                action: 'audioBuffer',
                params: {
                    sessionID: sip.dialogs[sID]._worker.sendAudioBuffer,
                    data: sip.dialogs[sip.dialogs[sID]._worker.sendAudioBuffer].audioBuffer
                }
            });
        }
}

function init() {
    var sessionID = this.sessionID,
        session = sip.dialogs[sessionID],
        offer,
        direction,
        worker = session._worker = require('child_process').fork(__dirname + "/media/manager.js", { silent: true, execPath: 'node' });
    // worker = session._worker = require('child_process').fork(__dirname + "media/rtp/rtp.js", { silent: true, execPath: 'node' });
    if (session.webRtc && session.webRtc.direction) {
        direction = session.webRtc.direction;

        // worker.send({ action: 'direction', params: direction});
    }
    if (this && this.params && this.params.response && this.params.response.content) {
        offer = this.params.response.content;
    }

    var CB = {};

    //console.log('Звонок webRtc: ', sip.dialogs[sessionID].webRtc);
    //console.log('Звонок Rtp: ', sip.dialogs[sessionID].rtp);

    bus.emit('message', { category: 'call', sessionID: sessionID, type: 'info', msg: 'RTP process started' });
    worker.on('error', function (err) {
        //console.log('rtp', err);
        bus.emit('message', { category: 'call', sessionID: sessionID, type: 'error', msg: 'RTP ' + err });
    });

    worker.on('close', function (code) {
        bus.emit('message', { category: 'call', sessionID: sessionID, type: 'info', msg: 'RTP process closed with code ' + code });
        //session.close();
    });

    session.timeOutID = setTimeout(function () {
        //clearTimeout(session.timeOutID);
        bus.emit('message', { category: 'call', sessionID: sessionID, type: 'error', msg: 'RTP process timeout' });
        session.close();
    }, 600000); //30 min

    worker.on('message', function (d) {
        if (d.action === undefined) {
            bus.emit('message', { category: 'call', sessionID: sessionID, type: 'error', msg: 'RTP ' + d });
            return;
        };
        switch (d.action) {
            case 'rtpInPort':
                bus.emit('rtpInPort', { sessionID: sessionID, port: d.params.port, host: d.params.host });
                break;
            case 'audioBuffer':
                //consolbus.log(d.params.data.length);
                //bus.emit('message', {sessionID: sessionID, msg: d.params.data});
                break;
            case 'mediaStream':
                bus.emit('playBuffer', d.params); //WebKit only
                setAudioBuffer(d.params);
                break;
            case 'stop':
                bus.emit('message', { category: 'call', sessionID: sessionID, type: 'info', msg: 'Stop RTP' }); // + d.params.ip + ':' + d.params.port);
                session.rtpActive = false;
                bus.emit('RtpClose', { sessionID: sessionID });
                break;
            case 'init':
                session.rtpActive = true;
                bus.emit('message', { category: 'call', sessionID: sessionID, type: 'info', msg: 'Start RTP' }); // + d.params.ip + ':' + d.params.port);
                bus.emit('RtpStart', { sessionID: sessionID });
                break;
            case 'start_play':
                if (d.error) {
                    bus.emit('message', { category: 'call', sessionID: sessionID, type: 'error', msg: 'Start play ' + (d.params.file ? ('file "' + d.params.file) : ('audioBuffer "' + d.params.audioBuffer)) + '" error: ' + d.error }); // + d.params.ip + ':' + d.params.port);
                    if (CB['start_play']) {
                        CB['start_play']();
                        // delete CB['start_play'];
                    }
                } else
                    bus.emit('message', { category: 'call', sessionID: sessionID, type: 'info', msg: 'Start play ' + (d.params.file ? ('file "' + d.params.file) : ('audioBuffer "' + d.params.audioBuffer)) + '"' }); // + d.params.ip + ':' + d.params.port);
                break;
            case 'reset_play':
                bus.emit('message', { category: 'call', sessionID: sessionID, type: 'info', msg: 'Reset play ' + (d.params.file ? ('file "' + d.params.file) : ('audioBuffer "' + d.params.audioBuffer)) + '"' }); // + d.params.ip + ':' + d.params.port);
                break;
            case 'stop_play':
                bus.emit('message', { category: 'call', sessionID: sessionID, type: 'info', msg: 'Stop play ' + (d.params.file ? ('file "' + d.params.file) : ('audioBuffer "' + d.params.audioBuffer)) + '"' }); // + d.params.ip + ':' + d.params.port);
                if (CB['start_play']) {
                    CB['start_play']();
                    // delete CB['start_play'];
                }
                break;
            case 'recOn':
                bus.emit('message', { category: 'call', sessionID: sessionID, type: 'info', msg: 'Start record file "' + d.params.file + '"' }); //'+d.params.port);
                break;
            case 'recOff':
                bus.emit('message', { category: 'call', sessionID: sessionID, type: d.params.file ? 'info' : 'error', msg: 'Stop record "' + d.params.file + '"' + (d.error ? '. Error: "' + d.error + '"' : '') }); //+d.params.port);
                if (CB['recOff']) {
                    CB['recOff']();
                    delete CB['recOff'];
                }
                break;
            case 'start_dtmf_detect':
                bus.emit('message', { category: 'call', sessionID: sessionID, type: 'debug', msg: 'Detect DTMF start' });
                break;
            case 'set_dtmf_mode':
                bus.emit('setDtmfMode', { sessionID: sessionID, dtmf_mode: d.params });
                break;
            case 'dtmf_key':
                bus.emit('dtmf_key', { sessionID: sessionID, key: d.params.key });
                break;
            case 'dtmf_seq':
                bus.emit('message', { category: 'call', sessionID: sessionID, type: 'info', msg: 'dtmf_seq "' + d.params.key + '"' });
                break;
            case 'stream_on':
                let port = '';
                if (d && d.params && d.params.rinfo && d.params.rinfo.port) {
                    port = d.params.rinfo.port;
                }

                let detectPort = '';
                if (d && d.params && d.params.port) {
                    detectPort = d.params.port;
                }

                let address = '';
                if (d && d.params && d.params.rinfo && d.params.rinfo.address) {
                    address = d.params.rinfo.address;
                }

                bus.emit('message', { category: 'call', sessionID: sessionID, type: 'debug', msg: 'RTP_IN stream detected on port ' + detectPort + ' from ' + address + ':' + port });
                bus.emit('stream_on', { sessionID: sessionID });
                break;

            case 'start_stt':
                bus.emit('message', { category: 'call', sessionID: sessionID, type: 'debug', msg: 'Start STT :' + JSON.stringify(d.params) });
                break;
            case 'sttInit':
                bus.emit('message', { category: 'call', sessionID: sessionID, type: 'debug', msg: 'STT Init :' + JSON.stringify(d.params) });
                break;
            case 'sttOn':
                bus.emit('stt_text', { sessionID: sessionID, text: d.params.text });
                break;

            // RTC Обработчики
            case 'getAnswer':
                // console.log('getAnswer', d.params);
                bus.emit('rtpInPort', { sessionID: sessionID, rtpIn: d.params });
                // console.log('getAnswer: ', message.params.answer);
                break;
            case 'dataChannel':
                console.log('dataChannel');
                // console.log('dataChannel: ', d.params.data);
                break;
            case 'getSdp':
                bus.emit('rtcInPort', { sessionID: sessionID, rtcIn: d.params });
                // bus.emit('message', { category: 'call', sessionID: sessionID, type: 'debug', msg: 'createOffer :' + d.params });
                // console.log('getAnswer: ', message.params.answer);
                break;
            case 'close':
                bus.emit('RtpClose', { sessionID: sessionID });
                break;
            // case 'stream_on':
                // bus.emit('stream_on', { sessionID: sessionID });
                // break;
            case 'direction':
                bus.emit('message', { category: 'call', sessionID: sessionID, type: 'debug', msg: d });
                break;
            default:
                bus.emit('message', { category: 'call', sessionID: sessionID, type: 'debug', msg: 'RTP ' + d });
                break;
        }
    });

    session.close = function () {
        if (session.rtpActive)
            worker.send({ action: 'close' });
        setTimeout(function () {
            if (sip.dialogs[sessionID]) //just to be safe
                bus.emit('RtpClose', { sessionID: sessionID });
        }, 3000);
        clearTimeout(session.timeOutID);
    };

    session.start_play = function (params, cb) {
        if (session.rtpActive) {
            CB['start_play'] = cb;
            if (params.audioBuffer && session && session._worker)
                session._worker.sendAudioBuffer = params.audioBuffer;
            worker.send({ action: 'start_play', params: params });
        }
    };

    session.stop_play = function (params) {
        if (session.rtpActive) {
            if (params && params.audioBuffer && session && session._worker)
                delete session._worker.sendAudioBuffer;
            worker.send({ action: 'stop_play', params: params });
        }
    };

    session.rec = function (params, cb) {
        if (session.rtpActive)
            worker.send({ action: 'rec', params: params });
        if (cb) {
            if (params.rec === false)
                CB['recOff'] = cb;
            else
                cb();
        }
    };


    var stunServer = config.get("stunServer"),
        audioCodec = config.get("audioCodec"),
        publicIP = sip.connections[session.sipAccountID].sUA.publicIP;

    if (stunServer) {
        stunServer = stunServer.split(':');
        stunServer = { host: stunServer[0], port: stunServer[1] || 3478 }
    }
    var params = { publicIP: publicIP, stunServer: stunServer, audioCodec: audioCodec };
    if (publicIP && stunServer)
        bus.emit('message', { category: 'call', sessionID: sessionID, type: 'debug', msg: 'RTP process init with params ' + JSON.stringify(params) });


    if (sip && sip.dialogs && sessionID &&
        sip.dialogs[sessionID] && sip.dialogs[sessionID].rtp) {
        params.sessionID = sessionID;
        worker.send({ action: 'rtpInPort', params: params });
    } else {
        worker.send({
            action: 'createRtc', params: {
                offer: offer,
                direction: direction,
                sessionID: sessionID
            }
        });
    }
};

bus.on('RtpStart', function (data) {
    var sessionID = data.sessionID;
    sip.dialogs[sessionID].streamOnTimeout =
        setTimeout(function () {
            if (sip.dialogs[sessionID]) {
                bus.emit('message', { category: 'call', sessionID: sessionID, type: 'error', msg: 'RTP incoming stream timeout [' + rtpTimeout + ' sec]' });
                sip.bye(sessionID, 'Reason: Q.850 ;cause=31 ;text="RTP Timeout"');
            }
        }, rtpTimeout * 1000);
});

bus.on('stream_on', function (data) {
    var sessionID = data.sessionID;
    if (sip.dialogs[sessionID].streamOnTimeout)
        clearTimeout(sip.dialogs[sessionID].streamOnTimeout);
});



bus.on('rtpWorkerInit', function (cntx) {
    process.nextTick(function () {
        init.apply(cntx);
    });
});

bus.on('rtpWorker', function (data) {
    var sessionID = data.sessionID,
        session = sip.dialogs[sessionID],
        worker = session._worker;

    worker && worker.send({ action: 'init', params: data });
});

// ********************* RTC *********************

bus.on('RtcStart', function (data) {
    var sessionID = data.sessionID;
    sip.dialogs[sessionID].streamOnTimeout =
        setTimeout(function () {
            if (sip.dialogs[sessionID]) {
                bus.emit('message', { category: 'call', sessionID: sessionID, type: 'error', msg: 'RTC incoming stream timeout [' + rtpTimeout + ' sec]' });
                sip.bye(sessionID, 'Reason: Q.850 ;cause=31 ;text="RTC Timeout"');
            }
        }, rtpTimeout * 1000);
});

bus.on('stream_on', function(data) {
    var sessionID = data.sessionID;
    if (sip.dialogs[sessionID].streamOnTimeout)
        clearTimeout(sip.dialogs[sessionID].streamOnTimeout);
});


bus.on('rtcWorkerInit', function (cntx) {
    process.nextTick(function () {
        init.apply(cntx);
    });
});

bus.on('rtcWorker', function (data) {
    var sessionID = data.sessionID,
        session = sip.dialogs[sessionID];
    session.rtpActive = true;
    bus.emit('message', { category: 'call', sessionID: sessionID, type: 'info', msg: 'Start RTC' });
    bus.emit('RtcStart', { sessionID: sessionID });

});


module.exports = init;
