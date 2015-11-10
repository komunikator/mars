var ua;
var sipLogger;
function send(data, cb) {
    /*
     {
     auth:{
     user:user
     password:password    
     },
     msisdn:msisdn,
     text:text
     */

    if (!data || !data.auth || !data.auth.user || !data.auth.password || !data.text || !data.msisdn)
    {
        if (cb)
            cb();
        return;
    }

    function swapBytes(buffer) {
        var l = buffer.length;
        if (l & 0x01) {
            throw new Error('Buffer length must be even');
        }
        for (var i = 0; i < l; i += 2) {
            var a = buffer[i];
            buffer[i] = buffer[i + 1];
            buffer[i + 1] = a;
        }
        return buffer;
    }
    if (!ua)
        ua = require('../lib/sip');
    if (!ua.send)
        ua.start({port: 9010, logger: {
                recv: function(m, i) {
                    if (sipLogger)
                        sipLogger.debug('RECV from ' + i.protocol + ' ' + i.address + ':' + i.port + '\n' + ua.stringify(m));
                    else
                        console.log(m, i);
                },
                send: function(m, i) {
                    if (sipLogger)
                        sipLogger.debug('SEND to ' + i.protocol + ' ' + i.address + ':' + i.port + '\n' + ua.stringify(m)); // util.inspect(m, null, null));
                    else
                        console.log(m, i);
                },
                error: function(e) {
                    if (sipLogger)
                        sipLogger.error(e.stack);
                    else
                        console.log(e.stack);
                }
            }});

    function rstring() {
        return Math.floor(Math.random() * 1e6).toString();
    }

    var rq = {
        method: 'MESSAGE',
        uri: 'sip:' + data.msisdn + '@sms.multifon.ru',
        headers: {
            route: ' <sip:' + data.auth.user + '@193.201.229.35:5060;transport=tcp;lr>',
            to: {uri: 'sip:' + data.msisdn + '@sms.multifon.ru'},
            from: {uri: 'sip:' + data.auth.user + '@multifon.ru', params: {tag: rstring()}},
            'call-id': rstring(),
            cseq: {method: 'MESSAGE', seq: 1},
            accept: 'text/plain',
            'x-movial-content': 'sms/text',
            'x-movial-deliveryreport': false,
            'User-Agent': 'MCPC-MG-1-0-34-3490/2.0.0.5186',
            'Supported': '100rel',
            'content-type': 'text/plain; charset=ISO-10646-UCS-2'
        },
        content: swapBytes(require("encoding").convert(data.text, "ucs2"))
    };
    ua.send(rq, function(rs) {
        if (rs.status === 401 || rs.status === 407) {
            rq.headers['cseq'].seq++;
            rq.headers.via.shift();
            require('../lib/digest').signRequest({}, rq, rs, data.auth);
            ua.send(rq,
                    function(rs_) {
                        if (rs_.status < 200) {
                        }
                        else
                        if (rs_.status === 200) {
                            if (cb)
                                cb(rs_);
                        }
                        else
                        {
                            if (cb)
                                cb(rs_);
                        }
                    }
            );
        }
        ;
    });
}
;

exports.send = send;

exports.init = function(cntx) {
    var e = cntx.Events;
    var auth;
    e.getData({source: 'sipAccounts'}, function(obj) {
        if (obj.data)
            obj.data.forEach(function(account) {
                if (account.host == 'multifon.ru')
                    auth = account;
            });
        //console.log('sipAccounts', auth);
        if (auth) {
            e.on('sendSMS', function(d, cb) {
                var cfg = {
                    auth: auth,
                    msisdn: d.msisdn,
                    text: d.text
                };
                send(cfg, function(rs) {
                    if (cb)
                        cb(rs);
                    if (rs.status === 200) {
                        e.emit('message', {category: 'call', sessionID: d.sessionID, msg: 'SMS sent successfully to "' + d.msisdn + '"', type: 'debug'});
                        //console.log('success');
                    }
                    else
                        e.emit('message', {category: 'call', sessionID: d.sessionID, msg: 'SMS sent failure to "' + d.msisdn + '"', type: 'debug'});
                    //console.log('failure');
                });
            });
            e.on('sendSMS', function(d) {
                e.emit('message', {category: 'call', sessionID: d.sessionID, msg: 'Sent SMS "' + d.text + '" to "' + d.msisdn + '"', type: 'info'});
            });
            e.emit('message', {msg: 'Add "sendSMS" listener', type: 'debug'});

        }
    });

    e.getData({source: 'getLogger', id: 'sip'}, function(obj) {
        sipLogger = obj.data;
        //console.log('getLogger', sipLogger);
    });

};
