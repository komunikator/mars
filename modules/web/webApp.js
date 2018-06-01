var Express = require('express'),
    Http = require('http'),
    Cookies = require('cookies'),
    gaikan = require('gaikan'),
    router = require('./application/router');
var app = Express(),
    bus = app.bus = require('../../lib/system/bus'),
    log4js = require('../../lib/system/logger');
var fs = require('fs');
var cookieParser = require('cookie-parser');

process.on('disconnect', function() {
    console.log('parent exited');
    process.exit();
});

process.on('uncaughtException', function(e) {
    bus.emit('message', { category: 'http', type: 'error', msg: e.stack });
    //console.log(e);
});

//if (log4js)
//    app.use(log4js.connectLogger(log4js.getLogger('http'), {level: 'auto'}));

app.use(cookieParser());
var bodyParser = require('body-parser');
app.use(bodyParser.json({limit: '50mb', extended: true}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
/*
var sessionStore;
var Session = require('express-session');
var redisCfg = bus.config.get("redis");
if (redisCfg) {
    var RedisStore = require('connect-redis')(Session);
    sessionStore = new RedisStore(redisCfg);
    sessionStore.client.on('connect', function () {
        bus.emit('message', {category: 'http', type: 'info', msg: 'Redis store connected'});//, socket, upgradeHead, cb);
        //console.log('redis connected');
    });
} else {
	var session = bus.config.get("session") || {secret: "secret"};
	var MemoryStore = require('session-memory-store')(Session);
	sessionStore = new MemoryStore(session);
}
session.store = sessionStore;

app.use(Session(session));
*/

var session = bus.config.get("session") || { name: 'connect.sid', keys: ['6b97cdfc-5904-4614-b606-fe11351ba2e9', 'e5f5a3d0-facd-498e-afb0-8ae8385a629c'] };
app.use(require('cookie-session')(session));

app.set('webPath', bus.config.get("webPath") || '');
app.set('trustedNet', bus.config.get("trustedNet"));

//http server
var wwwPath = bus.config.get("wwwPath") || process.cwd();
if (!fs.existsSync(process.cwd() + '/www') &&
    fs.existsSync(process.cwd() + '/node_modules/mars')) {
    wwwPath = process.cwd() + '/node_modules/mars';
}

app.set('lang', require(wwwPath + '/www/root/lang/ru.js').msg);
bus.onRequest('lang', function(param, cb) {
    cb(null, app.get('lang') || {});
});
app.use(require('body-parser')());
app.engine('html', gaikan);
app.set('view engine', '.html');
app.set('views', wwwPath + '/www/views');
app.set('viewsList', require('../../lib/util').getFiles(app.get('views')));

app.use(Express.static(wwwPath + '/www/root'));

if (bus.config.get("webAuth") !== "disable")
    require('./auth/')(app);
try {
    if (bus.config.get("instanceAuth"))
        app.set('instanceAuth', new Function(bus.config.get("instanceAuth")));
} catch (e) {
    console.log(e);
}

app.get('*', function(req, res, next) {
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
        res.status(403).json(403, { success: false, /*url: req.url,*/ message: 'Access denied, please log in' });
});

router.init(app);

var port = process.env.PORT || bus.config.get("webPort") || 8080;
if (!fs.existsSync(process.cwd() + '/www') &&
    fs.existsSync(process.cwd() + '/node_modules/mars')) {
    wwwPath = process.cwd() + '/node_modules/mars';
}

var server = Http.createServer(app).listen(port, function() {
    bus.emit('message', { category: 'server', type: 'info', msg: 'Web server start on port ' + this.address().port });
    bus.emit('startWebServer', { port: this.address().port });
});

server.on('upgrade', function(req, socket, upgradeHead) {
    if (bus.config.get("webAuth") === "disable")
        return;
    var cookies = new Cookies(req);
    var sessionCookie = cookies.get(session.name);
    var data = {};
    try {
        data = JSON.parse(new Buffer(sessionCookie, 'base64').toString('utf8'));
    } catch (e) {
        bus.emit('message', { category: 'server', type: 'error', msg: e.toString() });
    }

    var instanceAuth = app.get('instanceAuth');
    if (data && instanceAuth && instanceAuth.call(data)) {
        return;
    }

    if (data && data.passport && data.passport.user !== undefined)
        return;
    socket.end();
});

var io = require('socket.io')(server);
io.set('transports', ['websocket']);
io.on('connection', function(socket) {
    var confSipCli, confSipServer;
    bus.request('sipServer', {}, function(err, data) {
        confSipServer = data || '';
        bus.request('sipClients', {}, function(err, data) {
            confSipCli = data || [];
            var msgSipCliHide;
            if (confSipCli.length == 0 || confSipServer == 'disable') {
                msgSipCliHide = JSON.stringify({ source: 'hideSipCli', data: true });
                socket.emit('message', msgSipCliHide);
            } else {
                msgSipCliHide = JSON.stringify({ source: 'hideSipCli', data: false });
                socket.emit('message', msgSipCliHide);
            }
        });
    });
    var clientIp = socket.request.headers['x-forwarded-for'] || socket.request.connection.remoteAddress;
    bus.emit('message', { type: 'info', msg: 'Web User connected [' + clientIp + ']. Total web connections: ' + Object.keys(io.sockets.connected).length });
    var timerWs = setTimeout(function() {
        sendTimeToUser(socket);
    }, 500);

    socket.on('message', function(message) {
        try {
            var args = JSON.parse(message);
            bus.emit.apply(bus, args);
        } catch (e) {
            socket.emit(JSON.stringify(e.toString()));
        }
    });

    socket.on('close', function() {
        bus.emit('message', { type: 'info', msg: 'Web User close. Total web connections: ' + Object.keys(io.sockets.connected).length });
        clearTimeout(timerWs);
    });

    socket.on('disconnect', function() {
        bus.emit('message', { type: 'info', msg: 'Web User disconnected. Total web connections: ' + Object.keys(io.sockets.connected).length });
        clearTimeout(timerWs);
    });
});

setInterval(sendTimeAllUsers, 30000);
var diff = new Date().getTimezoneOffset() * 60 * 1000 * (-1);

function sendTimeAllUsers() {
    var now = new Date();
    var msgTime = JSON.stringify({ source: 'time', data: now.getTime() + diff });
    io.emit('message', msgTime);
}

function sendTimeToUser(socket) {
    var now = new Date();
    var msgTime = JSON.stringify({ source: 'time', data: now.getTime() + diff });
    socket.emit('message', msgTime);
}

var onData = async function(obj) {
    // bus.emit('message', obj);
    var controllerPath = './application/controller/',
        dialogController = require(controllerPath + 'dialog'),
        statusUAController = require(controllerPath + 'statusUA'),
        statusSipCliController = require(controllerPath + 'statusSipCli'),
        statusB24UA = require(controllerPath + 'statusB24UA');
        statusSMPP = require(controllerPath + 'statusSMPP');

    if (io.engine.clientsCount == 0)
        return;

    if (obj.source == 'Dialogs') {
        obj.data = dialogController.getStoreData(obj.data);
    }

    if (obj.source == 'statusUA') {
        obj.data = statusUAController.getStoreData(obj.data);
    }

    if (obj.source == 'statusSipCli') {
        obj.data = await statusSipCliController.getStoreData(obj.data);
    }
    if (obj.source == 'statusB24UA') {
        obj.data = await statusB24UA.getStoreData(obj.data);
    }
    if (obj.source == 'statusSMPP') {
        obj.data = await statusSMPP.getStoreData(obj.data);
    }
    io.emit('message', JSON.stringify({ success: true, data: obj }));
};
bus.on('updateData', onData);

app.use("/rec", Express.static('./rec'));
app.use("/media", Express.static('./media'));

function render(req, res, name) {
    res.render(name, { webPath: app.get('webPath'), username: req.user && req.user.username });
}

app.get('/', function(req, res) {
    render(req, res, 'index');
});
app.get('/reports', function(req, res) {
    render(req, res, 'reports');
});
app.get('/manager', function(req, res) {
    render(req, res, 'manager');
});
app.get('/media', function(req, res) {
    render(req, res, 'media');
});
app.get('/scripts', function(req, res) {
    render(req, res, 'scripts');
});
app.get('/updates', function(req, res) {
    render(req, res, 'updates');
});
app.get('/startUpdates', function(req, res) {
    render(req, res, 'startUpdates');
});

module.exports = app;
