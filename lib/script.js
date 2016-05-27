var bus = require('./system/bus'),
        config = bus.config,
        sip = require('./sip/sip');

function onAnswered() {
    var
       sessionID = this.sessionID,
       session = sip.dialogs[sessionID];
       session.user = {};

    if (!session) {
        bus.emit('message', {category: 'call', sessionID: sessionID, type: 'error', msg: "Dialog not found"});
        return;
    }

    var
        path = require('path'),
        recPath = 'rec/<session_id>.wav',
        callTimeOut = 600, //sec
        timerId,
        sttText = null,
        dtmfKeys = null,
        ttsFile = null,
        requestRes = null,
        actionRes = null,
        sipAccountID = session.sipAccountID,
        caller = session.meta.from,
        called = session.meta.to,
        pin = session.meta.pin,
        timeOutID = setTimeout(function () {
            sip.bye(sessionID);
            clearTimeout(timeOutID);
        }, callTimeOut * 1000);

        session.data = null;

    var steps = session.scriptData || {};

    function getScriptParams()
    {
        // параметры для передачи в сценарий
        var scriptParams = {
                                session: session,
                                requestRes: requestRes,
                                actionRes: actionRes,
                                dtmfKeys: dtmfKeys,
                                sttText: sttText,
                                data: session.data,
                                ttsFile: ttsFile,
                                sessionID: sessionID,
                                caller: caller,
                                called: called,
                                pin: pin
        };
        return scriptParams;
    }

    function setParams(obj) {
        var n_obj = {};

        for (var k in obj)
            n_obj[k] = obj[k];
        delete n_obj['next']; //не вычисляем 'next' при прохождении по ключам состояния

        for (var key in n_obj) {
            // реализуется каскад вызовов функций, т.е. пока в переменной n_obj[key] будет функция, выполняем её
            while (typeof n_obj[key] == 'function' || n_obj[key] instanceof Function)
            {
                n_obj[key] = n_obj[key].call({}, getScriptParams());
            }
            if (typeof n_obj[key] == 'string' || n_obj[key] instanceof String)
                n_obj[key] = n_obj[key]
                        .replace('<requestRes>', requestRes)
                        .replace('<actionRes>', actionRes)
                        .replace('<dtmfKeys>', dtmfKeys)
                        .replace('<sttText>', sttText)
                        .replace('<ttsFile>', ttsFile)
                        .replace('<session_id>', sessionID)
                        .replace('<caller>', session.meta.from)
                        .replace('<called>', session.meta.to)
                        .replace('<pin>', session.meta.pin);
        }
        return n_obj;
    }

    function goto(mark, obj) {
        var self = null;

        function findParent(obj) {
            if (obj['mark'] && setParams({mark: obj['mark']}).mark == mark)
            {
                self = obj;
            }
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
                //cb вычисляем в момент вызова
                cb = function () {
                                      getActions(setParams({key: this}).key)()
                                 }.bind(obj[k].next);
            switch (k) {
                case 'request':
                    f = function () {
                        bus.emit('message', {category: 'call', sessionID: sessionID, type: 'debug', msg: "Script set '" + k + "' state"});// + JSON.stringify(obj[k])});
                        var o = setParams(obj[k]);
                        requestRes = null;
                        //e.getData({source: o.source, query: o.query}, function (obj) {
                        bus.request(o.source, o.query, function (err, data) {
                            requestRes = data;//JSON.stringify(obj.data);
                            if (cb)
                                cb();
                        });
                    };
                    break;
                case 'sendMESSAGE':
                    f = function () {
                        bus.emit('message', {category: 'call', sessionID: sessionID, type: 'debug', msg: "Script set '" + k + "' state"});// + JSON.stringify(obj[k])});
                        var o = setParams(obj[k]);
                        bus.emit('msgSend', {
                            msg: o.text,
                            uri: o.uri || session.sipContext.headers.to.uri,
                            sessionID: sessionID,
                            sipAccountID: sipAccountID,
                            cb: function () {
                                if (cb)
                                    cb();
                            }});
                    };
                    break;
                case 'sendSMS':
                    f = function () {
                        bus.emit('message', {category: 'call', sessionID: sessionID, type: 'debug', msg: "Script set '" + k + "' state"});// + JSON.stringify(obj[k])});
                        var o = setParams(obj[k]);
                        if (!o.msisdn) {
                            var meta = session.meta;
                            o.msisdn = meta.type == "outgoing" ? meta.to : meta.from;
                        }
                        o.sessionID = sessionID;
                        bus.emit('sendSMS', o);
                        if (cb)
                            cb();
                    };
                    break;
                case 'sendDtmf':
                    f = function () {
                        var o = setParams(obj[k]);
                        var arrDtmf = o.text.split('');

                        var doIt = function() {
                            var curSym = arrDtmf.shift();
                            if (curSym == 'R') curSym = 'hf';

                            if (!curSym) {
                                console.log('curSym = ' + curSym + ' Вызываем callback');
                                bus.emit('message', {category: 'call', sessionID: sessionID, type: 'debug', msg: "curSym " + curSym + " Вызываем callback"});
                                if (cb) cb();
                            } else {
                                setTimeout(function() {
                                    console.log('curSym = ' + curSym + ' посылаем dtmf');
                                    bus.emit('message', {category: 'call', sessionID: sessionID, type: 'debug', msg: "curSym " + curSym + " посылаем dtmf"});
                                    sip.sendDtmf(sessionID, curSym, doIt);
                                }, 1000);
                            }
                        }

                        doIt();

                        //sip.sendDtmf(sessionID, o.text);
                        //if (cb)
                            //cb();
                    };
                    break;
                case 'play':
                    f = function () {
                        bus.emit('message', {category: 'call', sessionID: sessionID, type: 'debug', msg: "Script set '" + k + "' state"});// + JSON.stringify(obj[k])});
                        var o = setParams(obj[k]);
                        if (o.file) {
                            // -----------------------------------------------------
                            // поиск и преобразование имени файла, состоящее из цифр в имена файлом из каждой цифры в отдельности
                            var media_num_path = o.num_path || 'media/number/'; // путь к звуковым файлам с цифрами
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
                        session.start_play(o, function () {
                            if (cb)
                                cb();
                        });
                    };
                    break;
                case 'stopPlay':
                    f = function () {
                        bus.emit('message', {category: 'call', sessionID: sessionID, type: 'debug', msg: "Script set '" + k + "' state"});// + JSON.stringify(obj[k])});
                        session.stop_play();
                        if (cb)
                            cb();
                    };
                    break;
                case 'sttOn':
                    f = function () {
                        // bus.emit('message', {category: 'call', sessionID: sessionID, type: 'debug', msg: "Script set '" + k + "' state" + (!obj[k].opt ? "" : (". Option:" + JSON.stringify(obj[k].opt)))});// + JSON.stringify(obj[k])});
                        sttText = '';
                        // если установлены параметры (секция 'opt') запоминаем их
                        if (obj[k].opt)
                            session.sttOpt = setParams(obj[k].opt)
                        else // если не установлены, удаляем предыдущие
                            delete session.sttOpt;

                        var options = config.get("recognize");
                        if (options && options.options && options.options.developer_key)
                            bus.emit('message', {category: 'call', sessionID: sessionID, type: 'debug', msg: "Script set '" + k + "' state" + (!session.sttOpt ? "" : (". Option:" + JSON.stringify(session.sttOpt)))});// + JSON.stringify(obj[k])});
                        else
                        {
                            bus.emit('message', {category: 'call', sessionID: sessionID, type: 'error', msg: "Recognize settings is not defined"});
                            return;
                        }

                        if (session.sttOpt && session.sttOpt.model && options.options)
                            options.options.model = session.sttOpt.model;
                        if (session && obj[k])
                            session.rec({stt_detect: (obj[k] && true), options: options});

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
                                                // delete session.sttOpt;
                                                workCompleted = true; // обработчик будет принимать "нажатия", пока не будет произнесена определённая последовательность
                                                //console.log('session.rec({stt_detect: true, options:{stop:true}});');
                                                //session.rec({stt_detect: true});//, options:{options:{stop:true}}});
                                                break;
                                            }
                                        }
                                        catch (e_) {
                                            bus.emit('message', {category: 'call', sessionID: sessionID, type: 'error', msg: "Script error: '" + e_ + "'"});// + JSON.stringify(obj[k])});
                                            //console.log(e_)
                                        }
                                    }
                            };

                            session.sttEvent = function (data) {
                                if (data.seq != undefined) {
                                    sttText = data.seq;
                                    if (!workCompleted)
                                        onStt(obj[k], data.seq);
                                }
                            };
                        }
                        ;
                        if (cb)
                            cb();
                    };
                    break;
                case 'dtmfOn':
                    f = function () {
                        // bus.emit('message', {category: 'call', sessionID: sessionID, type: 'debug', msg: "Script set '" + k + "' state" + (!obj[k].opt ? "" : (". Option:" + JSON.stringify(obj[k].opt)))});// + JSON.stringify(obj[k])});
                        dtmfKeys = '';

                        if (session && obj[k])
                            session.rec({dtmf_detect: (obj[k] && true)});
                        // если установлены параметры (секция 'opt') запоминаем их
                        if (obj[k].opt)
                            session.dtmfOpt = setParams(obj[k].opt)
                        else // если не установлены, удаляем предыдущие
                            delete session.dtmfOpt;

                        bus.emit('message', {category: 'call', sessionID: sessionID, type: 'debug', msg: "Script set '" + k + "' state" + (!session.sttOpt ? "" : (". Option:" + JSON.stringify(session.sttOpt)))});// + JSON.stringify(obj[k])});

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
                                                // delete session.dtmfOpt;
                                                workCompleted = true; // обработчик будет принимать нажатия, пока не будет нажата определённая последовательность
                                                //session.rec({dtmf_detect: false});
                                                break;
                                            }
                                        }
                                        catch (e_) {
                                            bus.emit('message', {category: 'call', sessionID: sessionID, type: 'error', msg: "Script error: '" + e_ + "'"});// + JSON.stringify(obj[k])});
                                            //console.log(e_)
                                        }
                                    }
                            };

                            session.onDtmf = function (data) {
                                if (data.seq !== undefined) {
                                    dtmfKeys = data.seq;
                                    if (!workCompleted)
                                        onDtmf(obj[k], data.seq);
                                }
                            };
                        }
                        ;
                        if (cb)
                            cb();
                    };
                    break;
                case 'mediaStream':
                    f = function () {
                        bus.emit('message', {category: 'call', sessionID: sessionID, type: 'debug', msg: "Script set '" + k + "' state" + (!obj[k].opt ? "" : (". Option:" + JSON.stringify(obj[k].opt)))});// + JSON.stringify(obj[k])});
                        if (session && obj[k])
                            session.rec({media_stream: obj[k]});
                    };
                    break;
                case 'dtmfData':
                    f = function () {
                        bus.emit('message', {category: 'call', sessionID: sessionID, type: 'debug', msg: "Script set '" + k + "' state"});// + JSON.stringify(obj[k])});
                        bus.emit('dtmfData', {sessionID: sessionID, dtmfDataMode: obj[k], seq: session.data || dtmfKeys || sttText});
                        session.data = null;
                        if (cb)
                            cb();
                    };
                    break;
                case 'dtmfDataFields':
                    f = function () {
                        bus.emit('message', {category: 'call', sessionID: sessionID, type: 'debug', msg: "Script set '" + k + "' state. Data: " + JSON.stringify(obj[k])});// + JSON.stringify(obj[k])});
                        session.dtmfDataFields = obj[k];
                    };
                    break;
                case 'recOn':
                    f = function () {
                        bus.emit('message', {category: 'call', sessionID: sessionID, type: 'debug', msg: "Script set '" + k + "' state"});// + JSON.stringify(obj[k])});
                        var o = setParams({rec: obj[k], file: obj[k].file || recPath, type: (obj[k].type === 'stereo' ? '-M' : '-m')});
                        session.rec(o);
                        if (cb)
                            cb();
                    };
                    break;
                case 'recOff':
                    f = function () {
                        bus.emit('message', {category: 'call', sessionID: sessionID, type: 'debug', msg: "Script set '" + k + "' state"});// + JSON.stringify(obj[k])});
                        session.rec({rec: false}, cb);
                    };
                    break;
                case 'wait':
                    f = function () {
                        var o = setParams(obj[k]);
                        bus.emit('message', {category: 'call', sessionID: sessionID, type: 'debug', msg: "Script set '" + k + "' state"});// + JSON.stringify(obj[k])});
                        clearTimeout(timerId);
                        timerId =
                                setTimeout(function () {
                                    if (cb)
                                        cb();
                                }, o.time * 1000);
                        bus.emit('message', {category: 'call', sessionID: sessionID, type: 'debug', msg: "Set wait timeout '" + o.time + "' sec"});// + JSON.stringify(obj[k])});

                    };
                    break;
                case 'hangUp':
                    f = function () {
                        bus.emit('message', {category: 'call', sessionID: sessionID, type: 'debug', msg: "Script set '" + k + "' state"});// + JSON.stringify(obj[k])});
                        if (timeOutID)
                            clearTimeout(timeOutID);
                        sip.bye(sessionID);
                        if (cb)
                            cb();
                    };
                    break;
                case 'refer':
                    f = function () {
                        bus.emit('message', {category: 'call', sessionID: sessionID, type: 'debug', msg: "Script set '" + k + "' state"});// + JSON.stringify(obj[k])});
                        var o = setParams(obj[k]);
                        sip.refer(sessionID, o.target);
                        if (cb)
                            cb();
                    };
                    break;
                case 'stt':
                    f = function () {
                        bus.emit('message', {category: 'call', sessionID: sessionID, type: 'debug', msg: "Script set '" + k + "' state"});// + JSON.stringify(obj[k])});
                        var o = setParams(obj[k]);
                        bus.emit('stt', {sipAccountID: sipAccountID, sessionID: sessionID, file: o.file, cb: function (text) {
                                sttText = text;
                                if (cb)
                                    cb()
                            }});
                    };
                    break;
                case 'tts':
                    f = function () {
                        bus.emit('message', {category: 'call', sessionID: sessionID, type: 'debug', msg: "Script set '" + k + "' state"});// + JSON.stringify(obj[k])});
                        var o = setParams(obj[k]);

                        // если на распознавание пришли только цифры, вставляем после каждой цифры символы ". "(точка и пробел)
                        // if ( /^\d+$/.test(o.text) )
                        // o.text = o.text.split('').join('. ');

                        bus.emit('tts', {sipAccountID: sipAccountID, sessionID: sessionID, rewrite: o.rewrite, type: o.type, text: o.text, cb: function (fileName) {
                                ttsFile = fileName;
                                if (cb)
                                    cb();
                            }});
                    };
                    break;
                case 'ttsPlay':
                    f = function () {
                        bus.emit('message', {category: 'call', sessionID: sessionID, type: 'debug', msg: "Script set '" + k + "' state"});// + JSON.stringify(obj[k])});
                        var o = setParams(obj[k]);

                        bus.emit('tts', {sipAccountID: sipAccountID, sessionID: sessionID, rewrite: o.rewrite, type: o.type, text: o.text, cb: function (fileName) {
                                ttsFile = fileName;
                                if (!ttsFile)
                                {
                                    if (cb)
                                        cb();
                                    return;
                                }
                                k = 'play';
                                bus.emit('message', {category: 'call', sessionID: sessionID, type: 'debug', msg: "Script set '" + k + "' state"});// + JSON.stringify(obj[k])});
                                session.start_play({file: ttsFile}, function () {
                                    if (cb)
                                        cb();
                                });
                            }});
                    };
                    break;
                case 'goto':
                    var o = setParams({goto: obj[k]}).goto;
                    var g_ = goto(o, steps);
                    //var g_ = goto(obj[k], steps);
                    //console.log(g_);
                    if (g_)
                        f = function () {
                            bus.emit('message', {category: 'call', sessionID: sessionID, type: 'debug', msg: "Script set '" + k + "' state"});// + JSON.stringify(obj[k])});
                            getActions(g_)();
                        };
                    break;
                case 'mark': // setParams({mark:obj[k]});
                    break;
                case 'action':
                    var scriptParams = getScriptParams();
                    scriptParams.cb = function (res) {
                        actionRes = res;
                        if (cb)
                            cb()
                    };
                    if (typeof obj[k].func == 'function' || obj[k].func instanceof Function)
                    {
                        var func = obj[k].func || function () {
                            this.cb();
                        };
                        // func.apply(scriptParams);
                        func.call({}, scriptParams);
                    }
                    break;
                default:
                    bus.emit('message', {category: 'call', sessionID: sessionID, type: 'error', msg: "Script undefined state '" + k + "'"});// + JSON.stringify(obj[k])});
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
                if (session.rtpActive && !session.lock)
                    f();
            });
        };
    }
    ;

    getActions(steps)();
}


bus.on('stream_on', function (data) {//RtpStart //stream_on
    onAnswered.apply(data);
});

module.exports = onAnswered;
