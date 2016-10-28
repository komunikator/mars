var Express = require('feathers'),
        Http = require('http'),
        Cookies = require('cookies'),
        gaikan = require('gaikan'),
        router = require('./application/router'),
        bitrix24 = require('./bitrix24/index');

var app = Express(),
        bus = app.bus = require('../../lib/system/bus'),
        log4js = require('../../lib/system/logger');

var feathers_db = require('./nedbStore');

var path = require('path');
var serveStatic = require('feathers').static;
var favicon = require('serve-favicon');
var compress = require('compression');
var cors = require('cors');
//var feathers = require('feathers');
var configuration = require('feathers-configuration');
var hooks = require('feathers-hooks');
var rest = require('feathers-rest');
var bodyParser = require('body-parser');
var socketio = require('feathers-socketio');
//var io = require('socket.io');

//  app.configure(configuration(path.join(__dirname, '..')));

// app.use(compress())
//   .options('*', cors())
//   .use(cors())
//   .use(favicon( path.join(app.get('public'), 'favicon.ico') ))
//   .use('/', serveStatic( app.get('public') ))
//   .use(bodyParser.json())
//   .use(bodyParser.urlencoded({ extended: true }))
//   .configure(hooks())
//   .configure(rest())
//   .configure(socketio())
//   .configure(services)
//   .configure(middleware);



var cookieParser = require('cookie-parser');
var connect = require('connect');

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

//app.use(Express.cookieParser()); - old
app.use(cookieParser());

var session = bus.config.get("session") || {secret: "secret"};



/* ---------------- old
 var sessionStore = new Express.session.MemoryStore();//
 var sessionStore = new connect.session.MemoryStore();
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
 var MemoryStore = express.session.MemoryStore;
 session.store = sessionStore;
 app.use(Express.session(session));*/

var session = require('express-session');
var sessionStore = new session.MemoryStore();
app.use(session({
    secret: 'secret'
}));
app.set('webPath', bus.config.get("webPath") || '');
app.set('trustedNet', bus.config.get("trustedNet"));

//http server
var wwwPath = bus.config.get("wwwPath") || process.cwd();
app.set('lang', require(wwwPath + '/www/root/lang/ru.js').msg);
bus.onRequest('lang', function (param, cb) {
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
        res.status(status).json(403, {success: false, /*url: req.url,*/ message: 'Access denied, please log in'});
});

router.init(app);



var port = process.env.PORT || bus.config.get("webPort") || 8080;

var server = Http.createServer(app).listen(port, function () {
    bus.emit('message', {category: 'server', type: 'info', msg: 'Web server start on port ' + this.address().port});
    bus.emit('startWebServer', {port: this.address().port});
});

server.on('upgrade', function (req, socket, upgradeHead) {
    if (bus.config.get("webAuth") === "disable")
        return;
    var cookies = new Cookies(req);
    var sessionID = cookies.get(session.key || 'connect.sid').replace(/^s%3A(.+)\..+/, "$1");
    //console.log(sessionStore);
    sessionStore.get(sessionID, function (err, data) {
        //console.log(sessionID, err, data);
        //bus.emit('message', {category: 'http', type: 'debug', msg: data});

        var instanceAuth = app.get('instanceAuth');
        if (data && instanceAuth && instanceAuth.call(data)) {
            return;
        }

        if (data && data.passport && data.passport.user !== undefined)
            return;

        socket.end();

        bus.emit('message', {category: 'http', type: 'error', msg: 'Websocket access denied'});
    });
});

var io = require('socket.io')(server);
//---old for ws
//wss.on('connection', function (socket) {
io.on('connection', function (socket) {
    var confSipCli, confSipServer;
    // bus.request('sipClients', {}, function (err, data) {
    //     confSipCli = data || [];
    //     var msgSipCliHide;
    //     if (confSipCli.length == 0 || confSipServer == 'disable') {
    //         msgSipCliHide = JSON.stringify({source: 'hideSipCli', data: true});
    //         ws.send(msgSipCliHide);
    //     } else {
    //         msgSipCliHide = JSON.stringify({source: 'hideSipCli', data: false});
    //         ws.send(msgSipCliHide);
    //     }
    // });

    bus.request('sipServer', {}, function (err, data) {
        confSipServer = data || '';
        bus.request('sipClients', {}, function (err, data) {
            confSipCli = data || [];
            var msgSipCliHide;
            if (confSipCli.length == 0 || confSipServer == 'disable') {
                msgSipCliHide = JSON.stringify({source: 'hideSipCli', data: true});
                //---old for ws
                // ws.send(msgSipCliHide);
                socket.emit('message', msgSipCliHide);
            } else {
                msgSipCliHide = JSON.stringify({source: 'hideSipCli', data: false});
                //---old for ws
                // ws.send(msgSipCliHide);
                socket.emit('message', msgSipCliHide);
            }
        });
    });



    // bus.emit('message', {type: 'info', msg: confSipCli});

    //---old for ws
    //bus.emit('message', {type: 'info', msg: 'Web User connected. Total web connections: ' + wss.clients.length});
    bus.emit('message', {type: 'info', msg: 'Web User connected. Total web connections: ' + io.engine.clientsCount});

    //bus.emit('updateData', {source: 'statusUA', data: []});

    var timerWs = setTimeout(function () {
        sendTimeToUser(socket);
    }, 500);

    //["refresh","config"]
    // ws.on('open', function(){
    //     // var confSipCli = bus.config.get('sipClients');
    //     bus.emit('message', {type: 'info', msg: 'confSipCli'});
    //     // if (confSipCli) {
    //     // }
    // });

    socket.on('message', function (message) {
        try {
            var args = JSON.parse(message);
            bus.emit.apply(bus, args);
        } catch (e) {
            //---old for ws
            //ws.send(JSON.stringify(e.toString()));
            socket.emit(JSON.stringify(e.toString()));
        }
    });

    socket.on('close', function () {
        //---old for ws
        // bus.emit('message', {type: 'info', msg: 'Web User close. Total web connections: ' + wss.clients.length});
        bus.emit('message', {type: 'info', msg: 'Web User close. Total web connections: ' + io.engine.clientsCount});
        clearTimeout(timerWs);
    });

    socket.on('disconnect', function () {
        //---old for ws
        //bus.emit('message', {type: 'info', msg: 'Web User disconnected. Total web connections: ' + wss.clients.length});
        bus.emit('message', {type: 'info', msg: 'Web User disconnected. Total web connections: ' + io.engine.clientsCount});
        clearTimeout(timerWs);
    });
});

