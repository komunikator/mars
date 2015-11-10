/*
 * dialog module
 */

/**
 * This method read records
 *
 * @param req
 * @param res
 */
var Events;
var scripts;
exports.init = function (events) {
    Events = events;
    Events.getData({source: 'scriptData', id: 'root'}, function (obj) {
        scripts = obj.data || [];
    });

};

exports.getStoreData = function (data) {
    var dialogData = [];
    if (data)
        for (var i in data) {
            var meta = data[i].meta;
            if (meta) {
                var date = meta.times && meta.times.ringing && new Date(meta.times.ringing);
                var _data = [];
                if (data[i].dtmfData)
                    data[i].dtmfData.forEach(function (el) {
                        _data.push(el.keys);
                    });
                dialogData.push(
                        {_id: i,
                            gdate: require('dateformat')(date, 'yyyy.mm.dd HH:MM:ss'),
                            type: meta.type ? meta.type : '',
                            msisdn: meta.from ? meta.from : '',
                            service_contact: meta.to ? meta.to : '',
                            status: meta.status ? (meta.times.end ? 'ended' : meta.status) : '',
                            reason: meta.statusReason ? meta.statusReason : '',
                            script: meta.script ? meta.script.replace('.js', '') : '',
                            data: _data.length ? _data.join('<br>') : ''
                                    //rtp_local: meta.in ? meta.in.ip + ":" + meta.in.port : '',
                                    //rtp_remote: meta.out ? meta.out.ip + ":" + meta.out.port : '',
                                    //refer: meta.refer ? meta.refer : ''
                        }
                );
            }
        }
    return dialogData;
};

exports.read = function (req, res) {
    //var params = req.body;

    Events.getData({source: 'dialogData'}, function (obj) {
        res.send({success: true, data: exports.getStoreData(obj.data)});
    });
};

