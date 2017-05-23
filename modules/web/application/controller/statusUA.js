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
    // bus.emit('message', data);
    if (typeof data == 'string')
        try {
            data = JSON.parse(data);
        } catch (e) {
            data = [];
        }
    var rec = [null, null, null, null, null, null, null, null, null, null,
        null, null, null, null, null, null, null, null, null, null
    ];

    Object.keys(data).forEach(function(row, i) {
        rec[i] = data[row].status;
        rec[(1 + '' + i)] = data[row].name;
    });
    // bus.emit('message', data);
    return [rec];
};

exports.read = function(req, res) {
    bus.request('getStatusUAList', {}, function(err, data) {
        // bus.emit('message', data);
        res.send({ success: true, data: exports.getStoreData(data) });
    });
};