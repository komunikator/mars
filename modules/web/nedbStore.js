


var NeDB = require('nedb');
var service = require('feathers-nedb');
var db = new NeDB({
  filename: 'data/registeredCalls.db',
  autoload: true
});


function recCall(app, bus, data) {
    bus.emit('message', {type: 'info', msg: data});
    app.use('/registeredCalls', service({
        Model: db
    }));

    var dtmfString = '';
    var i = 0,
            len = data.dtmfData ? data.dtmfData.length : 1;

    var date = data.dtmfData ? new Date(data.times.ringing) : new Date(data.times.end);
    if (data.dtmfData && data.dtmfData[0] && data.dtmfData[0].keys) {
        dtmfString = String((data.dtmfData[0] && data.dtmfData[0].name ? data.dtmfData[0].name + ': ' : '') + data.dtmfData[0].keys).replace(';', '');
        //console.log(dtmfString);
        while (++i < len)
        {
            dtmfString += ';' + String((data.dtmfData[i] && data.dtmfData[i].name ? data.dtmfData[i].name + ': ' : '') + data.dtmfData[i].keys).replace(';', '');
        }
    }

    var rec = {
        gdate: require('dateformat')(date, 'yyyy.mm.dd HH:MM:ss'),
        step: i,
        session_id: data.sessionID,
        parent_id: data.parentID,
        msisdn: (data.type == 'outgoing') ? data.to : data.from,
        service_contact: (data.type == 'outgoing') ? data.from : data.to,
        script: data.script != undefined ? data.script : '',
        data: dtmfString,
        status: data.status ? data.status : '',
        reason: data.statusReason ? data.statusReason : '',
        duration: data.duration,
        type: data.type
    };

    if (data.refer)
        rec.refer = data.refer;

    app.service('registeredCalls').create(rec).then(function(message) {
      console.log('Created message', message);
    });
    return rec;
}
module.exports.recCall = recCall;
