var bus = require('../../../lib/system/bus'),
        passport = require('passport'),
        LocalStrategy = require('passport-local').Strategy,
        flash = require('connect-flash');


var lang = {},
        users = [];

bus.request('webAccounts', {}, function (err, data) {
    users = data || [];
});

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
        if (req.isAuthenticated()) {
            return res.render('index', {webPath: app.get('webPath'), username: req.user.username});
        }
        res.redirect('/auth?referer=' + req.url);
    });

    app.get('/auth', function (req, res) {

        var data = {
            user: req.user,
            message: req.flash('error')
        };

        if (req.query['referer'] != undefined) {
            data['referer'] = req.query['referer'];
        }

        res.render('auth', data);
    });


    app.post('/auth', passport.authenticate('local', {failureRedirect: '/auth', failureFlash: true}),
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
