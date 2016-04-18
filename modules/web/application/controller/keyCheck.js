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

exports.check = function (req, res) {
    //res.send(req.query.type);
    var checked = false;
    if (req.query.type == "ivona"){
        if (!req.query.accessKey || !req.query.secretKey){
            return res.send({success: false, msg: "Key empty"});
        }
        var Ivona = require('ivona-node');
        //bus.emit('message',req.query);
        var ivona = new Ivona({
            accessKey: req.query.accessKey,
            secretKey: req.query.secretKey
        });

        ivona.listVoices().on('complete', function(voices) {
            if (voices.message == "Authentication failed"){
                checked = false;
            } else {
                checked = true;
            }
            res.send({success: true, checked: checked});
        });
    } else
    if (req.query.type == "yandex"){
        if (!req.query.key){
            return res.send({success: false, msg: "Key empty"});
        }
        var yandex_speech = require('yandex-speech');
        yandex_speech.ASR({developer_key: req.query.key},
        function (err, httpResponse, xml) {
            if (xml.substr(0,xml.indexOf(" ")) == "Invalid"){
                checked = false;
            } else {
                checked = true;
            }
            res.send({success: true, checked: checked});
        });
    }
    else {
        res.send({success: false, msg: "Unknown type"});
    }
};

