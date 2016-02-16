/*
 * dialog module
 */

/**
 * This method read records
 *
 * @param req
 * @param res
 */
exports.read = function(req, res) {
    var params = req.body;
    res.sendfile(__dirname + '/menu.json');
    //var rec = [{_id: Date.now(), data: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2) + 'Mb'}];
    //console.log({success: true, Dialog: rec});
    //res.send({success: true, Dialog: rec});
};

