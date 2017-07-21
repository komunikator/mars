var bus = require('./system/bus'),
    config = bus.config,
    sip = require('./sip/sip'),
    rtcTimeout = config.get("rtpTimeout") || 30; //sec

function init() {
    var sessionID = this.sessionID,
        session = sip.dialogs[sessionID],
        worker = session._worker = require('child_process').fork(__dirname + "/rtc/rtc.js", { silent: true, execPath: 'node' }),
        // worker = session._worker = new Rtc(sessionID),
        offer = this.params.response.content;
    var CB = {};

    bus.emit('message', { category: 'call', sessionID: sessionID, type: 'info', msg: 'RTC process started' });

    worker.on('error', function(err) {
        console.log('rtc ', err);
        bus.emit('message', { category: 'call', sessionID: sessionID, type: 'error', msg: 'RTC ' + err });
    });

    worker.on('message', function(message) {
        if (message.action === undefined) {
            console.log
            bus.emit('message', { category: 'call', sessionID: sessionID, type: 'error', msg: 'RTC ' + message });
            return;
        }

        bus.emit('message', { category: 'call', sessionID: sessionID, type: 'info', msg: 'RTC ' + message.action });

        switch (message.action) {
            case 'createRtc':
                worker.send({ action: 'initRtc', params: { sessionID: sessionID } });
                break
            case 'initRtc':
                console.log('initRTC: offer: ', offer);
                worker.send({ action: 'setRemoteSdp', params: { offer: offer }});
                break;
            case 'setRemoteSdp':
                worker.send({ action: 'listenDataChannel' });
                break;
            case 'listenDataChannel':
                worker.send({ action: 'createAnswer'});
                break;
            case 'createAnswer':
                worker.send({ action: 'setLocalDescription'});
                break;
            case 'setLocalDescription':
                break;
            case 'iceGatheringComplete':
                worker.send({ action: 'getAnswer'});
                break;
            case 'getAnswer':
                bus.emit('rtpInPort', { sessionID: sessionID, rtpIn: message.params.answer });
                console.log('getAnswer: ', message.params.answer);
                break;
            case 'dataChannel':
                console.log('dataChannel: ', message.params.data);
                break;
        }

    });

    session.timeOutID = setTimeout(function() {
        // clearTimeout(session.timeOutID);
        bus.emit('message', { category: 'call', sessionID: sessionID, type: 'error', msg: 'RTC process timeout' });
        // worker.send({action: 'close'});
        session.close();
    }, 1800000); //30 min

    session.close = function() {
        if (session.rtcActive)
            worker.send({ action: 'close' });
        setTimeout(function() {
            if (sip.dialogs[sessionID]) //just to be safe
                bus.emit('RtcClose', { sessionID: sessionID });
        }, 3000);
        clearTimeout(session.timeOutID);
    };

    session.start_play = function(params, cb) {
        if (session.rtcActive) {
            CB['start_play'] = cb;
            if (params.audioBuffer && session && session._worker)
                session._worker.sendAudioBuffer = params.audioBuffer;
            worker.send({ action: 'start_play', params: params });
        }
    };

    session.stop_play = function(params) {
        if (session.rtcActive) {
            if (params && params.audioBuffer && session && session._worker)
                delete session._worker.sendAudioBuffer;
            worker.send({ action: 'stop_play', params: params });
        }
    };

    session.rec = function(params, cb) {
        if (session.rtcActive)
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
        bus.emit('message', { category: 'call', sessionID: sessionID, type: 'debug', msg: 'RTC process init with params ' + JSON.stringify(params) });

    worker.send({ action: 'createRtc', params: { sessionID: sessionID } });

    /*
    // setLocalDescription
    function iceGatheringComplete() {
        console.log('iceGatheringComplete');        
        worker.removeListener('iceGatheringComplete', iceGatheringComplete);

        bus.emit('rtpInPort', { sessionID: sessionID, rtpIn: worker.getAnswer() });
        console.log('getAnswer: ', worker.getAnswer());
    }

    worker.on('iceGatheringComplete', iceGatheringComplete);


    // setLocalDescription
    function setLocalDescription() {
        console.log('setLocalDescription');        
        worker.removeListener('setLocalDescription', setLocalDescription);

    }

    worker.on('setLocalDescription', setLocalDescription);

    // createAnswer
    function createAnswer(answer) {
        console.log('createAnswer');        
        worker.removeListener('createAnswer', createAnswer);

        console.log('createAnswer answer: ', answer);
        worker.setLocalDescription(answer);
    }

    worker.on('createAnswer', createAnswer);

    // listenDataChannel
    function listenDataChannel() {
        console.log('rtcWorker listenDataChannel');        
        worker.removeListener('listenDataChannel', listenDataChannel);

        worker.createAnswer();
    }
    worker.on('listenDataChannel', listenDataChannel);

    // setRemoteSdp
    function setRemoteSdp() {
        console.log('rtcWorker setRemoteSdp');
        worker.removeListener('setRemoteSdp', setRemoteSdp);

        worker.listenDataChannel();
    }
    worker.on('setRemoteSdp', setRemoteSdp);

    // initRtc
    function initRtc() {
        worker.removeListener('initRtc', initRtc);
        worker.setRemoteSdp(offer);
    }
    worker.on('initRtc', initRtc);

    worker.initRtc();
    */
};

/*
function init() {
    var sessionID = this.sessionID,
        session = sip.dialogs[sessionID],
        //worker = session._worker = require('child_process').fork(__dirname + "/rtp/rtp.js", { silent: true, execPath: 'node' });
        Rtc = require(__dirname + '/rtc/rtc.js'),
        worker = session._worker = new Rtc(sessionID),
        offer = this.params.response.content;
    var CB = {};

    bus.emit('message', { category: 'call', sessionID: sessionID, type: 'info', msg: 'RTC process started' });
    // worker.on('error', function(err) {
    //     //console.log('rtp', err);
    //     bus.emit('message', { category: 'call', sessionID: sessionID, type: 'error', msg: 'RTP ' + err });
    // });

    session.timeOutID = setTimeout(function() {
        //clearTimeout(session.timeOutID);
        bus.emit('message', { category: 'call', sessionID: sessionID, type: 'error', msg: 'RTC process timeout' });
        //worker.send({action: 'close'});
        session.close();
    }, 1800000); //30 min

    session.close = function() {
        if (session.rtcActive)
            // worker.send({ action: 'close' });
        setTimeout(function() {
            if (sip.dialogs[sessionID]) //just to be safe
                bus.emit('RtcClose', { sessionID: sessionID });
        }, 3000);
        clearTimeout(session.timeOutID);
    };

    session.start_play = function(params, cb) {
        if (session.rtcActive) {
            CB['start_play'] = cb;
            // if (params.audioBuffer && session && session._worker)
                // session._worker.sendAudioBuffer = params.audioBuffer;
            // worker.send({ action: 'start_play', params: params });
        }
    };

    session.stop_play = function(params) {
        if (session.rtcActive) {
            if (params && params.audioBuffer && session && session._worker)
                delete session._worker.sendAudioBuffer;
            // worker.send({ action: 'stop_play', params: params });
        }
    };

    session.rec = function(params, cb) {
        if (session.rtcActive)
            // worker.send({ action: 'rec', params: params });
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
        bus.emit('message', { category: 'call', sessionID: sessionID, type: 'debug', msg: 'RTC process init with params ' + JSON.stringify(params) });

    // setLocalDescription
    function iceGatheringComplete() {
        console.log('iceGatheringComplete');        
        worker.removeListener('iceGatheringComplete', iceGatheringComplete);

        bus.emit('rtpInPort', { sessionID: sessionID, rtpIn: worker.getAnswer() });
        console.log('getAnswer: ', worker.getAnswer());
    }

    worker.on('iceGatheringComplete', iceGatheringComplete);


    // setLocalDescription
    function setLocalDescription() {
        console.log('setLocalDescription');        
        worker.removeListener('setLocalDescription', setLocalDescription);

    }

    worker.on('setLocalDescription', setLocalDescription);

    // createAnswer
    function createAnswer(answer) {
        console.log('createAnswer');        
        worker.removeListener('createAnswer', createAnswer);

        console.log('createAnswer answer: ', answer);
        worker.setLocalDescription(answer);
    }

    worker.on('createAnswer', createAnswer);

    // listenDataChannel
    function listenDataChannel() {
        console.log('rtcWorker listenDataChannel');        
        worker.removeListener('listenDataChannel', listenDataChannel);

        worker.createAnswer();
    }
    worker.on('listenDataChannel', listenDataChannel);

    // setRemoteSdp
    function setRemoteSdp() {
        console.log('rtcWorker setRemoteSdp');
        worker.removeListener('setRemoteSdp', setRemoteSdp);

        worker.listenDataChannel();
    }
    worker.on('setRemoteSdp', setRemoteSdp);

    // initRtc
    function initRtc() {
        worker.removeListener('initRtc', initRtc);
        worker.setRemoteSdp(offer);
    }
    worker.on('initRtc', initRtc);

    worker.initRtc();
};
*/

bus.on('RtcStart', function(data) {
    var sessionID = data.sessionID;
    sip.dialogs[sessionID].streamOnTimeout =
        setTimeout(function() {
            if (sip.dialogs[sessionID]) {
                bus.emit('message', { category: 'call', sessionID: sessionID, type: 'error', msg: 'RTC incoming stream timeout [' + rtcTimeout + ' sec]' });
                sip.bye(sessionID, 'Reason: Q.850 ;cause=31 ;text="RTC Timeout"');
            }
        }, rtcTimeout * 1000);
});

bus.on('stream_on', function(data) {
    var sessionID = data.sessionID;
    if (sip.dialogs[sessionID].streamOnTimeout)
        clearTimeout(sip.dialogs[sessionID].streamOnTimeout);
});

bus.on('rtcWorkerInit', function(cntx) {
    process.nextTick(function() {
        init.apply(cntx);
    });
});

bus.on('rtcWorker', function(data) {
    var sessionID = data.sessionID,
        session = sip.dialogs[sessionID];
    session.rtpActive = true;
    bus.emit('message', { category: 'call', sessionID: sessionID, type: 'info', msg: 'Start RTP' });
    bus.emit('RtcStart', { sessionID: sessionID });

});

module.exports = init;