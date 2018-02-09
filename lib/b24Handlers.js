
/******************** Зависимости ********************/
let request = require('request');
let nodeBase64image = require('node-base64-image');

/******************** Контроллеры ********************/

// Post запросы к bitrix24
function restCommand(method, params, auth) {
    if (!method || !params || !auth) {
        return console.error(`Not method ${method} or params ${params} or auth ${auth}`);
    }

    var queryUrl  = 'https://' + auth['domain'] + '/rest/' + method;
    //console.log('queryUrl: ', queryUrl);

    params['access_token']              = auth['access_token'];

    //console.log('restCommand: ', queryUrl);
    //console.log('params: ', params);

    request.post(queryUrl, {form: params}, function (err, res, data) {
        if (err) {
            return console.error('Request err: ', err);
        }
        //console.log('restCommand data: ', data);
    });
}

// на установку приложения
function onAppInstall(req) {
    if (!req.url) return false;

    if (req && req.settings && req.settings.PROPERTIES && 
        req.settings.PROPERTIES.PERSONAL_PHOTO) {

        nodeBase64image.encode(req.settings.PROPERTIES.PERSONAL_PHOTO, { string: true, local: false }, function (err, data) {
            if (err) {
                return console.error("err: ", err);
            }
            req.settings.PROPERTIES.PERSONAL_PHOTO = data || "";
            restCommand('imbot.register', req.settings, req.body['auth']);
        });
    } else {
        restCommand('imbot.register', req.settings, req.body['auth']);
    }
}

function onImbotJoinChat(req, res) {
    var msg = "Я - чат бот iBender. Буду помогать вам.\nЧтобы я ответил в чате, упомяните меня в сообщении или кликните на мой аватар :)";
    sendMessage(msg, req);

}

// Входящее сообщение от пользователя
function onImbotMessageAdd(req, res) {
    // var msg = req.body["data"]["PARAMS"]["MESSAGE"];

    // getAnswer(req);

    sendMessage(req.answer, req);
}


// На удаление приложения
function onImbotDelete(req, res) {
    console.log("Удаление чат бот");
}

// На обновление приложения
function onAppUpdate(req, res) {
    console.log("Обновление приложения");
}

// Обработчик команд
function onImCommandAdd(req, res) {
    console.log("Обработчик команд");
}


/******************** Запросы к bitrix24 ********************/

// Получить просроченные задачи
function b24BadTasks(req) {
    var params = {
        "auth": req.body["auth"]["access_token"],
        "ORDER": {
            "DEADLINE": "desc"
        },
        "FILTER": {
            "RESPONSIBLE_ID": req.body["data"]["PARAMS"]["FROM_USER_ID"],
            "<DEADLINE": "2018-01-30"
        },
        "PARAMS": {
            "NAV_PARAMS": {
                "nPageSize": 1,
                "iNumPage": 1
            }
        },
        "SELECT": ["TITLE"]
    };
    restCommand("task.item.list", params, req.body["auth"]);
}


/******************** Чат бот ********************/

// Получить ответ от чат бот
function getAnswer(req) {
    switch (req.body["data"]["PARAMS"]["MESSAGE"]) {
        case "что горит":
            b24BadTasks(req);
            break;
        default:
            var msg = "Ответ чат бота на сообщение: " + req.body["data"]["PARAMS"]["MESSAGE"];
            sendMessage(msg, req);
            break;
    }
}

// Отправить сообщение
function sendMessage(msg, req) {
    var answer = {
        "DIALOG_ID": req.body['data']['PARAMS']['DIALOG_ID'],
        "MESSAGE": msg

    };

    restCommand('imbot.message.add', answer, req.body["auth"]);
}


/******************** API модуля ********************/
module.exports.onAppInstall      = onAppInstall;
module.exports.onAppUpdate       = onAppUpdate;
module.exports.onImCommandAdd    = onImCommandAdd;
module.exports.onImbotJoinChat   = onImbotJoinChat;
module.exports.onImbotMessageAdd = onImbotMessageAdd;
module.exports.onImbotDelete     = onImbotDelete;
module.exports.sendMessage       = sendMessage;


/******************** OAuth авторизация ********************/

function onOAuth(req) {
    if ( ('code' in req.query) && ('state' in req.query) &&
         ('domain' in req.query) && ('member_id' in req.query) &&
         ('scope' in req.query) && ('server_domain' in req.query) &&
         ('url' in req) ) {

        var url = 'https://' + req.query['domain'] + '/oauth/token/?client_id=' + req.clientId +
            '&grant_type=' + 'authorization_code' + '&client_secret=' + req.clientSecret + '&redirect_uri=' +
            req.url + '&code=' + req.query['code'] + '&scope=' + req.query['scope'];

        request(url, function (err, res, data) {
            if (err) {
                console.log('Bitrix24 request error: ' + err);
            } else {
                data = JSON.parse(data);

                var auth = {
                    domain: data['domain'],
                    access_token: data['access_token']
                };

                var newReq = [];
                newReq['body'] = [];
                newReq['body']['auth'] = auth;
                newReq['body']['event'] = "ONAPPINSTALL";
                newReq['url'] = req.url;
                newReq['settings'] = req.settings;

                onAppInstall(newReq);
           }
        });

    }

}

module.exports.onOAuth           = onOAuth;