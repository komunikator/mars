function init() {
    let bus = require('./system/bus'),
        config = bus.config,
        connections = {},
        b24Handlers = require('./b24Handlers.js'),
        request = require('request'),
        lastAuth;

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

            var b24accountsData = JSON.stringify(config.get("b24accounts")); // Преобразуем в строк что бы получить копию вместо ссылки
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
        
        deleteAllB24accounts();

        let b24accounts = config.get("b24accounts");

        for (let key in b24accounts) {
            connections[key] = {};
            connections[key].auth = b24accounts[key];
            connections[key].auth.id = key;
        }

        bus.emit('setB24accounts', JSON.stringify(connections));
    };

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
            return false;

        if (("headers" in req) && ("host" in req.headers) && ("path" in req) && ("protocol" in req)) {
            req.url = req.protocol + "://" + req.headers.host + req.path;

            if ( (connections[req.id].auth instanceof Object) && 
                (connections[req.id].auth.settings instanceof Object) &&
                (connections[req.id].auth.settings.PROPERTIES instanceof Object) ) {

                connections[req.id].auth.settings['EVENT_MESSAGE_ADD'] = connections[req.id].auth.settings['EVENT_MESSAGE_ADD'] || req.url;
                connections[req.id].auth.settings['EVENT_WELCOME_MESSAGE'] = connections[req.id].auth.settings['EVENT_WELCOME_MESSAGE'] || req.url;
                connections[req.id].auth.settings['EVENT_BOT_DELETE'] = connections[req.id].auth.settings['EVENT_BOT_DELETE'] || req.url;

                req.settings = connections[req.id].auth.settings;

                if ( ("query" in req) && ("code" in req.query) ) {
                    req.clientId     = connections[req.id].auth.clientId     || '';
                    req.clientSecret = connections[req.id].auth.clientSecret || '';

                    b24Handlers.onOAuth(req);
                }
            }
        }

        if (("body" in req) && ("event" in req.body)) {
            switch (req.body["event"]) {
                case "ONAPPINSTALL":
                    b24Handlers.onAppInstall(req);
                    break;
                case "ONIMBOTJOINCHAT":
                    b24Handlers.onImbotJoinChat(req);
                    break;
                case "ONIMBOTMESSAGEADD":
                    b24Handlers.onImbotMessageAdd(req);
                    break;
                case "ONIMBOTDELETE":
                    b24Handlers.onImbotDelete(req);
                    break;
                case "ONAPPUPDATE":
                    b24Handlers.onAppUpdate(req);
                    break;
                case "ONIMCOMMANDADD":
                    b24Handlers.onImCommandAdd(req);
                    break;
                default:
                    console.log("default: " + req.body["event"]);
                    break;
            }
        }
    });

    bus.on('refresh', function(type) {
        if (type === 'configData')
            refreshB24accounts();
    });
};
module.exports = init();