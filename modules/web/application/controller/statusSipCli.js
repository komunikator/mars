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

function getSipClients() {
    return new Promise((resolve) => {
        bus.request('sipClients', {}, function (err, data) {
            if (err) return resolve([]);
            if (data) {
                return resolve(data);
            }
            return resolve([]);
        });
    });
}

exports.getStoreData = async function (data) {
    if (data){
        try {
            data = JSON.parse(data);
        } catch (e) {
            data = [];
        }
    }
    var rec = [null, null, null, null, null, null, null, null, null, null,

                null, null, null, null, null, null, null, null, null, null];

    if (data) {
        data.forEach(function (row, i) {
            rec[i] = 1;
            rec[10+i] = row;
        });
    }
    return [rec];
};

exports.read = function (req, res) {
    bus.request('getStatusSipCliList', {}, async function (errSipList, sipList) {
        if (errSipList) return false;
        if (sipList) {
            res.send({success: true, data: await exports.getStoreData(JSON.stringify(sipList))});
        } else {
            return false;
        }
    });
};