bus.on('cdr', function(data){
   var newRec =  feathers_db.recCall(app, bus, data);
   io.emit('new rec', newRec);
})
//---old for ws
//var timerServerTime = setInterval(sendTimeAllUsers, 300000);
setInterval(sendTimeAllUsers, 30000);
var diff = new Date().getTimezoneOffset() * 60 * 1000 * (-1);

function sendTimeAllUsers() {
    //---old for ws
    // wss.sockets.clients().forEach(function (ws) {
    //     var now = new Date();
    //     var msgTime = JSON.stringify({source: 'time', data: now.getTime() + diff});
    //     ws.send(msgTime);
    // });
    var now = new Date();
    var msgTime = JSON.stringify({source: 'time', data: now.getTime() + diff});
    io.emit('message', msgTime);
}

function sendTimeToUser(socket) {
    var now = new Date();
    var msgTime = JSON.stringify({source: 'time', data: now.getTime() + diff});
    socket.emit('message', msgTime);
}

var onData = function (obj) {
    var controllerPath = './application/controller/',
            dialogController = require(controllerPath + 'dialog'),
            statusUAController = require(controllerPath + 'statusUA');
    statusSipCliController = require(controllerPath + 'statusSipCli');

    //---old for ws
    //if (wss.clients.length == 0)
    if (io.engine.clientsCount == 0)
        return;

    if (obj.source == 'Dialogs') {
        obj.data = dialogController.getStoreData(obj.data);
    }

    if (obj.source == 'statusUA') {
        obj.data = statusUAController.getStoreData(obj.data);
    }

    if (obj.source == 'statusSipCli') {
        obj.data = statusSipCliController.getStoreData(obj.data);
    }
    // --- old for ws
    // wss.clients.forEach(function (conn) {
    //     conn.send(JSON.stringify({success: true, data: obj}));
    // });
    io.emit('message', JSON.stringify({success: true, data: obj}));
};
bus.on('updateData', onData);

app.use("/rec", Express.static('./rec'));
app.use("/media", Express.static('./media'));

function render(req, res, name) {
    res.render(name, {webPath: app.get('webPath'), username: req.user && req.user.username});
}

app.get('/', function (req, res) {
    bitrix24.auth(req);
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
app.get('/updates', function (req, res) {
    render(req, res, 'updates');
});
app.get('/startUpdates', function (req, res) {
    render(req, res, 'startUpdates');
});
app.get('/bitrix24', bitrix24.read);

(require('./logview'))(server, bus);


// var app = feathers();

// app.configure(configuration(path.join(__dirname, '..')));

// app.use(compress())
//         .options('*', cors())
//         .use(cors())
//         .use(favicon(path.join(app.get('public'), 'favicon.ico')))
//         .use('/', serveStatic(app.get('public')))
//         .use(bodyParser.json())
//         .use(bodyParser.urlencoded({extended: true}))
//         .configure(hooks())
//         .configure(rest())
//         .configure(socketio())
//         .configure(services)
//         .configure(middleware);


// app.configure(rest());
// app.use(bodyParser.json());
// app.configure(socketio());
// app.use(bodyParser.urlencoded({extended: true}));

// app.use('/services/registeredCalls', service({
//   Model: db,
//   paginate: {
//     default: 2,
//     max: 4
//   }
// }));
// console.log(1111);
// app.service('registeredCalls').create({
//   text: 'Oh hai!!!',
//   complete: false
// }).then(function(message) {
//   console.log('Created message', message);
// });
// console.log(2222);


module.exports = app;

