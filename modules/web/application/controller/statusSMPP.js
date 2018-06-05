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

exports.getStoreData = async function (data, clients) {
    if (data){
        try {
            data = JSON.parse(data);
        } catch (e) {
            data = [];
        }
    }
    var rec = [null, null, null, null, null, null, null, null, null, null,

                null, null, null, null, null, null, null, null, null, null];


    var clients = clients || await getSipClients();

    if (clients) {
         clients.forEach(function (row, i) {
            rec[i] = 0;
            rec[10+i] = row.user;
        });
    }

    if (data) {
        data.forEach(function (row, i) {
            for (var i = 10; i < rec.length; i++){
                if (row.substr(0,row.indexOf('@')) == rec[i]){
                    rec[i - 10] = 1;
                    rec[i] = row;
                }
            }
            // rec[i] = 1;
            // rec[10+i] = row;
        });
    }
    //bus.emit('message', {category: 'sip_proxy', type: 'trace', msg: rec });
    return [rec];
};

exports.read = function (req, res) {
    bus.request('getStatusSipCliList', {}, function (errSipList, sipList) {
        if (errSipList) return false;
        if (sipList) {
            // bus.request('sipServer', {}, function (errSipServer, sipServer) {
            bus.request('sipClients', {}, async function (errSipServer, clients) {
                if (errSipServer) return false;
                res.send({success: true, data: await exports.getStoreData(JSON.stringify(sipList), clients)});
            });
        } else {
            return false;
        }
    });
};