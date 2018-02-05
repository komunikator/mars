var bus;
exports.init = function(_bus) {
    bus = _bus;
};


function getB24accounts() {
    return new Promise((resolve) => {
        bus.request('b24accounts', {}, function (err, data) {
            if (err) return resolve([]);
            if (data) {
                return resolve(data);
            }
            return resolve([]);
        });
    });
}

exports.getStoreData = async function() {
    let data = await getB24accounts();

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
        rec[i] = data[row].disable || 1;
        rec[(1 + '' + i)] = row;
    });
    return [rec];
};

exports.read = async function(req, res) {
    res.send({ 
        success: true, 
        data: await exports.getStoreData() 
    });

    // bus.request('b24accounts', {}, function (errSipServer, clients) {
    //     if (errSipServer) return false;
    //     res.send({success: true, data: exports.getStoreData(JSON.stringify(clients))});
    // });
};