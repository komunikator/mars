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
    if (data){
        try {
            data = JSON.parse(data);
        } catch (e) {
            data = [];
        }
    }
    var rec = [null, null, null, null, null, null, null, null, null, null,
    
                null, null, null, null, null, null, null, null, null, null];
    

    var clients = bus.config.get('sipClients');

    if (clients){
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
        
    return [rec];
};

exports.read = function (req, res) {
    bus.request('getStatusSipCliList', {}, function (err, data) {
        res.send({success: true, data: exports.getStoreData(JSON.stringify(data))});
    });
};

