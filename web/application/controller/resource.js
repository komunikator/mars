/*
 * resource module
 */

/**
 * This method read records
 *
 * @param req
 * @param res
 */

var Events;
var lang;
exports.init = function(events) {
    Events = events;
    Events.getData({source: 'lang'}, function(obj) {
        lang = obj.data || {};
    });

};

///scriptsListData
var fs = require('fs');

exports.read = function(req, res) {
    var id = req.params['id'];
    if (!id) {
        res.send({success: false, msg: 'Parameter "id" not found'});
        return;
    }
    id += 'ListData';
    Events.getData({source: id}, function(obj) {
        var data = [];
        if (obj.data)
            obj.data.forEach(function(el) {
                data.push({id: data.length, text: el.text.replace('.js', ''), value: el.value});
            });
        res.send({success: true, data: data});
    });
};

exports.rename = function(req, res) {
    //consol.log(req.params['id']);
    var oldPath = './' + req.body['oldPath'] + '.js';
    var newPath = './' + req.body['newPath'] + '.js';
    //console.log(oldPath, newPath);

    if (!newPath || !oldPath) {
        res.end(JSON.stringify({success: false}));
        return;
    }

    if (fs.existsSync(newPath)) {
        res.end(JSON.stringify({success: false, message: lang.pathExist}));
        return;
    }

    fs.rename(oldPath, newPath, function(err) {
        var result = {success: !err};
        if (err)
            result.message = lang[err.code] ? lang[err.code] : err.code;
        res.end(JSON.stringify(result));
    });
};

exports.update = function(req, res) {
    var name = req.body['name'];
    var create = req.body['name'];
    var value = req.body['value'];
    if (!name) {
        res.end(JSON.stringify({success: false}));
        return;
    }
    var path = './' + name + '.js';
    if ((create == 'true') && fs.existsSync(path)) {
        res.end(JSON.stringify({success: false, message: lang.fileExist}));
        return;
    };

    fs.writeFile(path, value, function(err) {
        if (!err) {
            Events.emit('refresh', name.replace(/\/(.*)$/, ''));
        }
        var result = {success: !err};
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
        res.end(JSON.stringify({success: false, message: lang.pathNotExist}));
        return;
    }
    if (fs.statSync(path).isDirectory())
        fs.rmdir(path, function(err) {
            var result = {success: !err};
            if (err)
                result.message = lang[err.code] ? lang[err.code] : err.code;
            res.end(JSON.stringify(result));
        });
    else
        fs.unlink(path, function(err) {
            var result = {success: !err};
            if (err)
                result.message = lang[err.code] ? lang[err.code] : err.code;
            else
                Events.emit('refresh', req.body['path'].replace(/\/(.*)$/, ''));
            res.end(JSON.stringify(result));
        });
};