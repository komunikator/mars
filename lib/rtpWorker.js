var bus = require('./system/bus'),
        config = bus.config,
        sip = require('./sip/sip');

function setAudioBuffer(data) {
    if (sip.dialogs[data.sessionID])
        sip.dialogs[data.sessionID].audioBuffer = data.data;
    broadcastAudioBuffer();
}

function broadcastAudioBuffer() {
    for (var sID in sip.dialogs)
        if (sip.dialogs[sID]._worker &&
                sip.dialogs[sID]._worker.sendAudioBuffer &&
                sip.dialogs[sip.dialogs[sID]._worker.sendAudioBuffer] &&
                sip.dialogs[sip.dialogs[sID]._worker.sendAudioBuffer].audioBuffer)
        {
            sip.dialogs[sID]._worker.send(
                    {
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
            worker = session._worker = require('child_process').fork(__dirname + "/rtp/rtp.js", {silent: true, execPath: 'node'});
    var CB = {};

    worker.on('error', function (err) {
        //consolbus.log('rtp', err);
        bus.emit('message', {category: 'call', sessionID: sessionID, type: 'error', msg: 'RTP ' + err});
    });

    session.timeOutID = setTimeout(function () {
        //clearTimeout(session.timeOutID);
        bus.emit('message', {category: 'call', sessionID: sessionID, type: 'error', msg: 'RTP process timeout'});
        //worker.send({action: 'close'});
        session.close();
    }, 1800000);//30 min



    worker.on('message', function (d) {
        //console.log(d);
        if (d.action === undefined) {
            bus.emit('message', {category: 'call', sessionID: sessionID, type: 'error', msg: 'RTP ' + d});
            return;
        }
        ;
        switch (d.action) {
            case 'audioBuffer':
                //consolbus.log(d.params.data.length);
                //bus.emit('message', {sessionID: sessionID, msg: d.params.data});
                break;
            case 'mediaStream':
                bus.emit('playBuffer', d.params);//WebKit only
                setAudioBuffer(d.params);
                break;
            case 'stop':
                bus.emit('message', {category: 'call', sessionID: sessionID, type: 'info', msg: 'Stop RTP'});// + d.params.ip + ':' + d.params.port);
                session.rtpActive = false;
                bus.emit('RtpClose', {sessionID: sessionID});
                break;
            case 'init':
                session.rtpActive = true;
                bus.emit('message', {category: 'call', sessionID: sessionID, type: 'info', msg: 'Start RTP'});// + d.params.ip + ':' + d.params.port);
                bus.emit('RtpStart', {sessionID: sessionID});
                break;
            case 'start_play':
                if (d.error) {
                    bus.emit('message', {category: 'call', sessionID: sessionID, type: 'error', msg: 'Start play ' + (d.params.file ? ('file "' + d.params.file) : ('audioBuffer "' + d.params.audioBuffer)) + '" error: ' + d.error});// + d.params.ip + ':' + d.params.port);
                    if (CB['start_play']) {
                        CB['start_play']();
                        // delete CB['start_play'];
                    }
                }
                else
                    bus.emit('message', {category: 'call', sessionID: sessionID, type: 'info', msg: 'Start play ' + (d.params.file ? ('file "' + d.params.file) : ('audioBuffer "' + d.params.audioBuffer)) + '"'});// + d.params.ip + ':' + d.params.port);
                break;
            case 'reset_play':
                bus.emit('message', {category: 'call', sessionID: sessionID, type: 'info', msg: 'Reset play ' + (d.params.file ? ('file "' + d.params.file) : ('audioBuffer "' + d.params.audioBuffer)) + '"'});// + d.params.ip + ':' + d.params.port);
                break;
            case 'stop_play':
                bus.emit('message', {category: 'call', sessionID: sessionID, type: 'info', msg: 'Stop play ' + (d.params.file ? ('file "' + d.params.file) : ('audioBuffer "' + d.params.audioBuffer)) + '"'});// + d.params.ip + ':' + d.params.port);
                if (CB['start_play']) {
                    CB['start_play']();
                    // delete CB['start_play'];
                }
                break;
            case 'recOn':
                bus.emit('message', {category: 'call', sessionID: sessionID, type: 'info', msg: 'Start record file "' + d.params.file + '"'});//'+d.params.port);
                break;
            case 'recOff':
                bus.emit('message', {category: 'call', sessionID: sessionID, type: d.params.file ? 'info' : 'error', msg: 'Stop record "' + d.params.file + '"' + (d.error ? '. Error: "' + d.error + '"' : '')});//+d.params.port);
                if (CB['recOff']) {
                    CB['recOff']();
                    delete CB['recOff'];
                }
                break;
            case 'start_dtmf_detect':
                bus.emit('message', {category: 'call', sessionID: sessionID, type: 'debug', msg: 'Detect DTMF start'});
                break;
            case 'set_dtmf_mode':
                bus.emit('setDtmfMode', {sessionID: sessionID, dtmf_mode: d.params});
                break;
            case 'dtmf_key':
                bus.emit('dtmf_key', {sessionID: sessionID, key: d.params.key});
                break;
            case 'dtmf_seq':
                bus.emit('message', {category: 'call', sessionID: sessionID, type: 'info', msg: 'dtmf_seq "' + d.params.key + '"'});
                break;
            case 'stream_on':
                bus.emit('message', {category: 'call', sessionID: sessionID, type: 'debug', msg: 'RTP_IN stream detected on port ' + d.params.port + ' from ' + d.params.rinfo.address + ':' + d.params.rinfo.port});
                break;

            case 'start_stt':
                bus.emit('message', {category: 'call', sessionID: sessionID, type: 'debug', msg: 'Start STT :' + JSON.stringify(d.params)});
                break;
            case 'sttInit':
                bus.emit('message', {category: 'call', sessionID: sessionID, type: 'debug', msg: 'STT Init :' + JSON.stringify(d.params)});
                break;
            case 'sttOn':
                bus.emit('stt_text', {sessionID: sessionID, text: d.params.text});
                break;
        }
    });

    session.close = function () {
        if (session.rtpActive)
            worker.send({action: 'close'});
        setTimeout(function () {
            if (sip.dialogs[sessionID]) //just to be safe
                bus.emit('RtpClose', {sessionID: sessionID});
        }, 3000);
        clearTimeout(session.timeOutID);
    };

    session.start_play = function (params, cb) {
        if (session.rtpActive) {
            CB['start_play'] = cb;
            if (params.audioBuffer && session && session._worker)
                session._worker.sendAudioBuffer = params.audioBuffer;
            worker.send({action: 'start_play', params: params});
        }
    };

    session.stop_play = function (params) {
        if (session.rtpActive) {
            if (params.audioBuffer && session && session._worker)
                delete session._worker.sendAudioBuffer;
            worker.send({action: 'stop_play', params: params});
        }
    };

    session.rec = function (params, cb) {
        if (session.rtpActive)
            worker.send({action: 'rec', params: params});
        if (cb) {
            if (params.rec === false)
                CB['recOff'] = cb;
            else
                cb();
        }
    };

    worker.send({action: 'init', params: this});
}
;

bus.on('rtpWorker', function (cntx) {
    init.apply(cntx);
});

module.exports = init;