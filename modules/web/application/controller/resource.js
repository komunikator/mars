/*
 * resource module
 */

/**
 * This method read records
 *
 * @param req
 * @param res
 */

var bus;
var lang;
exports.init = function(_bus) {
    bus = _bus;
    bus.request('lang', {}, function(err, data) {
        lang = data || {};
    });

};

///scriptsListData
var fs = require('fs');

exports.read = function(req, res) {
    var id = req.params['id'];
    if (!id) {
        res.send({ success: false, msg: 'Parameter "id" not found' });
        return;
    }
    id += 'ListData';
    bus.request(id, {}, function(err, _data) {
        var data = [];
        if (_data) {
            _data.forEach(function(el) {
                data.push({ id: data.length, text: el.text.replace('.js', ''), value: el.value });
            });
        }
        res.send({ success: true, data: data });
    });
};

exports.rename = function(req, res) {
    //consol.log(req.params['id']);
    var oldPath = './' + req.body['oldPath'] + '.js';
    var newPath = './' + req.body['newPath'] + '.js';
    //console.log(oldPath, newPath);

    if (!newPath || !oldPath) {
        res.end(JSON.stringify({ success: false }));
        return;
    }

    if (fs.existsSync(newPath)) {
        res.end(JSON.stringify({ success: false, message: lang.pathExist }));
        return;
    }

    fs.rename(oldPath, newPath, function(err) {
        var result = { success: !err };
        if (err) {
            result.message = lang[err.code] ? lang[err.code] : err.code;
        }
        res.end(JSON.stringify(result));
    });
};

exports.update = function(req, res) {
    if (!req.body['name']) {
        res.end(JSON.stringify({ success: false }));
        return;
    }
    var path = './' + req.body['name'] + '.js';
    if ((req.body['create'] == 'true') && fs.existsSync(path)) {
        res.end(JSON.stringify({ success: false, message: lang.fileExist }));
        return;
    }
    var dir = req.body['name'].split('/')[0];
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
    fs.writeFile(path, req.body['value'], function(err) {
        if (!err) {
            bus.emit('refresh', req.body['name'].replace(/\/(.*)$/, ''));

            if (req.body['name'].replace(/\/(.*)$/, '') == 'config') {
                bus.config.set('sipClients', JSON.parse(req.body['value']).sipClients);
            }

        }
        var result = { success: !err };
        if (err) {
            result.message = lang[err.code] ? lang[err.code] : err.code;
        }
        res.end(JSON.stringify(result));
    });
};

exports.delete = function(req, res) {
    var path = './' + req.body['path'] + '.js';

    //console.log(path);

    if (!fs.existsSync(path)) {
        res.end(JSON.stringify({ success: false, message: lang.pathNotExist }));
        return;
    }
    if (fs.statSync(path).isDirectory()) {
        fs.rmdir(path, function(err) {
            var result = { success: !err };
            if (err) {
                result.message = lang[err.code] ? lang[err.code] : err.code;
            }
            res.end(JSON.stringify(result));
        });
    } else {
        fs.unlink(path, function(err) {
            var result = { success: !err };
            if (err) {
                result.message = lang[err.code] ? lang[err.code] : err.code;
            } else {
                bus.emit('refresh', req.body['path'].replace(/\/(.*)$/, ''));
            }
            res.end(JSON.stringify(result));
        });
    }
};