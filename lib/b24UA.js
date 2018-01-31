function init() {
    let bus = require('./system/bus'),
        config = bus.config,
        sip = require('./sip/sip');
        sip.connections = sip.connections || {},
        b24Handlers = require('./b24Handlers.js'),
        request = require('request');

    function deleteAllB24Accounts() {
        for (let key in sip.connections) {
            if ( (!sip.connections[key].type) || (b24Accounts[key].type != 'b24') ) continue;
            delete sip.connections[key];
        }
    }

    function refreshB24Accounts() {
        sip.connections = sip.connections || {};

        deleteAllB24Accounts();

        let b24Accounts = config.get("sipAccounts");

        for (let key in b24Accounts) {
            if ( (!b24Accounts[key].type) || (b24Accounts[key].type != 'b24') ) continue;

            sip.connections[key] = {};
            sip.connections[key].auth = b24Accounts[key];
            sip.connections[key].auth.id = key;
        }
    };

    bus.on('b24.message.incoming', (req) => {
        if (!(req instanceof Object)) {
            return console.error('B24 Error: Request is not a Object');
        }
        if (!req.id) {
            return console.error('B24 Error: Not found key id');
        }
        if (!sip.connections[req.id]) {
            return console.error('B24 Error: Not found sip connections id: ', req.id);
        }

        if (("headers" in req) && ("host" in req.headers) && ("path" in req) && ("protocol" in req)) {
            req.url = req.protocol + "://" + req.headers.host + req.path;

            if ( (sip.connections[req.id].auth instanceof Object) && 
                (sip.connections[req.id].auth.settings instanceof Object) &&
                (sip.connections[req.id].auth.settings.PROPERTIES instanceof Object) ) {

                sip.connections[req.id].auth.settings['EVENT_MESSAGE_ADD'] = sip.connections[req.id].auth.settings['EVENT_MESSAGE_ADD'] || req.url;
                sip.connections[req.id].auth.settings['EVENT_WELCOME_MESSAGE'] = sip.connections[req.id].auth.settings['EVENT_WELCOME_MESSAGE'] || req.url;
                sip.connections[req.id].auth.settings['EVENT_BOT_DELETE'] = sip.connections[req.id].auth.settings['EVENT_BOT_DELETE'] || req.url;

                req.settings = sip.connections[req.id].auth.settings;

                if ( ("query" in req) && ("code" in req.query) ) {
                    req.clientId     = sip.connections[req.id].auth.clientId     || '';
                    req.clientSecret = sip.connections[req.id].auth.clientSecret || '';

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
            refreshB24Accounts();
    });
};
module.exports = init();