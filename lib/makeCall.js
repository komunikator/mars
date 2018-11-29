var bus = require('./system/bus'),
    config = bus.config,
    sip = require('sip'), 
    sdp = require('sip/sdp'),
    audioCodec = config.get("audioCodec");

var rtpContent = function (data_obj) {
    if (!data_obj.port)
        data_obj = { port: data_obj };
    var data =
        'v=0\r\n' +
        'o=- 13374 13374 IN IP4 ' + (data_obj.host || sip.hostIp) + '\r\n' +
        's=-\r\n' +
        'c=IN IP4 ' + (data_obj.host || sip.hostIp) + '\r\n' +
        't=0 0\r\n' +
        'm=audio ' + data_obj.port + ' RTP/AVP ' + (audioCodec === 'PCMA' ? '8' : '0') + ' 101\r\n' +
        'a=rtpmap:' + (audioCodec === 'PCMA' ? '8 PCMA/8000' : '0 PCMU/8000') + '\r\n' +
        'a=rtpmap:101 telephone-event/8000\r\n' +
        'a=fmtp:101 0-15\r\n' +
        //'a=ptime:30\r\n' + //a=ptime:<packet time>
        'a=sendrecv\r\n';
    return data;
};

// Making the call
function call(sessionID, rs) {
    var session = sip.dialogs[sessionID],
        sipAccountID = session.sipAccountID,
        dtmf_payload_type = 101; //def


    bus.emit('message', { category: 'call', type: 'debug', sessionID: sessionID, msg: 'Start dialog with call-id "' + rs.headers['call-id'] + '"' });
    session.startTime = Date.now();
    if (session.webRtc) {
        var getAnswer = JSON.parse(rs.content);
        if (getAnswer.type == "answer") {
            session._worker.send({ action: 'answer', data: rs.content })
        }
    }

    //bus.emit('message',{type:'info', msg: 'Set RTP_IN port: ' + data_port);

    // yes we can get multiple 2xx response with different tags
    if (!rs.content)
        return;
    var sdp_discr = sdp.parse(rs.content).m[0];
    if (sdp_discr && sdp_discr['a'])
        for (var n in sdp_discr.a) {
            var match = /rtpmap:(\d+) telephone-event/i.exec(sdp_discr.a[n]);
            if (match)
                dtmf_payload_type = match[1];
        }
    //       if (dtmf_payload_type !== undefined)
    //           bus.emit('message',{type:'info', msg: "Detected DTMF Payload Type " + dtmf_payload_type);

    if (!session.response) //only for outgoing call
    { //sending ACK
        var rq = {
            method: 'ACK',
            uri: rs.headers.contact[0].uri,
            headers: {
                to: rs.headers.to,
                from: rs.headers.from,
                'call-id': rs.headers['call-id'],
                cseq: { method: 'ACK', seq: rs.headers.cseq.seq },
                via: [],
                //via: [rs.headers.via[0]],
                'max-forwards': 71
            }
        };

        if (rs.headers['record-route']) {
            rq.headers['route'] = rs.headers['record-route'].reverse();
            //rq.uri = rs.headers.to.uri;//???
        }
        sip.setHeaders(rq, sipAccountID);
        //sip.send(rq);
        sip.connections[sipAccountID].sUA.send(rq);
    }
    var rtp_ip = (sdp.parse(rs.content).c && sdp.parse(rs.content).c.address) || (sdp.parse(rs.content).m && sdp.parse(rs.content).m[0] && sdp.parse(rs.content).m[0].c && sdp.parse(rs.content).m[0].c.address);
    var rtp_port = '';
    if (sdp_discr && sdp_discr.port) {
        rtp_port = sdp_discr.port;
    }

    bus.emit('message', { category: 'call', sessionID: sessionID, type: 'debug', msg: "Parsing SDP: RTP_OUT " + rtp_ip + ":" + rtp_port });

    if (dtmf_payload_type !== undefined)
        bus.emit('message', { category: 'call', sessionID: sessionID, type: 'debug', msg: "Parsing SDP: DTMF Payload Type " + dtmf_payload_type });

    var info = {
        from: sip.parseUri(rs.headers.from.uri).user,
        to: sip.parseUri(rs.headers.to.uri).user,
        out: {
            ip: rtp_ip,
            port: rtp_port
        },
        in: { dtmf_payload_type: dtmf_payload_type },
        sessionID: sessionID,
        sdp: rs.content
    };

    //rtp = new rtpWorker(e, info, sip.dialogs);

    if (sip.dialogs[sessionID].webRtc) {
        bus.emit('rtcWorker', info);
    } else {
        bus.emit('rtpWorker', info);
    }

    // registring our 'dialog' which is just function to process in-dialog requests
    // refer from name
    var m = rs.headers.from.name;
    if (m)
        m = m.match(/referred-by\<(.*)\>/);
    if (m)
        info.refer = m[1];
    //reref from sip
    if (rs.headers['referred-by'])
        info.refer = sip.parseUri(rs.headers['referred-by'].replace(/^\<(.*)\>/, '$1')).user;
    info.type = session.response ? 'incoming' : 'outgoing';
    info.status = 'answered';
    info.script = sip.dialogs[sessionID].meta.script;
    info.pin = sip.dialogs[sessionID].meta.pin;
    info.times = sip.dialogs[sessionID].meta.times;
    info.times.answered = new Date().getTime();
    // для входящего звонка в объекте sip.dialogs в заголовке переставляем значения полей from и to
    sip.dialogs[sessionID].dialogID = sip.getDialogID(rs);
    var sipContext = sip.dialogs[sessionID].sipContext = {
        uri: rs.headers.contact[0].uri,
        headers: {
            from: rs.headers.to,
            to: rs.headers.from,
            'call-id': rs.headers['call-id']
        }
    };
    // для корректного завершения звонка подставляем в поле route, если оно есть, значение поля record-route
    if (rs.headers['record-route']) {
        sipContext.headers['route'] = rs.headers['record-route'];
        //sipContext.uri = rs.headers.to.uri;//???
    }
    sip.dialogs[sessionID].meta = info;
    // если звонок исходящий в объекте sip.dialogs в заголовке значения полей from и to переставляем обратно
    if (info.type === 'outgoing') {
        sipContext.headers.from = rs.headers.from;
        sipContext.headers.to = rs.headers.to;
    }

    //console.log(sip.dialogs);
    bus.emit('answered', { sessionID: sessionID, uri: sipContext.headers.to.uri });
}

