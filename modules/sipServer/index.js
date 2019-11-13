// ************* Подгрузка модулей *************
let bus = require('../../lib/system/bus');
let os = require('os');
let util = require('util');
let inviteExpires = bus.config.get('sipServerInviteExpires') || 60;
let sipServer = bus.config.get('sipServer') || {};
let proxyPort = sipServer['sipServerPort'] || 5060;
let conf = sipServer['sipClients'] || [];
let realm = os.hostname();
let lastToSend;
let registry = {};
let inviteExpireses = {};
let fs = require('fs');
let nodeSipServer = require('sip_server');
let settings = {
    accounts: { }
};
let server;

// ************* Неотловленные ошибки *************
process.on('uncaughtException', function (e) {
    bus.emit('message', {category: 'sip_proxy', type: 'error', msg: e.stack});
});

// ************* Подгрузка списка аккаунтов *************
if (conf) {
    for (var i = 0; i < conf.length; i++) {
        registry[conf[i].user] = {password: conf[i].password};
        if (conf[i].group) {
            registry[conf[i].user].group = conf[i].group;
        }
    }
}

if ( !bus.config.get('hostIp')  ) {
    bus.request('hostIp', {}, function (err, data) {
        if (err) return false;
        if (data) {
            bus.config.set('hostIp', data);
        } else {
            bus.config.set( 'hostIp', require('ip').address() );
        }
        startProxy();
    });
} else {
    startProxy();
}

// ************* Запуск сервера *************
function startProxy(data) {
    // bus.emit('message', {msg: 'sip_proxy started:' + bus.config.get('hostIp')});

    if (server) {
        bus.emit('message', {msg: 'sip_proxy started'});
        server.ProxyStart(data);
    } else {
        settings.accounts = registry;

        server = new nodeSipServer.SipServer(settings);

        server.ProxyStart(sipServer);
        server.on('updateRegistryList', sendContacts);
    
        sendContacts();
    }
}

// ************* Обновление списка подключенных контактов *************
async function sendContacts() {
    let registeredAccounts = JSON.stringify(await getRegisteredAccounts());

    // bus.emit('message', {category: 'sip_proxy', type: 'trace', msg: registeredAccounts });

    if (lastToSend != registeredAccounts) {
        bus.emit('setSipClients', registeredAccounts);
    }
    lastToSend = registeredAccounts;
}

function getAccount(name) {
    return new Promise((resolve) => {
        server.registry.get('sip:contact:' + name + ':*', (err, data) => {
            if (data) {
                if (data.length && data[data.length - 1] 
                    && ('contact' in data[data.length - 1])) {
                    // bus.emit('message', {category: 'sip_proxy', type: 'trace', msg: 'data.length == ' + data.length });
                    // bus.emit('message', {category: 'sip_proxy', type: 'trace', msg: data[data.length - 1].expires });
                    return resolve(data[data.length - 1].contact.uri);
                } else {
                    return resolve(0);
                }
            }
            resolve(0);
        });
    });
}

async function getRegisteredAccounts() {
    // bus.emit('message', {category: 'sip_proxy', type: 'trace', msg: 'getRegisteredAccounts' });

    let accounts = [];
    for (let key in server.accounts) {
        let account = await getAccount(key);
        if (account) {
            accounts.push( account.replace('sip:', '') );
        } else {
            accounts.push(key);
        }
    }
    return accounts;
}

// ************* Остановка сервера *************
function stopProxy() {
    try {
        if (server && server.stop) {
            server.stop();
        }
    } catch (err) {
        bus.emit('message', {category: 'sip_proxy', type: 'error', msg: err.stack});
    }
}

// ************* Очистить список аккаунтов *************

function clearRegistryList() {
    for (var item in registry) {
        delete registry[item];
    }

    // bus.emit('setSipClients', JSON.stringify([]));

    // ************* Удаляем всех ранее подключенных клиентов *************
    // if (server) {
    //     bus.emit('message', {category: 'sip_proxy', type: 'error', msg: 'Очищаем список аккаунтов'});
        
    //     server.registry.remove('*', (err, data) => {
    //         process.nextTick(sendContacts);
    //     });
    // }
}


//setInterval(sendContacts, 1000);

