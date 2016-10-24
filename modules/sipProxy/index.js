var bus = require('../../lib/system/bus');
var sip = require('sip');
var digest = require('sip/digest');
var proxy = require('sip/proxy');
var os = require('os');
var util = require('util');
var conf = bus.config.get('sipClients');
var inviteExpires = bus.config.get('sipProxyInviteExpires') || 60;
var proxyPort = bus.config.get('sipProxyPort') || 5060;
var contacts = {};
var realm = os.hostname();
var lastToSend;
var registry = {};
var inviteExpireses = {};
var fs = require('fs');

process.on('uncaughtException', function (e) {
    bus.emit('message', {category: 'sip_proxy', type: 'error', msg: e.toString()});
});

function sendContacts() {
    var toSendContacts = [];
    for (var item in contacts) {
        if (!contacts[item][0].params || (contacts[item][0].params.expires != 0)) {
            toSendContacts.push(item + '@' + sip.parseUri(contacts[item][0].uri).host + ':' + sip.parseUri(contacts[item][0].uri).port);
        }
    }
    ;
    if (lastToSend != toSendContacts) {
        bus.emit('setSipClients', JSON.stringify(toSendContacts));
    }
    lastToSend = toSendContacts;
}

function setDefaultDomain(uri) {
    var tmp_uri = sip.parseUri(uri);
    tmp_uri.host = require("ip").address();
    tmp_uri.port = proxyPort;
    return sip.stringifyUri(tmp_uri);
}

function setDefaultUri(user, uri) {
    uri = setDefaultDomain(uri);
    var tmp_uri = sip.parseUri(uri);
    tmp_uri.user = user;
    return sip.stringifyUri(tmp_uri);
}

function sipDigestRegister(rq, username) {
    var userinfo = registry[username];
    if (!userinfo) {
        var session = {realm: realm};
        sip.send(digest.challenge({realm: realm}, sip.makeResponse(rq, 401, 'Authentication Required')));
    } else {
        userinfo.session = userinfo.session || {realm: realm};
        registry[username] = userinfo;

        if (!digest.authenticateRequest(userinfo.session, rq, {user: username, password: userinfo.password})) {
            sip.send(digest.challenge(userinfo.session, sip.makeResponse(rq, 401, 'Authentication Required')));
        }
        else {
            if (contacts[username] && contacts[username].timer) {
                clearTimeout(contacts[username].timer);
            }

            userinfo.contact = rq.headers.contact;
            registry[username] = userinfo;
            var rs = sip.makeResponse(rq, 200, 'OK');
            contacts[username] = rq.headers.contact;
            contacts[username].timer = setTimeout(function () {
                delete contacts[username];
                sendContacts();
            }, parseInt(rq.headers.expires || (rq.headers.contact && rq.headers.contact[0] && rq.headers.contact[0].params.expires)) * 1000);
            sendContacts();
            rs.headers.contact = rq.headers.contact;
            sip.send(rs);
        }
    }
}

if (conf) {
    for (var i = 0; i < conf.length; i++) {
        registry[conf[i].user] = {password: conf[i].password};
        if (conf[i].group) {
            registry[conf[i].user].group = conf[i].group;
        }
    }
}

bus.emit('message', {msg: 'sip_proxy started:' + require("ip").address()});

