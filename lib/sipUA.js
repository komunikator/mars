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



    sip.auth = config.get("sipAccounts");
    sip.name = config.get("serviceName");
    sip.tname = config.get("toolName");
    sip.contact = [];
    sip.from = [];
    sip.status = [];

    sip.logger = bus.getLogger('sip');

    sip.newUUID = function () {
        var UUID = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
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
        return require("crypto")
                .createHash("md5")
                .update(val)
                .digest("hex").replace(/\D/g, '').substr(0, 4)
    };


    sip.setHeaders = function (rq, sipAccountID) {
        var allowMethods = 'INVITE, ACK, BYE, INFO, MESSAGE';
        // var allowMethods = 'INVITE, ACK, BYE, INFO';
        if (rq.status) //is response
        {
            rq.headers.contact = [sip.contact[sipAccountID]];
            //' INVITE, ACK, CANCEL, OPTIONS, BYE, REGISTER, SUBSCRIBE, NOTIFY, REFER, INFO, MESSAGE';
            rq.headers['Allow'] = allowMethods;
            rq.headers['Server'] = sip.name;
        }
        else //is request
        {
            rq.headers['User-Agent'] = sip.name;
            rq.headers['Allow'] = allowMethods;
            // rq.headers['Allow'] = 'INVITE, ACK, BYE, INFO';
        }
        return rq;
    };


    sip.sendRq = function (rq, cb, sessionID, sipAccountID) {
        if (rq.headers.via)
            rq.headers.via.shift();
        bus.emit('message', {type: 'debug', category: logCategory, msg: 'Send SIP method "' + rq.method + '"'});

        if (sipAccountID === undefined)
            sipAccountID = sip.dialogs[sessionID].sipAccountID;
        sip.setHeaders(rq, sipAccountID);
        sUA[sipAccountID].send(rq, function (rs) {

//detect SIP public ip
            var host = rs.headers.via[0].host;
            var port = rs.headers.via[0].port;
            if (rs.headers.via[0].params &&
                    rs.headers.via[0].params.received &&
                    rs.headers.via[0].params.received !== sip.hostIp &&
                    host !== rs.headers.via[0].params.received
                    ||
                    rs.headers.via[0].params.rport &&
                    rs.headers.via[0].params.rport !== port
                    ) {
                host = rs.headers.via[0].params.received;
                if (rs.headers.via[0].params.rport)
                    port = rs.headers.via[0].params.rport;
                var realUri = 'sip:' + (sip.parseUri(sip.from[sipAccountID].uri) && sip.parseUri(sip.from[sipAccountID].uri).user) + '@' + host + ':' + port;
                if (sip.contact[sipAccountID].uri !== realUri) {
                    bus.emit('message', {type: 'info', msg: 'SIP UA' + sipAccountID + ' [' + sip.from[sipAccountID].uri + '] detected external ip: "' + host + ':' + port + '"'});
                    sip.contact[sipAccountID].uri = realUri;
                }
                ;
                if (host !== sip.hostIp)
                    sUA[sipAccountID].publicIP = host;

                if (rq.headers.contact && rq.headers.contact[0].uri)
                    rq.headers.contact[0].uri = sip.contact[sipAccountID].uri;
            }
//

//        sip.send(rq, function(rs) {
// console.log(rs)
            if (rs.status >= 300) {
                if (rs.status === 401 || rs.status === 407) {

                    bus.emit('message', {type: 'debug', category: logCategory, msg: 'SIP method "' + rq.method + '" need authorization'});
                    var context = {};
                    // Update the original request so that it's not treated as a duplicatbus.
                    rq.headers['cseq'].seq++;
                    rq.headers.via.shift();
                    //rq.headers.via[0].host = sip.hostIp;
                    //console.log(rq.headers.via);
                    //rq.headers['call-id'] = rstring();
                    //console.log(sip.auth[sipAccountID])
                    digest.signRequest(context, rq, rs, sip.auth[sipAccountID]);
                    //console.log(rq);
                    sUA[sipAccountID].send(rq,
                            //sip.send(rq,
                                    function (rs_) {
                                        if (rs_.status < 200) {
                                            bus.emit('message', {type: 'debug', category: logCategory, msg: 'SIP method "' + rq.method + '" authorization progress status ' + rs_.status});
                                            sendRinging(rs_, sessionID);
                                        }
                                        else
                                        if (rs_.status === 200 || rs_.status === 487) {//487 for CANCEL
                                            bus.emit('message', {type: 'debug', category: logCategory, msg: 'SIP method "' + rq.method + '" successfully authorized'});
                                            if (cb)
                                            {
                                                cb(rs_);
                                                cb = null;
                                            }
                                        }
                                        else
                                        {
                                            if (cb)
                                            {
                                                cb(rs_);
                                                cb = null;
                                            }
                                            bus.emit('message', {type: 'debug', category: logCategory, msg: 'SIP method "' + rq.method + '" authorization failed with status ' + rs_.status + (rs_.reason ? '. Reason: "' + rs_.reason + '"' : '')});
                                        }
                                    }
                            );
                        }
                else
                {
                    if (rs.status !== 487) //for CANCEL
                        bus.emit('message', {type: 'debug', category: logCategory, msg: 'SIP method "' + rq.method + '" failed with status ' + rs.status + (rs.reason ? '. Reason: "' + rs.reason + '"' : '')});
                    //if (rq.method === 'INVITE')
                    //        bus.emit('message', {type: 'debug', category: logCategory, msg: 'SIP method "' + rq.method + '" failed with status ' + rs.status + '. Reason: "' + rs.reason + '"'});

                    //console.log(rs);
                    if (cb)
                    {
                        cb(rs);
                        cb = null;
                    }
                }

            }
            else if (rs.status < 200) {
                bus.emit('message', {type: 'debug', category: logCategory, msg: 'SIP method "' + rq.method + '" progress status ' + rs.status});
                sendRinging(rs, sessionID);
            }
            else {
                bus.emit('message', {type: 'debug', category: logCategory, msg: 'SIP method "' + rq.method + '" successfully authorized'});
                if (cb)
                {
                    cb(rs);
                    cb = null;
                }
            }
        });
    };
    function getDialogID(rs) {
        if (!rs)
            return null;
        return rs.headers['call-id'];
        if (rs.status)
            return [rs.headers['call-id'], (rs.headers.to.params ? rs.headers.to.params.tag : ''), (rs.headers.from.params ? rs.headers.from.params.tag : '')].join(':');
        else
            return [rs.headers['call-id'], (rs.headers.from.params ? rs.headers.from.params.tag : ''), (rs.headers.to.params ? rs.headers.to.params.tag : '')].join(':');
    }
    sip.getDialogID = getDialogID;

    function getSessionID(rs) {
        var dialogID = getDialogID(rs),
                sessionID = null;
        for (var sID in dialogs)
            if (dialogs[sID].dialogID === dialogID)
                sessionID = sID;
        return sessionID;
    }

    function sendRinging(rs, sessionID) {
        if (rs.status === 180 && rs.headers.cseq.method === "INVITE")
        {
            dialogs[sessionID].meta.status = 'ringing';
            dialogs[sessionID].meta.times.ringing = new Date().getTime();
            dialogs[sessionID].dialogID = sip.getDialogID(rs);
            dialogs[sessionID].sipContext = {
                uri: rs.headers.contact[0].uri,
                headers: {
                    to: rs.headers.to,
                    from: rs.headers.from,
                    'call-id': rs.headers['call-id']
                }
            };
            bus.emit('ringing', {sessionID: sessionID, uri: rs.headers.to.uri});
        }
    }

    //starting stack
    function onData(rs) {
        if (!sip.parseUri(rs.headers.from.uri))
            rs.headers.from.uri = 'sip:' + rs.headers.from.uri + '@' + rs.headers.via[0].host;

//        var sipAccountID = getAccountID(rs);
        var sipAccountID = this.sipAccountID;
        if (sipAccountID == null) {
            bus.emit('message', {category: 'call', sessionID: sessionID, type: 'error', msg: 'Invalide sipAccountID for ' + rs.headers.to.uri});
            return;
        }

        // console.log('method: ', rs.method);

        // Метод MESSAGE выделен в отдельное условие, т.к. при обмене сообщениями не создаётся диалог и сессия
        // Если передано сообщение, здесь его принимаем
        if (rs.method === 'MESSAGE')
        {
            var name;
            if (rs.headers.from.name) // если в сообщении есть имя отправившего сообщение,
            {
                name = rs.headers.from.name; // запоминаем это имя
            }
            bus.emit('message', {category: 'call', sessionID: sessionID, type: 'info', msg: 'MESSAGE recieved: ' + '"' + rs.content + '" from ' + rs.headers.from.uri.replace('sip:', '') + (name ? ' (' + name.replace(/"/g, '') + ')' : '')}); // если есть name, удаляем из него двойные кавычки

            // msgSend('Ответ на сообщение "' + rs.content + '"'); // для тестирования
            // отправляем сообщение вне диалога
            // bus.emit('msgSend', {msg: 'Ответ на сообщение "' + rs.content + '"', to: {uri: rs.headers.from.uri}, sipAccountID: sipAccountID}); // для тестирования

            // отсылаем сообщение для вывода его в JIN
            bus.emit('msgReceived', {sessionID: sessionID, msg: rs.content, to: {uri: rs.headers.to.uri}, from: {name: name, uri: rs.headers.from.uri}, sipAccountID: sipAccountID});

            var rs_ = sip.makeResponse(rs, 200, 'OK. MESSAGE recieved');
            sip.setHeaders(rs_, sipAccountID);
            sUA[sipAccountID].send(rs_);
        }
        else
        // Метод NOTIFY выделен в отдельное условие, т.к. при обмене сообщениями не создаётся диалог и сессия
        if (rs.method === 'NOTIFY')
        {
            bus.emit('message', {category: 'call', sessionID: sessionID, type: 'debug', msg: 'Transfer NOTIFY'});
            var rs_ = sip.makeResponse(rs, 200, 'OK');
            sip.setHeaders(rs_, sipAccountID);
            sUA[sipAccountID].send(rs_);
        }
        else
        // Метод OPTIONS выделен в отдельное условие, т.к. при обмене сообщениями не создаётся диалог и сессия
        if (rs.method === 'OPTIONS')
        {
            bus.emit('message', {category: 'call', sessionID: sessionID, type: 'debug', msg: 'Transfer OPTIONS'});
            var rs_ = sip.makeResponse(rs, 200, 'OK');
            sip.setHeaders(rs_, sipAccountID);
            sUA[sipAccountID].send(rs_);
        }
        else
        {
            // Если есть параметр tag, т.е. установился сеанс связи
            //if (rs.headers.to.params.tag) { // check if it's an in dialog request
            //console.log(rs);
            //var sessionID = getSessionID(rs);
            //console.log('from sip_ua',sip.getDialogID(rs));
            //console.log(sessionID,dialogs[sessionID]);
            // console.log(rs.method);
            //

            var sessionID = getSessionID(rs);

            function callEnd() {
                bus.emit('callEnded', {uri: rs.headers.from.uri, sessionID: sessionID, by: 'Subscriber'});
                var rs_ = sip.makeResponse(rs, 200, 'OK');
                sip.setHeaders(rs_, sipAccountID);
                sUA[sipAccountID].send(rs_);
            }

            if (rs.method == 'CANCEL') {
                var rq = sip.dialogs[sessionID].inviteRs;
                callEnd();

                var rs_ = sip.makeResponse(rq, 487, 'Call Terminated');
                sip.setHeaders(rs_, sipAccountID);
                sUA[sipAccountID].send(rs_);
            }

            if (rs.headers.to.params.tag) { // check if it's an in dialog request
                if (sessionID && dialogs[sessionID])
                {
                    switch (rs.method)
                    {
                        case 'ACK':
                            bus.emit('message', {category: 'call', sessionID: sessionID, type: 'debug', msg: 'Invite ACK'});
                            bus.emit('inviteACK', {response: rs, sessionID: sessionID});
                            break;
                            //case 'CANCEL':
                        case 'BYE':
                            callEnd();
                            break;
                        case 'INFO':
                            if (/dtmf-relay$/.test(rs.headers['content-type']))
                            {
                                var dtmf = rs.content.match(/^Signal=(\S+)/);
                                var dtmf_mode = 'INFO';
                                if (dialogs[sessionID].meta.dtmf_mode != dtmf_mode) {
                                    bus.emit('setDtmfMode', {sessionID: sessionID, dtmf_mode: dtmf_mode});
                                }
                                bus.emit('dtmf_key', {sessionID: sessionID, key: dtmf[1]});
                            }
                            break;
                        default:
                            var rs_ = sip.makeResponse(rs, 405, 'Method not allowed1');
                            sip.setHeaders(rs_, sipAccountID);
                            sUA[sipAccountID].send(rs_);
                    }
                }
                else
                {
                    var rs_ = sip.makeResponse(rs, 481, "Call doesn't exists");
                    sip.setHeaders(rs_, sipAccountID);
                    sUA[sipAccountID].send(rs_);
                }
            }
            else
            {
                if (rs.method === 'INVITE') {
                    rs.headers.to.params.tag = sip.newTag();
                    var rs_ = sip.makeResponse(rs, 180, 'Ringing');
                    sip.setHeaders(rs_, sipAccountID);
                    sUA[sipAccountID].send(rs_);
                    bus.request('onEvent', {id: 'on_call[' + sipAccountID + ']'}, function (err, data) {
                        bus.emit('message', {type: 'info', msg: 'Incoming call ' + rs.headers.from.uri});
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
                                    times: {ringing: new Date().getTime()}
                                },
                                parentID: parentID
                            };
                            dialogs[sessionID].meta.pin = sip.getPin(dialogs[sessionID].meta.from);

                            bus.emit('ringing', {sessionID: sessionID, uri: rs.headers.from.uri, parentID: parentID});
                            setTimeout(function () {
                                bus.emit('incomingCall', {response: rs, sessionID: sessionID, script: script, sipAccountID: sipAccountID, parentID: parentID});
                            }, 1000);
                        }
                        else {
                            bus.emit('message', {type: 'warn', msg: 'For incoming call sip:' + sip.parseUri(rs.headers.to.uri).user + '@' + sip.parseUri(rs.headers.to.uri).host + ' script not set'});
                            var rs_ = sip.makeResponse(rs, 480, 'Temporarily Unavailable');
                            sip.setHeaders(rs_, sipAccountID);
                            sUA[sipAccountID].send(rs_);
                        }
                    });
                }
                else
                {
                    var rs_ = sip.makeResponse(rs, 405, 'Method not allowed');
                    sip.setHeaders(rs_, sipAccountID);
                    sUA[sipAccountID].send(rs_);
                }
            }
        }
    }

    function startSip(sipAccountID) {
        var logger = sip.logger;
        return sip.create(
                //sip.start(
                        {port: '0', //port, //random
                            tcp: false,
                            hostname: sip.hostIp,
                            //debug: true,
                            logger: {
                                recv: function (m, i) {
//console.log(m,i);
                                    logger.debug('RECV from ' + i.protocol + ' ' + i.address + ':' + i.port + '\n' + sip.stringify(m)); // util.inspect(m, null, null));
                                },
                                send: function (m, i) {
//console.log(m,i);
                                    logger.debug('SEND to ' + i.protocol + ' ' + i.address + ':' + i.port + '\n' + sip.stringify(m)); // util.inspect(m, null, null));
                                },
                                error: function (e) {
                                    bus.getLogger('error').error(e.stack);
                                }
                            }//,
//tcp: false
                        }, onData.bind({sipAccountID: sipAccountID}));
            }
    function register(cb, sipAccountID, unregister) {
        if (!(sip.auth && sip.auth[sipAccountID]))
            return;
        var expiresTime = (unregister == undefined ? sip.contact[sipAccountID].params.expires : 0);

        var rq = {
            method: 'REGISTER',
            uri: 'sip:' + sip.auth[sipAccountID].host,
            headers: {
                to: {name: sip.from[sipAccountID].name, uri: sip.from[sipAccountID].uri},
                from: {name: sip.from[sipAccountID].name, uri: sip.from[sipAccountID].uri, params: {tag: sip.newTag()}},
                cseq: {method: 'REGISTER', seq: 1},
                'call-id': sip.newCallId(),
                contact: [sip.contact[sipAccountID]],
                expires: expiresTime
//                'content-length': 0
            }
        };
        sip.sendRq(rq, function (rs) {
            if (rs.status >= 400)
                cb(false);
            else
                cb((digest.authenticateResponse({}, rs) === false) ? false : true);
        }, null, sipAccountID);
    }

    sip.stopUA = function () {
        //sUA[sipAccountID].destroy();
        sip.stop();
        bus.emit('message', {type: 'info', msg: 'SIP UA stopped'});
    };

    sip.registerInit = function (sipAccountID, unregister, cb) {
        function regResult(reg) {
            var lastStatus = JSON.stringify(sip.status);
            if (unregister != undefined) {
                //console.log('unregistered');

                if (expiresIntvl[sipAccountID]) {
                    clearInterval(expiresIntvl[sipAccountID]);
                    expiresIntvl[sipAccountID] = null;
                }

                if (reg && sip.contact[sipAccountID])
                {
                    sip.status[sipAccountID] = 'disabled';//'unregistered';
                }
                else
                {

                }
            } else {
                //console.log('registered');
                if (reg && sip.contact[sipAccountID] && !sip.auth[sipAccountID].disable)
                {
                    //bus.emit('message', {type: 'info', msg: 'SIP UA'+sipAccountID+' registered as "' + sip.from[sipAccountID].uri + '", expires :' + sip.contact[0].params.expires});
                    sip.status[sipAccountID] = 'registered';
                    if (!expiresIntvl[sipAccountID])
                        expiresIntvl[sipAccountID] = setInterval(function () {
                            //console.log('reg',sipAccountID);
                            sip.registerInit(sipAccountID);
                        }, (sip.contact[sipAccountID].params.expires * 1000) - 3000);

                }
                else
                {
                    //bus.emit('message', {type: 'error', msg: 'SIP UA'+sipAccountID+' registration failed'});
                    sip.status[sipAccountID] = 'unregistered';
                    if (expiresIntvl)
                        clearInterval(expiresIntvl);
                }
            }
            //bus.emit('UA_status', sip.status);
            if (lastStatus != JSON.stringify(sip.status)) {
                bus.request('getStatusUAList', {}, function (err, data) {
                    bus.emit('updateData', {source: 'listSIP', data: data});
                    bus.emit('updateData', {source: 'statusUA', data: data});
                });
            }
            if (sip.status[sipAccountID] === 'disabled')
                bus.emit('message', {type: 'debug', msg: 'SIP UA' + sipAccountID + ' [' + sip.from[sipAccountID].uri + '] set state "' + sip.status[sipAccountID] + '"'});
            else
                bus.emit('message', {type: (sip.status[sipAccountID] == 'registered' ? 'debug' : 'error'), msg: 'SIP UA' + sipAccountID + ' [' + sip.from[sipAccountID].uri + '] registration status "' + sip.status[sipAccountID] + '"'});

            if (!unregister) {
                bus.emit('register', {uri: sip.from[sipAccountID].uri, status: sip.status[sipAccountID]});
            }

            if (cb)
                cb();

            regResult = function () {
            };
        }
        register(regResult, sipAccountID, unregister);
    };

    sip.startUA = function () {
        sip.auth = config.get("sipAccounts");
        if (sip.auth && sip.auth.length)
            sip.auth.forEach(function (auth, sipAccountID) {
                if (sip.auth[sipAccountID]) {
                    if (!sip.auth[sipAccountID].disable) {
                        if (!sUA[sipAccountID])
                            sUA[sipAccountID] = startSip(sipAccountID);
//                        if (sip.status[sipAccountID] !== 'registered' && sip.status[sipAccountID] !== 'registration') {
                        if (!sip.status[sipAccountID] || sip.status[sipAccountID] === 'disabled') {
                            sip.from[sipAccountID] = {name: sip.name, uri: 'sip:' + sip.auth[sipAccountID].user + '@' + (sip.auth[sipAccountID].domain ? sip.auth[sipAccountID].domain : sip.auth[sipAccountID].host)};
                            sip.contact[sipAccountID] = {uri: 'sip:' + sip.auth[sipAccountID].user + '@' + sip.hostIp/* + ':' + port*/, params: {expires: sip.auth[sipAccountID].expires || 300}};
                            //bus.emit('message', {type: 'debug', msg: 'SIP UA' + sipAccountID + ' [' + sip.from[sipAccountID].uri + '] started on port ' + port});
                            bus.emit('message', {type: 'debug', msg: 'SIP UA' + sipAccountID + ' [' + sip.from[sipAccountID].uri + '] started'});
                            bus.emit('message', {type: 'debug', msg: 'SIP UA' + sipAccountID + ' [' + sip.from[sipAccountID].uri + '] start registration'});
                            sip.status[sipAccountID] = 'registration';
                            //detecting external ip:port
                            function optionsResult() {
                                sip.registerInit(sipAccountID);
                                optionsResult = function () {
                                };
                            }
                            sip.options('sip:' + sip.auth[sipAccountID].host, sipAccountID, optionsResult);
                        }
                    }
                    else
                        sip.status[sipAccountID] = 'disabled';
                }
            });
        bus.emit('message', {type: 'info', msg: 'sipUA started'});
    };


    function registerAccountEvent() {
        var sipAccounts = config.get("sipAccounts");
        if (sipAccounts)
            sipAccounts.forEach(function (account, i) {
                if (!account.disable) {
                    var event = 'on_call[' + /*account.user + '@' + account.host*/ i + ']';
                    if (bus.OnEvent[event] === undefined)
                        bus.OnEvent[event] = null;
                }
                else
                if (bus.OnEvent[event] !== undefined)
                    delete bus.OnEvent[event];
            });

        bus.removeListener('lastCallEnded', restartSipConnections);

        if (isChangeSipAccounts()) {
            if (!Object.keys(dialogs).length) {
                restartSipConnections();
            } else {
                bus.once('lastCallEnded', restartSipConnections);
            }
        }

        function isChangeSipAccounts() {
            if (!sip.lastAuth)
                return true;//first start
            var
                    sipAccountsData = JSON.stringify(config.get("sipAccounts")),
                    isChange = (sipAccountsData !== JSON.stringify(sip.lastAuth));

            sip.lastAuth = sipAccountsData;
            return isChange;
        }
    }

    function restartSipConnections() {
        var countContacts = 0;
        if (!sip.contact.length)
            sip.startUA();
        else {
            sip.auth = config.get("sipAccounts") || [];
            sip.contact.forEach(function (obj, sipAccountID) {
                if (sip.status[sipAccountID] === 'registered' &&
                        (!sip.auth[sipAccountID] || (sip.auth[sipAccountID] && sip.auth[sipAccountID].disable))) {
                    countContacts++;
                    sip.registerInit(sipAccountID, 1, function () {
                        countContacts--;

                        if (countContacts < 1) {
                            sip.sUA.forEach(function (obj, _sipAccountID) {
                                if (!sip.auth[_sipAccountID]) {
                                    delete sip.contact[_sipAccountID];
                                    delete sip.status[_sipAccountID];
                                    obj.destroy();
                                }

                            });
                            sip.startUA();
                        }
                    });
                }

            });
            if (!countContacts)
                sip.startUA();
        }

        bus.request('getStatusUAList', {}, function (err, data) {
            bus.emit('updateData', {source: 'listSIP', data: data});
            bus.emit('updateData', {source: 'statusUA', data: data});
        });
    }

    sip.sendDtmf = function (sessionID, data, cb) {
        if (!sip.dialogs[sessionID] || !sip.dialogs[sessionID].sipContext)
        {
            bus.emit('message', {category: 'call', sessionID: sessionID, type: 'error', msg: "Dialog not found"});
            //bus.emit('callEnded', {sessionID: sessionID});
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
            //console.log('sip.sendDtmf callback');
            delete rq.content;
            if (cb)
                cb();
        }, sessionID);
    };

    sip.bye = function (sessionID, reason) {
        if (!sip.dialogs[sessionID] || !sip.dialogs[sessionID].sipContext)
        {
            bus.emit('message', {category: 'call', sessionID: sessionID, type: 'error', msg: "Dialog not found"});
            //bus.emit('callEnded', {sessionID: sessionID});
            return;
        }
        var rq = sip.dialogs[sessionID].sipContext;
        rq.method = 'BYE';
        rq.headers.cseq = {
            method: 'BYE',
            seq: Math.floor(Math.random() * 1e5)
        };
        if (reason)
            rq.reason = reason;
        sip.sendRq(rq, function () {
            if (reason)
                bus.emit('callFailed', {sessionID: sessionID, uri: rq.headers.to.uri, msg: reason});
            else
                bus.emit('callEnded', {sessionID: sessionID, uri: rq.headers.to.uri, by: 'Service'});
        }, sessionID);
    };

    sip.cancel = function (sessionID, reason) {
        if (!sip.dialogs[sessionID] || !sip.dialogs[sessionID].inviteRq)
        {
            bus.emit('message', {category: 'call', sessionID: sessionID, type: 'error', msg: "Dialog not found"});
            //bus.emit('callEnded', {sessionID: sessionID});
            return;
        }
        var rq = sip.dialogs[sessionID].inviteRq,
                sipAccountID = sip.dialogs[sessionID].sipAccountID;

        rq.method = 'CANCEL';
        rq.headers.cseq.method = rq.method;

        bus.emit('message', {category: 'call', sessionID: sessionID, type: 'debug', msg: 'Service send CANCEL invite'});
        sip.sUA[sipAccountID].send(rq, function (rs) {
            if (rs.status !== 200)
                bus.emit('message', {category: 'call', sessionID: sessionID, type: 'warn', msg: 'Cancel INVITE failed with status ' + rs.status + (rs.reason ? '. Reason: "' + rs.reason + '"' : '')});
            bus.emit('callCancelled', {sessionID: sessionID, uri: rq.uri, msg: reason});
        });
    };

    sip.refer = function (sessionID, target) {
        if (!sip.dialogs[sessionID] || !sip.dialogs[sessionID].sipContext)
        {
            bus.emit('message', {category: 'call', sessionID: sessionID, type: 'error', msg: "Dialog not found"});
            //bus.emit('callEnded', {sessionID: sessionID});
            return;
        }

        var rq = sip.dialogs[sessionID].sipContext;

        //rq.headers.from.params.tag = sip.newTag();
        //delete rq.headers.to.params.tag;

        rq.method = 'REFER';
        rq.headers.cseq = {
            method: 'REFER',
            seq: Math.floor(Math.random() * 1e5)
        };
        rq.headers['Refer-To'] = '<sip:' + target + '@' + sip.parseUri(rq.headers.from.uri).host + '>';//target;
        rq.headers['Referred-By'] = '<' + rq.headers.to.uri + '>';
        sip.sendRq(rq, function (rs) {
            if (rs.status != 202) {
                bus.emit('message', {category: 'call', sessionID: sessionID, type: 'error', msg: "Transfer failed"});
                sip.bye(sessionID, 'Reason: Q.850 ;cause=31 ;text="Transfer failed"');
            }
            else {
                bus.emit('callRefer', {sessionID: sessionID, target: target});
                bus.emit('message', {category: 'call', sessionID: sessionID, type: 'debug', msg: "Transfer accepted to '" + target + "'"});
            }
        }, sessionID);
    };

    sip.invite = function (sessionID, uri, content) {
        if (!sip.dialogs[sessionID]) {
            bus.emit('message', {category: 'call', sessionID: sessionID, type: 'error', msg: "Dialog not found"});
            return;
        }
        var sipAccountID = sip.dialogs[sessionID].sipAccountID,
                rq = {
                    method: 'INVITE',
                    uri: uri,
                    headers: {
                        to: {uri: uri},
                        from: {name: sip.from[sipAccountID].name, uri: sip.from[sipAccountID].uri, params: {tag: sip.newTag()}},
                        'call-id': sip.newCallId(),
                        cseq: {method: 'INVITE', seq: 1},
                        'content-type': 'application/sdp',
                        contact: [sip.contact[sipAccountID]]
                    },
                    content: content
                };

        sip.dialogs[sessionID].inviteRq = rq; //for CANCEL

        var ringingTimeout = config.get("ringingTimeout") || 60, //sec
                ringingTimeoutID = setTimeout(
                        function () {
                            if (sip.dialogs[sessionID].meta.status !== 'answered') //just to be safe
                                sip.cancel(sessionID, 'Service cancel INVITE. Reason: ringing timeout [' + ringingTimeout + ' sec]');
                        },
                        ringingTimeout * 1000);

        var onceFlag = true;
        sip.sendRq(rq,
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
                            bus.emit('message', {category: 'call', sessionID: sessionID, type: 'info', msg: 'URI [' + uri + '] is answered'});
                            bus.emit('inviteAccepted', {sessionID: sessionID, rs: rs});
                        }
                        else
                        if (rs.status !== 487)// !CANCEL
                        {
                            // bus.emit('message', {type: 'info', msg: 'INVITE failed with status ' + rs.status + '. Reason: "' + rs.reason + '"'});
                            bus.emit('callFailed', {sessionID: sessionID, uri: uri, type: 'info', msg: 'INVITE failed with status ' + rs.status + (rs.reason ? '. Reason: "' + rs.reason + '"' : '')});
                        }
                    }
                    ;
                }, sessionID, sipAccountID);

    };

    bus.on('invite', function (data) {
        sip.invite(data.sessionID, data.uri, data.content)
    });

    sip.options = function (uri, sipAccountID, cb) {
        var rq = {
            method: 'OPTIONS',
            uri: uri,
            headers: {
                to: {name: sip.from[sipAccountID].name, uri: sip.from[sipAccountID].uri},
                from: {name: sip.from[sipAccountID].name, uri: sip.from[sipAccountID].uri, params: {tag: sip.newTag()}},
                cseq: {method: 'OPTIONS', seq: 1},
                'call-id': sip.newCallId()
            }
        };
        sip.sendRq(rq, function () {
            if (cb)
                cb();
        }, null, sipAccountID);
    };

    //отправка сообщения SIP MESSAGE
    sip.message = function (data) {
        var sipAccountID = String(data.sipAccountID) || config.get("activeAccount");
        // var uri = 'sip:' + sip.auth[sipAccountID].user + '@' + sip.auth[sipAccountID].host;

        var rq = {
            method: 'MESSAGE',
            uri: data.uri,
            headers: {
                to: data.uri,
                from: {name: '', uri: sip.from[sipAccountID].uri, params: {tag: sip.newTag()}},
                'call-id': sip.newCallId(),
                cseq: {method: 'MESSAGE', seq: Math.floor(Math.random() * 1e5)},
                'content-type': 'text/plain; charset=UTF-8',
                accept: 'text/plain'
            },
            content: data.msg
        };

        sip.sendRq(rq, function (rs) {

            var msgStatus = 'The message "' + rq.content + '" was ';
            var sts = ((rs.status === 200) || (rs.status === 202));

            bus.emit('message', {category: 'call', sessionID: data.sessionID, type: sts ? 'info' : 'error', msg: msgStatus + (sts ? 'sent' : 'not sent')});

            // console.log('===========================');
            // console.log(data);
            // console.log(data.cb_func.toString());
            if (data.cb)
                data.cb(rs);

        }, data.sessionID, sipAccountID);
    };

    // подписка на событие для отправки сообщения
    bus.on('msgSend', sip.message);

    sip.hostIp = require('ip').address();
    bus.emit('message', {type: 'debug', msg: 'Server ip ' + sip.hostIp});

    bus.on('refresh', function (type) {
        if (type === 'configData')
            registerAccountEvent();
    });
}
;
module.exports = init();