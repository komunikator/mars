/*
 * statusUA module
 */

/**
 * This method read records
 *
 * @param req
 * @param res
 */
var Events;
exports.init = function(events) {
    Events = events;
};

exports.getStoreData = function(data) {
    var rec = [];
    if (data)
        data.forEach(function(row, i) {
            rec[i] = row.status;
            rec[(1 + '' + i)] = row.name;
        });
    return data;
};

exports.read = function(req, res) {
    Events.getData({source: 'getListSIP'}, function(obj) {
        res.send({success: true, data: exports.getStoreData(obj.data)});
    });
};