function make_call(data) {
    var sessionID = data['sessionID'],
        session = sip.dialogs[sessionID],
        sipAccountID = session.sipAccountID,
        uri = session.uri,
        content;

    if (sip.dialogs[sessionID].webRtc) {

        content = data['rtcIn'];
    } else {
        content = rtpContent(data);
    }
    if (session.response) { //incoming call

        // bus.emit('message', {category: 'call', sessionID:sessionID, type: 'info', msg: 'URI [' + uri + '] is is called'});
        /*
         session.response.headers.to.params.tag = sip.newTag();
         var rs = sip.makeResponse(session.response, 180, 'Ringing');
         sip.setHeaders(rs);
         sip.send(rs);
         */

        setTimeout(function () {
            if (!session.inviteAckCompleted) {
                bus.emit('callCancelled', { msg: "Invite ACK timeout", sessionID: sessionID, uri: session.response.headers.to.uri });
            }
        }, 10000); //wait ACK timeOut

        /*
         session.meta.in = {
         ip: sip.hostIp,
         port: rtpIn.port
         };
         */

        if (sip.dialogs[sessionID]) {
            var rs = sip.makeResponse(session.response, 200, 'OK');
            rs.headers['content-type'] = 'application/sdp';
            rs.content = content;
            sip.setHeaders(rs, sipAccountID);
            //sip.send(rs);
            sip.connections[sipAccountID].sUA.send(rs);
        }
    } else {
        bus.emit('message', { category: 'call', sessionID: sessionID, type: 'info', msg: 'Call to [' + uri + ']' });
        bus.emit('invite', { sessionID: sessionID, uri: uri, content: content });
    }
}

function init() {
    var sessionID = this.sessionID;

    if (sip.dialogs && sessionID && sip.dialogs[sessionID] && sip.dialogs[sessionID].webRtc) {
        bus.emit('rtcWorkerInit', this);
    } else {
        bus.emit('rtpWorkerInit', this);
    }
}

bus.on('rtpInPort', function (data) {
    var sessionID = data.sessionID;
    if (data && data.port) {
        bus.emit('message', { category: 'call', sessionID: sessionID, type: 'debug', msg: "Set RTP_IN port to " + data.port });
    }
    make_call(data);
})

bus.on('rtcInPort', function (data) {
    var sessionID = data.sessionID;
    if (data && data.port) {
        bus.emit('message', { category: 'call', sessionID: sessionID, type: 'debug', msg: "Set RTC_IN port to " + data.port });
    }
    make_call(data);
})

bus.on('inviteACK', function (data) {
    if (data.sessionID &&
        sip.dialogs[data.sessionID] &&
        sip.dialogs[data.sessionID].meta.status === 'start') {
        var session = sip.dialogs[data.sessionID];
        session.inviteAckCompleted = true;
        call(data.sessionID, session.response);
    }
    //console.log('inviteACK', sip.dialogs[data.sessionID].meta);
});


bus.on('inviteAccepted', function (data) {
    if (data.sessionID && sip.dialogs[data.sessionID]) {
        if (sip.dialogs[data.sessionID].meta.status === 'ringing') {
            var session = sip.dialogs[data.sessionID];
            session.inviteAccepted = true;
            call(data.sessionID, data.rs);    
        } else if (sip.dialogs[data.sessionID].meta.status === 'start'){
            bus.emit('callEnded',{sessionID: data.sessionID})
        }   
    }
    //console.log('inviteACK', sip.dialogs[data.sessionID].meta);
});

bus.on('callEnded', function (data) {
    if (data.sessionID &&
        sip.dialogs &&
        sip.dialogs[data.sessionID] &&
        sip.dialogs[data.sessionID].close)
        sip.dialogs[data.sessionID].close(data);
    else
        bus.emit('RtpClose', data);
});

bus.on('dtmf_seq', function (data) {
    if (data.sessionID &&
        sip.dialogs &&
        sip.dialogs[data.sessionID] &&
        sip.dialogs[data.sessionID].onDtmf)
        sip.dialogs[data.sessionID].onDtmf(data);
});

bus.on('stt_seq', function (data) {
    if (data.sessionID &&
        sip.dialogs &&
        sip.dialogs[data.sessionID] &&
        sip.dialogs[data.sessionID].sttEvent)
        sip.dialogs[data.sessionID].sttEvent(data);
});

bus.on('callRefer', function (data) {
    if (data.sessionID &&
        sip.dialogs &&
        sip.dialogs[data.sessionID] &&
        sip.dialogs[data.sessionID].onRefer)
        sip.dialogs[data.sessionID].onRefer(data);
});

bus.on('runScript', function (cntx) {
    init.apply(cntx);
});

module.exports = init;
