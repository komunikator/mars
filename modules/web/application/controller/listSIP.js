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
exports.init = function(_bus) {
    bus = _bus;
};

exports.getStoreData = function(data) {
    var rec = [];
    if (data) {
        Object.keys(data).forEach(function(row, i) {
            rec[i] = row.status;
            rec[(1 + '' + i)] = row.name;
        });
    }
    return data;
};

exports.read = function(req, res) {
    bus.request('getListSIP', {}, function(err, data) {
        res.send({ success: true, data: exports.getStoreData(data) });
    });
};