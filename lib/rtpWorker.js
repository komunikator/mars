function rtpWorker(events, params, dialogs) {
    var sessionID = params.sessionID;
    var lib_dir = './lib';
    var worker;
    var e,
            CB = {},
            rtpActive;
    //console.log(events);
    e = events;
    //if (!worker)
    worker = require('child_process').fork(__dirname + "/rtp.js", {silent: true, execPath: 'node'});
    dialogs[sessionID]._worker = worker;
    //worker = require('child_process').fork(lib_dir + "/rtp.js");
    //console.log(worker);
    worker.on('error', function (err) {
        //console.log('rtp', err);
        e.emit('message', {category: 'call', sessionID: sessionID, type: 'error', msg: 'RTP ' + err});
    });
    var timeOutID = setTimeout(function () {
        clearTimeout(timeOutID);
        e.emit('message', {category: 'call', sessionID: sessionID, type: 'error', msg: 'RTP process timeout'});
        worker.send({action: 'close'});
    }, 1800000);//30 min

    function setAudioBuffer(data) {
        if (dialogs[data.sessionID])
            dialogs[data.sessionID].audioBuffer = data.data;
        broadcastAudioBuffer();
    }

    function broadcastAudioBuffer() {
        for (var sID in dialogs)
            if (dialogs[sID]._worker &&
                    dialogs[sID]._worker.sendAudioBuffer &&
                    dialogs[dialogs[sID]._worker.sendAudioBuffer] &&
                    dialogs[dialogs[sID]._worker.sendAudioBuffer].audioBuffer)
            {
                dialogs[sID]._worker.send(
                        {
                            action: 'audioBuffer',
                            params: {
                                sessionID: dialogs[sID]._worker.sendAudioBuffer,
                                data: dialogs[dialogs[sID]._worker.sendAudioBuffer].audioBuffer
                            }
                        });
            }
    }

    worker.on('message', function (d) {
        if (d.action === undefined) {
            e.emit('message', {category: 'call', sessionID: sessionID, type: 'error', msg: 'RTP ' + d});
            return;
        }
        ;
        switch (d.action) {
            case 'audioBuffer':
                //console.log(d.params.data.length);
                //e.emit('message', {sessionID: sessionID, msg: d.params.data});
                break;
            case 'mediaStream':
                e.emit('playBuffer', d.params);//WebKit only
                setAudioBuffer(d.params);
                break;
            case 'stop':
                e.emit('message', {category: 'call', sessionID: sessionID, type: 'info', msg: 'Stop RTP'});// + d.params.ip + ':' + d.params.port);
                rtpActive = false;
                break;
            case 'init':
                rtpActive = true;
                e.emit('message', {category: 'call', sessionID: sessionID, type: 'info', msg: 'Start RTP'});// + d.params.ip + ':' + d.params.port);
                e.emit('RtpStart', {sessionID: sessionID});
                break;
            case 'start_play':
                if (d.error) {
                    e.emit('message', {category: 'call', sessionID: sessionID, type: 'error', msg: 'Start play ' + (d.params.file ? ('file "' + d.params.file) : ('audioBuffer "' + d.params.audioBuffer)) + '" error: ' + d.error});// + d.params.ip + ':' + d.params.port);
                    if (CB['start_play']) {
                        CB['start_play']();
                        // delete CB['start_play'];
                    }
                }
                else
                    e.emit('message', {category: 'call', sessionID: sessionID, type: 'info', msg: 'Start play ' + (d.params.file ? ('file "' + d.params.file) : ('audioBuffer "' + d.params.audioBuffer)) + '"'});// + d.params.ip + ':' + d.params.port);
                break;
            case 'reset_play':
                e.emit('message', {category: 'call', sessionID: sessionID, type: 'info', msg: 'Reset play ' + (d.params.file ? ('file "' + d.params.file) : ('audioBuffer "' + d.params.audioBuffer)) + '"'});// + d.params.ip + ':' + d.params.port);
                break;
            case 'stop_play':
                e.emit('message', {category: 'call', sessionID: sessionID, type: 'info', msg: 'Stop play ' + (d.params.file ? ('file "' + d.params.file) : ('audioBuffer "' + d.params.audioBuffer)) + '"'});// + d.params.ip + ':' + d.params.port);
                if (CB['start_play']) {
                    CB['start_play']();
                    // delete CB['start_play'];
                }
                break;
            case 'recOn':
                e.emit('message', {category: 'call', sessionID: sessionID, type: 'info', msg: 'Start record file "' + d.params.file + '"'});//'+d.params.port);
                break;
            case 'recOff':
                e.emit('message', {category: 'call', sessionID: sessionID, type: d.params.file ? 'info' : 'error', msg: 'Stop record "' + d.params.file + '"' + (d.error ? '. Error: "' + d.error + '"' : '')});//+d.params.port);
                if (CB['recOff']) {
                    CB['recOff']();
                    delete CB['recOff'];
                }
                break;
            case 'start_dtmf_detect':
                e.emit('message', {category: 'call', sessionID: sessionID, type: 'debug', msg: 'Detect DTMF start'});
                break;
            case 'set_dtmf_mode':
                e.emit('setDtmfMode', {sessionID: sessionID, dtmf_mode: d.params});
                break;
            case 'dtmf_key':
                e.emit('dtmf_key', {sessionID: sessionID, key: d.params.key});
                break;
            case 'dtmf_seq':
                e.emit('message', {category: 'call', sessionID: sessionID, type: 'info', msg: 'dtmf_seq "' + d.params.key + '"'});
                break;
            case 'stream_on':
                e.emit('message', {category: 'call', sessionID: sessionID, type: 'debug', msg: 'RTP_IN stream detected on port ' + d.params.port + ' from ' + d.params.rinfo.address + ':' + d.params.rinfo.port});
                break;

            case 'start_stt':
                e.emit('message', {category: 'call', sessionID: sessionID, type: 'debug', msg: 'Start STT :' + JSON.stringify(d.params)});
                break;
            case 'sttInit':
                e.emit('message', {category: 'call', sessionID: sessionID, type: 'debug', msg: 'STT Init :' + JSON.stringify(d.params)});
                break;
            case 'sttOn':
                e.emit('stt_text', {sessionID: sessionID, text: d.params.text});
                break;
        }
    });

    this.close = function () {
        if (rtpActive)
            worker.send({action: 'close'});
        clearTimeout(timeOutID);
    };
    this.start_play = function (params, cb) {
        if (rtpActive) {
            CB['start_play'] = cb;
            if (params.audioBuffer && dialogs[sessionID] && dialogs[sessionID]._worker)
                dialogs[sessionID]._worker.sendAudioBuffer = params.audioBuffer;
            worker.send({action: 'start_play', params: params});
        }
    };
    this.stop_play = function (params) {
        if (rtpActive) {
            if (params.audioBuffer && dialogs[sessionID] && dialogs[sessionID]._worker)
                delete dialogs[sessionID]._worker.sendAudioBuffer;
            worker.send({action: 'stop_play', params: params});
        }
    };

    this.rec = function (params, cb) {
        if (rtpActive)
            worker.send({action: 'rec', params: params});
        if (cb) {
            if (params.rec === false)
                CB['recOff'] = cb;
            else
                cb();
        }
    };

    worker.send({action: 'init', params: params});
}
module.exports = rtpWorker;