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

            //bus.emit('message', { type: 'info', msg: 'isChangeB24accounts ' + isChange});

            return isChange;
        } catch (err) {
            bus.emit('message', { type: 'error', msg: 'isChangeb24accounts: ' + err });
            return true;
        }
    }

    function refreshB24accounts() {
        if (!isChangeB24accounts()) return false;

        let b24accounts = config.get("b24accounts");

        for (let key in connections) {
            if (!b24accounts[key]) {
                delete connections[key];
            }
        }

        for (let key in b24accounts) {
            let accessToken = '';
            if (connections[key] && connections[key].auth && connections[key].auth.access_token) {
                accessToken = connections[key].auth.access_token;
            }
            let chatBots;
            if (connections && connections[key] && connections[key].chatBots) {
                chatBots = JSON.parse(JSON.stringify(connections[key].chatBots));
            }
            connections[key] = {};
            connections[key].chatBots = chatBots || {};
            connections[key].auth = b24accounts[key];
            connections[key].auth.id = key;
            connections[key].auth.access_token = '';

            if (accessToken) {
                connections[key].auth.access_token = accessToken;
            }
        }

        bus.emit('setB24accounts', JSON.stringify(connections));
    };

    // ******************** обработка входящих сообщений от b24 по rest ******************** //
    function saveB24accounts() {
        let accounts = {};

        for(let key in connections) {
            accounts[key] = JSON.parse(JSON.stringify(connections[key].auth));


            if (connections[key] && connections[key].chatBots) {
                for (let nameTask in connections[key].chatBots) {
                    registerBot(nameTask);
                }
            } else {
                console.log('not found chatbots: ', connections[key].chatBots);
            }

            delete accounts[key].access_token;
            delete accounts[key].chatBots;
        }

        bus.emit('updateData', { source: 'config', data: { 'b24accounts': accounts } });
    }

    bus.on('b24.message.incoming', (req) => {
        //console.log(req);
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

                    /*
                    try {
                        data = JSON.parse(data);
                    } catch(err) {
                        return console.log('Error json.parse: ', err);
                    }
                    */

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
                    console.log("B24 default case: " + req.body["event"]);
                    break;
            }
        }
    });

    bus.onRequest('on_b24_request', function(req, cb) {
        b24botApi.onB24request(req, cb);
    });

    bus.on('on_answer_message', (req) => {
        if (req && req.type && req.type == 'b24') {
            let request = {
                url: req.url,
                answer: req.answer,
                settings: {
                    DIALOG_ID: req.body.data.PARAMS.DIALOG_ID,
                    BOT_ID: req.body.data.BOT[0].BOT_ID,
                    access_token: req.body.auth.access_token
                }
            };

            b24botApi.sendMessage(request, (err, data) => {
                if (err) {
                    console.error(err);
                    return done(err);
                }

                try {
                    data = JSON.parse(data);
                } catch(err) {
                    return console.log('B24 send answer error json.parse: ', err);
                }

                //console.log(`Callback imbot.message.add data: ${data}`);
            });
            //b24botApi.onImbotMessageAdd(req);
        }
    });

    bus.on('refresh', function(type) {
        if (type === 'configData') {
            refreshB24accounts();
        }

        if ( !isChangeB24accounts() ) return false;

        // Get first access_token on start application
        for (let key in connections) {
            if (connections[key] && connections[key].auth && 
                connections[key].auth.refresh_token && connections[key].auth.clientId &&
                (!connections[key].auth.access_token) && connections[key].auth.clientSecret && 
                (connections[key].auth.disable != 1)) {

                let req = {
                    'client_id': connections[key].auth.clientId,
                    'client_secret': connections[key].auth.clientSecret,
                    'refresh_token': connections[key].auth.refresh_token
                };

                b24botApi.onRefreshTokens(req, (err, data) => {
                    if (err) return console.log('Callback on refresh tokens ', err);

                    try {
                        data = JSON.parse(data);
                    } catch(err) {
                        return console.log('Error json.parse on refresh token: ', err);
                    }

                    if (data && data.access_token && data.refresh_token) {
                        connections[key].auth.access_token = data.access_token;
                        connections[key].auth.refresh_token = data.refresh_token;
                        saveB24accounts();
                    }
                });
            };
        }
    });

    // ******************** tasks ******************** //
    function registerBot(name, cb) {
        console.log('registerBot ', name);
        let path = `tasks/${name}`;
        if ( fs.existsSync(path) ) {
            fs.readFile(path, 'utf8', function(err, contents) {
                if (err) {
                    if (cb) {
                        console.log(err);
                        cb(err, contents);
                    }
                    return;
                }

                try {
                    contents = JSON.parse( contents.replace('exports.src =', '') );
                } catch (err) {
                    if (cb) {
                        cb(err);
                    }
                    return;
                }
                registerB24botApi(contents, name, cb);
            });
        } else {
            if (cb) { 
                cb('Not found task on registerBot');
            }
        }
    }

    bus.on('setOnEventTask', registerBot);

    function deactivateTask(name) {
        let path = `tasks/${name}`;
        if ( fs.existsSync(path) ) {
            fs.readFile(path, 'utf8', function(err, contents) {
                if (err) {
                    return console.log(err);
                }

                try {
                    contents = JSON.parse( contents.replace('exports.src =', '') );
                } catch(err) {
                    return;
                }

                let b24id;

                if (contents && contents.onEvent) {
                    b24id = contents.onEvent.match( /on_call\[\w+]/ig );
                    if (b24id && b24id.length) {
                        b24id = b24id[0].replace('on_call[','').slice(0, -1);
                    }
                }

                if (b24id && connections[b24id] && connections[b24id].auth && connections[b24id].auth.access_token && connections[b24id].auth.portalLink) {
                    if (!connections[b24id].chatBots || !connections[b24id].chatBots[name] || !connections[b24id].chatBots[name].botId) {
                        return console.log('Not found botId on unregister bot. b24id: ', b24id, ' nameTask: ', name);
                    }

                    let botId = connections[b24id].chatBots[name].botId;

                    let req = {
                        url: connections[b24id].auth.portalLink,
                        settings: {
                            BOT_ID: botId,
                            access_token: connections[b24id].auth.access_token
                        }
                    };

                    function onAppUninstall(err, data) {
                        if (err) {
                            console.error(err);
                            return console.log(err);
                        }

                        try {
                            data = JSON.parse(data);
                        } catch (err) {
                            return console.log('JSON.parse error: ', err);
                        }

                        console.log(`imbot.unregister data: ${data}`);

                        if (data.result) {
                            console.log(`data.result: ${data.result}`);
                        } else {
                            return console.log('not found data.result');
                        }
                    }
                    b24botApi.onAppUninstall(req, onAppUninstall);
                }
            })
        }
    }

    bus.on('deactivateTask', deactivateTask);
    bus.onRequest('registerB24Bot', registerBot);

    function registerB24botApi(task, nameTask, cb) {
        if (!task || !task.onEvent) return console.log('B24 not found task.onEvent');
        let b24id = task.onEvent.match( /on_call\[\w+]/ig );

        if (b24id && b24id.length) {
            b24id = b24id[0].replace('on_call[', '').slice(0, -1);
            //if (!nameTask || !connections[b24id] || !connections[b24id].chatBots || !connections[b24id].chatBots[nameTask]) {
            //    return console.log('Not found chatbots nameTask: ', nameTask, ' b24id:', b24id);
            //}
            connections[b24id].chatBots = connections[b24id].chatBots || {};
            connections[b24id].chatBots[nameTask] = connections[b24id].chatBots[nameTask] || {};
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
                        LAST_NAME: task.LAST_NAME || '',
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

                try {
                    data = JSON.parse(data);
                } catch(err) {
                    return console.error(err);
                }

                if (data && data.result) {
                    console.log(`cbB24onAppInstall data.result: ${data.result}`);
                    connections[b24id].chatBots[nameTask] = {
                        botId: data.result
                    };
                } else {
                    connections[b24id].chatBots[nameTask] = {
                        error: data.error
                    };
                    console.log('Not found data.result');
                }

                bus.emit('setB24accounts', JSON.stringify(connections));

                if (cb) {
                    return cb(err, connections[b24id].chatBots[nameTask]);
                }
            });
        } else {
            connections[b24id].chatBots[nameTask] = {
                error: 'Not found access_token or portal link'
            };
            console.log('registerB24botApi not found access_token or portalLink');
        }
    }

};
module.exports = init();