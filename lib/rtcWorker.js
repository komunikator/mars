var bus = require('./system/bus'),
    config = bus.config,
    sip = require('./sip/sip'),
    rtcTimeout = config.get("rtpTimeout") || 30; //sec

function init() {
    var sessionID = this.sessionID,
        session = sip.dialogs[sessionID],
        // worker = session._worker = require('child_process').fork(__dirname + "/rtc/rtc.js", { silent: true, execPath: 'node' }),
        worker = session._worker = require('child_process').fork(__dirname + "/media/manager.js", { silent: true, execPath: 'node' });
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
            bus.emit('message', { category: 'call', sessionID: sessionID, type: 'error', msg: 'RTC ' + message });
            return;
        }

        bus.emit('message', { category: 'call', sessionID: sessionID, type: 'info', msg: 'RTC ' + message.action });

        // console.log('New message action: ' + message.action);

        switch (message.action) {
            case 'getAnswer':
                console.log('getAnswer', message.params);
                bus.emit('rtpInPort', { sessionID: sessionID, rtpIn: message.params });
                // console.log('getAnswer: ', message.params.answer);
                break;
            case 'dataChannel':
                // console.log('dataChannel');
                // console.log('dataChannel: ', message.params.data);
                break;
            case 'close':
                bus.emit('RtpClose', { sessionID: sessionID });
                break;
            case 'stream_on':
                bus.emit('stream_on', { sessionID: sessionID });
                break;
        }
    });

    session.timeOutID = setTimeout(function() {
        clearTimeout(session.timeOutID);
        bus.emit('message', { category: 'call', sessionID: sessionID, type: 'error', msg: 'RTC process timeout' });
        worker.send({action: 'close'});
        session.close();
    }, 1800000); //30 min

    session.close = function() {
        if (session.rtpActive)
            worker.send({ action: 'close' });

        setTimeout(function() {
            if (sip.dialogs[sessionID]) //just to be safe
                bus.emit('RtpClose', { sessionID: sessionID });
        }, 3000);

        clearTimeout(session.timeOutID);
    };

    worker.send({ action: 'createRtc', params: { offer: offer } });
};

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
    bus.emit('message', { category: 'call', sessionID: sessionID, type: 'info', msg: 'Start RTC' });
    bus.emit('RtcStart', { sessionID: sessionID });

});

module.exports = init;