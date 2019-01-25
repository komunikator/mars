var bus = require('./system/bus'),
        config = bus.config,
        dialog = require('./dialog'),
        sip = require('sip');

function onAnswered() {
    var
        sessionID = this.sessionID,
        session = sip.dialogs[sessionID];
        session.user = {};

    session.startScript = startScript;
    session.ttsPlay = ttsPlay;
    session.sttOn = sttOn;
    session.dialogOn = sttOn;
    session.dtmfOn = dtmfOn;
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
        sipAccount = config.get("sipAccounts")[sipAccountID];

    if ('availableTime' in sipAccount) {
        if (sipAccount.availableTime <= 0) 
	    return sip.bye(sessionID, 'SIP ;cause=200; text="Payment Required"');

	if (sipAccount.availableTime < callTimeOut)
      	    callTimeOut = sipAccount.availableTime;
    }
    var timeOutID = setTimeout(function () {
                	if (sip.dialogs[sessionID]) sip.bye(sessionID, 'SIP ;cause=200; text="Call Timeout ' + callTimeOut + ' sec "');
                	clearTimeout(timeOutID);
            	    }, callTimeOut * 1000);

    session.data = null;

    var steps = session.scriptData || {};

    function ttsPlay(o, cb){
        bus.emit('tts', {sipAccountID: sipAccountID, sessionID: sessionID, rewrite: o.rewrite, type: o.type, voice: o.voice, text: o.text, key: o.key,cb: function (fileName) {
            ttsFile = fileName;
            if (!ttsFile)
            {
                if (cb)
                    cb();
                return;
            }
            session.start_play({file: ttsFile}, function () {
                if (cb)
                    cb();
            });
        }});
    }

    function getScriptParams(){
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
            pin: pin,
            bus: bus
        };
        return scriptParams;
    }

    function startScript (o, cb){
        if (o) o = setParams(o);
        bus.request('newSessionID', {}, function (err, _sessionID) {
            requestRes = null;
            var onData = function (data) {
                if (data.sessionID === _sessionID) {
                    data.event = this.event;
                    requestRes = data;
                        if (cb)
                            cb(requestRes);
                        bus.removeListener('callEnded', onEnded);
                        bus.removeListener('answered', onAnswered);
                    //bus.removeListener(this.event, onData);
                }
            };
            var onAnswered = onData.bind({event:'answered'});
            var onEnded    = onData.bind({event:'callEnded'});
            bus.on('answered', onAnswered);
            bus.on('callEnded', onEnded);
            bus.emit('startScript', {uri: o.to, sessionID: _sessionID, script: o.script, sipAccountID: (o.sipAccountID !== undefined ? o.sipAccountID  : session.sipAccountID)  , params: o.params});
        })
    }

    function dtmfOn(o, cb){
        dtmfKeys = '';
	    if (o) o = setParams(o);
        if (session && o)
            session.rec({dtmf_detect: (o && true)});
        // если установлены параметры (секция 'opt') запоминаем их
        if (o.opt)
            session.dtmfOpt = setParams(o.opt)
        else // если не установлены, удаляем предыдущие
            delete session.dtmfOpt;

        bus.emit('message', {category: 'call', sessionID: sessionID, type: 'debug', msg: "Script set 'dtmfOn' state" + (!session.dtmfOpt ? "" : (". Option:" + JSON.stringify(session.dtmfOpt)))});// + JSON.stringify(obj[k])});
        var workCompleted;

        if (o) {
            var onDtmf = function (patern, keys) {
                if (patern)
                    for (var i in patern) {
                        try {
                            if (i == keys || new RegExp(i).test(keys) || i == 'def') {
                                if (timerId)
                                    clearTimeout(timerId);
                                if (typeof patern[i] == 'function' || patern[i] instanceof Function) {
                                    patern[i]();
                                } else {
                                    getActions(patern[i])();
                                }
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
                        onDtmf(o.keys || o, data.seq);
                }
            };
        };
        if (cb)
            cb();
    }

    function sttOn(o, cb){
        sttText = '';
	if (o) o = setParams(o);
        // если установлены параметры (секция 'opt') запоминаем их
        if (o.opt)
            session.sttOpt = setParams(o.opt)
        else // если не установлены, удаляем предыдущие
            delete session.sttOpt;
	
        var options = config.get("recognize");
        if (session && session.sttOpt && session.sttOpt.developer_key) options.options.developer_key = session.sttOpt.developer_key;
        if (session && session.sttOpt && session.sttOpt.model) options.options.model = session.sttOpt.model;
        if (options && options.options && options.options.developer_key)
            bus.emit('message', {category: 'call', sessionID: sessionID, type: 'debug', msg: "Script set 'sttOn' state" + (!session.sttOpt ? "" : (". Option:" + JSON.stringify(session.sttOpt)))});// + JSON.stringify(obj[k])});
        else
        {
            bus.emit('message', {category: 'call', sessionID: sessionID, type: 'error', msg: "Recognize settings is not defined"});
            return;
        }

        if (options.options && session.sttOpt) { 
            if (session.sttOpt.model)
                options.options.model = session.sttOpt.model;
            if (session.sttOpt.customGrammar)
                options.options.customGrammar = session.sttOpt.customGrammar;
            else 
                delete options.options.customGrammar;        
        }

        if (o && o.opt && o.opt.to) { 
	    options.options.to = o.opt.to;
            dialog.call(o.opt, sessionID, session, function(dialog_data){
                if (cb) cb(dialog_data);
            });
        }
        if (session && o)
            session.rec({stt_detect: (o && true), options: options});

        var workCompleted;

        if (o) {
            var onStt = function (patern, keys) {
                if (patern)
                    for (var i in patern) {
                        try {
                            if (i == keys || new RegExp(i, 'i').test(keys) || i == 'def') {
                                if (timerId)
                                    clearTimeout(timerId);
                                if (typeof patern[i] == 'function' || patern[i] instanceof Function) {
                                    patern[i]();
                                } else {
                                    getActions(patern[i])();
                                }
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
                    if (o.opt && o.opt && (o.opt.to_sessionId || o.opt.to)) {
                        dialog.send(o.opt, sessionID, sttText);
                    }
                    if (!workCompleted)
                        onStt(o.keys || o, data.seq);
                }
            };
        };
        if (cb && o.opt && !o.opt.to)
            cb();
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
                        o.text = o.text.toUpperCase();

                        var arrDtmf;
                        var regexp = /[^A-D0-9R*#]/gi;
                        var isNotCorrect = regexp.test(o.text);
                        var interval = 1000;
                        if (o.interval >= 0)
                            interval = o.interval;

                        var sendDtmf = function () {
                            var curSym = arrDtmf.shift();
                            if (curSym == 'R')
                                curSym = 'hf';

                            if (!curSym) {
                                if (cb)
                                    cb();
                            } else {
                                setTimeout(function () {
                                    sip.sendDtmf(sessionID, curSym, sendDtmf);
                                }, interval);
                            }
                        }

                        //console.log('isNotCorrect = ' + isNotCorrect);

                        if ( (!isNotCorrect) && (o.text) ) {
                            arrDtmf = o.text.split('');
                            //console.log(arrDtmf);
                        } else {
                            bus.emit('message', {category: 'call', type: 'error',  sessionID: sessionID, msg: "Dtmf is not correct " + o.text});
                        }

                        if (arrDtmf) {
                            sendDtmf();
                        } else {
                            if (cb) cb();
                        }

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
                                if (!require('fs').existsSync(tmp1[i]) && /^\d+$/.test(tmp2)) {
                                    tmp2 = tmp2.split(''); // разбиваем имя файла на отдельные цифры

                                    // проходим по массиву цифр и добавляем к цифре (имени файла) путь и расширение
                                    for (var j = 0, len1 = tmp2.length; j < len1; j++)
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
                        var o = setParams(obj[k]);
                        sttOn(o, cb);
                    };
                    break;
                case 'dialogOn':
                    f = function () {
                        // bus.emit('message', {category: 'call', sessionID: sessionID, type: 'debug', msg: "Script set '" + k + "' state" + (!obj[k].opt ? "" : (". Option:" + JSON.stringify(obj[k].opt)))});// + JSON.stringify(obj[k])});
                        var o = setParams(obj[k]);
                        sttOn(o, cb);
                    };
                    break;
                case 'dtmfOn':
                    f = function () {
                        // bus.emit('message', {category: 'call', sessionID: sessionID, type: 'debug', msg: "Script set '" + k + "' state" + (!obj[k].opt ? "" : (". Option:" + JSON.stringify(obj[k].opt)))});// + JSON.stringify(obj[k])});
                        var o = setParams(obj[k]);
                        dtmfOn(o, cb);
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
                        if (obj[k].rejectTo) {
                            sip.refer(sessionID, o.target, obj[k].rejectTo);
                        } else {
                            sip.refer(sessionID, o.target);
                        }
                        session.onRefer = function(data){
                            var msg = (data.status == 200) ? 'Call successfully transferred to "' + o.target + '"' : 'Call transfer to "' + o.target + '" failed with code "' + data.status + '"';
                            bus.emit('message', {category: 'call', sessionID: sessionID, type: data.status == 200 ? 'info' : 'error', msg: msg});
                            if (cb)
                                cb();
                        session.onRefer = null;
                        };
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

                        bus.emit('tts', {sipAccountID: sipAccountID, sessionID: sessionID, rewrite: o.rewrite, type: o.type, voice: o.voice, text: o.text, cb: function (fileName) {
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
                        console.log(o)
                        ttsPlay(o, cb);
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
                case 'sub':
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
                case 'async':
                    var keys = Object.keys(obj[k]);
                    if (!keys || !keys.length)
                        break;
                    for (var k_ = keys.length - 1; k_ > 0; k_--) {
                        var next_ = {};
                        next_[keys[k_]] = obj[k][keys[k_]];
                        if (typeof obj[k][keys[k_ - 1]] !== "object")
                            obj[k][keys[k_ - 1]] = {};
                        var obj_ = obj[k][keys[k_ - 1]];
                        while (obj_.next) {
                            var keys_ = Object.keys(obj_.next);
                            if (!keys_.length)
                                delete obj_.next;
                            else
                                obj_ = obj_.next[keys_[keys_.length - 1]];
                        }
                        obj_.next = next_;
                        delete obj[k][keys[k_]];
                    }
                    ;
                    //console.log(JSON.stringify(obj[k]));
                    f = getActions(obj[k]);
                    break;
                case 'startScript' :
                    var o = setParams(obj[k]);
                    startScript(o, cb);
                    
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
    if (typeof steps == 'function') {
        session.bye = function () {
            sip.bye(sessionID)
        };
        session.refer = function (target) {
            sip.refer(sessionID, target)
        };
        session.sendDtmf = function (sym) {
            sip.sendDtmf(sessionID, sym)
        };
        steps.call({}, getScriptParams());
    }
    else
        getActions(steps)();
}

bus.on('stream_on', function (data) {//RtpStart //stream_on
    onAnswered.apply(data);
});

module.exports = onAnswered;
