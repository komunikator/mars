// ************* Подгрузка модулей *************
let os = require('os');
let fs = require('fs');
let sip = require('sip');
let nodeSipServer = require('sip_server');
let bus = require('../../lib/system/bus');
let sipServer = bus.config.get('sipServer') || {};
let conf = sipServer['accounts'] || [];
let server;
let lastToSend;
let accounts = {};

// ************* Неотловленные ошибки *************
process.on('uncaughtException', function (e) {
    bus.emit('message', {category: 'sip_proxy', type: 'error', msg: e.stack});
});

// ************* Подгрузка списка аккаунтов *************
if (conf) {
    for (var i = 0; i < conf.length; i++) {
        accounts[conf[i].user] = { password: conf[i].password };
        if (conf[i].group) {
            accounts[conf[i].user].group = conf[i].group;
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

// ************* Чтение сертификатов *************
function getCertificate(keyPath, crtPath) {
    let key = '';
    let cert = '';

    if (fs.existsSync(keyPath) && fs.existsSync(crtPath)) {
        key = fs.readFileSync(keyPath); 
        cert = fs.readFileSync(crtPath);
    }

    return { 
        key: key,
        cert: cert
    };
}

// ************* Запуск сервера *************
function startProxy(data) {
    if (server) {
        bus.emit('message', {msg: 'sip_proxy started'});
        if (data && data.tls && data.tls.key && data.tls.cert) {
            let sslTls = getCertificate(data.tls.key, data.tls.cert);
            data['tls']['key'] = sslTls['key'];
            data['tls']['cert'] = sslTls['cert'];
        }

        if (data && data.wss && data.wss.key && data.wss.cert) {
            let sslWss = getCertificate(data.wss.key, data.wss.cert);
            data['wss']['key'] = sslWss['key'];
            data['wss']['cert'] = sslWss['cert'];
        }
        server.ProxyStart(data);
    } else {
        server = new nodeSipServer.SipServer({ accounts: accounts });

        if (sipServer && sipServer.tls && sipServer.tls.key && sipServer.tls.cert) {
            let sslTls = getCertificate(sipServer.tls.key, sipServer.tls.cert);
            sipServer['tls']['key'] = sslTls['key'];
            sipServer['tls']['cert'] = sslTls['cert'];
        }

        if (sipServer && sipServer.wss && sipServer.wss.key && sipServer.wss.cert) {
            let sslWss = getCertificate(sipServer.wss.key, sipServer.wss.cert);
            sipServer['wss']['key'] = sslWss['key'];
            sipServer['wss']['cert'] = sslWss['cert'];
        }

        server.ProxyStart(sipServer);
        server.on('updateRegistryList', sendContacts);
    
        sendContacts();
    }
}

// ************* Обновление списка подключенных контактов на sip server *************
async function sendContacts() {
    let registeredAccounts = JSON.stringify(await getRegisteredAccounts());

    // bus.emit('message', {category: 'sip_proxy', type: 'trace', msg: registeredAccounts });

    if (lastToSend != registeredAccounts) {
        bus.emit('setSipClients', registeredAccounts);
    }
    lastToSend = registeredAccounts;
}

function getAccount(user) {
    return new Promise((resolve) => {
        server.registry.get('sip:contact:' + user + ':*', (err, data) => {
            let result = {
                user: user,
                connections: []
            };
            if (data) {
                if (data.length && data[data.length - 1] 
                    && ('contact' in data[data.length - 1])) {

                    for (let i = 0; i < data.length; i++) {
                        result.connections.push( data[i].contact.connection );
                    }
                    return resolve(result);
                } else {
                    return resolve(result);
                }
            }
            resolve(result);
        });
    });
}

async function getRegisteredAccounts() {
    // bus.emit('message', {category: 'sip_proxy', type: 'trace', msg: 'getRegisteredAccounts' });

    let accounts = [];
    for (let key in server.accounts) {
        let account = await getAccount(key);
        if (account && account.connections && account.connections.length) {
            accounts.push( account );
        } else {
            // accounts.push(key);
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
function clearAccountList() {
    for (var item in accounts) {
        delete accounts[item];
    }
}


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

                clearAccountList();

                for (var i = 0; i < data.length; i++) {
                    if (!accounts[data[i].user]) {

                        accounts[data[i].user] = {password: data[i].password}
                    } else {
                        for (var item in accounts) {
                            if (tmp.indexOf(item) + 1 == 0) {
                                delete accounts[item];
                            }
                        }
                    }
                }

                sendContacts();
            }
        });

        function isChangeSipServer(newSipServer) {
            var isChange = false;

            let oldSettingsSipServer = JSON.stringify({
                udp: sipServer['udp'],
                tcp: sipServer['tcp'],
                tls: sipServer['tls'],
                ws: sipServer['ws'],
                wss: sipServer['wss']
            });
            let newSettingsSipServer = JSON.stringify({
                udp: newSipServer['udp'],
                tcp: newSipServer['tcp'],
                tls: newSipServer['tls'],
                ws: newSipServer['ws'],
                wss: newSipServer['wss']
            });

            if (newSettingsSipServer != oldSettingsSipServer) {
                isChange = true;
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