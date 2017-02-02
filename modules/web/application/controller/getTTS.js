/*
 * statusUA module
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

exports.get = function (req, res) {
    if (!req.query.text) return res.send(400, {success: false, msg: "parameter 'text' is required!"});  
    bus.request('newSessionID', {}, function (err, sessionID) {
        var params ={
            text: req.query.text, 
            rewrite: req.query.rewrite || false, 
            sessionID: sessionID, 
            type: req.query.type || 'ivona', 
            voice: req.query.voice || 'Tatyana', 
            cb: getTTScb
        };
        bus.request('getTTS', params, getTTScb);
        function getTTScb(err, filename) {
            if (err) {
                res.send({
                    success:false, 
                    msg: err
                })
            } else {
                res.send({
                    success: true, 
                    file: filename
                });
            }
        }
    })  
};

