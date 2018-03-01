function init() {
    let bus = require('./system/bus'),
        config = bus.config,
        connections = {},
        b24lib = require('b24_bot_api'),
        b24botApi = new b24lib.B24botApi(),
        request = require('request'),
        fs = require('fs'),
        lastAuth;

    // ******************** manage accounts ******************** //
    function deleteAllB24accounts() {
        for (let key in connections) {
           delete connections[key];
        }
    }

    // проверяем изменился ли список аккаунтов в конфиге
    function isChangeB24accounts() {
        try {
            if (!lastAuth) { 
                lastAuth = JSON.stringify(config.get("b24accounts"));
                return true;
            }

            lastAuth = JSON.parse(lastAuth);

            var b24accountsData = JSON.stringify(config.get("b24accounts")); // Преобразуем в строку что бы получить копию вместо ссылки
            b24accountsData = JSON.parse(b24accountsData);

            b24accountsData = JSON.stringify(b24accountsData);
            lastAuth = JSON.stringify(lastAuth);

            var isChange = (b24accountsData !== lastAuth);
            lastAuth = b24accountsData;

            bus.emit('message', { type: 'info', msg: 'isChangeB24accounts ' + isChange});

            return isChange;
        } catch (err) {
            bus.emit('message', { type: 'error', msg: 'isChangeb24accounts: ' + err });
            return true;
        }
    }

    function refreshB24accounts() {
        if (!isChangeB24accounts()) return false;

        //deleteAllB24accounts();

        let b24accounts = config.get("b24accounts");

        for (let key in b24accounts) {
            let accessToken = '';
            if (connections[key] && connections[key].auth && connections[key].auth.access_token) {
                accessToken = connections[key].auth.access_token;
            }
            connections[key] = {};
            connections[key].auth = b24accounts[key];
            connections[key].auth.id = key;

            if (accessToken) {
                connections[key].auth.access_token = accessToken;
            }
        }

        let copyConnections = JSON.parse(JSON.stringify(connections));

        for (let key in copyConnections) {
            delete copyConnections[key].auth.access_token;
        }

        bus.emit('setB24accounts', JSON.stringify(connections));
    };

    // ******************** обработка входящих сообщений от b24 по rest ******************** //

    function saveB24accounts() {
        let accounts = {};

        for(let key in connections) {
            accounts[key] = JSON.parse(JSON.stringify(connections[key].auth));
            delete accounts[key].access_token;
        }

        bus.emit('updateData', { source: 'config', data: { 'b24accounts': accounts } });
    }

    bus.on('b24.message.incoming', (req) => {
        if (!(req instanceof Object)) {
            return console.error('B24 Error: Request is not a Object');
        }
        if (!req.id) {
            return console.error('B24 Error: Not found key id');
        }
        if (!connections[req.id]) {
            return console.error('B24 Error: Not found b24 connections id: ', req.id);
        }
        if ( (connections[req.id].auth) && (connections[req.id].auth.disable) )
            return console.log(`B24 account ${req.id} disable`);

        req.type = 'b24';

        if (('headers' in req) && ('host' in req.headers) && ('path' in req) && ('protocol' in req)) {
            req.url = connections[req.id].auth.portalLink;

            if ( ('query' in req) && ('code' in req.query) ) {
                req.clientId     = connections[req.id].auth.clientId     || '';
                req.clientSecret = connections[req.id].auth.clientSecret || '';

                b24botApi.onOAuth(req, function(err, data) {
                    if (err) {
                        return console.log(`Callback onOAuth err: ${err}`);
                    }

                    if (req.id && connections[req.id] && connections[req.id].auth && connections[req.id].auth && connections[req.id].auth && data && data.refresh_token && data.access_token) {
                        connections[req.id].auth.refresh_token = data.refresh_token;
                        connections[req.id].auth.access_token = data.access_token;
                        saveB24accounts();
                    }
                });
            }
        }

        if (("body" in req) && ("event" in req.body)) {
            switch (req.body["event"]) {
                case "ONAPPINSTALL":
                    b24botApi.onAppInstall(req);
                    break;
                case "ONIMBOTJOINCHAT":
                    b24botApi.onImbotJoinChat(req);
                    break;
                case "ONIMBOTMESSAGEADD":
                    req.message = req.body["data"]["PARAMS"]["MESSAGE"];

                    bus.request('onEvent', { id: `on_call[${req.id}]` }, (err, data) => {
                        req.nameScript = data;
                        bus.emit('on_message_add', req);
                    });
                    // b24botApi.onImbotMessageAdd(req);
                    break;
                case "ONIMBOTDELETE":
                    b24botApi.onImbotDelete(req);
                    break;
                case "ONAPPUPDATE":
                    b24botApi.onAppUpdate(req);
                    break;
                case "ONIMCOMMANDADD":
                    b24botApi.onImCommandAdd(req);
                    break;
                default:
                    console.log("default: " + req.body["event"]);
                    break;
            }
        }
    });

    bus.onRequest('on_b24_request', function(req, cb) {
        b24botApi.onB24request(req, cb);
    });

    bus.on('on_answer_message', (req) => {
        if (req && req.type && req.type == 'b24')
            b24botApi.onImbotMessageAdd(req);
    });

    bus.on('refresh', function(type) {
        if (type === 'configData')
            refreshB24accounts();
    });

    // ******************** tasks  ******************** //
    bus.on('create_task', (name) => {
        console.log(`create_task name: ${name}`);

        if ( fs.existsSync(`tasks/${name}`) ) {
            let task = require(`../tasks/${name}`);
            registerB24botApi(task.src);
        }
    });

    function registerB24botApi(task) {
        if (!task || !task.onEvent) return console.log('B24 not found task.onEvent');

        let b24id = task.onEvent.match( /on_call\[\w+]/ig );

        if (b24id && b24id.length) {
            b24id = b24id[0].replace('on_call[', '').slice(0, -1);
        } else {
            return console.log('registerB24botApi b24id.lenght == 0');
        }

        if (b24id && connections[b24id] && connections[b24id].auth && connections[b24id].auth.access_token && connections[b24id].auth.portalLink) {
            let req = {
                url: connections[b24id].auth.portalLink,
                settings: {
                    access_token: connections[b24id].auth.access_token,
                    CODE: task.CODE || '',
                    TYPE: task.TYPE || 'B',
                    EVENT_MESSAGE_ADD: task.EVENT_MESSAGE_ADD || '',
                    EVENT_WELCOME_MESSAGE: task.EVENT_WELCOME_MESSAGE || '',
                    EVENT_BOT_DELETE: task.EVENT_BOT_DELETE || '',
                    PROPERTIES: {
                        NAME: task.NAME || '',
                        LAST_NAME: task.NAME || '',
                        COLOR: task.COLOR || '',
                        EMAIL: task.EMAIL || '',
                        PERSONAL_BIRTHDAY: task.PERSONAL_BIRTHDAY || '',
                        WORK_POSITION: task.WORK_POSITION || '',
                        PERSONAL_WWW: task.PERSONAL_WWW || '',
                        PERSONAL_GENDER: task.PERSONAL_GENDER || '',
                        PERSONAL_PHOTO: task.PERSONAL_PHOTO || ''
                    }
                }
            };

            b24botApi.onAppInstall(req, (err, data) => {
                if (err) {
                    return console.error(err);
                }

                data = JSON.parse(data);

                console.log('cbB24onAppInstall imbot.register data: ');

                if (data.result) {
                    console.log(`cbB24onAppInstall data.result: ${data.result}`);
                    botId = data.result;
                } else {
                    if (data.error && data.error == 'expired_token') {
                        console.log('Протухли токены');
                    }
                    return console.log('not found data.result');
                }
            });
        } else {
            console.log('registerB24botApi not found access_token or portalLink');
        }
    }

};
module.exports = init();