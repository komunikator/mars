var bus;
var request = require('request');

exports.init = function (_bus) {
    bus = _bus;
};

function isAvailableUpdates(curVersion, lastVersion) {
    var versions = {};
    versions['current'] = curVersion;
    versions['last'] = lastVersion;

    curVersion = curVersion.split('.');
    lastVersion = lastVersion.split('.');
    var availableUpdates = false;

    if ( Number(lastVersion[0]) > Number(curVersion[0]) ) {
        availableUpdates = true;
    }

    if ( Number(lastVersion[0]) == Number(curVersion[0]) ) {
        if ( Number(lastVersion[1]) > Number(curVersion[1]) ) {
            availableUpdates = true;
        }
    }

    if ( Number(lastVersion[0]) == Number(curVersion[0]) ) {
        if ( Number(lastVersion[1]) == Number(curVersion[1]) ) {
            if ( Number(lastVersion[2]) > Number(curVersion[2]) ) {
                availableUpdates = true;
            }
        }
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
    var repository = bus.config.get("repository") || 'https://raw.githubusercontent.com/komunikator/mars/stable/package.json';

    request(repository, function (error, response, body) {
        var lastVersion = "0.0.0";

        if (!error && response.statusCode == 200) {
            body = JSON.parse(body);

            if (body && body['version']) {
                lastVersion = body.version;
            }
            reqCurVersion(res, lastVersion);
        } else {
            reqCurVersion(res, lastVersion);
        }
    });
}

exports.read = function (req, res) {
    reqLastVersion(res);
};