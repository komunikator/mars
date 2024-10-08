/**
 * @fileoverview SIP User Agent
 */

function init() {
    var bus = require('./system/bus'),
        config = bus.config;

    var logCategory = 'ua',
        sip = require('./sip/sip'),
        digest = require('./sip/digest'),
        sUA = sip.sUA = [], /* sipUA array */
        dialogs = sip.dialogs = {},
        expiresIntvl = [];

    process.on('SIGINT', exitHandler);
    process.on('exit', exitHandler);

    function exitHandler(code) {
        console.log('exitHandler code', code);
        if (code == 0) return;
        bus.emit('restartApp');
    }

    bus.on('restartApp', function () {
        function unRegFn() {
            setTimeout(function () { process.exit(0) }, 500) //some async fn
        }
        let arraySipAccount = [];
        for (var key in sip.connections) {
            if (sip.connections[key].status === "registered") {
                arraySipAccount.push(key);
            }
        }
        const promises = arraySipAccount.map((sipAccount) => {
            return new Promise(function (resolve, reject) {
                register(resolve, sipAccount, true);
            })
        })
        Promise.all(promises).then(unRegFn);
    });

    sip.connections = sip.connections || {};

    var sipAccounts = config.get("sipAccounts");
    for (var key in sipAccounts) {
        if ((sipAccounts[key].type) && (sipAccounts[key].type != 'sip')) continue;
        sip.connections[key] = {};
        sip.connections[key].auth = sipAccounts[key]
    }
    sip.name = config.get("serviceName");
    sip.tname = config.get("toolName");

    sip.logger = bus.getLogger('sip');

    sip.newUUID = function () {
        var UUID = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0,
                v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
        return UUID;
    };

    sip.createRandomToken = function (size, base) {
        var i, r,
            token = '';
        base = base || 32;
        for (i = 0; i < size; i++) {
            r = Math.random() * base | 0;
            token += r.toString(base);
        }
        return token;
    };
    sip.newTag = function () {
        return sip.createRandomToken(10, 15);
    };
    sip.newCallId = function () {
        return sip.createRandomToken(22) + '@' + sip.hostIp;
    };
    sip.newSessionID = function () {
        return sip.createRandomToken(10, 10);
    };
    sip.getPin = function (val) {
        return require("crypto").createHash("md5").update(val).digest("hex").replace(/\D/g, '').substr(0, 4)
    };
    sip.setHeaders = function (rq, sipAccountID) {
        var allowMethods = 'INVITE, ACK, BYE, INFO, MESSAGE, OPTIONS, REFER';
        // var allowMethods = 'INVITE, ACK, BYE, INFO';
        if (sip.connections[sipAccountID]) {
            if (!rq.headers) rq.headers = {};

            if (rq.status) { //is response
                rq.headers.contact = [sip.connections[sipAccountID].contact];
                //' INVITE, ACK, CANCEL, OPTIONS, BYE, REGISTER, SUBSCRIBE, NOTIFY, REFER, INFO, MESSAGE';
                rq.headers['Allow'] = allowMethods;
                rq.headers['Server'] = sip.name;
            } else { //is request
                rq.headers['User-Agent'] = sip.name;
                rq.headers['Allow'] = allowMethods;
                // rq.headers['Allow'] = 'INVITE, ACK, BYE, INFO';
            }
        };

        return rq;
    };

    sip.sendRq = function (rq, cb, sessionID, sipAccountID) {
        if (rq.headers.via) {
            rq.headers.via.shift();
        }
        bus.emit('message', { type: 'debug', category: logCategory, msg: 'Send SIP method "' + rq.method + '"' });
        if (sipAccountID == undefined) {
            sipAccountID = sip.dialogs[sessionID].sipAccountID;
        }
        sip.setHeaders(rq, sipAccountID);
        sip.connections[sipAccountID].sUA.send(rq, function (rs) {
            var host = rs.headers.via[0].host;
            var port = rs.headers.via[0].port;
            if (rs.headers.via[0].params &&
                rs.headers.via[0].params.received &&
                rs.headers.via[0].params.received !== sip.hostIp &&
                host !== rs.headers.via[0].params.received ||
                rs.headers.via[0].params.rport &&
                rs.headers.via[0].params.rport !== port
            ) {
                host = rs.headers.via[0].params.received;
                if (!host || host == 'undefined') host = sip.hostIp;

                if (rs.headers.via[0].params.rport)
                    port = rs.headers.via[0].params.rport;
                try {
                    var realUri = 'sip:' + (sip.parseUri(sip.connections[sipAccountID].from.uri) && sip.parseUri(sip.connections[sipAccountID].from.uri).user) + '@' + host + ':' + port;
                    if (sip.connections[sipAccountID].contact.uri !== realUri) {
                        bus.emit('message', { type: 'info', msg: 'SIP UA ' + sipAccountID + ' [' + sip.connections[sipAccountID].from.uri + '] detected external ip: "' + host + ':' + port + '"' });
                        sip.connections[sipAccountID].contact.uri = realUri;
                    };
                    if (host !== sip.hostIp) {
                        sip.connections[sipAccountID].sUA.publicIP = host;
                    }
                } catch (err) {
                    bus.emit('message', { type: 'error', category: logCategory, msg: err });
                }
                if (rq.headers.contact && rq.headers.contact[0].uri) {
                    rq.headers.contact[0].uri = sip.connections[sipAccountID].contact.uri;
                }
            }
            if (rs.status >= 300) {
                if (rs.status === 401 || rs.status === 407) {
                    bus.emit('message', { type: 'debug', category: logCategory, msg: 'SIP method "' + rq.method + '" need authorization' });
                    var context = {};
                    rq.headers['cseq'].seq++;
                    rq.headers.via.shift();
                    digest.signRequest(context, rq, rs, sip.connections[sipAccountID].auth);

                    sip.connections[sipAccountID].sUA.send(rq, function (rs_) {

                        if (rs_.status < 200) {
                            bus.emit('message', { type: 'debug', category: logCategory, msg: 'SIP method "' + rq.method + '" authorization progress status ' + rs_.status });
                            sendRinging(rs_, sessionID);
                        } else {
                            if (rs_.status === 200 || rs_.status === 487) { //487 for CANCEL
                                bus.emit('message', { type: 'debug', category: logCategory, msg: 'SIP method "' + rq.method + '" successfully authorized' });
                                if (cb) {
                                    cb(rs_);
                                    cb = null;
                                }
                            } else {
                                if (cb) {
                                    cb(rs_);
                                    cb = null;
                                }
                                bus.emit('message', { type: 'debug', category: logCategory, msg: 'SIP method "' + rq.method + '" authorization failed with status ' + rs_.status + (rs_.reason ? '. Reason: "' + rs_.reason + '"' : '') });
                            }
                        }
                    });
                } else {
                    if (rs.status !== 487) {
                        bus.emit('message', { type: 'debug', category: logCategory, msg: 'SIP method "' + rq.method + '" failed with status ' + rs.status + (rs.reason ? '. Reason: "' + rs.reason + '"' : '') });
                    }
                    if (cb) {
                        cb(rs);
                        cb = null;
                    }
                }
            } else if (rs.status < 200) {
                bus.emit('message', { type: 'debug', category: logCategory, msg: 'SIP method "' + rq.method + '" progress status ' + rs.status });
                sendRinging(rs, sessionID);
            } else {
                bus.emit('message', { type: 'debug', category: logCategory, msg: 'SIP method "' + rq.method + '" successfully authorized' });
                if (cb) {
                    cb(rs);
                    cb = null;
                }
            }
        });
    };

    function getDialogID(rs) {
        if (!rs) {
            return null;
        }
        return rs.headers['call-id'];
    }
    sip.getDialogID = getDialogID;

    function getSessionID(rs) {
        var dialogID = getDialogID(rs),
            sessionID = null;
        for (var sID in dialogs) {
            if (dialogs[sID].dialogID == dialogID) {
                sessionID = sID;
            }
        }
        return sessionID;
    }

    function sendRinging(rs, sessionID) {
        if ((rs.status === 180 || rs.status === 183) && rs.headers.cseq.method === "INVITE") {
            dialogs[sessionID].meta.status = 'ringing';
            dialogs[sessionID].meta.times.ringing = new Date().getTime();
            // dialogs[sessionID].dialogID = sip.getDialogID(rs);
            dialogs[sessionID].sipContext = {
                uri: rs.headers.contact[0].uri,
                headers: {
                    to: rs.headers.to,
                    from: rs.headers.from,
                    'call-id': rs.headers['call-id']
                }
            };
            bus.emit('ringing', { sessionID: sessionID, uri: rs.headers.to.uri });
        }
    }

    //starting stack
    function onData(rs) {
        if (!sip.parseUri(rs.headers.from.uri)) {
            rs.headers.from.uri = 'sip:' + rs.headers.from.uri + '@' + rs.headers.via[0].host;
        }
        var sipAccountID = this.sipAccountID;
        if (sipAccountID == null) {
            bus.emit('message', { category: 'call', sessionID: sessionID, type: 'error', msg: 'Invalide sipAccountID for ' + rs.headers.to.uri });
            return;
        }
        // Метод MESSAGE выделен в отдельное условие, т.к. при обмене сообщениями не создаётся диалог и сессия
        // Если передано сообщение, здесь его принимаем
        if (rs.method === 'MESSAGE') {
            var name;
            if (rs.headers.from.name) { // если в сообщении есть имя отправившего сообщение,
                name = rs.headers.from.name; // запоминаем это имя
            }
            bus.emit('message', { category: 'call', sessionID: sessionID, type: 'info', msg: 'MESSAGE recieved: ' + '"' + rs.content + '" from ' + rs.headers.from.uri.replace('sip:', '') + (name ? ' (' + name.replace(/"/g, '') + ')' : '') }); // если есть name, удаляем из него двойные кавычки
            // msgSend('Ответ на сообщение "' + rs.content + '"'); // для тестирования
            // отправляем сообщение вне диалога
            // bus.emit('msgSend', {msg: 'Ответ на сообщение "' + rs.content + '"', to: {uri: rs.headers.from.uri}, sipAccountID: sipAccountID}); // для тестирования           

            bus.request('onEvent', { id: `on_call[${sipAccountID}]` }, (err, data) => {
                req = rs;
                req.nameScript = data;
                req.type = "sip_message";
                req.sipAccountID = sipAccountID;
                bus.emit('on_message_add', req);
            });
            // отсылаем сообщение для вывода его в JIN
            bus.emit('msgReceived', { sessionID: sessionID, msg: rs.content, to: { uri: rs.headers.to.uri }, from: { name: name, uri: rs.headers.from.uri }, sipAccountID: sipAccountID });
            var rs_ = sip.makeResponse(rs, 200, 'OK. MESSAGE recieved');
            sip.setHeaders(rs_, sipAccountID);
            sip.connections[sipAccountID].sUA.send(rs_);

        } else {
            var sessionID = getSessionID(rs);

            function callEnd() {
                bus.emit('callEnded', { uri: rs.headers.from.uri, sessionID: sessionID, by: 'Subscriber' });
                var rs_ = sip.makeResponse(rs, 200, 'OK');
                sip.setHeaders(rs_, sipAccountID);
                sip.connections[sipAccountID].sUA.send(rs_);
            }

            if (rs.method == 'CANCEL') {
                if (sip.dialogs[sessionID]) {
                    var rq = sip.dialogs[sessionID].inviteRs;
                    callEnd();
                    var rs_ = sip.makeResponse(rq, 487, 'Call Terminated');
                    sip.setHeaders(rs_, sipAccountID);
                    sip.connections[sipAccountID].sUA.send(rs_);
                }
            }

            if (rs.headers.to.params.tag) { // check if it's an in dialog request
                if (sessionID && dialogs[sessionID]) {
                    switch (rs.method) {
                        case 'ACK':
                            bus.emit('message', { category: 'call', sessionID: sessionID, type: 'debug', msg: 'Invite ACK' });
                            bus.emit('inviteACK', { response: rs, sessionID: sessionID });
                            break;
                        case 'INVITE':
                            if (rs.headers && rs.headers.diversion) {
                                callEnd();
                                break;
                            }
                        //case 'CANCEL':
                        case 'BYE':
                            callEnd();
                            break;
                        case 'NOTIFY':
                            if (rs.headers.event && rs.headers.event.toLowerCase() === 'refer' && rs.headers['subscription-state'] && /^terminated/i.test(rs.headers['subscription-state'])) {
                                rs.content = rs.content || '';
                                var status = rs.content.match(/^SIP\/2\.0 (\d{3})/i);
                                if (status) {
                                    status = status[1];
                                }
                                bus.emit('callRefer', { sessionID: sessionID, status: status });
                            }
                            var rs_ = sip.makeResponse(rs, 200, 'OK');
                            sip.setHeaders(rs_, sipAccountID);
                            sip.connections[sipAccountID].sUA.send(rs_);
                            break;
                        case 'INFO':
                            if (/dtmf-relay$/.test(rs.headers['content-type'])) {
                                var dtmf = rs.content.match(/^Signal=(.?\S+).?/);
                                dtmf[1] = dtmf[1].replace(/\ /g, "");

                                var dtmf_mode = 'INFO';
                                if (dialogs[sessionID].meta.dtmf_mode != dtmf_mode) {
                                    bus.emit('setDtmfMode', { sessionID: sessionID, dtmf_mode: dtmf_mode });
                                }
                                bus.emit('dtmf_key', { sessionID: sessionID, key: dtmf[1] });
                            }
                            break;
                        default:
                            var rs_ = sip.makeResponse(rs, 405, 'Method not allowed');
                            sip.setHeaders(rs_, sipAccountID);
                            sip.connections[sipAccountID].sUA.send(rs_);
                    }
                } else {
                    if (rs.method == 'BYE') {
                        return sip.bye(sessionID);
                    }
                    var rs_ = sip.makeResponse(rs, 481, "Call doesn't exists");
                    sip.setHeaders(rs_, sipAccountID);
                    sip.connections[sipAccountID].sUA.send(rs_);
                }
            } else {
                //console.log(sip.parseUri(rs.headers.to.uri).user, sip.connections[sipAccountID].auth.allow);
                if (rs.method == 'REGISTER') {
                    //dirty hack
                    var rs_ = sip.makeResponse(rs, 200, 'OK');

                    if (!(new RegExp(sip.connections[sipAccountID].auth.allow || '').test(sip.parseUri(rs.headers.to.uri).user)))
                        rs_ = sip.makeResponse(rs, 404, 'Not Found');

                    sip.setHeaders(rs_, sipAccountID);
                    sip.connections[sipAccountID].sUA.send(rs_);
                } else if (rs.method === 'INVITE') {
                    var rs_;

                    if (!(new RegExp(sip.connections[sipAccountID].auth.allow || '').test(sip.parseUri(rs.headers.to.uri).user))) {
                        rs_ = sip.makeResponse(rs, 404, 'Not Found');
                        sip.setHeaders(rs_, sipAccountID);
                        sip.connections[sipAccountID].sUA.send(rs_);
                        return;
                    }

                    rs.headers.to.params.tag = sip.newTag();
                    rs_ = sip.makeResponse(rs, 180, 'Ringing');

                    sip.setHeaders(rs_, sipAccountID);
                    sip.connections[sipAccountID].sUA.send(rs_);
                    bus.request('onEvent', { id: 'on_call[' + sipAccountID + ']' }, function (err, data) {
                        bus.emit('message', { type: 'info', msg: 'Incoming call ' + rs.headers.from.uri });
                        if (data) {
                            var script = data;
                            var sessionID = sip.newSessionID();
                            var parentID = sip.newSessionID();
                            dialogs[sessionID] = {
                                inviteRs: rs,
                                uri: rs.headers.from.uri,
                                dialogID: sip.getDialogID(rs),
                                sipContext: {
                                    uri: rs.headers.contact[0].uri,
                                    headers: {
                                        to: rs.headers.to,
                                        from: rs.headers.from,
                                        'call-id': rs.headers['call-id']
                                    }
                                },
                                meta: {
                                    from: sip.parseUri(rs.headers.from.uri).user,
                                    to: sip.parseUri(rs.headers.to.uri).user,
                                    type: 'incoming',
                                    status: 'start',
                                    sessionID: sessionID,
                                    script: script,
                                    times: { ringing: new Date().getTime() }
                                },
                                parentID: parentID
                            };
                            if (rs.headers['record-route']) dialogs[sessionID].sipContext.headers['record-route'] = rs.headers['record-route'];
                            dialogs[sessionID].meta.pin = sip.getPin(dialogs[sessionID].meta.from);
                            bus.emit('ringing', { sessionID: sessionID, uri: rs.headers.from.uri, parentID: parentID });
                            setTimeout(function () {
                                bus.emit('incomingCall', { response: rs, sessionID: sessionID, script: script, sipAccountID: sipAccountID, parentID: parentID });
                            }, 1000);
                        } else {
                            bus.emit('message', { type: 'warn', msg: 'For incoming call sip:' + sip.parseUri(rs.headers.to.uri).user + '@' + sip.parseUri(rs.headers.to.uri).host + ' script not set' });
                            var rs_ = sip.makeResponse(rs, 480, 'Temporarily Unavailable');
                            sip.setHeaders(rs_, sipAccountID);
                            sip.connections[sipAccountID].sUA.send(rs_);
                        }
                    });
                } else {
                    var rs_;
                    if (rs.method == 'OPTIONS') {
                        rs_ = sip.makeResponse(rs, 200, 'OK');
                    } else {
                        rs_ = sip.makeResponse(rs, 405, 'Method not allowed');
                    }
                    sip.setHeaders(rs_, sipAccountID);
                    sip.connections[sipAccountID].sUA.send(rs_);
                }
            }
        }
    }

    function startSip(sipAccountID) {
        var logger = sip.logger;
        var sipAccounts = config.get("sipAccounts");
        return sip.create({
            port: "port" in sipAccounts[sipAccountID] ? sipAccounts[sipAccountID].port : '0',
            tcp: false,
            hostname: sip.hostIp,
            logger: {
                recv: function (m, i) { logger.debug('RECV from ' + i.protocol + ' ' + i.address + ':' + i.port + '\n' + sip.stringify(m)); },
                send: function (m, i) { logger.debug('SEND to ' + i.protocol + ' ' + i.address + ':' + i.port + '\n' + sip.stringify(m)); },
                error: function (e) { bus.getLogger('error').error(e.stack); }
            }
        }, onData.bind({ sipAccountID: sipAccountID }));
    }

    function register(cb, sipAccountID, unregister) {
        if (!sip.connections[sipAccountID]) sip.connections[sipAccountID] = {};
        if (sip.connections[sipAccountID] && !sip.connections[sipAccountID].auth) {
            return;
        }
        var contact_expires = 60;

        if (sip.connections[sipAccountID].contact && sip.connections[sipAccountID].contact.params && sip.connections[sipAccountID].contact.params.expires) {
            contact_expires = sip.connections[sipAccountID].contact.params.expires;
        }
        var expiresTime = (unregister == undefined ? contact_expires : 0);

        if (!expiresTime) delete sip.connections[sipAccountID].contact['params'];

        try {
            var rq = {
                method: 'REGISTER',
                uri: 'sip:' + sip.connections[sipAccountID].auth.host,
                headers: {
                    to: { name: sip.connections[sipAccountID].from.name, uri: sip.connections[sipAccountID].from.uri },
                    from: { name: sip.connections[sipAccountID].from.name, uri: sip.connections[sipAccountID].from.uri, params: { tag: sip.newTag() } },
                    cseq: { method: 'REGISTER', seq: 1 },
                    'call-id': sip.newCallId(),
                    contact: [sip.connections[sipAccountID].contact],
                    expires: expiresTime
                }
            };
        } catch (err) {
            bus.emit('message', { type: 'error', msg: 'register: ' + err });
        }

        sip.sendRq(rq, function (rs) {
            if (rs.status >= 400) {
                cb(false);
            } else {
                cb((digest.authenticateResponse({}, rs) === false) ? false : true);
            }
        }, null, sipAccountID);
    }

    sip.stopUA = function () {
        sip.stop();
        bus.emit('message', { type: 'info', msg: 'SIP UA stopped' });
    };

    sip.registerInit = function (sipAccountID, unregister, cb) {

        function setRegInterval(sipAccountID) {
            if (sip.connections[sipAccountID].auth.disable)
                return clearInterval(expiresIntvl[sipAccountID]);
            if (!expiresIntvl[sipAccountID]) {
                expiresIntvl[sipAccountID] = setInterval(function () {
                    sip.registerInit(sipAccountID);
                }, (sip.connections[sipAccountID].contact.params.expires * 1000) - 3000);
            }
        };

        function regResult(reg) {
            var statuses = {};
            for (var key in sip.connections) {
                statuses[key] = sip.connections[key].status;
            }
            var lastStatus = JSON.stringify(statuses);

            if (unregister != undefined) {
                if (expiresIntvl[sipAccountID]) {
                    clearInterval(expiresIntvl[sipAccountID]);
                    expiresIntvl[sipAccountID] = null;
                }
                if (reg && sip.connections[sipAccountID].contact) {
                    sip.connections[sipAccountID].status = 'disabled'; //'unregistered';
                }
            } else {
                if (reg && sip.connections[sipAccountID].contact && !sip.connections[sipAccountID].auth.disable)
                    sip.connections[sipAccountID].status = 'registered';
                else
                    sip.connections[sipAccountID].status = 'unregistered';

                setRegInterval(sipAccountID)
            }

            statuses = {};
            for (var key in sip.connections) {
                statuses[key] = sip.connections[key].status;
            }
            //bus.emit('UA_status', sip.status);
            if (lastStatus != JSON.stringify(statuses)) {
                bus.request('getStatusUAList', {}, function (err, data) {
                    // bus.emit("message", data);
                    bus.emit('updateData', { source: 'listSIP', data: data });
                    bus.emit('updateData', { source: 'statusUA', data: data });
                });

            }

            try {
                if (sip.connections[sipAccountID].status === 'disabled') {
                    bus.emit('message', { type: 'debug', msg: 'SIP UA' + sipAccountID + ' [' + sip.connections[sipAccountID].from.uri + '] set state "' + sip.connections[sipAccountID].status + '"' });
                } else {
                    switch (sip.connections[sipAccountID].type) {
                        case 'sip':
                            bus.emit('message', { type: (sip.connections[sipAccountID].status == 'registered' ? 'debug' : 'error'), msg: 'SIP UA' + sipAccountID + ' [' + sip.connections[sipAccountID].from.uri + '] registration status "' + sip.connections[sipAccountID].status + '"' });
                            break;
                        case 'b24':
                            bus.emit('message', { type: (sip.connections[sipAccountID].status == 'registered' ? 'debug' : 'error'), msg: 'SIP UA' + sipAccountID + ' [' + sip.connections[sipAccountID].clientId + '] registration status "' + sip.connections[sipAccountID].status + '"' });
                            break;
                        default:
                            bus.emit('message', { type: (sip.connections[sipAccountID].status == 'registered' ? 'debug' : 'error'), msg: 'SIP UA' + sipAccountID + ' [' + sip.connections[sipAccountID].file + '] registration status "' + sip.connections[sipAccountID].status + '"' });
                            break;
                    }
                }
                if (!unregister) {
                    bus.emit('register', { uri: sip.connections[sipAccountID].from.uri, status: sip.connections[sipAccountID].status });
                }
            } catch (err) {
                bus.emit('message', { type: 'error', msg: 'regResult: ' + err });
            }

            if (cb) {
                cb();
            }
            regResult = function () { };
        }

        register(regResult, sipAccountID, unregister);
    };

    sip.startUA = function () {
        var sipAccounts = config.get("sipAccounts");
        for (var key in sipAccounts) {
            if ((sipAccounts[key].type) && (sipAccounts[key].type != 'sip')) continue;
            sip.connections[key] = {};
            sip.connections[key].auth = sipAccounts[key];
        }
        if (sip.connections && Object.keys(sip.connections).length) {
            for (var key in sip.connections) {
                if (!sip.connections[key].sUA) {
                    sip.connections[key].sUA = startSip(key);
                }
                if (!sip.connections[key].status || sip.connections[key].status == 'disabled') {
                    var host = sip.connections[key].auth.domain || sip.connections[key].auth.host;
                    if (sip.connections[key].auth.port) {
                        host += ":" + sip.connections[key].auth.port;
                    }
                    sip.connections[key].from = { name: sip.name, uri: 'sip:' + sip.connections[key].auth.user + '@' + host };
                    sip.connections[key].contact = { uri: 'sip:' + sip.connections[key].auth.user + '@' + host, params: { expires: sip.connections[key].auth.expires || 300 } };
                    bus.emit('message', { type: 'debug', msg: 'SIP UA' + key + ' [' + sip.connections[key].from.uri + '] started' });
                    if (sip.connections[key].auth.disable) {
                        sip.connections[key].status = 'disabled'
                        continue;
                    }
                    bus.emit('message', { type: 'debug', msg: 'SIP UA' + key + ' [' + sip.connections[key].from.uri + '] start registration' });
                    sip.connections[key].status = 'registration';
                    sip.options('sip:' + sip.connections[key].auth.host, key, function optionsResult(sipAccountID) {
                        sip.registerInit(sipAccountID);
                        optionsResult = function () { };
                    });
                }
            }
        }
        bus.emit('message', { type: 'info', msg: 'sipUA started' });
    };

    function registerAccountEvent() {
        if (isChangeSipAccounts()) {
            var sipAccounts = config.get("sipAccounts");
            // обработка событий при disable 
            if (sipAccounts) {
                for (var key in sipAccounts) {
                    if ((sipAccounts[key].type) && (sipAccounts[key].type != 'sip')) continue;

                    var account = sipAccounts[key];
                    var event = 'on_call[' + key + ']';
                    if (!account.disable) {
                        if (bus.OnEvent[event] === undefined) {
                            bus.OnEvent[event] = null;
                        }
                    } else {
                        if (bus.OnEvent[event] !== undefined) {
                            delete bus.OnEvent[event];
                        }
                    }
                }
            }

            // обработка текущих звонков
            bus.removeListener('lastCallEnded', restartSipConnections);
            if (!Object.keys(dialogs).length) {
                restartSipConnections();
            } else {
                bus.once('lastCallEnded', restartSipConnections);
            }
        }

        // проверяем изменился ли список аккаунтов в конфиге
        function isChangeSipAccounts() {
            try {
                if (!sip.lastAuth) {
                    sip.lastAuth = JSON.stringify(config.get("sipAccounts"));
                    return true;
                }
                sip.lastAuth = JSON.parse(sip.lastAuth);

                var sipAccountsData = JSON.stringify(config.get("sipAccounts")); // Преобразуем в строк что бы получить копию вместо ссылки
                sipAccountsData = JSON.parse(sipAccountsData);

                for (var key in sipAccountsData) {
                    delete sipAccountsData[key]['availableTime'];
                }

                for (var key in sip.lastAuth) {
                    delete sip.lastAuth[key]['availableTime'];
                }

                sipAccountsData = JSON.stringify(sipAccountsData);
                sip.lastAuth = JSON.stringify(sip.lastAuth);

                var isChange = (sipAccountsData !== sip.lastAuth);
                sip.lastAuth = sipAccountsData;

                bus.emit('message', { type: 'info', msg: 'isChangeSipAccounts ' + isChange });

                return isChange;
            } catch (err) {
                bus.emit('message', { type: 'error', msg: 'isChangeSipAccounts: ' + err });
                return true;
            }
        }
    }

    function restartSipConnections() {
        var countContacts = 0;

        if (!Object.keys(sip.connections).length) {
            sip.startUA();
        } else {
            for (var key in sip.connections) {
                if ((sip.connections[key].status === 'registered') && (sip.connections[key].auth)) {
                    countContacts++;

                    sip.registerInit(key, 1, function () {
                        countContacts--;
                        if (!countContacts) {

                            for (var key in sip.connections) {
                                if (sip.connections[key] && sip.connections[key].sUA && sip.connections[key].sUA.destroy) {
                                    sip.connections[key].sUA.destroy();
                                }
                                delete sip.connections[key];
                            };
                            sip.startUA();
                        }
                    });
                }
            }
            if (!countContacts) {
                sip.startUA();
            }
        }

        bus.request('getStatusUAList', {}, function (err, data) {
            bus.emit('updateData', { source: 'listSIP', data: data });
            bus.emit('updateData', { source: 'statusUA', data: data });
            // bus.emit("message", data);
        });
    }

    sip.sendDtmf = function (sessionID, data, cb) {
        if (!sip.dialogs[sessionID] || !sip.dialogs[sessionID].sipContext) {
            bus.emit('message', { category: 'call', sessionID: sessionID, type: 'error', msg: "Dialog not found" });
            return;
        }
        var rq = sip.dialogs[sessionID].sipContext;
        rq.method = 'INFO';
        rq.headers.cseq = {
            method: 'INFO',
            seq: Math.floor(Math.random() * 1e5)
        };

        rq.content = 'Signal=' + data + '\r\n';
        if (data == 'hf') {
            rq.headers['content-type'] = 'application/hook-flash';
        } else {
            rq.headers['content-type'] = 'application/dtmf-relay';
        }

        sip.sendRq(rq, function () {
            delete rq.headers['content-type'];
            delete rq.content;
            if (cb) {
                cb();
            }
        }, sessionID);
    };

    sip.bye = function (sessionID, reason) {
        if (!sip.dialogs[sessionID] || !sip.dialogs[sessionID].sipContext) {
            bus.emit('message', { category: 'call', sessionID: sessionID, type: 'error', msg: "Dialog not found" });
            return;
        }
        var rq = sip.dialogs[sessionID].sipContext;
        rq.method = 'BYE';
        rq.headers.cseq = {
            method: 'BYE',
            seq: Math.floor(Math.random() * 1e5)
        };
        if (reason) {
            rq.reason = reason;
        }
        sip.sendRq(rq, function () {
            if (reason) {
                bus.emit('callFailed', { sessionID: sessionID, uri: rq.headers.to.uri, msg: reason });
            } else {
                bus.emit('callEnded', { sessionID: sessionID, uri: rq.headers.to.uri, by: 'Service' });
            }
        }, sessionID);
    };

    sip.cancel = function (sessionID, reason) {
        if (!sip.dialogs[sessionID] || !sip.dialogs[sessionID].inviteRq) {
            bus.emit('message', { category: 'call', sessionID: sessionID, type: 'error', msg: "Dialog not found" });
            return;
        }
        var rq = sip.dialogs[sessionID].inviteRq,
            sipAccountID = sip.dialogs[sessionID].sipAccountID;
        rq.method = 'CANCEL';
        rq.headers.cseq.method = rq.method;
        bus.emit('message', { category: 'call', sessionID: sessionID, type: 'debug', msg: 'Service send CANCEL invite' });
        sip.connections[sipAccountID].sUA.send(rq, function (rs) {
            if (rs.status !== 200) {
                bus.emit('message', { category: 'call', sessionID: sessionID, type: 'warn', msg: 'Cancel INVITE failed with status ' + rs.status + (rs.reason ? '. Reason: "' + rs.reason + '"' : '') });
            }
            bus.emit('callCancelled', { sessionID: sessionID, uri: rq.uri, msg: reason });
        });
    };

    sip.refer = function (sessionID, target) {
        if (!sip.dialogs[sessionID] || !sip.dialogs[sessionID].sipContext) {
            bus.emit('message', { category: 'call', sessionID: sessionID, type: 'error', msg: "Dialog not found" });
            return;
        }

        var rq = sip.dialogs[sessionID].sipContext;

        rq.method = 'REFER';
        rq.headers.cseq = {
            method: 'REFER',
            seq: Math.floor(Math.random() * 1e5)
        };
        rq.headers['Refer-To'] = '<sip:' + target + '@' + sip.parseUri(rq.headers.from.uri).host + '>'; //target;
        rq.headers['Referred-By'] = '<' + rq.headers.from.uri + '>';
        rq.headers['Contact'] = '<' + sip.connections[sip.dialogs[sessionID].sipAccountID].contact.uri + '>' + ';expires=' + sip.connections[sip.dialogs[sessionID].sipAccountID].contact.params.expires;
        if (arguments[2]) {
            rq.headers['reject-to'] = arguments[2];
        } else {
            delete rq.headers['reject-to'];
        }
        sip.sendRq(rq, function (rs) {
            delete rq.headers['Refer-To'];
            delete rq.headers['Referred-By'];
            if (rs.status != 202) {
                bus.emit('message', { category: 'call', sessionID: sessionID, type: 'error', msg: "Transfer failed" });
                sip.bye(sessionID, 'Reason: Q.850 ;cause=31 ;text="Transfer failed"');
            } else {
                bus.emit('message', { category: 'call', sessionID: sessionID, type: 'debug', msg: "Transfer accepted to '" + target + "'" });
            }
        }, sessionID);
    };

    sip.invite = function (sessionID, uri, content) {
        if (!sip.dialogs[sessionID]) {
            bus.emit('message', { category: 'call', sessionID: sessionID, type: 'error', msg: "Dialog not found" });
            return;
        }
        var sipAccountID = sip.dialogs[sessionID].sipAccountID,
            rq = {
                method: 'INVITE',
                uri: uri,
                headers: {
                    to: { uri: uri },
                    from: { name: sip.connections[sipAccountID].from.name, uri: sip.connections[sipAccountID].from.uri, params: { tag: sip.newTag() } },
                    'call-id': sip.newCallId(),
                    cseq: { method: 'INVITE', seq: 1 },
                    'content-type': 'application/sdp',
                    contact: [sip.connections[sipAccountID].contact]
                },
                content: content
            };

        sip.dialogs[sessionID].inviteRq = rq; //for CANCEL
        sip.dialogs[sessionID].dialogID = sip.getDialogID(rq);
        var ringingTimeout = config.get("ringingTimeout") || 60,
            ringingTimeoutID = setTimeout(function () {
                if (sip.dialogs[sessionID].meta.status !== 'answered') { //just to be safe
                    sip.cancel(sessionID, 'Service cancel INVITE. Reason: ringing timeout [' + ringingTimeout + ' sec]');
                }
            }, ringingTimeout * 1000);
        var onceFlag = true;
        sip.sendRq(rq, function (rs) {
            if (onceFlag) {
                onceFlag = false;
                if (!ringingTimeoutID) {
                    return;
                } else {
                    clearTimeout(ringingTimeoutID);
                }
                if (rs.status === 200) {
                    bus.emit('message', { category: 'call', sessionID: sessionID, type: 'info', msg: 'URI [' + uri + '] is answered' });
                    bus.emit('inviteAccepted', { sessionID: sessionID, rs: rs });
                } else {
                    if (rs.status !== 487) { // !CANCEL
                        bus.emit('callFailed', { sessionID: sessionID, uri: uri, type: 'info', msg: 'INVITE failed with status ' + rs.status + (rs.reason ? '. Reason: "' + rs.reason + '"' : '') });
                    }
                }
            };
        }, sessionID, sipAccountID);
    };

    bus.on('invite', function (data) {
        sip.invite(data.sessionID, data.uri, data.content)
    });
    bus.on('on_answer_message', (req) => {
        if (req.type != 'sip_message') {
            return;
        }
        sip.message(req);
    });
    sip.options = function (uri, sipAccountID, cb) {
        var rq = {
            method: 'OPTIONS',
            uri: uri,
            headers: {
                // to: { name: sip.connections[sipAccountID].from.name, uri: sip.connections[sipAccountID].from.uri },
                to: { uri: uri },
                from: {
                    name: sip.connections[sipAccountID].from.name,
                    uri: sip.connections[sipAccountID].from.uri,
                    params: {
                        tag: sip.newTag()
                    }
                },
                cseq: { method: 'OPTIONS', seq: 1 },
                'call-id': sip.newCallId(),
                accept: 'application/sdp',
            }
        };
        sip.sendRq(rq, function (data) {
            if (cb) {
                if (data.headers && data.headers['user-agent'] == "MARS-softphone-wrtc" && data.headers.cseq && data.headers.cseq.method == "OPTIONS") {
                    cb(data);
                } else {
                    cb(sipAccountID);
                }
            }
        }, null, sipAccountID);
    };

    //отправка сообщения SIP MESSAGE
    sip.message = function (data) {

        var sipAccountID = String(data.sipAccountID) || config.get("activeAccount");
        var rq;
        if (data.type == 'sip_message') {
            rq = {
                method: 'MESSAGE',
                uri: data.headers.from.uri,
                headers: {
                    to: data.headers.from.uri,
                    from: data.headers.to.uri,
                    'call-id': sip.newCallId(),
                    cseq: { method: 'MESSAGE', seq: Math.floor(Math.random() * 1e5) },
                    'content-type': 'text/plain; charset=UTF-8',
                    accept: 'text/plain; charset=UTF-8',
                    'content-encoding': 'gzip'
                },
                content: data.answer,
                sipAccountID: data.sipAccountID,

            };
        } else {
            rq = {
                method: 'MESSAGE',
                uri: data.from.uri,
                headers: {
                    to: data.from.uri,
                    from: { name: '', uri: sip.connections[sipAccountID].from.uri, params: { tag: sip.newTag() } },
                    'call-id': sip.newCallId(),
                    cseq: { method: 'MESSAGE', seq: Math.floor(Math.random() * 1e5) },
                    'content-type': 'text/plain; charset=UTF-8',
                    accept: 'text/plain; charset=UTF-8',
                },
                content: data.content
            };
        }
        sip.sendRq(rq, function (rs) {
            // console.log(rq);
            var msgStatus = 'The message "' + rq.content + '" was ';
            var sts = ((rs.status === 200) || (rs.status === 202));
            bus.emit('message', { category: 'call', sessionID: data.sessionID, type: sts ? 'info' : 'error', msg: msgStatus + (sts ? 'sent' : 'not sent') });
            if (data.cb) {
                data.cb(rs);
            }
        }, data.sessionID, sipAccountID);
    };

    // подписка на событие для отправки сообщения
    bus.on('msgSend', sip.message);

    sip.hostIp = bus.config.get('hostIp');
    bus.emit('message', { type: 'debug', msg: 'Server ip ' + sip.hostIp });
    bus.on('refresh', function (type) {
        if (type === 'configData')
            registerAccountEvent();
    });
};
module.exports = init();
