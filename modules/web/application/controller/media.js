/*
 * script module
 */

/**
 * This method read records
 *
 * @param req
 * @param res
 */

var bus;
var lang;
var mkdirp = require('mkdirp');

exports.init = function (_bus) {
    bus = _bus;
    bus.request('lang', {}, function (err, data) {
        lang = data || {};
    });

};

function getTreeNode(data, path) {
    //if (id == 'm_root') id

    var nodes = [];
    var curNode = data;
    var isLeaf;
    for (var key in curNode)
    {
        isLeaf = /.wav$/.test(curNode[key]);
        var text = curNode[key];
        var src = '';
        if (isLeaf)
            iconCls = 'sound';
        else
            iconCls = 'folder';
        if (iconCls == 'sound')
        {
            var text = curNode[key];
            var src = path + '/' + curNode[key];
        }
        nodes.push({
            text: text,
            iconCls: iconCls,
            src: src,
            id: encodeURIComponent(path + '/' + curNode[key]), //.replace(/%20/g,'+')
            leaf: isLeaf
        });
    }
    return nodes;
}
;

exports.read = function (req, res) {
    var params = req.body;
    var id = req.params['id'];

    var path = id.replace('root', '/media');
    //request = {source: 'mediaList', id: path};
    bus.request('mediaList', {id: path}, function (err, data) {
        res.send({success: true, data: getTreeNode(data, path)});
    });
};


var fs = require('fs');

exports.create = function (req, res) {
    if (!req.body['path'] || !req.body['name']) {
        res.end(JSON.stringify({success: false}));
        return;
    }
    var path = '.' + req.body['path'] + '/' + req.body['name'];
    if (fs.existsSync(path)) {
        res.end(JSON.stringify({success: false, message: lang.directoryExist}));
        return;
    }
    ;
    //console.log(path);
    mkdirp(path, function (err) {
        var result = {success: !err};
        if (err)
            result.message = lang[err.code] ? lang[err.code] : err.code;
        res.end(JSON.stringify(result));
    });
};

exports.delete = function (req, res) {

    var paths = [];

    try {
        if (req.body['paths'])
            paths = JSON.parse(req.body['paths']);
    } catch (e) {
        console.log(e);
    }

    var len = paths.length,
            errCode,
            errMessage = '';

    function sendResult() {
        var result = {success: !errCode};
        if (errCode && errMessage)
            result.message = errMessage;
        res.end(JSON.stringify(result));
    }
    if (len)
        paths.forEach(function (path) {
            path = '.' + path;

            if (!fs.existsSync(path)) {
                errCode = true;
                errMessage += '"' + path + '" ' + lang.pathNotExist + '<br>';
                if (!--len)
                    sendResult();
                return;
            }
            if (fs.statSync(path).isDirectory())
                fs.rmdir(path, function (err) {
                    if (err)
                        errCode = err;
                    if (err)
                        errMessage += '"' + path + '" ' + lang[err.code] ? lang[err.code] : err.code + '<br>';
                    if (!--len)
                        sendResult();
                });
            else
                fs.unlink(path, function (err) {
                    if (err)
                        errCode = err;
                    if (err)
                        errMessage += '"' + path + '" ' + lang[err.code] ? lang[err.code] : err.code + '<br>';
                    if (!--len)
                        sendResult();
                });
        });
    else
        res.end(JSON.stringify({success: false, message: '"paths" is not defined!'}));

};

exports.rename = function (req, res) {
    //consol.log(req.params['id']);
    var oldPath = '.' + req.body['oldPath'];
    var newPath = '.' + req.body['newPath'];
    //console.log(oldPath, newPath);

    if (!newPath || !oldPath) {
        res.end(JSON.stringify({success: false}));
        return;
    }

    if (fs.existsSync(newPath)) {
        res.end(JSON.stringify({success: false, message: lang.pathExist}));
        return;
    }

    fs.rename(oldPath, newPath, function (err) {
        var result = {success: !err};
        if (err)
            result.message = lang[err.code] ? lang[err.code] : err.code;
        res.end(JSON.stringify(result));
    });
};

exports.put = function (req, res) {
    //console.log(new Buffer(req.params['id'], 'base64').toString());
    var path = '';
    if (req.params['id'])
        path = '.' + new Buffer(req.params['id'], 'base64').toString();//.replace(/^\/media(.*)/, "$1");
    //path = './uploads' + path;
    // console.log(path);

    var file_name = '/' + new Buffer(req.headers['x-file-name'], 'base64').toString();

    if (!file_name) {
        res.end(JSON.stringify({success: false}));
        return;
    }
    ;
    if (fs.existsSync(path + file_name)) {
        res.end(JSON.stringify({success: false, message: lang.fileExist}));
        return;
    }
    ;

    var getDirName = require("path").dirname;
    //console.log('makeDir', getDirName(path + file_name));
    mkdirp(getDirName(path + file_name), function (err) {
        if (err)
            return cb(err);
        var fstream = fs.createWriteStream(path + file_name);
        req.pipe(fstream);
        fstream.on('error', function (err) {
            res.end(JSON.stringify({success: false, message: lang[err.code] ? lang[err.code] : err.code}));
            //console.log(err);
        });
        fstream.on('close', function () {
            res.end(JSON.stringify({success: true}));
            //console.log('File "' + path + file_name + '" saved.');
        });
    });
};