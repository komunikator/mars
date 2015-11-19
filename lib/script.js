
var Script = function () {
};

Script.prototype.start = function (cntx) {
    var path = require('path');
    var lib_dir = '../lib';
    var recPath = 'rec/<session_id>.wav';
    var makeCall = require(lib_dir + '/makeCall');
    var e = cntx.Events;
    var config = cntx.config;
    var sipAccountID = cntx.sipAccountID;
    /*
     * context
     {
     Events
     sip
     clientUri
     }
     */
    //exports.start = function(e, sip, uri, auth) {
    var callTimeOut = 600; //sec
    var timerId;
    var call = new makeCall(cntx);
    var dtmfKeys = null;
    var sttText = null;
    var ttsFile = null;
    var requestRes = null;
    call.start(sipAccountID);
    //var newObject = JSON.parse(JSON.stringify(oldObject));
    call.onAnswered(function () {
        var session = cntx.dialogs[call.sessionID];
        var caller = cntx.dialogs[call.sessionID].meta.from;
        var called = cntx.dialogs[call.sessionID].meta.to;
        var pin = cntx.dialogs[call.sessionID].meta.pin;
        var rtp = call.getRTP();
        var timeOutID = setTimeout(function () {
            call.stop(sipAccountID);
            clearTimeout(timeOutID);
        }, callTimeOut * 1000);

        if (cntx.script)
            var steps = cntx.script || {};

        function setParams(obj) {
            var n_obj = {};
            for (var k in obj)
                n_obj[k] = obj[k];

            for (var key in n_obj) {
                if (typeof n_obj[key] == 'function' || n_obj[key] instanceof Function)
                    n_obj[key] = n_obj[key].toString();
                if (typeof n_obj[key] == 'string' || n_obj[key] instanceof String)
                    n_obj[key] = n_obj[key]
                            .replace('<requestRes>', requestRes)
                            .replace('<dtmfKeys>', dtmfKeys)
                            .replace('<sttText>', sttText)
                            .replace('<ttsFile>', ttsFile)
                            .replace('<session_id>', call.sessionID)
                            .replace('<caller>', cntx.dialogs[call.sessionID].meta.from)
                            .replace('<called>', cntx.dialogs[call.sessionID].meta.to)
                            .replace('<pin>', cntx.dialogs[call.sessionID].meta.pin);
                if (/^function/.test(n_obj[key])) {
                    try {
                        n_obj[key] = eval('n_obj[key]=(' + n_obj[key] + ')()')
                    } catch (e) {/*console.log(e)*/
                    }
                }
            }
            return n_obj;
        }

        function goto(mark, obj) {
            var self = null;
            function findParent(obj) {
                if (obj['mark'] && obj['mark'] == mark)
                    self = obj;
                else
                    for (var i in obj)
                        if (obj[i] instanceof Object && Object.keys(obj[i]).length)
                            findParent(obj[i]);
            }
            findParent(obj);
            return self;
        }

        function getActions(obj) {
            function getAction(obj, k) {
                var f = function () {
                };
                if (!obj[k])
                    return f;
                var cb = null;
                if (obj[k].next)
                    cb = getActions(obj[k].next);
                switch (k) {
                    case 'request':
                        f = function () {
                            e.emit('message', {category: 'call', sessionID: call.sessionID, type: 'debug', msg: "Script set '" + k + "' state"});// + JSON.stringify(obj[k])});
                            var o = setParams(obj[k]);
                            requestRes = null;
                            //e.getData({source: o.source, query: o.query}, function (obj) {
                            e.getData(o, function (obj) {
                                requestRes = obj.data;//JSON.stringify(obj.data);
                                if (cb)
                                    cb();
                            });
                        };
                        break;
                    case 'sendMESSAGE':
                        f = function () {
                            e.emit('message', {category: 'call', sessionID: call.sessionID, type: 'debug', msg: "Script set '" + k + "' state"});// + JSON.stringify(obj[k])});
                            var o = setParams(obj[k]);
                            call.sendMESSAGE(sipAccountID, o.text, o.to, function () {
                                if (cb)
                                    cb();
                            });
                        };
                        break;
                    case 'sendSMS':
                        f = function () {
                            e.emit('message', {category: 'call', sessionID: call.sessionID, type: 'debug', msg: "Script set '" + k + "' state"});// + JSON.stringify(obj[k])});
                            var o = setParams(obj[k]);
                            if (!o.msisdn) {
                                var meta = cntx.dialogs[call.sessionID].meta;
                                o.msisdn = meta.type == "outgoing" ? meta.to : meta.from;
                            }
                            o.sessionID = call.sessionID;
                            e.emit('sendSMS', o);
                            if (cb)
                                cb();
                        };
                        break;
                    case 'play':
                        f = function () {
                            e.emit('message', {category: 'call', sessionID: call.sessionID, type: 'debug', msg: "Script set '" + k + "' state"});// + JSON.stringify(obj[k])});
                            var o = setParams(obj[k]);
                            if (o.file) {
                                // -----------------------------------------------------
                                // поиск и преобразование имени файла, состоящее из цифр в имена файлом из каждой цифры в отдельности
                                var media_num_path = 'media/number/'; // путь к звуковым файлам с цифрами
                                var tmp1 = o.file.split(';'); // выделяем каждое имя файла (с путём, именем и расширением)
                                // проходим по массиву с именами файлов и ищем имя, состоящее только из цифр
                                for (var i = 0, len = tmp1.length; i < len; i++)
                                {
                                    var ext = path.extname(tmp1[i]) || '.wav'; // запоминаем расширение файла
                                    var tmp2 = path.basename(tmp1[i], path.extname(tmp1[i])); // выделяем только имя файла без расширения и пути
                                    // если имя файла состоит только из цифр и не существует, разделяем по цифрам и собираем в отдельные имена файлов
                                    if (!require('fs').existsSync(tmp1[i]) && /^\d+$/.test(tmp2))
                                    {
                                        tmp2 = tmp2.split(''); // разбиваем имя файла на отдельные цифры
                                        // проходим по массиву цифр и добавляем к цифре (имени файла) путь и расширение
                                        for (var j = 0, len = tmp2.length; j < len; j++)
                                            tmp2[j] = media_num_path + tmp2[j] + ext;
                                        // на место файла с именем состоящим только из цифр собираем строку, которая содержит имена файлов из каждой цифры с путём и расширением
                                        tmp1[i] = tmp2.join(';');
                                    }
                                }
                                o.file = tmp1.join(';');
                                // -----------------------------------------------------
                            }
                            rtp.start_play(o, function () {
                                if (cb)
                                    cb();
                            });
                        };
                        break;
                    case 'stopPlay':
                        f = function () {
                            e.emit('message', {category: 'call', sessionID: call.sessionID, type: 'debug', msg: "Script set '" + k + "' state"});// + JSON.stringify(obj[k])});
                            rtp.stop_play();
                            if (cb)
                                cb();
                        };
                        break;
                    case 'sttOn':
                        f = function () {
                            e.emit('message', {category: 'call', sessionID: call.sessionID, type: 'debug', msg: "Script set '" + k + "' state" + (!obj[k].opt ? "" : (". Option:" + JSON.stringify(obj[k].opt)))});// + JSON.stringify(obj[k])});
                            sttText = '';
                            // если установлены параметры (секция 'opt') запоминаем их
                            if (obj[k].opt)
                                cntx.dialogs[call.sessionID].sttOpt = obj[k].opt;
                            else // если не установлены, удаляем предыдущие
                                delete cntx.dialogs[call.sessionID].sttOpt;
                            var options = config.get("recognize");
                            if (cntx.dialogs[call.sessionID].sttOpt && cntx.dialogs[call.sessionID].sttOpt.model && options.options)
                                options.options.model = cntx.dialogs[call.sessionID].sttOpt.model;
                            if (rtp && obj[k])
                                rtp.rec({stt_detect: (obj[k] && true), options: options});

                            var workCompleted;

                            if (obj[k]) {
                                var onStt = function (patern, keys) {
                                    if (patern)
                                        for (var i in patern) {
                                            try {
                                                if (i == keys || new RegExp(i, 'i').test(keys) || i == 'def') {
                                                    if (timerId)
                                                        clearTimeout(timerId);
                                                    getActions(patern[i])();
                                                    // delete cntx.dialogs[call.sessionID].sttOpt;
                                                    workCompleted = true; // обработчик будет принимать "нажатия", пока не будет произнесена определённая последовательность
                                                    //console.log('rtp.rec({stt_detect: true, options:{stop:true}});');
                                                    //rtp.rec({stt_detect: true});//, options:{options:{stop:true}}});
                                                    break;
                                                }
                                            }
                                            catch (e_) {
                                                e.emit('message', {category: 'call', sessionID: call.sessionID, type: 'error', msg: "Script error: '" + e_ + "'"});// + JSON.stringify(obj[k])});
                                                //console.log(e_)
                                            }
                                        }
                                };

                                call.setOnStt(function (data) {
                                    if (data.seq != undefined) {
                                        sttText = data.seq;
                                        if (!workCompleted)
                                            onStt(obj[k], data.seq);
                                    }
                                });
                            }
                            ;
                            if (cb)
                                cb();
                        };
                        break;
                    case 'dtmfOn':
                        f = function () {
                            e.emit('message', {category: 'call', sessionID: call.sessionID, type: 'debug', msg: "Script set '" + k + "' state" + (!obj[k].opt ? "" : (". Option:" + JSON.stringify(obj[k].opt)))});// + JSON.stringify(obj[k])});
                            dtmfKeys = '';

                            if (rtp && obj[k])
                                rtp.rec({dtmf_detect: (obj[k] && true)});
                            // если установлены параметры (секция 'opt') запоминаем их
                            if (obj[k].opt)
                                cntx.dialogs[call.sessionID].dtmfOpt = obj[k].opt
                            else // если не установлены, удаляем предыдущие
                                delete cntx.dialogs[call.sessionID].dtmfOpt;

                            var workCompleted;

                            if (obj[k]) {
                                var onDtmf = function (patern, keys) {
                                    if (patern)
                                        for (var i in patern) {
                                            try {
                                                if (i == keys || new RegExp(i).test(keys) || i == 'def') {
                                                    if (timerId)
                                                        clearTimeout(timerId);
                                                    getActions(patern[i])();
                                                    // delete cntx.dialogs[call.sessionID].dtmfOpt;
                                                    workCompleted = true; // обработчик будет принимать нажатия, пока не будет нажата определённая последовательность
                                                    //rtp.rec({dtmf_detect: false});
                                                    break;
                                                }
                                            }
                                            catch (e_) {
                                                e.emit('message', {category: 'call', sessionID: call.sessionID, type: 'error', msg: "Script error: '" + e_ + "'"});// + JSON.stringify(obj[k])});
                                                //console.log(e_)
                                            }
                                        }
                                };

                                call.setOnDtmf(function (data) {
                                    if (data.seq !== undefined) {
                                        dtmfKeys = data.seq;
                                        if (!workCompleted)
                                            onDtmf(obj[k], data.seq);
                                    }
                                });
                            }
                            ;
                            if (cb)
                                cb();
                        };
                        break;
                    case 'mediaStream':
                        f = function () {
                            e.emit('message', {category: 'call', sessionID: call.sessionID, type: 'debug', msg: "Script set '" + k + "' state" + (!obj[k].opt ? "" : (". Option:" + JSON.stringify(obj[k].opt)))});// + JSON.stringify(obj[k])});
                            if (rtp && obj[k])
                                rtp.rec({media_stream: obj[k]});
                        };
                        break;
                    case 'dtmfData':
                        f = function () {
                            e.emit('message', {category: 'call', sessionID: call.sessionID, type: 'debug', msg: "Script set '" + k + "' state"});// + JSON.stringify(obj[k])});
                            e.emit('dtmfData', {sessionID: call.sessionID, dtmfDataMode: obj[k], seq: dtmfKeys || sttText});
                            if (cb)
                                cb();
                        };
                        break;
                    case 'recOn':
                        f = function () {
                            e.emit('message', {category: 'call', sessionID: call.sessionID, type: 'debug', msg: "Script set '" + k + "' state"});// + JSON.stringify(obj[k])});
                            var o = setParams({rec: true, file: obj[k].file || recPath});
                            rtp.rec(o);
                            if (cb)
                                cb();
                        };
                        break;
                    case 'recOff':
                        f = function () {
                            e.emit('message', {category: 'call', sessionID: call.sessionID, type: 'debug', msg: "Script set '" + k + "' state"});// + JSON.stringify(obj[k])});
                            rtp.rec({rec: false}, cb);
                        };
                        break;
                    case 'wait':
                        f = function () {
                            var o = setParams(obj[k]);
                            e.emit('message', {category: 'call', sessionID: call.sessionID, type: 'debug', msg: "Script set '" + k + "' state"});// + JSON.stringify(obj[k])});
                            clearTimeout(timerId);
                            timerId =
                                    setTimeout(function () {
                                        if (cb)
                                            cb();
                                    }, o.time * 1000);
                            e.emit('message', {category: 'call', sessionID: call.sessionID, type: 'debug', msg: "Set wait timeout '" + o.time + "' sec"});// + JSON.stringify(obj[k])});

                        };
                        break;
                    case 'hangUp':
                        f = function () {
                            e.emit('message', {category: 'call', sessionID: call.sessionID, type: 'debug', msg: "Script set '" + k + "' state"});// + JSON.stringify(obj[k])});
                            if (timeOutID)
                                clearTimeout(timeOutID);
                            call.stop(sipAccountID);
                            if (cb)
                                cb();
                        };
                        break;
                    case 'refer':
                        f = function () {
                            e.emit('message', {category: 'call', sessionID: call.sessionID, type: 'debug', msg: "Script set '" + k + "' state"});// + JSON.stringify(obj[k])});
                            var o = setParams(obj[k]);
                            call.refer(sipAccountID, o.target);
                            if (cb)
                                cb();
                        };
                        break;
                    case 'stt':
                        f = function () {
                            e.emit('message', {category: 'call', sessionID: call.sessionID, type: 'debug', msg: "Script set '" + k + "' state"});// + JSON.stringify(obj[k])});
                            var o = setParams(obj[k]);
                            e.emit('stt', {sipAccountID: sipAccountID, sessionID: call.sessionID, file: o.file, cb: function (text) {
                                    sttText = text;
                                    if (cb)
                                        cb()
                                }});
                        };
                        break;
                    case 'tts':
                        f = function () {
                            e.emit('message', {category: 'call', sessionID: call.sessionID, type: 'debug', msg: "Script set '" + k + "' state"});// + JSON.stringify(obj[k])});
                            var o = setParams(obj[k]);

                            // если на распознавание пришли только цифры, вставляем после каждой цифры символы ". "(точка и пробел)
                            // if ( /^\d+$/.test(o.text) )
                            // o.text = o.text.split('').join('. ');

                            e.emit('tts', {sipAccountID: sipAccountID, sessionID: call.sessionID, rewrite: o.rewrite, type: o.type, text: o.text, cb: function (fileName) {
                                    ttsFile = fileName;
                                    if (cb)
                                        cb();
                                }});
                        };
                        break;
                    case 'ttsPlay':
                        f = function () {
                            e.emit('message', {category: 'call', sessionID: call.sessionID, type: 'debug', msg: "Script set '" + k + "' state"});// + JSON.stringify(obj[k])});
                            var o = setParams(obj[k]);

                            e.emit('tts', {sipAccountID: sipAccountID, sessionID: call.sessionID, rewrite: o.rewrite, type: o.type, text: o.text, cb: function (fileName) {
                                    ttsFile = fileName;
                                    k = 'play';
                                    e.emit('message', {category: 'call', sessionID: call.sessionID, type: 'debug', msg: "Script set '" + k + "' state"});// + JSON.stringify(obj[k])});
                                    rtp.start_play({file: ttsFile}, function () {
                                        if (cb)
                                            cb();
                                    });
                                }});
                        };
                        break;
                    case 'goto':
                        var o = setParams(obj).goto;
                        var g_ = goto(o, steps);
                        //var g_ = goto(obj[k], steps);
                        //console.log(g_);
                        if (g_)
                            f = function () {
                                e.emit('message', {category: 'call', sessionID: call.sessionID, type: 'debug', msg: "Script set '" + k + "' state"});// + JSON.stringify(obj[k])});
                                getActions(g_)();
                            };
                        break;
                    case 'mark':
                        break;
                    default:
                        e.emit('message', {category: 'call', sessionID: call.sessionID, type: 'error', msg: "Script undefined state '" + k + "'"});// + JSON.stringify(obj[k])});
                }
                ;
                return f;
            }
            if (obj['on']) {
                obj['sttOn'] = obj['on'];
                obj['dtmfOn'] = obj['on'];
                delete obj['on'];
            }
            var ff = [];
            for (var k in obj) {
                ff.push(getAction(obj, k));
            }
            return function () {
                ff.forEach(function (f) {
                    if (call.isActive())
                        f();
                });
            };
        }
        ;

        getActions(steps)();
    });
};
module.exports = Script;