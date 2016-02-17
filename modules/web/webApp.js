var Express = require('express'),
        Http = require('http'),
        Cookies = require('cookies'),
        gaikan = require('gaikan'),
        router = require('./application/router');

var app = Express(),
        bus = app.bus = require('../../lib/system/bus'),
        log4js = require('../../lib/system/logger');

process.on('disconnect', function () {
    console.log('parent exited');
    process.exit();
});

process.on('uncaughtException', function (e) {
    bus.emit('message', {category: 'http', type: 'error', msg: e.toString()});
    //console.log(e);
});

if (log4js)
    app.use(log4js.connectLogger(log4js.getLogger('http'), {level: 'auto'}));

app.use(Express.cookieParser());

var session = bus.config.get("session") || {secret: "secret"};

var sessionStore = new Express.session.MemoryStore();
var redisCfg = bus.config.get("redis");
if (redisCfg) {
    var Session = require('express-session'),
            RedisStore = require('connect-redis')(Session);
    sessionStore = new RedisStore(redisCfg);
    sessionStore.client.on('connect', function () {
        bus.emit('message', {category: 'http', type: 'info', msg: 'Redis store connected'});//, socket, upgradeHead, cb);
        //console.log('redis connected');
    });
}
session.store = sessionStore;
app.use(Express.session(session));
app.set('webPath', bus.config.get("webPath") || '');

//http server
app.set('lang', require(process.cwd() + '/www/root/lang/ru.js').msg);
app.use(require('body-parser')());
app.engine('html', gaikan);
app.set('view engine', '.html');
app.set('views', process.cwd() + '/www/views');
app.set('viewsList', require('../../lib/util').getFiles(app.get('views')));

app.use(Express.static(bus.config.get("wwwPath") || (process.cwd() + '/www/root')));

if (bus.config.get("webAuth") !== "disable")
    require('./auth/')(app);
try {
    if (bus.config.get("instanceAuth"))
        app.set('instanceAuth', new Function(bus.config.get("instanceAuth")));
} catch (e) {
    console.log(e);
}

app.get('*', function (req, res, next) {
    if (bus.config.get("webAuth") === "disable")
        return next();
    else
    if (req.session && req.session.passport && req.session.passport.user !== undefined)
        return next();

    var instanceAuth = app.get('instanceAuth');
    if (instanceAuth && instanceAuth.call(req)) {
        return next();
    }
    if (app.get('viewsList').indexOf(req.url.replace(/^\//, '') + '.html') !== -1)
        res.redirect('/auth?referer=' + req.url);
    else
        res.json(403, {success: false, /*url: req.url,*/ message: 'Access denied, please log in'});
});

router.init(app);

var port = process.env.PORT || bus.config.get("webPort") || 8080;

var server = Http.createServer(app).listen(port, function () {
    bus.emit('message', {category: 'server', type: 'info', msg: 'Web server start on port ' + this.address().port});
});

server.on('upgrade', function (req, socket, upgradeHead) {
    var cookies = new Cookies(req);
    var sessionID = cookies.get(session.key || 'connect.sid').replace(/^s%3A(.+)\..+/, "$1");
    //console.log(sessionStore);
    sessionStore.get(sessionID, function (err, data) {
        //console.log(sessionID, err, data);
        //bus.emit('message', {category: 'http', type: 'debug', msg: data});
        if (bus.config.get("webAuth") === "disable")
            return;

        var instanceAuth = app.get('instanceAuth');
        if (data && instanceAuth && instanceAuth.call(data)) {
            return;
        }

        if (data && data.passport && data.passport.user !== undefined)
            return;

        socket.end();
        console.log(data);
        bus.emit('message', {category: 'http', type: 'error', msg: 'Websocket access denied'});
    });
});

var WebSocketServer = require('ws').Server,
        wss = new WebSocketServer({server: server});

wss.on('connection', function (ws) {

    bus.emit('message', {category: 'http', type: 'info', msg: 'Web User connected. Total web connections: ' + wss.clients.length});
    //        bus.emit('updateData', {source: 'statusUA', data: []});

    var timerWs = setTimeout(function () {
        sendTimeToUser(ws);
    }, 5000);
    //["refresh","config"]
    ws.on('message', function (message) {
        try {
            var args = JSON.parse(message);
            bus.emit.apply(bus, args);
        } catch (e) {
            //console.log(e);
            ws.send(JSON.stringify(e.toString()));
        }
    });

    ws.on('close', function () {
        bus.emit('message', {type: 'info', msg: 'Web User close. Total web connections: ' + wss.clients.length});
        clearTimeout(timerWs);
    });

    ws.on('disconnect', function () {
        bus.emit('message', {type: 'info', msg: 'Web User disconnected. Total web connections: ' + wss.clients.length});
        clearTimeout(timerWs);
    });
});

var timerServerTime = setInterval(sendTimeAllUsers, 300000);
var diff = new Date().getTimezoneOffset() * 60 * 1000 * (-1);

function sendTimeAllUsers() {
    wss.clients.forEach(function (ws) {
        var now = new Date();
        var msgTime = JSON.stringify({source: 'time', data: now.getTime() + diff});
        ws.send(msgTime);
    });
}

function sendTimeToUser(ws) {
    var now = new Date();
    var msgTime = JSON.stringify({source: 'time', data: now.getTime() + diff});
    ws.send(msgTime);
}

var onData = function (obj) {
    var controllerPath = './application/controller/',
            dialogController = require(controllerPath + 'dialog'),
            statusUAController = require(controllerPath + 'statusUA');

    if (wss.clients.length == 0)
        return;

    if (obj.source == 'Dialogs') {
        obj.data = dialogController.getStoreData(obj.data);
    }

    if (obj.source == 'statusUA') {
        obj.data = statusUAController.getStoreData(obj.data);
    }

    wss.clients.forEach(function (conn) {
        conn.send(JSON.stringify({success: true, data: obj}));
    });
};
bus.on('updateData', onData);
bus.onRequest('lang', function (param, cb) {
    cb(null, app.get('lang') || {});
});

app.use("/rec", Express.static('./rec'));
app.use("/media", Express.static('./media'));

function render(req, res, name) {
    res.render(name, {webPath: app.get('webPath'), username: req.user && req.user.username});
}

app.get('/', function (req, res) {
    render(req, res, 'index');
});
app.get('/reports', function (req, res) {
    render(req, res, 'reports');
});
app.get('/manager', function (req, res) {
    render(req, res, 'manager');
});
app.get('/media', function (req, res) {
    render(req, res, 'media');
});
app.get('/scripts', function (req, res) {
    render(req, res, 'scripts');
});

(require('./logview'))(server, bus);
