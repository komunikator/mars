var bus;
var request = require('request');

exports.init = function (_bus) {
    bus = _bus;
};

function isAvailableUpdates(curVersion, lastVersion) {
    var versions = {};
    curVersion = curVersion;
    lastVersion = lastVersion;
    var availableUpdates = false;

    versions['current'] = curVersion;
    versions['last'] = lastVersion;

    if (lastVersion > curVersion) {
        availableUpdates = true;
    }

    versions['availableUpdates'] = availableUpdates;
    return versions;
}

function reqCurVersion(res, lastVersion) {
    bus.request('version', {}, function (err, data) {
        if (err) {
            console.log(err);
            res.send({success: false, data: {}});
            return;
        }
        res.send({success: true, data: isAvailableUpdates(data, lastVersion)});
    });
}

function reqLastVersion(res) {
    request('https://raw.githubusercontent.com/komunikator/mars/stable/package.json', function (error, response, body) {
        if (!error && response.statusCode == 200) {
            body = JSON.parse(body);
            reqCurVersion(res, body.version);
        } else {
            res.send({success: false});
        }
    });
}

exports.read = function (req, res) {
    reqLastVersion(res);
};