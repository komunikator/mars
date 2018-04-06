var request = require('request');

exports.call = function(opt, sessionID, session, cb){
    var obj = {
        to: opt.to,
        script: 'Operator.js',
        params: [sessionID, opt.developer_key]
    };
    if (opt.from) obj.sipAccountID = opt.from;
    session.startScript(obj, function(data){
        if (data.event == "answered") {
            session.start_play({audioBuffer: data.sessionID, streaming: true})
        }  else {
            if (cb) cb(data);
        }   
    })
}

exports.send = function(opt, sessionID, text){
    var channel;
    var sessID;
    var dialog_store_url = "https://dialog_store.kloud.one";
    if (opt.to_sessionId) {
        channel = "out";
        sessID = opt.to_sessionId;
    }
    if (opt.to) {
        channel = "in";
        sessID = sessionID;
    }
    request(dialog_store_url+"/messages/create?text="+escape(text)+"&channel="+channel+"&time="+(new Date()).toISOString()+"&session_id="+sessID+"&token="+Buffer.from(opt.developer_key).toString('base64'));
}
