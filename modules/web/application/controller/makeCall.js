/*
 * makeCall module
 */

/**
 * This method read records
 *
 * @param req
 * @param res
 */
var bus;
exports.init = function (_bus) {
    bus = _bus;
};

exports.post = function (req, res) {
    //var params = req.body;
    bus.request('newSessionID', {}, function (err, sessionID) {
        var onData = function (data) {
            if (data.sessionID === sessionID) {
                if (data.type == 'info')
                    data.success = true;
                res.send(data);
                bus.removeListener('scriptStatus', onData);
            }
        };
        bus.on('scriptStatus', onData);
        bus.emit('startScript', {uri: req.params['msisdn'], sessionID: sessionID, script: req.params['script'] != undefined ? req.params['script'] : '', sipAccountID: req.params['sipAccountID'] != undefined ? req.params['sipAccountID'] : 0});
    })
};

