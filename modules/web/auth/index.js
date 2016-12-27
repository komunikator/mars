process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

var bus = require('../../../lib/system/bus'),
        passport = require('passport'),
        LocalStrategy = require('passport-local').Strategy,
        flash = require('connect-flash'),
        request = require('request'),
        url = require("url");


var lang = {},
        users = [];

function refreshWebAccounts() {
    bus.request('webAccounts', {}, function (err, data) {
        if (err) {
            bus.emit('message', {category: 'http', type: 'error', msg: err});
            return false;
        }
        users = data;
    });
}
refreshWebAccounts();

bus.on('refresh', function (type) {
    if (type === 'configData')
        refreshWebAccounts();
}
);

function findById(id, fn) {
    if (users[id]) {
        fn(null, users[id]);
    } else {
        console.log('User ' + id + ' does not exist')
        fn(null, null);
    }
}

function findByUsername(username, fn) {
    for (var i = 0, len = users.length; i < len; i++) {
        var user = users[i];
        if (user.username === username) {
            user.id = i;
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
                });
            });
        }
));


function init(app) {
    lang = app.set('lang') || {};
    app.use(flash());
    app.use(passport.initialize());
    app.use(passport.session());


    app.get('/', function (req, res, next) {
        //return res.status(200).json({session: req.session});
        if (req.isAuthenticated()) {
            return res.render('index', {webPath: app.get('webPath'), username: req.user.username});
        }
        res.redirect('/auth?referer=' + req.url);
    });

    var trustedNetCfg = app.get('trustedNet') || {
            "tokenURL": "https://net.trusted.ru/idp/sso/oauth/token",
            "profileURL": "https://net.trusted.ru/trustedapp/rest/person/profile/get",
            "redirect_uri": "/auth/trusted",
            "client_id": "TRUSTED_LOGIN_CLIENT_ID",
            "client_secret": "TRUSTED_LOGIN_CLIENT_SECRET"
    };
    app.get('/auth', function (req, res) {

        var data = {
            redirect_uri: trustedNetCfg.redirect_uri,
            client_id: trustedNetCfg.client_id,
            user: req.user,
            message: req.flash('error')
        };

        if (req.query['referer'] != undefined) {
            data['referer'] = req.query['referer'];
        }

        res.render('auth', data);
    });

    if (trustedNetCfg && trustedNetCfg.redirect_uri)
        app.get(trustedNetCfg.redirect_uri, function (req, res) {
            //return res.send(req.headers);
            var reqUrl = url.parse(req.headers['referer'] || ('http://' + req.headers['host']));
            var code = req.param("code");
            if (code) {
                request.post({
                    url: trustedNetCfg.tokenURL,
                    form: {
                        code: code,
                        grant_type: "authorization_code",
                        redirect_uri: reqUrl.protocol + '//' + reqUrl.host + trustedNetCfg.redirect_uri
                    },
                    auth: {
                        user: trustedNetCfg.client_id,
                        pass: trustedNetCfg.client_secret,
                        sendImmediately: false
                    }
                },
                function (err, res_, body) {
                    if (err)
                        res.send(err.toString());
                    else {
                        try {
                            var data = JSON.parse(body);
                        } catch (e) {
                            return res.send(e.toString());
                        }
                        if (!data.access_token)
                            return res.send(data);

                        request.get(trustedNetCfg.profileURL + '?access_token=' + data.access_token, function (err, rs, body) {
                            try {
                                var user_data = JSON.parse(body);
                            } catch (e) {
                                return res.send(e.toString());
                            }
                            if (user_data)
                                user_data = user_data.user;
                            if (!user_data || !user_data.username)
                                res.send(user_data);
                            else
                                findByUsername(user_data.username, function (err, user) {
                                    if (user) {
                                        req.session.passport.user = user.id;
                                        if (req.query['referer'] != 'undefined' && req.query['referer'] != undefined) {
                                            res.redirect(req.query['referer']);
                                        } else {
                                            res.redirect('/');
                                        }
                                    }
                                    else {
                                        req.session.flash = {error: lang['unknown_user'] + ' "' + user_data.username + '"'};
                                        res.redirect('/auth');
                                    }
                                });

                        })
                    }
                });
            }
            else
                res.redirect('/auth');
        });

    app.post('/auth', passport.authenticate('local', {failureRedirect: '/auth?referer=/', failureFlash: true}),
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

}

module.exports = init;
