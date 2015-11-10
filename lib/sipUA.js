/**
 * @fileoverview SIP User Agent
 */


/**
 * @augments cntx
 * @class Class creating a SIP UA'+sipAccountID+''+sipAccountID+'.
 */
var sipUA = function (cntx) {

    var logCategory = 'ua',
        ua = require('./sip'),
        sUA;
        findPort = require('./findPort'),
        digest = require('./digest'),
        e = cntx.Events,
        dialogs = cntx.dialogs;
        ua.logger = cntx.logger;

    init();

    function init() {
        sUA = [];
        ua.sUA = sUA;
        expiresIntvl = [],
        ua.auth = cntx.config.get("sipAccounts");
        ua.name = cntx.config.get("serviceName");
        ua.tname = cntx.config.get("toolName");
        ua.contact = [];
        ua.from = [];
        ua.status = [];
        ua.port = [];
    }

   /* ua.setHeaders = function (rq, sipAccountID) {

        rq.headers.contact = [ua.contact[sipAccountID]];
        //' INVITE, ACK, CANCEL, OPTIONS, BYE, REGISTER, SUBSCRIBE, NOTIFY, REFER, INFO, MESSAGE';
        rq.headers['Allow'] = 'INVITE, ACK, BYE, INFO, MESSAGE';
        rq.headers['Server'] = ua.name;
        rq.headers['User-Agent'] = ua.name;

        return rq;
    };*/


    ua.setHeaders = function (rq, sipAccountID) {
        var allowMethods = 'INVITE, ACK, BYE, INFO, MESSAGE';
        // var allowMethods = 'INVITE, ACK, BYE, INFO';
        if (rq.status) //is response
        {
            rq.headers.contact = [ua.contact[sipAccountID]];
            //' INVITE, ACK, CANCEL, OPTIONS, BYE, REGISTER, SUBSCRIBE, NOTIFY, REFER, INFO, MESSAGE';
            rq.headers['Allow'] = allowMethods;
            rq.headers['Server'] = ua.name;
        }
        else //is request
        {
            rq.headers['User-Agent'] = ua.name;
            rq.headers['Allow'] = allowMethods;
            // rq.headers['Allow'] = 'INVITE, ACK, BYE, INFO';
        }
        return rq;
    };


    ua.sendRq = function (rq, cb, sessionID, sipAccountID) {
        if (rq.headers.via)
            rq.headers.via.shift();
        e.emit('message', {type: 'debug', category: logCategory, msg: 'Send SIP method "' + rq.method + '"'});
        ua.setHeaders(rq, sipAccountID);
        sUA[sipAccountID].send(rq, function (rs) {
//        ua.send(rq, function(rs) {
// console.log(rs)
            if (rs.status >= 300) {
                if (rs.status === 401 || rs.status === 407) {
//detect SIP public ip
                    var host = rs.headers.via[0].host;
                    var port = rs.headers.via[0].port;
                    if (rs.headers.via[0].params &&
                            rs.headers.via[0].params.received &&
                            rs.headers.via[0].params.received !== ua.hostIp &&
                            host !== rs.headers.via[0].params.received) {
                        host = rs.headers.via[0].params.received;
                        if (rs.headers.via[0].params.rport)
                            port = rs.headers.via[0].params.rport;
                        e.emit('message', {type: 'info', msg: 'SIP UA' + sipAccountID + ' [' + ua.from[sipAccountID].uri + '] detected public ip: "' + host + ':' + port + '"'});
                        //console.log('Public ip:port ' + host + ':' + port);
                        if (rq.headers.contact && rq.headers.contact[0].uri) {
                            sUA[sipAccountID].publicIP = host;
                            //replace uri
                            rq.headers.contact[0].uri = 'sip:' + ua.parseUri(rq.headers.contact[0].uri).user + '@' + host + ':' + port;
                        }
                        //console.log(rq.headers.contact && rq.headers.contact[0].uri);
                    }
//
                    e.emit('message', {type: 'debug', category: logCategory, msg: 'SIP method "' + rq.method + '" need authorization'});
                    var context = {};
                    // Update the original request so that it's not treated as a duplicate.
                    rq.headers['cseq'].seq++;
                    rq.headers.via.shift();
                    //rq.headers.via[0].host = ua.hostIp;
                    //console.log(rq.headers.via);
                    //rq.headers['call-id'] = rstring();
                    //console.log(ua.auth[sipAccountID])
                    digest.signRequest(context, rq, rs, ua.auth[sipAccountID]);
                    //console.log(rq);
                    sUA[sipAccountID].send(rq,
                            //ua.send(rq,
                                    function (rs_) {
                                        if (rs_.status < 200) {
                                            e.emit('message', {type: 'debug', category: logCategory, msg: 'SIP method "' + rq.method + '" authorization progress status ' + rs_.status});
                                            sendRinging(rs_, sessionID);
                                        }
                                        else
                                        if (rs_.status === 200) {
                                            e.emit('message', {type: 'debug', category: logCategory, msg: 'SIP method "' + rq.method + '" successfully authorized'});
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
                                            e.emit('message', {type: 'debug', category: logCategory, msg: 'SIP method "' + rq.method + '" authorization failed with status ' + rs_.status + '. Reason: "' + rs_.reason + '"'});
                                        }
                                    }
                            );
                        }
                else
                {
                    e.emit('message', {type: 'debug', category: logCategory, msg: 'SIP method "' + rq.method + '" failed with status ' + rs.status + '. Reason: "' + rs.reason + '"'});
                    //if (rq.method === 'INVITE')
                    //        e.emit('message', {type: 'debug', category: logCategory, msg: 'SIP method "' + rq.method + '" failed with status ' + rs.status + '. Reason: "' + rs.reason + '"'});

                    //console.log(rs);
                    if (cb)
                    {
                        cb(rs);
                        cb = null;
                    }
                }

            }
            else if (rs.status < 200) {
                e.emit('message', {type: 'debug', category: logCategory, msg: 'SIP method "' + rq.method + '" progress status ' + rs.status});
                sendRinging(rs, sessionID);
            }
            else {
                e.emit('message', {type: 'debug', category: logCategory, msg: 'SIP method "' + rq.method + '" successfully authorized'});
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
        if (rs.status)
            return [rs.headers['call-id'], (rs.headers.to.params ? rs.headers.to.params.tag : ''), (rs.headers.from.params ? rs.headers.from.params.tag : '')].join(':');
        else
            return [rs.headers['call-id'], (rs.headers.from.params ? rs.headers.from.params.tag : ''), (rs.headers.to.params ? rs.headers.to.params.tag : '')].join(':');
    }
    ua.getDialogID = getDialogID;

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
            dialogs[sessionID].dialogID = ua.getDialogID(rs);
            dialogs[sessionID].sipContext = {
                uri: rs.headers.contact[0].uri,
                headers: {
                    to: rs.headers.to,
                    from: rs.headers.from,
                    'call-id': rs.headers['call-id']
                }
            };
            e.emit('ringing', {sessionID: sessionID, uri:rs.headers.to.uri});
        }
    }

    function getAccountInfo(sipAccountID) {
        var sipAccount = ua.auth[sipAccountID];
        if (sipAccount)
            return sipAccount.user + '@' + sipAccount.host;
        return null;
    }

    function getAccountID(rs) {
        var AccountID = null;
        ua.auth.forEach(function (account, i) {
            var from = ua.parseUri(rs.headers.from.uri),
                    to = ua.parseUri(rs.headers.to.uri);
            if (from && to &&
                    (account.host == from['host'] || account.domain == from['host']) &&
                    account.user == to['user'])
                AccountID = i;
        });
        return AccountID;
    }

    //отправка сообщения SIP MESSAGE вне диалога
    function msgSend(data)
    {
        var sipAccountID = String(data.serviceContactID) || cntx.config.get("activeAccount");
        // var uri = 'sip:' + ua.auth[sipAccountID].user + '@' + ua.auth[sipAccountID].host;

        var rq = {
            method: 'MESSAGE',
            uri: data.to.uri,
            headers: {
                to: {uri: data.to.uri},
                from: {name: '', uri: ua.from[sipAccountID].uri, params: {tag: e.newTag()}},
                'call-id': e.newCallId(ua),
                cseq: {method: 'MESSAGE', seq: Math.floor(Math.random() * 1e5)},
                'content-type': 'text/plain; charset=UTF-8',
                accept: 'text/plain',
               'User-Agent': ua.tname
            },
            content: data.msg
        };

        ua.sendRq(rq, function(rs) {

            var msgStatus = 'The message "' + rq.content + '" was ';
            var sts = ((rs.status === 200) || (rs.status === 202));

            e.emit('message', {category: 'call', sessionID: data.sessionID, type: sts ?  'info' : 'error', msg: msgStatus + (sts ? 'sent' : 'not sent')});

            // console.log('===========================');
            // console.log(data);
            // console.log(data.cb_func.toString());
            if (data.cb_func)
                   data.cb_func(rs);

        }, null, sipAccountID);
    }

    // подписка на событие для отправки сообщения
    e.on('msgSend', msgSend);

//starting stack
    function onData(rs) {
        if (!ua.parseUri(rs.headers.from.uri))
            rs.headers.from.uri = 'sip:' + rs.headers.from.uri + '@' + rs.headers.via[0].host;

//        var sipAccountID = getAccountID(rs);
        var sipAccountID = this.sipAccountID;
        if (sipAccountID == null) {
            e.emit('message', {category: 'call', sessionID: sessionID, type: 'error', msg: 'Invalide sipAccountID for ' + rs.headers.to.uri});
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
            e.emit('message', {category: 'call', sessionID: sessionID, type: 'info', msg: 'MESSAGE recieved: ' + '"' + rs.content + '" from ' + rs.headers.from.uri.replace('sip:', '') + (name ? ' (' + name.replace(/"/g, '') + ')': '')}); // если есть name, удаляем из него двойные кавычки

            // msgSend('Ответ на сообщение "' + rs.content + '"'); // для тестирования
            // отправляем сообщение вне диалога
            // e.emit('msgSend', {msg: 'Ответ на сообщение "' + rs.content + '"', to: {uri: rs.headers.from.uri}, serviceContactID: sipAccountID}); // для тестирования

            // отсылаем сообщение для вывода его в JIN
            e.emit('msgReceived', {sessionID: sessionID, msg: rs.content, to: {uri: rs.headers.to.uri}, from: {name: name, uri: rs.headers.from.uri}, serviceContactID: sipAccountID});

            var rs_ = ua.makeResponse(rs, 200, 'OK. MESSAGE recieved');
            ua.setHeaders(rs_, sipAccountID);
            sUA[sipAccountID].send(rs_);
        }
        else
        // Метод NOTIFY выделен в отдельное условие, т.к. при обмене сообщениями не создаётся диалог и сессия
        if (rs.method === 'NOTIFY')
        {
            e.emit('message', {category: 'call', sessionID: sessionID, type: 'debug', msg: 'Transfer NOTIFY'});
            var rs_ = ua.makeResponse(rs, 200, 'OK');
            ua.setHeaders(rs_, sipAccountID);
            sUA[sipAccountID].send(rs_);
        }
        else
        // Метод OPTIONS выделен в отдельное условие, т.к. при обмене сообщениями не создаётся диалог и сессия
        if (rs.method === 'OPTIONS')
        {
            e.emit('message', {category: 'call', sessionID: sessionID, type: 'debug', msg: 'Transfer OPTIONS'});
            var rs_ = ua.makeResponse(rs, 200, 'OK');
            ua.setHeaders(rs_, sipAccountID);
            sUA[sipAccountID].send(rs_);
        }
        else
        {
            // Если есть параметр tag, т.е. установился сеанс связи
            if (rs.headers.to.params.tag) { // check if it's an in dialog request
                //console.log(rs);
                var sessionID = getSessionID(rs);
                //console.log('from sip_ua',ua.getDialogID(rs));
                //console.log(sessionID,dialogs[sessionID]);
                // console.log(rs.method);
                //
                if (sessionID && dialogs[sessionID])
                {
                    switch (rs.method)
                    {
                        case 'ACK':
                            e.emit('message', {category: 'call', sessionID: sessionID, type: 'debug', msg: 'Invite ACK'});
                            e.emit('inviteACK', {response: rs, sessionID: sessionID});
                            break;
                        case 'CANCEL':
                        case 'BYE':
                            e.emit('callEnded', {uri: rs.headers.from.uri, sessionID: sessionID});
                            var rs_ = ua.makeResponse(rs, 200, 'OK');
                            ua.setHeaders(rs_, sipAccountID);
                            sUA[sipAccountID].send(rs_);
                            break;
                        case 'INFO':
                            if (/dtmf-relay$/.test(rs.headers['content-type']))
                            {
                                var dtmf = rs.content.match(/^Signal=(\S+)/);
                                var dtmf_mode = 'INFO';
                                if (dialogs[sessionID].meta.dtmf_mode != dtmf_mode) {
                                    e.emit('setDtmfMode', {sessionID: sessionID, dtmf_mode: dtmf_mode});
                                }
                                e.emit('dtmf_key', {sessionID: sessionID, key: dtmf[1]});
                            }
                            break;
                        default:
                            var rs_ = ua.makeResponse(rs, 405, 'Method not allowed1');
                            ua.setHeaders(rs_, sipAccountID);
                            sUA[sipAccountID].send(rs_);
                    }
                }
                else
                {
                    var rs_ = ua.makeResponse(rs, 481, "Call doesn't exists");
                    ua.setHeaders(rs_, sipAccountID);
                    sUA[sipAccountID].send(rs_);
                }
            }
            else
            {
                if (rs.method === 'INVITE') {
                    rs.headers.to.params.tag = e.newTag();
                    var rs_ = ua.makeResponse(rs, 180, 'Ringing');
                    ua.setHeaders(rs_, sipAccountID);
                    sUA[sipAccountID].send(rs_);
                    //console.log('onEvent:', 'on_call[' + getAccountInfo(rs) + ']');
                    e.getData({source: 'onEvent', id: 'on_call[' + getAccountInfo(sipAccountID) + ']'}, function (obj) {
                        e.emit('message', {type: 'info', msg: 'Incoming call ' + rs.headers.from.uri});
    //                e.getData({source: 'onEvent', id: 'incomingCall' + sipAccountID}, function(obj) {
                        //console.log(obj);
                        if (obj.data) {
                            var script = obj.data;
                            var sessionID = e.newSessionID();
                            dialogs[sessionID] = {
                                dialogID: ua.getDialogID(rs),
                                sipContext: {
                                    uri: rs.headers.contact[0].uri,
                                    headers: {
                                        to: rs.headers.to,
                                        from: rs.headers.from,
                                        'call-id': rs.headers['call-id']
                                    }
                                },
                                meta: {
                                    from: ua.parseUri(rs.headers.from.uri).user,
                                    to: ua.parseUri(rs.headers.to.uri).user,
                                    type: 'incoming',
                                    status: 'start',
                                    sessionID: sessionID,
                                    script: script,
                                    times: {ringing: new Date().getTime()}
                                }
                            };
                        dialogs[sessionID].meta.pin = e.getPin(dialogs[sessionID].meta.from);

                            e.emit('ringing', {sessionID: sessionID, uri:rs.headers.from.uri});
                            setTimeout(function () {
                                e.emit('incomingCall', {response: rs, sessionID: sessionID, script: script, serviceContactID: sipAccountID});
                            }, 1000);
                        }
                        else {
                            e.emit('message', {type: 'warn', msg: 'For incoming call sip:' + ua.parseUri(rs.headers.to.uri).user + '@' + ua.parseUri(rs.headers.to.uri).host + ' script not set'});
                            var rs_ = ua.makeResponse(rs, 480, 'Temporarily Unavailable');
                            ua.setHeaders(rs_, sipAccountID);
                            sUA[sipAccountID].send(rs_);
                        }
                    });
                }
                else
                {
                    var rs_ = ua.makeResponse(rs, 405, 'Method not allowed');
                    ua.setHeaders(rs_, sipAccountID);
                    sUA[sipAccountID].send(rs_);
                }
            }
        }
    }

    function startSip(sipAccountID, port) {
        var logger = ua.logger;
        return ua.create(
                //ua.start(
                        {port: port,
                            logger: {
                                recv: function (m, i) {
//console.log(m,i);
                                    logger.debug('RECV from ' + i.protocol + ' ' + i.address + ':' + i.port + '\n' + ua.stringify(m)); // util.inspect(m, null, null));
                                },
                                send: function (m, i) {
//console.log(m,i);
                                    logger.debug('SEND to ' + i.protocol + ' ' + i.address + ':' + i.port + '\n' + ua.stringify(m)); // util.inspect(m, null, null));
                                },
                                error: function (e) {
                                    logger.error(e.stack);
                                }
                            }//,
//tcp: false
                        }, onData.bind({sipAccountID: sipAccountID}));
            }
    function register(cb, sipAccountID, unregister) {

        expiresTime = (unregister == undefined ? ua.contact[sipAccountID].params.expires : 0);

        var rq = {
            method: 'REGISTER',
            uri: 'sip:' + ua.auth[sipAccountID].host,
            headers: {
                to: {name: ua.from[sipAccountID].name, uri: ua.from[sipAccountID].uri},
                from: {name: ua.from[sipAccountID].name, uri: ua.from[sipAccountID].uri, params: {tag: e.newTag()}},
                cseq: {method: 'REGISTER', seq: 1},
                'call-id': e.newCallId(ua),
                contact: [ua.contact[sipAccountID]],
                expires: expiresTime
//                'content-length': 0
            }
        };
        ua.sendRq(rq, function (rs) {
            if (rs.status >= 400)
                cb(false);
            else
                cb((digest.authenticateResponse({}, rs) === false) ? false : true);
        }, null, sipAccountID);
    }

    this.stop = function () {
        //sUA[sipAccountID].destroy();
        ua.stop();
        e.emit('message', {type: 'info', msg: 'SIP UA stopped'});
    };

    ua.registerInit = function(sipAccountID, unregister, cb) {
        register(function (reg) {
            var lastStatus = JSON.stringify(ua.status);
            if (unregister != undefined) {
                //console.log('unregistered');

                if (expiresIntvl[sipAccountID]) {
                    clearInterval(expiresIntvl[sipAccountID]);
                    expiresIntvl[sipAccountID] = null;
                }

                if (reg && ua.contact[sipAccountID])
                {
                    ua.status[sipAccountID] = 'unregistered';
                }
                else
                {

                }
            } else {
                //console.log('registered');
                if (reg && ua.contact[sipAccountID])
                {
                    //e.emit('message', {type: 'info', msg: 'SIP UA'+sipAccountID+' registered as "' + ua.from[sipAccountID].uri + '", expires :' + ua.contact[0].params.expires});
                    ua.status[sipAccountID] = 'registered';
                    if (!expiresIntvl[sipAccountID])
                        expiresIntvl[sipAccountID] = setInterval(function () {
                            //console.log('reg',sipAccountID);
                            ua.registerInit(sipAccountID);
                        }, (ua.contact[sipAccountID].params.expires * 1000) - 3000);

                }
                else
                {
                    //e.emit('message', {type: 'error', msg: 'SIP UA'+sipAccountID+' registration failed'});
                    ua.status[sipAccountID] = 'unregistered';
                    //if (expiresIntvl)
                    //    clearInterval(expiresIntvl);
                }
            }
            //e.emit('UA_status', ua.status);
            if (lastStatus != JSON.stringify(ua.status)) {
                e.getData({source: 'getStatusUAList'}, function (obj) {
                    e.emit('updateData', {source: 'listSIP', data: obj.data});
                    e.emit('updateData', {source: 'statusUA', data: obj.data});
                });
            }

            e.emit('message', {type: (ua.status[sipAccountID] == 'registered' ? 'debug' : 'error'), msg: 'SIP UA' + sipAccountID + ' [' + ua.from[sipAccountID].uri + '] registration status "' + ua.status[sipAccountID] + '"'});

            if (cb)
                cb();

        }, sipAccountID, unregister);
    };

    this.start = ua.start = function (cb) {
        //console.log(ua.auth[sipAccountID]);
        init();

        var sipAccountID = 0;
        var toDo = function () {
            if (ua.auth[sipAccountID])
                new findPort(cntx.config.get("sipPort")).getPort(function (port) {
                    //console.log(ua.auth[sipAccountID].disable);

                    if (!ua.auth[sipAccountID].disable) {
                        ua.port.push(port);
                        sUA[sipAccountID] = startSip(sipAccountID, port);
                        ua.from[sipAccountID] = {name: ua.name, uri: 'sip:' + ua.auth[sipAccountID].user + '@' + (ua.auth[sipAccountID].domain ? ua.auth[sipAccountID].domain : ua.auth[sipAccountID].host)};
                        ua.contact[sipAccountID] = {uri: 'sip:' + ua.auth[sipAccountID].user + '@' + ua.hostIp + ':' + port, params: {expires: ua.auth[sipAccountID].expires || 300}};
                        e.emit('message', {type: 'debug', msg: 'SIP UA' + sipAccountID + ' [' + ua.from[sipAccountID].uri + '] started on port ' + port});
                        e.emit('message', {type: 'debug', msg: 'SIP UA' + sipAccountID + ' [' + ua.from[sipAccountID].uri + '] start registration'});
                    }

                    sipAccountID++;
                    toDo();
                });
            else {
                if (ua.contact.length)
                    ua.contact.forEach(function (c, i) {
                        /*
                         if (!expiresIntvl[sipAccountID])
                         expiresIntvl[sipAccountID] = setInterval(function() {
                         //console.log('reg',sipAccountID);
                         ua.registerInit(sipAccountID);
                         }, (ua.contact[sipAccountID].params.expires * 1000) - 3000);
                         */
                        ua.registerInit(i);

                    });
                if (cb)
                    cb(ua);
            }
        };

        if (!ua.hostIp)
            require('dns').lookup(require('os').hostname(), function (err, ip, fam) {
//                console.log(ua.auth[sipAccountID],cntx.sipAccountID);
                ua.hostIp = ip;
                e.emit('message', {type: 'debug', msg: 'Server ip ' + ua.hostIp});
                toDo();
            });
        else
            toDo();
    };
};
module.exports = sipUA;