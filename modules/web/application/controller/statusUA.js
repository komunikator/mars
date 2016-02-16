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

exports.getStoreData = function (data) {
    if (typeof data == 'string')
        try {
            data = JSON.parse(data);
        } catch (e) {
            data = [];
        }
    var rec = [null, null, null, null, null, null, null, null, null, null,
        null, null, null, null, null, null, null, null, null, null];
    if (data)
        data.forEach(function (row, i) {
            rec[i] = row.status;
            rec[(1 + '' + i)] = row.name;
        });
    return [rec];
};

exports.read = function (req, res) {
    bus.request('getStatusUAList', {}, function (err, data) {
        res.send({success: true, data: exports.getStoreData(data)});
    });
};

