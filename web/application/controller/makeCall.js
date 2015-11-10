/*
 * makeCall module
 */

/**
 * This method read records
 *
 * @param req
 * @param res
 */
var e;
exports.init = function(events) {
    e = events;
};

exports.post = function(req, res) {
    //var params = req.body;
    var sessionID = e.newSessionID();
    var onData = function(data) {
        if (data.sessionID === sessionID) {
            if (data.type == 'info') 
		data.success = true;
            res.send(data);
            e.removeListener('scriptStatus', onData);
        }
    };
    e.on('scriptStatus', onData);
    e.emit('startScript', {uri: req.params['msisdn'], sessionID: sessionID, script: req.params['script'] != undefined ? req.params['script'] : '', serviceContactID: req.params['serviceContactID'] != undefined ? req.params['serviceContactID'] : 0});
};