// ************* Подписаться на обнволения *************
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

                clearRegistryList();

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

                sendContacts();
            }
        });

        function isChangeSipServer(newSipServer) {
            var isChange = false;
            if ( sipServer['sipServerPort'] && (sipServer['sipServerPort'] != newSipServer['sipServerPort']) ) {
                isChange = true;
            } else if ( (sipServer['ws']) && (sipServer['ws']['port']) && ( sipServer.ws.port != newSipServer.ws.port ) ) {
                isChange = true;
                //bus.emit('message', {category: 'sip_proxy', type: 'trace', msg: sipServer.ws.port + ' : ' + newSipServer.ws.port});
            } else if ( (sipServer['tls']) && (sipServer['tls']['key']) && ( sipServer.tls.key != newSipServer.tls.key ) ) {
                isChange = true;
                //bus.emit('message', {category: 'sip_proxy', type: 'trace', msg: sipServer.tls.key + ' : ' + newSipServer.tls.key});
            } else if ( (sipServer['crt']) && (sipServer['tls']['crt']) && ( sipServer.tls.crt != newSipServer.tls.crt ) ) {
                isChange = true;
                //bus.emit('message', {category: 'sip_proxy', type: 'trace', msg: sipServer.tls.crt + ' : ' + newSipServer.tls.crt});
            }
            sipServer = newSipServer;
            return isChange;
        }

        bus.request('sipServer', {}, function (err, data) {
            if (err) return false;
            if ( isChangeSipServer(data) ) {
                // bus.emit('message', {category: 'sip_proxy', type: 'trace', msg: 'Были изменения'});
                bus.emit('setSipClients', JSON.stringify([]));

                // ************* Удаляем всех ранее подключенных клиентов *************
                if (server) {
                    server.registry.remove('*');
                    process.nextTick(sendContacts);

                    stopProxy();
                    startProxy(data);
                }
            } else {
                // bus.emit('message', {category: 'sip_proxy', type: 'trace', msg: 'Нет изменений'});
            }
        });
    }
});















//////////////// Оригинал
/*
var bus = require('../../lib/system/bus');
var sip = require('sip');
var digest = require('sip/digest');
var proxy = require('sip/proxy');
var os = require('os');
var util = require('util');
var inviteExpires = bus.config.get('sipServerInviteExpires') || 60;
var sipServer = bus.config.get('sipServer') || {};
var proxyPort = sipServer['sipServerPort'] || 5060;
//var conf = bus.config.get('sipClients');
var conf = sipServer['sipClients'] || [];
var contacts = {};
var realm = os.hostname();
var lastToSend;
var registry = {};
var inviteExpireses = {};
var fs = require('fs');

//bus.emit('message', {category: 'sip_proxy', type: 'trace', msg: conf});

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

    bus.emit('message', {category: 'sip_proxy', type: 'trace', msg: toSendContacts});
    bus.emit('message', {category: 'sip_proxy', type: 'trace', msg: lastToSend});

    if (lastToSend != toSendContacts) {
        bus.emit('setSipClients', JSON.stringify(toSendContacts));
    }
    lastToSend = toSendContacts;
}

function setDefaultDomain(uri) {
    var tmp_uri = sip.parseUri(uri);
    tmp_uri.host = bus.config.get('hostIp');
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
function stopProxy() {
    try {
        sip.stop();
    } catch (err) {
        bus.emit('message', {category: 'sip_proxy', type: 'error', msg: err});
    }
}

function startProxy() {
    bus.emit('message', {msg: 'sip_proxy started:' + bus.config.get('hostIp')});

    var options = {
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
        }
    };

    if ( ("tls" in sipServer) && ("key" in sipServer.tls) && sipServer.tls.key
      && ("crt" in sipServer.tls) && sipServer.tls.crt ) {
        options['tls'] = {
            key: fs.readFileSync(__dirname + '/' + sipServer.tls.key),
            cert: fs.readFileSync(__dirname + '/' + sipServer.tls.crt)
        };
    }
    if ( ("ws" in sipServer) && ("port" in sipServer.ws) ) {
        options['ws_port'] = sipServer.ws.port;
    }

    proxy.start(options, function (rq) {
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
}

if ( !bus.config.get('hostIp')  ) {
    bus.request('hostIp', {}, function (err, data) {
        if (err) return false;
        if (data) {
            bus.config.set('hostIp', data);
        } else {
            bus.config.set( 'hostIp', require('ip').address() );
        }
        startProxy();
    });
} else {
    startProxy();
}

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

        function isChangeSipServer(newSipServer) {
            var isChange = false;
            if ( (sipServer['ws']) && (sipServer['ws']['port']) && ( sipServer.ws.port != newSipServer.ws.port ) ) {
                isChange = true;
                //bus.emit('message', {category: 'sip_proxy', type: 'trace', msg: sipServer.ws.port + ' : ' + newSipServer.ws.port});
            } else if ( (sipServer['tls']) && (sipServer['tls']['key']) && ( sipServer.tls.key != newSipServer.tls.key ) ) {
                isChange = true;
                //bus.emit('message', {category: 'sip_proxy', type: 'trace', msg: sipServer.tls.key + ' : ' + newSipServer.tls.key});
            } else if ( (sipServer['crt']) && (sipServer['tls']['crt']) && ( sipServer.tls.crt != newSipServer.tls.crt ) ) {
                isChange = true;
                //bus.emit('message', {category: 'sip_proxy', type: 'trace', msg: sipServer.tls.crt + ' : ' + newSipServer.tls.crt});
            }
            sipServer = newSipServer;
            return isChange;
        }

        bus.request('sipServer', {}, function (err, data) {
            if (err) return false;
            if ( isChangeSipServer(data) ) {
                //bus.emit('message', {category: 'sip_proxy', type: 'trace', msg: 'Были изменения'});
                stopProxy();
                startProxy();
            } else {
                //bus.emit('message', {category: 'sip_proxy', type: 'trace', msg: 'Нет изменений'});
            }
        });
    }
});
*/