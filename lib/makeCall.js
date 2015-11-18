var makeCall = function (cntx) {
    /*
     * context
     {
     Events
     sipUA

     clientUri
     response
     }
     */
    var e = cntx.Events,
            ua = cntx.sipUA,
            uri = cntx.clientUri,
            dialogs = cntx.dialogs,
            sipAccountID = cntx.sipAccountID,
            sessionID = cntx.sessionID;
    this.sessionID = sessionID;

    var callActive;
    var sdp = require('./sdp'),
            findPort = require('./findPort.js'),
            rtpWorker = require('./rtpWorker');

    var onAnswered,
            rtp,
            dtmf_payload_type = 101, //def
            dtmf_mode,
            ringingTimeout = cntx.config.get("ringingTimeout") || 60, //sec
            stunServer = cntx.config.get("stunServer"),
            ringingTimeoutID;

    if (stunServer) {
        stunServer = stunServer.split(':');
        stunServer = {host: stunServer[0], port: stunServer[1] || 3478}
    }

    var rtpContent = function (data_obj) {
        if (!data_obj.port)
            data_obj = {port: data_obj};
        var data =
                'v=0\r\n' +
                'o=- 13374 13374 IN IP4 ' + (data_obj.host || ua.hostIp) + '\r\n' +
                's=-\r\n' +
                'c=IN IP4 ' + (data_obj.host || ua.hostIp) + '\r\n' +
                't=0 0\r\n' +
                'm=audio ' + data_obj.port + ' RTP/AVP 0 101\r\n' +
                //'m=audio ' + data_port + ' RTP/AVP 0 8 101\r\n' +
                'a=rtpmap:0 PCMU/8000\r\n' +
                //'a=rtpmap:8 PCMA/8000\r\n' +
                'a=rtpmap:101 telephone-event/8000\r\n' +
                'a=fmtp:101 0-15\r\n' +
                'a=ptime:30\r\n' +
                'a=sendrecv\r\n';
        return data;
    };

    // Making the call
    function call(rs, data_port) {
        e.emit('message', {category: 'debug', sessionID: sessionID, msg: 'Start dialog with call-id "' + rs.headers['call-id'] + '"'});
        //e.emit('message',{type:'info', msg: 'Set RTP_IN port: ' + data_port);

        // yes we can get multiple 2xx response with different tags
        if (!rs.content)
            return;
        var sdp_discr = sdp.parse(rs.content).m[0];
        if (sdp_discr && sdp_discr['a'])
            for (var n in sdp_discr.a)
            {
                var match = /rtpmap:(\d+) telephone-event/i.exec(sdp_discr.a[n]);
                if (match)
                    dtmf_payload_type = match[1];
            }
//       if (dtmf_payload_type !== undefined)
//           e.emit('message',{type:'info', msg: "Detected DTMF Payload Type " + dtmf_payload_type);

        if (!cntx.response)//only for outgoing call
        {//sending ACK
            var rq = {
                method: 'ACK',
                uri: rs.headers.contact[0].uri,
                headers: {
                    to: rs.headers.to,
                    from: rs.headers.from,
                    'call-id': rs.headers['call-id'],
                    cseq: {method: 'ACK', seq: rs.headers.cseq.seq},
                    via: [],
                    //via: [rs.headers.via[0]],
                    'max-forwards': 71
                }
            };
            ua.setHeaders(rq, sipAccountID);
            //ua.send(rq);
            ua.sUA[sipAccountID].send(rq);
        }
        var rtp_ip = (sdp.parse(rs.content).c && sdp.parse(rs.content).c.address) || (sdp.parse(rs.content).m && sdp.parse(rs.content).m[0] && sdp.parse(rs.content).m[0].c && sdp.parse(rs.content).m[0].c.address);
        var rtp_port = sdp_discr.port;
        e.emit('message', {category: 'call', sessionID: sessionID, type: 'debug', msg: "Parsing SDP: RTP_OUT " + rtp_ip + ":" + rtp_port});
        if (dtmf_payload_type !== undefined)
            e.emit('message', {category: 'call', sessionID: sessionID, type: 'debug', msg: "Parsing SDP: DTMF Payload Type " + dtmf_payload_type});

        var info = {
            from: ua.parseUri(rs.headers.from.uri).user,
            to: ua.parseUri(rs.headers.to.uri).user,
            out: {
                ip: rtp_ip,
                port: rtp_port},
            in: {
                ip: ua.hostIp,
                port: data_port,
                dtmf_payload_type: dtmf_payload_type},
            sessionID: sessionID
        };

        rtp = new rtpWorker(e, info, dialogs);
        // registring our 'dialog' which is just function to process in-dialog requests
        // refer from name
        var m = rs.headers.from.name;
        if (m)
            m = m.match(/referred-by\<(.*)\>/);
        if (m)
            info.refer = m[1];
        //reref from sip
        if (rs.headers['referred-by'])
            info.refer = ua.parseUri(rs.headers['referred-by'].replace(/^\<(.*)\>/, '$1')).user;
        info.type = cntx.response ? 'incoming' : 'outgoing';
        info.status = 'answered';
        info.script = dialogs[sessionID].meta.script;
        info.pin = dialogs[sessionID].meta.pin;
        info.times = dialogs[sessionID].meta.times;
        info.times.answered = new Date().getTime();
        // для входящего звонка в объекте dialogs в заголовке переставляем значения полей from и to
        dialogs[sessionID].dialogID = ua.getDialogID(rs);
        dialogs[sessionID].sipContext = {
            uri: rs.headers.contact[0].uri,
            headers: {
                from: rs.headers.to,
                to: rs.headers.from,
                'call-id': rs.headers['call-id']
            }
        };
        // для корректного завершения звонка подставляем в поле route, если оно есть, значение поля record-route
        if (rs.headers['record-route'])
                dialogs[sessionID].sipContext.headers['route'] = rs.headers['record-route'];

        dialogs[sessionID].meta = info;
        // если звонок исходящий в объекте dialogs в заголовке значения полей from и to переставляем обратно
        if (info.type === 'outgoing')
        {
            dialogs[sessionID].sipContext.headers.from = rs.headers.from;
            dialogs[sessionID].sipContext.headers.to = rs.headers.to;
        }

        //console.log(dialogs);
        e.emit('answered', {sessionID: sessionID, uri: dialogs[sessionID].sipContext.headers.to.uri});
    }

    function make_call(data_port, sipAccountID) {
        var content;
        if (ua.sUA[sipAccountID].publicIP && stunServer) {
//RTP Stun
            var stun = require('vs-stun');
            var socket = require('dgram').createSocket('udp4');
            //TODO Move to rtp.js
            socket.on('listening', function ( ) {
                e.emit('message', {category: 'call', sessionID: sessionID, type: 'debug', msg: 'STUN request to STUN server ' + stunServer.host + ':' + stunServer.port});
                stun.resolve(socket, stunServer, function (err, value) {
                    socket.close();
                    if (value && value.public) {
                        e.emit('message', {category: 'call', sessionID: sessionID, type: 'debug', msg: 'Resolved RTP external IP:port (' + value.public.host + ':' + value.public.port + ')'});
                        content = rtpContent(value.public);
                        toDo();
                    }
                    else
                    {
                        e.emit('message', {category: 'call', sessionID: sessionID, type: 'error', msg: 'STUN request to STUN server ' + stunServer.host + ':' + stunServer.port + ' has timed out. ' + value.type});
                        //???? maybe re-INVITE
                        content = rtpContent({host: ua.sUA[sipAccountID].publicIP, port: data_port});
                        toDo();
                    }
                }, {count: 1, timeout: 100});
            });

            socket.bind(data_port);
        }
        else
        {
            content = rtpContent(data_port);
            toDo();
        }
        function toDo() {
            if (cntx.response) {
                // e.emit('message', {category: 'call', sessionID:sessionID, type: 'info', msg: 'URI [' + uri + '] is is called'});
                /*
                 cntx.response.headers.to.params.tag = e.newTag();
                 var rs = ua.makeResponse(cntx.response, 180, 'Ringing');
                 ua.setHeaders(rs);
                 ua.send(rs);
                 */
                var inviteAckCompleted = false,
                        inviteAckTimeout = 10;//sec

                var waitAck = function (data) {
                    if (data.sessionID == sessionID) {
                        inviteAckCompleted = true;
                        call(cntx.response, data_port);
                        e.removeListener('inviteACK', waitAck)
                    }
                    ;
                };
                e.on('inviteACK', waitAck);


                setTimeout(function () {
                    if (!inviteAckCompleted) {
                        e.removeListener('inviteACK', waitAck);
                        e.emit('callCancelled', {msg: "Invite ACK timeout", sessionID: sessionID, uri: cntx.response.headers.to.uri});
                    }
                }, inviteAckTimeout * 1000); //wait ACK timeOut
                if (dialogs[sessionID]) {
                    var rs = ua.makeResponse(cntx.response, 200, 'OK');
                    rs.headers['content-type'] = 'application/sdp';
                    rs.content = content;
                    ua.setHeaders(rs, sipAccountID);
                    //ua.send(rs);
                    ua.sUA[sipAccountID].send(rs);
                }
            }
            else
            {
                var rq = {
                    method: 'INVITE',
                    uri: uri,
                    headers: {
                        to: {uri: uri},
                        from: {name: ua.from[sipAccountID].name, uri: ua.from[sipAccountID].uri, params: {tag: e.newTag()}},
                        'call-id': e.newCallId(ua),
                        cseq: {method: 'INVITE', seq: 1},
                        'content-type': 'application/sdp',
                        contact: [ua.contact[sipAccountID]]
                    },
                    content: content
                };
                e.emit('message', {category: 'call', sessionID: sessionID, type: 'info', msg: 'Call to [' + uri + ']'});
                var data = {
                    sessionID: sessionID,
                    meta: {
                        type: 'outgoing',
                        status: 'invite',
                        from: ua.parseUri(rq.headers.from.uri).user,
                        to: ua.parseUri(rq.headers.to.uri).user,
                        in: {
                            ip: ua.hostIp,
                            port: data_port
                        }
                    }};
                e.emit('invite', data);
                //console.log('invite', data.sessionID);
                if (!dialogs[data.sessionID])
                    dialogs[data.sessionID] = {meta: data.meta};
                var cancel = function (msg) {
                    rq.method = 'CANCEL';
                    rq.headers.cseq.method = rq.method;
                    e.emit('message', {category: 'call', sessionID: sessionID, type: 'debug', msg: 'Service send CANCEL invite'});
                    ua.sUA[sipAccountID].send(rq, function (rs) {
                        if (rs.status !== 200)
                            e.emit('message', {category: 'call', sessionID: sessionID, type: 'warn', msg: 'Cancel INVITE failed with status ' + rs.status + (rs.reason ? '. Reason: "' + rs.reason + '"' : '')});
                        e.emit('callCancelled', {sessionID: sessionID, uri: uri, msg: msg});
                    });
                };
                dialogs[data.sessionID].cancel = cancel;
                ringingTimeoutID = setTimeout(
                        function () {
                            cancel('Service cancel INVITE. Reason: ringing timeout [' + ringingTimeout + ' sec]');
                        },
                        ringingTimeout * 1000);
                var onceFlag = true;
                ua.sendRq(rq,
                        function (rs) {
                            if (onceFlag)
                            {
                                onceFlag = false;
                                if (!ringingTimeoutID)
                                    return;
                                else
                                    clearTimeout(ringingTimeoutID);

                                //console.log(rs);
                                if (rs.status === 200)
                                {
                                    e.emit('message', {category: 'call', sessionID: sessionID, type: 'info', msg: 'URI [' + uri + '] is answered'});
                                    call(rs, data_port);
                                }
                                else
                                if (rs.status !== 487)// !CANCEL
                                {
                                    // e.emit('message', {type: 'info', msg: 'INVITE failed with status ' + rs.status + '. Reason: "' + rs.reason + '"'});
                                    e.emit('callFailed', {sessionID: sessionID, uri: uri, type: 'info', msg: 'INVITE failed with status ' + rs.status + '. Reason: "' + rs.reason + '"'});
                                }
                            }
                            ;
                        }, sessionID, sipAccountID);
            }
//e.emit('start_call', call_id);
        }
    }
    ;
    function getBusyPorts() {
        var ports = [];
        if (ua) {
            if (ua.port)
                ports = ua.port;
            if (dialogs) {
                for (var i in dialogs)
                    if (dialogs[i].meta.in)
                        ports.push(dialogs[i].meta.in.port);
            }
        }
        return ports;
    }

    var stop = function (sipAccountID) {
        if (!dialogs[sessionID] || !dialogs[sessionID].sipContext)
        {
            e.emit('message', {category: 'call', sessionID: sessionID, type: 'error', msg: "Dialog not found"});
            //e.emit('callEnded', {sessionID: sessionID});
            return;
        }
        ;
        var rq = dialogs[sessionID].sipContext;
        rq.method = 'BYE';
        rq.headers.cseq = {
            method: 'BYE',
            seq: Math.floor(Math.random() * 1e5)
        };
        ua.sendRq(rq, function () {
            e.emit('callEnded', {sessionID: sessionID, uri: rq.headers.to.uri});
        }, sessionID, sipAccountID);
    };

    this.stop = stop;
    cntx.dialogs[sessionID].bye = stop;

    this.refer = function (sipAccountID, target) {
        if (!dialogs[sessionID] || !dialogs[sessionID].sipContext)
        {
            e.emit('message', {category: 'call', sessionID: sessionID, type: 'error', msg: "Dialog not found"});
            //e.emit('callEnded', {sessionID: sessionID});
            return;
        }

        var rq = dialogs[sessionID].sipContext;

        //rq.headers.from.params.tag = e.newTag();
        //delete rq.headers.to.params.tag;

        rq.method = 'REFER';
        rq.headers.cseq = {
            method: 'REFER',
            seq: Math.floor(Math.random() * 1e5)
        };
        rq.headers['Refer-To'] = '<sip:' + target + '@' + ua.parseUri(rq.headers.from.uri).host + '>';//target;
        rq.headers['Referred-By'] = '<' + rq.headers.to.uri + '>';
        ua.sendRq(rq, function (rs) {
            if (rs.status != 202) {
                e.emit('message', {category: 'call', sessionID: sessionID, type: 'error', msg: "Transfer failed"});
                stop(sipAccountID);
            }
            else {
                e.emit('callRefer', {sessionID: sessionID, target: target});
                e.emit('message', {category: 'call', sessionID: sessionID, type: 'debug', msg: "Transfer accepted to '" + target + "'"});
            }
        }, sessionID, sipAccountID);
    };

    // передача сообщения методом SIP MESSAGE из сценария
    this.sendMESSAGE = function (sipAccountID, text, cb_func) {
        if (!dialogs[sessionID] || !dialogs[sessionID].sipContext)
        {
            e.emit('message', {category: 'call', sessionID: sessionID, type: 'error', msg: "Dialog not found"});
            //e.emit('callEnded', {sessionID: sessionID});
            return;
        }

        var to_uri = dialogs[sessionID].sipContext.headers.to.uri;
        var from_uri = dialogs[sessionID].sipContext.headers.from.uri;

        // вызывается функция отправки сообщения
        e.emit('msgSend', {msg: text, to: {uri: to_uri}, sessionID: sessionID, serviceContactID: sipAccountID, cb_func: cb_func});
    };

    this.start = function (sipAccountID) {
        new findPort().getPort(function (port) {
            e.emit('message', {category: 'call', sessionID: sessionID, type: 'debug', msg: "Set RTP_IN port to " + port});
            callActive = true;
            make_call(port, sipAccountID);
        }, getBusyPorts());
    };
    var sFn = function (data) {
        if (sessionID === data.sessionID)
        {
            e.removeListener('RtpStart', sFn);
            if (onAnswered)
                onAnswered(data);
        }
    };

    e.on('RtpStart', sFn);

    this.onAnswered = function (fn) {
        onAnswered = fn;
    };

    // dtmf
    var onDtmf = function (data) {
        console.log('onDtmf', data);
    };

    var dtmfEvent = function (data) {
        if (sessionID === data.sessionID)
            if (onDtmf)
                onDtmf(data);
    };
    e.on('dtmf_seq', dtmfEvent);


    this.setOnDtmf = function (fn) {
        onDtmf = fn;
    };

    // stt
    var onStt = function (data) {
        console.log('onStt', data);
    };

    var sttEvent = function (data) {
        if (sessionID === data.sessionID)
            if (onStt)
                onStt(data);
    };

    e.on('stt_seq', sttEvent);

    this.setOnStt = function (fn) {
        onStt = fn;
    };

    var eFn = function (data) {
        if (sessionID === data.sessionID)
        {
            if (rtp)
                rtp.close();
            callActive = false;
            e.removeListener('callEnded', eFn);
            e.removeListener('dtmf_seq', dtmfEvent);
            e.removeListener('stt_seq', sttEvent);
        }
    };
    e.on('callEnded', eFn);
    //TODO setTimeout for eFn

    this.getRTP = function () {
        return rtp;
    };
    this.isActive = function () {
        return callActive;
    };
};
module.exports = makeCall;