proxy.start({
    port: proxyPort,
    logger: {
        recv: function (m, i) {
            bus.emit('message', {category: 'sip_proxy', msg: 'RECV from ' + i.protocol + ' ' + i.address + ':' + i.port + '\n' + sip.stringify(m) + '\n'});
        },
        send: function (m, i) {
            bus.emit('message', {category: 'sip_proxy', msg: 'RECV from ' + i.protocol + ' ' + i.address + ':' + i.port + '\n' + sip.stringify(m) + '\n'});
        },
        error: function (e) {
            bus.emit('message', {category: 'error', type: 'error', msg: e.stack});
        }
    },
    tls: {
        key: fs.readFileSync(__dirname + '/server_localhost.key'),
        cert: fs.readFileSync(__dirname + '/server_localhost.crt')
    }
}, function (rq) {
    if (rq.method === 'REGISTER') {
        var username = sip.parseUri(rq.headers.to.uri).user;
        sipDigestRegister(rq, username);
    } else {
        if (rq.headers.contact && rq.headers.contact[0].uri) {
            rq.headers.contact[0].uri = setDefaultDomain(rq.headers.contact[0].uri);
        }
        var user = sip.parseUri(rq.uri).user;
        if (contacts[user] && Array.isArray(contacts[user]) && contacts[user].length > 0) {
            rq.uri = contacts[user][0].uri;
            if (rq.method === 'REFER') {
                rq.headers['refer-to'].params.expires = inviteExpires;
                if (rq.headers['refer-to'].params.expires && rq.method === 'REFER'){
                    inviteExpireses[sip.parseUri(rq.headers.to.uri).user+'_'+sip.parseUri(rq.headers['refer-to'].uri).user] = parseInt(rq.headers['refer-to'].params.expires);
                }
            }
            proxy.send(rq);
        } else {
            if (rq.method === 'INVITE') {
                var group = [];
                var invites = [];

                var cur_expires = rq.headers.expires || inviteExpireses[sip.parseUri(rq.headers.from.uri).user + '_' + sip.parseUri(rq.headers.to.uri).user] || inviteExpireses;
                var timer = setTimeout(function () {
                    proxy.send(sip.makeResponse(rq, 486, 'Invite timeout'));
                    cancelInvite({headers: {to: {uri: ''}}});
                }, cur_expires * 1000);
                function cancelInvite(rs) {
                    var inv_rq = invites.shift();
                    if (!inv_rq)
                        return;
                    if (inv_rq.headers.to.uri == rs.headers.to.uri)
                        return cancelInvite(rs);
                    var cnc_rq = sip.copyMessage(inv_rq);
                    cnc_rq.method = 'CANCEL';
                    cnc_rq.headers.cseq.method = 'CANCEL';
                    delete cnc_rq.content;
                    proxy.send(cnc_rq, function () {
                        cancelInvite(rs);
                    });
                }
                ;
                for (var item in registry)
                    if (user == registry[item].group && contacts[item]) {
                        group.push(item);
                    }
                if (group.length) {
                    toDo();
                    function toDo() {
                        var item = group.shift();
                        if (!item)
                            return;
                        var inv_rq = sip.copyMessage(rq);
                        inv_rq.uri = contacts[item][0].uri;
                        inv_rq.headers.to.uri = setDefaultUri(item, rq.headers.to.uri);
                        invites.push(inv_rq);
                        proxy.send(inv_rq, function (rs) {
                            inv_rq.headers.to = rs.headers.to;
                            if (rs.status == 486){
                                var to_del;
                                for (var i = 0; i < invites.length; i++){
                                    if (rs.headers.to.uri == invites[i].headers.to.uri){
                                        to_del = i;
                                    }
                                }
                                delete invites[to_del];
                            }
                            if (rs.status == 486){
                                if (invites.length <= 1){
                                    rs.headers.via.shift();
                                    proxy.send(rs);
                                }
                            } else if (rs.status != 487) {
                                rs.headers.via.shift();
                                proxy.send(rs);
                            }

                            if (rs.status == 200 && rs.headers.cseq.method == 'INVITE') {
                                clearTimeout(timer);
                                cancelInvite(rs);
                            }
                            toDo()
                        });
                    }
                } else
                    proxy.send(sip.makeResponse(rq, 404, 'Not Found'));
            } else
                proxy.send(sip.makeResponse(rq, 404, 'Not Found'));
        }
    }
});

bus.on('refresh', function (type) {
    if (type == 'configData') {
        bus.request('sipClients', {}, function (err, data) {
            if (data) {
                var tmp = [];
                for (var i = 0; i < data.length; i++) {
                    tmp[i] = data[i].user;
                }

                for (var i = 0; i < data.length; i++) {
                    if (data[i].group && tmp.indexOf(data[i].group) == -1) {
                        tmp.push(data[i].group);
                    }
                }

                for (var i = 0; i < data.length; i++) {
                    if (!registry[data[i].user]) {

                        registry[data[i].user] = {password: data[i].password}
                    } else {
                        for (var item in registry) {
                            if (tmp.indexOf(item) + 1 == 0) {
                                delete registry[item];
                            }
                        }
                    }
                }
            }
        });
        sendContacts();
    }
});
