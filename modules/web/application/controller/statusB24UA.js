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
        if ( data[row] && data[row].auth && ('disable' in data[row].auth) ) {
            if (data[row].auth.disable == 1) {
                rec[i] = 0;
            } else {
                if (data[row].auth.access_token) {
                    rec[i] = 1;
                } else {
                    rec[i] = 2;
                }
            }
        } else {
            if (data[row] && data[row].auth && data[row].auth.access_token) {
                rec[i] = 1;
            } else {
                rec[i] = 2;
            }
        }

        /*
        if ('disable' in data[row].auth) {
            rec[i] = !data[row].auth.disable >>> 0;

            // Не удалось зарегистрироваться
            if (rec[i] && row && data && data[row] && data[row].auth && !data[row].auth.access_token) {
                rec[i] = 2;
            }
        }
        */

        rec[(1 + '' + i)] = row;
    });
    return [rec];
};

exports.read = async function(req, res) {
    res.send({ 
        success: true, 
        data: await exports.getStoreData() 
    });
};