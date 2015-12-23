process.on('disconnect', function () {
    console.log('parent exited');
    process.exit();
});

process.on('uncaughtException', function (e) {
    bus.emit('message', {category: 'http', type: 'error', msg: e.toString()});
});

var bus = require('../../lib/system/bus'),
        log4js = require('../../lib/system/logger');

var lang = require('./public/javascripts/lib/ext/locale/ru.js').msg,
        express = require('express'),
        flash = require('connect-flash'),
        router = require('./application/router'),
        http = require('http'),
        path = require('path'),
        passport = require('passport'),
        //,util = require('util')
        LocalStrategy = require('passport-local').Strategy;
// import the models
var models = {
    //User: require('./application/model/user')(mongoose),
    Dialog: require('./application/model/dialog')()
};

var express = require('express');
//var morgan         = require('morgan');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var app = express();

var lang, users;

function findById(id, fn) {
    var idx = id - 1;
    if (users[idx]) {
        fn(null, users[idx]);
    } else {
        fn(new Error('User ' + id + ' does not exist'));
    }
}

function findByUsername(username, fn) {
    for (var i = 0, len = users.length; i < len; i++) {
        var user = users[i];
        if (user.username === username) {
            return fn(null, user);
        }
    }
    return fn(null, null);
}

passport.serializeUser(function (user, done) {
    done(null, user.id);
});

passport.deserializeUser(function (id, done) {
    findById(id, function (err, user) {
        done(err, user);
    });
});

passport.use(new LocalStrategy(
        function (username, password, done) {
            // asynchronous verification, for effect...
            process.nextTick(function () {

                // Find the user by username.  If there is no user with the given
                // username, or the password is not correct, set the user to `false` to
                // indicate failure and set a flash message.  Otherwise, return the
                // authenticated `user`.
                findByUsername(username, function (err, user) {
                    if (err) {
                        return done(err);
                    }
                    if (!user) {
                        return done(null, false, {message: lang['unknown_user'] + ' "' + username + '"'});
                    }
                    if (user.password != password) {
                        return done(null, false, {message: lang['invalid_password']});
                    }
                    return done(null, user);
                })
            });
        }
));

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
//app.use(express.favicon());
//app.use(express.logger('dev'));
//app.use(express.bodyParser());
//app.use(express.methodOverride());
//app.use(app.router);
//app.use(express.static(path.join(__dirname, 'public')));


app.use(express.static(__dirname + '/public'));             // set the static files location /public/img will be /img for users
app.use("/rec", express.static('./rec'));
app.use("/media", express.static('./media'));


//app.use(morgan('dev')); 					// log every request to the console
app.use(bodyParser()); 						// pull information from html in POST
app.use(methodOverride());


// store session state in browser cookie
var cookieSession = require('cookie-session');
app.use(cookieSession({
    keys: ['secret1', 'secret2']
}));

//app.use(express.session({ secret: 'keyboard cat' }));
app.use(flash());
// Initialize Passport!  Also use passport.session() middleware, to support
// persistent login sessions (recommended).
app.use(passport.initialize());
app.use(passport.session());




app.isLoggedIn = function (req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login?referer=' + req.url);
};

app.get('/account', app.isLoggedIn, function (req, res) {
    //res.render('account', {user: req.user});
    res.send({success: true, user: req.user});

});

app.get('/login', function (req, res) {

    var data = {
        user: req.user,
        message: req.flash('error')
    };

    if (req.query['referer'] != undefined) {
        data['referer'] = req.query['referer'];
    }

    res.render('login', data);
});

app.post('/login', passport.authenticate('local', {failureRedirect: '/login', failureFlash: true}),
        function (req, res) {
            if (req.query['referer'] != 'undefined' && req.query['referer'] != undefined) {
                res.redirect(req.query['referer']);
            } else {
                res.redirect('/');
            }
        });

app.get('/logout', function (req, res) {
    req.logout();
    res.redirect('/');
});

function init() {

    if (log4js) {
        //app.use(log4js.connectLogger(logger, {level: log4js.levels.INFO}));
        //app.use(log4js.connectLogger(logger, { level: 'auto', format: ':method :url :status' }));

        //### AUTO LEVEL DETECTION
        //http responses 3xx, level = WARN
        //http responses 4xx & 5xx, level = ERROR
        //else.level = INFO
        app.use(log4js.connectLogger(log4js.getLogger('http'), {level: 'auto'}));
    }
    ;

    app.bus = bus;

    bus.onRequest('lang', function (param, cb) {
        try {
            var langSource = require('./public/javascripts/lib/ext/locale/ru.js');
        }
        catch (e_) {
            console.log(e_);
            cb(e);
        }
        cb(null, (langSource && langSource.msg) || {});
    });

    bus.request('lang', {}, function (err, data) {
        lang = data || {};
    });

    bus.request('webAccounts', {}, function (err, data) {
        users = data || {};
    });

    router.init(app, models);
    var port = process.env.PORT || bus.config.get("webPort") || 8080;
    try {
        //app.listen(port);

        //https
        var fs = require("fs");
        var https = require("http").createServer(
                //{
                ////key: fs.readFileSync("./web/ssl/private.key"),
                ////cert: fs.readFileSync("./web/ssl/certificate.pem"),
                //ca: fs.readFileSync("./web/ssl/certificate.pem"),
                ///passphrase: '1234'
                //},
                app).listen(port);

        //https
        //require('look').start(); //port 5959
        bus.emit('message', {type: 'info', msg: 'Web server start on port ' + port});
    }
    catch (e) {
        console.log(e);
    }

    (require('./logview'))(https, bus);


    var WebSocket = require('ws').Server;
    var webSocketServer = new WebSocket({server: https});

    webSocketServer.on('connection', function (ws) {
        //console.log(ws.upgradeReq.headers);
        bus.emit('message', {type: 'info', msg: 'Web User connected. Total web connections: ' + webSocketServer.clients.length});
        //        bus.emit('updateData', {source: 'statusUA', data: []});

        ws.on('message', function (message) {
        });

        ws.on('close', function () {
            bus.emit('message', {type: 'info', msg: 'Web User disconnected. Total web connections: ' + webSocketServer.clients.length});
        });
    });

    var onData = function (obj) {
        var controllerPath = './application/controller/',
                dialogController = require(controllerPath + 'dialog'),
                statusUAController = require(controllerPath + 'statusUA');

        if (webSocketServer.clients.length == 0)
            return;

        if (obj.source == 'Dialogs') {
            obj.data = dialogController.getStoreData(obj.data);
        }

        if (obj.source == 'statusUA') {
            obj.data = statusUAController.getStoreData(obj.data);
        }

        webSocketServer.clients.forEach(function (conn) {
            conn.send(JSON.stringify({success: true, data: obj}));
        });
    };
    bus.on('updateData', onData);
}

module.exports = init();
