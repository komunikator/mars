(function () {

    process.on('uncaughtException', function (e) {
        console.log('uncaughtException', e);
    });

    var libDir = './lib',
            confFile = './config/config.js',
            ua = null,
            dialogs = {},
            OnEvent = {},
            fs = require('fs'),
            sip = require(libDir + '/sip'),
            //config = require('nconf').argv().env().file({file: confFile}),
            config = require('nconf').file({file: confFile}),
            log4js = require('log4js'),
            jobs = [];
    log4js.configure(confFile, {reloadSecs: 300});
    function loggerInit() {
        var logLevels = config.get("logLevel");
        if (logLevels)
            for (var category in logLevels)
                log4js.getLogger(category).setLevel(logLevels[category]);
    }

    loggerInit();

    var sipAccounts = config.get("sipAccounts") || [];

    function registerAccountEvent() {
        sipAccounts = config.get("sipAccounts");
        if (sipAccounts)
            sipAccounts.forEach(function (account) {
                if (!account.disable) {
                    var event = 'on_call[' + account.user + '@' + account.host + ']';
                    if (OnEvent[event] === undefined)
                        OnEvent[event] = null;
                }
                else
                if (OnEvent[event] !== undefined)
                    delete OnEvent[event];
            });

        e.removeListener('lastCallEnded', restartSipConnections);

        if (isChangeSipAccounts()) {
            if (isDialogEmpty()) {
                restartSipConnections();
            } else {
                e.once('lastCallEnded', restartSipConnections);
            }
        }

        function isChangeSipAccounts() {
            if (ua && ua.auth && sipAccounts) {
                if (sipAccounts.length == ua.auth.length) {
                    for (var i = 0, len = sipAccounts.length; i < len; i++) {
                        if (isHaveCopyInArray(sipAccounts[i]) == false) {
                            //console.log('Start register sip accounts');
                            return true;
                        }
                    }
                    //console.log('Not change sip accounts');
                    return false;
                } else {
                    //console.log('Start register sip accounts');
                    return true;

                }
            } else {
                return false;
            }
        }

        function isHaveCopyInArray(account) {
            for (var j = 0, len = ua.auth.length; j < len; j++) {
                var uaAccount = ua.auth[j];

                if (isCopy(account, uaAccount)) {
                    return true;
                } else {
                    if (j == ua.auth.length - 1) {
                        return false;
                    }
                }
            }
        }

        function isCopy(account, uaAccount) {
            var isSame = false;
            for (var key in account)
            {
                if (uaAccount[key] != undefined) {
                    if (uaAccount[key] == account[key]) {
                        isSame = true;
                    } else {
                        return false;
                    }
                } else {
                    return false;
                }
            }

            if (isSame) {
                for (var key in uaAccount)
                {
                    if (account[key] != undefined) {
                        if (account[key] == uaAccount[key]) {
                            isSame = true;
                        } else {
                            return false;
                        }
                    } else {
                        return false;
                    }
                }

                if (isSame) {
                    return true;
                } else {
                    return false;
                }
            } else {
                return false;
            }
        }
    }

    function restartSipConnections() {
        var countContacts = 0;

        ua.contact.forEach(function (obj, sipAccountID) {
            countContacts++;
        });

        if (countContacts == 0) {
            ua.start();
        } else {
            ua.contact.forEach(function (obj, sipAccountID) {
                ua.registerInit(sipAccountID, 1, function () {
                    countContacts--;

                    if (countContacts < 1) {
                        ua.sUA.forEach(function (obj) {
                            obj.destroy();
                        });

                        ua.start();
                    }
                });
            });
        }

        e.getData({source: 'getStatusUAList'}, function (obj) {
            e.emit('updateData', {source: 'listSIP', data: obj.data});
            e.emit('updateData', {source: 'statusUA', data: obj.data});
        });
    }

    function getEventsList() {
        var list = [];
        for (var key in OnEvent)
            list.push(key);
        return list;
    }

    var e = new (require("events").EventEmitter)();

    e.setEventHandlers = function (eventHandlers) {
        if (eventHandlers)
            for (var event in eventHandlers) {
                this.on(event, eventHandlers[event]);
            }
    };

    e.setMaxListeners(20);

    e.newUUID = function () {
        var UUID = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
        return UUID;
    };

    e.createRandomToken = function (size, base) {
        var i, r,
                token = '';
        base = base || 32;
        for (i = 0; i < size; i++) {
            r = Math.random() * base | 0;
            token += r.toString(base);
        }
        return token;
    };
    e.newTag = function () {
        return e.createRandomToken(10, 15);
    };
    e.newCallId = function (ua) {
        return e.createRandomToken(22) + '@' + ua.hostIp;

    };
    e.newSessionID = function () {
        return e.createRandomToken(10, 10);
    };
    e.getPin = function (val) {
        return require("crypto")
                .createHash("md5")
                .update(val)
                .digest("hex").replace(/\D/g, '').substr(0, 4)
    };

    //e.unId = function() {
    //return Math.random().toString(16).slice(2);
    //};


//var media_files = fs.readdirSync(__dirname + '\\company');
//console.log(media_files);

    e.on('message', function (data) {
        var category = data.category || 'server';
        var logger = log4js.getLogger(category);
        var type = data.type || 'info';
        if (category === 'call') {
            if (data.sessionID && dialogs[data.sessionID]) {
                dialogs[data.sessionID].log = dialogs[data.sessionID].log || [];
                dialogs[data.sessionID].log.push(require('dateformat')(Date.now(), 'yyyy.mm.dd HH:MM:ss.l') + ' ' + data.msg);
            }
            ;
            data.msg = data.sessionID + ' : ' + data.msg;
        }
        logger[type](data.msg || data);
    });

    e.on('cdr', function (data) {
        e.emit('message', {category: 'cdr', msg: JSON.stringify(data)});
        /*
         var fs = fs;
         fs.appendFile('cdr.log', JSON.stringify(data) + "\r\n", function(err) {
         if (err)
         console.log(err);
         });
         */
    });

    function createCDR(data) {
        //console.log(data);
        var cdr = {};
        for (var k in data.meta)
            cdr[k] = data.meta[k];
        if (cdr['in'])
            delete (cdr['in']);
        if (cdr['out'])
            delete (cdr['out']);
        if (cdr.times.answered && cdr.times.end)
            cdr.duration = Math.ceil((cdr.times.end - cdr.times.answered) / 1000);
        if (data.dtmfTime)
            cdr.dtmfTime = data.dtmfTime;
        if (data.dtmfData)
            cdr.dtmfData = data.dtmfData;
        if (data.sipContext && data.sipContext.uri)
            cdr.uri = data.sipContext.uri;
        cdr.script = cdr.script.replace('.js', '');
        ;
        for (var time in cdr.times)
            cdr.times[time] = require('dateformat')(cdr.times[time], "yyyy.mm.dd HH:MM:ss");
        var m = cdr.from.match(/(.*)\((.*)\)/);
        if (m) {
            cdr.from = m[1];
            cdr.refer = m[2];
        }
        if (data.log)
            cdr.log = data.log;
        return cdr;
    }
// stt & tts
    try {
        var Recognizer = require('./lib/recognizer'),
                recognizer = new Recognizer(config.get("recognize"));

        e.on('stt', function (data) {
            recognizer.recognize(data.file, function (err, result) {
                //console.log('recognizeCallback', err, result);
                //callback(err, result);
                //console.log(result);
                if (!err)
                    e.emit('message', {category: 'call', sessionID: data.sessionID, type: 'debug', msg: 'tts text "' + result.text + '"'});
                data.cb(result.text);
            });

        });
    } catch (e) {
        //console.log(e);
    }
    var ivona_speech = new (require('ivona-node'))(config.get("ivona_speech")||{});
    e.on('tts', function (data) {
        var yandex_speech = require('./lib/recognize/yandex-speech');
        var sox = require('sox-stream');
        var transcode = sox({
            bits: 8,
            rate: 8000,
            channels: 1,
            encoding: 'u-law',
            type: 'wav'
        });

        var file_name = 'media/temp/' + data.text.replace(/[^a-zA-Zа-яА-Я0-9]/g, '_') + '.wav';
        transcode.on('error', function (err) {
            data.cb(file_name);
            data.cb = function () {
            };
            //console.log(err.message)
        });

        // если файл file_name не существует, посылаем текст на синтез речи, если существует и правильного формата просто его проигрываем
        if (data.rewrite || !fs.existsSync(file_name) || !require('./lib/wav').checkFormat(file_name))
        {
            function ttsDone() {
                //console.log('done');
                e.emit('message', {category: 'call', sessionID: data.sessionID, type: 'debug', msg: 'tts file "' + file_name + '"'});
                data.cb(file_name);
            }
            data.type = data.type || config.get("def_tts");
            if (data.type === 'ivona') {
                var fileWriter = fs.createWriteStream(file_name);
                fileWriter.on('finish', ttsDone);
                ivona_speech.createVoice(data.text, {
                    body: {
                        outputFormat: {codec: 'AU'},
                        voice: config.get("ivona_speech")
                    }
                }).pipe(transcode).pipe(fileWriter);
            }
            else
                yandex_speech.TTS({
                    text: data.text,
                    format: 'wav',
                    file: file_name,
                    transform: transcode
                }, ttsDone);
        } else
            data.cb(file_name);

    });
//

//  global dtmf_seq listener
    var dtmf_seqTimeOut = 1 * 50 * 20;//msec
    var dtmf_seqFn = function (data) {
        if (dialogs[data.sessionID] && dialogs[data.sessionID].lastDtmfSeq !== '')
            e.emit('dtmf_seq', {sessionID: data.sessionID, seq: dialogs[data.sessionID].lastDtmfSeq});
        if (dialogs[data.sessionID])
            dialogs[data.sessionID].lastDtmfSeq = '';
    };

    e.on('dtmf_key', function (data) {
        if (data.key === undefined)
            return;
        e.emit('message', {category: 'call', sessionID: data.sessionID, type: 'debug', msg: 'dtmf_key "' + data.key + '"'});

        if (!dialogs[data.sessionID])
            return;
        if (dialogs[data.sessionID].lastDtmfSeq === undefined)
            dialogs[data.sessionID].lastDtmfSeq = '';
        var deltaTime;

        var dtmfOpt = dialogs[data.sessionID].dtmfOpt;

        dialogs[data.sessionID].lastKeyTime = new Date().getTime();
        //need for stt_seq

        if (dtmfOpt && dtmfOpt.endSeq) {
            if (data.key == dtmfOpt.endSeq)//like '#'
                dtmf_seqFn(data);
            else
                dialogs[data.sessionID].lastDtmfSeq += '' + data.key;
            return;
        }

        if (dialogs[data.sessionID].lastKeyTime) {
            deltaTime = new Date().getTime() - dialogs[data.sessionID].lastKeyTime;
        }
        if (deltaTime && deltaTime < dtmf_seqTimeOut) {
            dialogs[data.sessionID]._dtmf_seqTimer && clearTimeout(dialogs[data.sessionID]._dtmf_seqTimer);
            dialogs[data.sessionID].lastDtmfSeq += '' + data.key;
        }
        else
            dialogs[data.sessionID].lastDtmfSeq = data.key;
        if (dialogs[data.sessionID].lastDtmfSeq !== '')
            dialogs[data.sessionID]._dtmf_seqTimer =
                    setTimeout(function () {
                        dtmf_seqFn(data)
                    }, dtmfOpt && dtmfOpt.seq ? dtmf_seqTimeOut : 0);

        //dialogs[data.sessionID].lastKeyTime = new Date().getTime();
    });

    e.on('dtmf_seq', function (data) {
        e.emit('message', {category: 'call', sessionID: data.sessionID, type: 'info', msg: 'dtmf_seq "' + data.seq + '"'});
        e.emit('dtmfData', data);
    });

//  global stt_seq listener
    var stt_seqTimeOut = 2 * 50 * 20;//msec
    var stt_seqFn = function (data) {
        if (dialogs[data.sessionID] && dialogs[data.sessionID].lastSttSeq !== '')
            e.emit('stt_seq', {sessionID: data.sessionID, seq: dialogs[data.sessionID].lastSttSeq});
        if (dialogs[data.sessionID])
            dialogs[data.sessionID].lastSttSeq = '';
    };

    function sttAddSeq(text, data) {
//     if (text.indexOf(dialogs[data.sessionID].lastSttSeq) != -1)
        dialogs[data.sessionID].lastSttSeq = text;
//     else
//       dialogs[data.sessionID].lastSttSeq += '' + text;
    }

    e.on('stt_text', function (data) {
        var lastKeyTimeOut = dialogs[data.sessionID] && dialogs[data.sessionID].lastKeyTime && (new Date().getTime() - dialogs[data.sessionID].lastKeyTime);

        if (lastKeyTimeOut && lastKeyTimeOut < 5000) {
            //console.log("Don't trust!!! Recently pressed DTMF key!!!");
            return;
        }

        if (data.text === undefined)
            return;

        if (!dialogs[data.sessionID])
            return;
        if (dialogs[data.sessionID].lastSttSeq === undefined)
            dialogs[data.sessionID].lastSttSeq = '';
        var deltaTime;

        var sttOpt = dialogs[data.sessionID].sttOpt;

        data.text = data.text.trim().toLowerCase().replace(/(\d)\s/g, '$1');
        var text = data.text;

        if (sttOpt && sttOpt.textFilter) {
            //console.log(text, new RegExp(sttOpt.textFilter));
            var m = text.match(new RegExp(sttOpt.textFilter));
            text = m ? m[0] : '';
            //console.log(text);
        }

        if (text == '')
            return;

        e.emit('message', {category: 'call', sessionID: data.sessionID, type: 'debug', msg: 'stt_text "' + text + '"'});

        if (sttOpt && sttOpt.endTextSeq) {
            if (data.text == sttOpt.endTextSeq || new RegExp(sttOpt.endTextSeq, 'i').test(data.text))
                stt_seqFn(data);
            else
                sttAddSeq(text, data);
            return;
        }

        if (dialogs[data.sessionID].lastSttTime) {
            deltaTime = new Date().getTime() - dialogs[data.sessionID].lastSttTime;
        }
        if (deltaTime && deltaTime < stt_seqTimeOut) {
            dialogs[data.sessionID]._stt_seqTimer && clearTimeout(dialogs[data.sessionID]._stt_seqTimer);
            sttAddSeq(text, data);
        }
        else
            dialogs[data.sessionID].lastSttSeq = text;
        if (dialogs[data.sessionID].lastSttSeq !== '')
            dialogs[data.sessionID]._stt_seqTimer =
                    setTimeout(function () {
                        stt_seqFn(data)
                    }, sttOpt && sttOpt.seq ? stt_seqTimeOut : 0);

        dialogs[data.sessionID].lastSttTime = new Date().getTime();
    });

    e.on('stt_seq', function (data) {
        e.emit('message', {category: 'call', sessionID: data.sessionID, type: 'info', msg: 'stt_seq "' + data.seq + '"'});
        e.emit('dtmfData', data);
    });

    e.on('dtmfData', function (data) {
        var rec = {
            time: Math.ceil((new Date().getTime() - dialogs[data.sessionID].meta.times.answered) / 1000),
            keys: data.seq
        };
        //key - on which time (sec)
        if (data.dtmfDataMode)
        {
            if (!dialogs[data.sessionID].dtmfData)
                dialogs[data.sessionID].dtmfData = [];
            dialogs[data.sessionID].dtmfData.push(rec);
        }
        else
        {
            if (!dialogs[data.sessionID].dtmfTime)
                dialogs[data.sessionID].dtmfTime = [];
            dialogs[data.sessionID].dtmfTime.push(rec);
        }
    });

    e.on('callEnded', function (data) {
        var obj = {category: 'call', sessionID: data.sessionID, type: 'info'};
        if (data.msg)
        {
            obj.type = data.type ? data.type : 'info';
            obj.msg = data.msg;
        }
        else {
            if (data.uri)
                //obj.msg = 'Called "' + sip.parseUri(data.uri).user + '" send BYE';
                obj.msg = 'Called send BYE';
            else
                obj.msg = 'Service send BYE';
        }
        ;
        var msg = obj.msg;
        dialogs[data.sessionID].meta.statusReason = msg;
        e.emit('message', obj);
    });

    e.on('setOnEvent', function (data) {
        if (OnEvent[data.event] === undefined) {
            e.emit('message', {type: 'error', msg: 'Event "' + data.event + '" not available'});
            return;
        }

        OnEvent[data.event] = data.script;
        //var sipAccountID = data.event.replace(/\w+(\d+)$/, '$1');
        e.emit('message', {type: 'debug', msg: 'setOnEvent "' + data.event + '" script "' + data.script + '"'});
    });

    e.on('nextJob', function () {
        if (jobs.length)
            jobs.shift()();
        else
            e.emit('message', {type: 'debug', msg: 'Queue is empty'});
    });

    e.on('incomingCall', function (data) {
        //if (!(OnEvent['incomingCall']) >= 0) {
        e.emit('startScript', {sessionID: data.sessionID, response: data.response, uri: data.response.headers.from.uri, script: data.script, serviceContactID: data.serviceContactID});
        // }
    });


    e.on('callCancelled', function (data) {
        dialogs[data.sessionID].meta.status = 'cancelled';
        dialogs[data.sessionID].meta.statusReason = data.msg;
        e.emit('callEnded', data);
    });

    e.on('callFailed', function (data) {
        dialogs[data.sessionID].meta.status = 'callFailed';
        dialogs[data.sessionID].meta.statusReason = data.msg;
        e.emit('callEnded', data);
    });

    e.on('startScript', function (params) {
        var serviceContactID = params.serviceContactID;
        if (!serviceContactID)
            serviceContactID = 0;
        if (params.serviceContactID == undefined) {
            var i = 0;
            while (i < ua.contact.length && !ua.contact[i])
                i++;
            if (ua.contact[i])
                params.serviceContactID = i;
        }
        else
            params.serviceContactID * 1;

        if (!sip.parseUri(params.uri))
            params.uri = 'sip:' + params.uri + '@' + sipAccounts[serviceContactID].host;
        startScript(params);
    });

    e.on('invite', function (data) {
        e.emit('updateData', {source: 'Dialogs', data: dialogs});
    });

    e.on('ringing', function (data) {
        e.emit('updateData', {source: 'Dialogs', data: dialogs});
    });

    e.on('call', function () {
        e.emit('updateData', {source: 'Dialogs', data: dialogs});
    });

    e.on('answered', function () {
        e.emit('updateData', {source: 'Dialogs', data: dialogs});
    });

    e.on('dtmfData', function () {
        e.emit('updateData', {source: 'Dialogs', data: dialogs});
    });

    /*    e.on('callEnded', function() {
     e.emit('updateData', {source: 'Dialogs', data: dialogs});
     });
     */
    e.on('scriptStatus', function (data) {
        if (data.type === 'error')
            e.emit('callCancelled', data);
        else
            e.emit('message', data);
    });

    e.on('setDtmfMode', function (data) {
        if (dialogs[data.sessionID].meta && dialogs[data.sessionID].meta.dtmf_mode != data.dtmf_mode)
            dialogs[data.sessionID].meta.dtmf_mode = data.dtmf_mode;
        e.emit('message', {category: 'call', sessionID: data.sessionID, type: 'info', msg: 'SET DTMF mode "' + data.dtmf_mode + '"'});
    });

    e.on('callEnded', function (data) {
        if (dialogs[data.sessionID].meta && dialogs[data.sessionID].meta.times)
            dialogs[data.sessionID].meta.times.end = new Date().getTime();

        delete dialogs[data.sessionID].audioBuffer;
        delete dialogs[data.sessionID]._worker;

        var cdr_data = JSON.parse(JSON.stringify(dialogs[data.sessionID]));
        process.nextTick(function () {
            e.emit('cdr', createCDR(cdr_data));
        });
    });

    e.on('callEnded', function () {
        e.emit('updateData', {source: 'Dialogs', data: dialogs});
    });

    e.on('callEnded', function (data) {
        //console.log(dialogs);
        if (dialogs[data.sessionID])
        {
            delete dialogs[data.sessionID];
            setTimeout(function () {
                e.emit('updateData', {source: 'Dialogs', data: dialogs});
            }, 3000);
        }
        e.emit('nextJob');
    });

    e.on('callEnded', function () {
        if (isDialogEmpty()) {
            e.emit('lastCallEnded');
        }
    });

    function isDialogEmpty() {
        var isDialogEmpty = true;

        for (var key in dialogs) {
            isDialogEmpty = false;
            break;
        }

        if (isDialogEmpty) {
            //console.log('isDialogEmpty = true');
        } else {
            //console.log('isDialogEmpty = false');

        }
        return isDialogEmpty;
    }

    e.getData = function (request, cb) {
        var timeOut = 2000;
        var timeOutID;
        var requestID = e.newSessionID();
        var f = function (obj) {
            if (timeOutID)
                clearTimeout(timeOutID);
            cb(obj);
        };
        e.once(requestID, f);
        timeOutID = setTimeout(function () {
            e.removeListener(requestID, f);
            cb(request);
        }, timeOut);
        request.requestID = requestID;
        e.emit('getData', request);

    };

    function setResourceData(list, dir) {
        var data = [];//,
        //list = getScriptData('root');
        list.forEach(function (el) {
            data.push({text: el, value: getDataRaw(el, dir)});
        });
        return data;
    }
    e.on('getData', function (obj) {
        if (obj.source) {
            switch (obj.source) {
                case 'onEvent':
                    obj.data = OnEvent[obj.id];
                    break;
                case 'dialogData':
                    obj.data = dialogs;
                    break;
                case 'mediaList':
                    obj.data = getMediaData(obj.id);
                    break;
                case 'recList':
                    obj.data = getRecData(obj.id);
                    break;
                case 'scriptData':
                    obj.data = getScriptData(obj.id);
                    break;
                case 'settingData':
                    obj.data = getSettingData(obj.id);
                    break;
                case 'companyData':
                    obj.data = getCompanyData(obj.id);
                    break;
                case 'sipAccounts':
                    obj.data = config.get("sipAccounts");
                    break;
                case 'webAccounts':
                    obj.data = config.get("webAccounts");
                    break;
                case 'currentGateway':
                    obj.data = config.get("softphone");
                    break;
                case 'activeAccount':
                    obj.data = config.get("activeAccount");
                    break;
                case 'getLogger':
                    obj.data = log4js.getLogger(obj.id);
                    break;
                case 'eventsListData':
                    obj.data = getEventsList();
                    break;
                case 'scriptsListData':
                    obj.data = setResourceData(getScriptList(), getScriptsDir());
                    break;
                case 'companiesListData':
                    obj.data = setResourceData(getCompaniesList(), getCompaniesDir());
                    break;
                case 'settingsListData':
                    obj.data = [{text: confFile.replace(/^(.+)\/(.+)$/, '$2'), value: getDataRaw(confFile.replace('./', ''), '.')}];
                    break;
                case 'targetsListData':
                    obj.data = [];
                    require(libDir + '/util').getFiles(getTargetsDir()).forEach(function (el) {
                        obj.data.push({text: el});
                    })
                            //setResourceData(require(libDir + '/util').getFiles(getTargetsDir()), getTargetsDir());
                            ;
                    break;
                case 'targetData':
                    var items = JSON.parse(getDataRaw(obj.query && obj.query.name + '.js', './targets') || '[]');
                    obj.data = {total: items.length, items: items};
                    break;
                case 'getStatusUAList':
                    obj.data = getStatusUAList();
                    break;
                case 'getListSIP':
                    obj.data = getListSIP();
                    break;
            }
            if (obj.data !== undefined)
                e.emit(obj.requestID, obj);
        }
    });


    function callLimit() {

        var callCount = 0;
        for (var sID in dialogs)
            if (!(dialogs[sID].meta.type == 'incoming' && (dialogs[sID].meta.status == 'ringing' || dialogs[sID].meta.status == 'start')))
                callCount++;
        return (callCount >= (config.get("maxCalls") || 10));
        //return (Object.keys(dialogs).length >= (config.get("maxCalls") || 10));
    }
    ;

    function getTargetsDir() {
        return config.get("targetDir") || './targets';
    }
    function getCompaniesDir() {
        return config.get("companyDir") || './companies';
    }
    function getScriptsDir() {
        return config.get("scriptDir") || './scripts';
    }

    function getMediaDir() {
        return config.get("mediaDir") || './media';
    }

    function getRecDir() {
        return config.get("recDir") || './rec';
    }
    function getDataRaw(name, dir) {
        var script_path = dir + '/' + name;
        if (fs.existsSync(script_path))
            return fs.readFileSync(script_path).toString().replace(/\s*exports\.src\s*=\s*/, '').replace(/;\s*$/, '');
        return null;
    }

    function getScriptPath(name) {
        var scripts = getScriptList();
        if (!name)
            return null;
        var script_path = getScriptsDir() + '/';
        if (require(libDir + '/util').isNumeric(name))
            script_path += scripts[name];
        else
            script_path += name;
        return script_path;
    }
    ;

    function getScriptData(name) {
        var script_path = getScriptPath(name);
        if (!script_path)
            return null;
        var scriptCfg;
        if (fs.existsSync(script_path))
        {
            try {
                scriptCfg = require(libDir + '/util').requireUncached(require("path").resolve(script_path));
                // console.log(scriptCfg.src);
            }
            catch (e_) {
                console.log(e_);
                //e.emit('scriptStatus', {category: 'call', sessionID: sessionID, type: 'error', msg: ' Script [' + script_path + '] invalid syntax'});
            }
        }
        ;
        if (scriptCfg && scriptCfg.src)
            return  scriptCfg.src;
        return null;
    }
    ;

    function getSettingData() {
        var conf;
        if (fs.existsSync(confFile))
        {
            try {
                conf = JSON.parse(fs.readFileSync(confFile));
                // console.log(scriptCfg.src);
            }
            catch (e_) {
                console.log(e_);
                //e.emit('scriptStatus', {category: 'call', sessionID: sessionID, type: 'error', msg: ' Script [' + scripts[scriptID] + '] invalid syntax'});
            }
        }
        ;
        if (conf)
            return  conf;
        return null;
    }
    ;

    function getCompanyData(name) {
        var companies = getCompaniesList();
        if (!name)
            return null;
        if (name == 'root')
            return companies;
        var company_path = getCompaniesDir() + '/';
        if (require(libDir + '/util').isNumeric(name))
            company_path += companies[name];
        else
            company_path += name;
//            console.log(script_path);
        var companyCfg;
        if (fs.existsSync(company_path))
        {
            try {
                companyCfg = require(libDir + '/util').requireUncached(require("path").resolve(company_path));
                // console.log(scriptCfg.src);
            }
            catch (e_) {
                console.log(e_);
                //e.emit('scriptStatus', {category: 'call', sessionID: sessionID, type: 'error', msg: ' Script [' + scripts[scriptID] + '] invalid syntax'});
            }
        }
        ;
        if (companyCfg && companyCfg.src)
            return  companyCfg.src;
        return null;
    }
    ;
    function getCompaniesList() {
        return require(libDir + '/util').getFiles(getCompaniesDir());
    }
    ;

    function getScriptList() {
        return require(libDir + '/util').getFiles(getScriptsDir());
    }

    function getMediaData(path) {
        path = path || '';
        return require(libDir + '/util').getFiles('.' + path, false, '.wav$');
    }

    function getRecData(path) {
        path = path || '';
        return require(libDir + '/util').getFiles('.' + path, false, '.wav$');
    }

    function getStatusUAList() {
        var data = [];
        ua.auth.forEach(function (account, i) {
            var status;
            if (account.disable)
                status = 0;
            else {
                if (ua.status[i] == 'registered')
                    status = 1;
                if (ua.status[i] == 'unregistered')
                    status = 2;
            }
            ;
            data[i] = {name: account.user + '@' + (account.domain || account.host), status: status};
        });
        return data;
    }

    function getListSIP() {
        var data = [];
        ua.auth.forEach(function (account, i) {
            data[i] = {id: i, name: account.user + '@' + (account.domain || account.host)};
        });
        return data;
    }

    function startScript(params) {
        //console.log(dialogs);
        if (params.sessionID && params.response && !dialogs.hasOwnProperty(params.sessionID))
        {
            e.emit('message', {type: 'info', msg: 'Session [' + params.sessionID + '] not found. Abort script'});
            return;
        }

        var script_dir = config.get("scriptDir") || './scripts',
                scripts = require(libDir + '/util').getFiles(script_dir),
                serviceContactID = (params.serviceContactID != undefined) ? params.serviceContactID * 1 : 0,
                uri = params.uri || (params.response ? params.response.headers.from.uri : ''),
                script = params.script;
        if (dialogs && callLimit())
        {
            e.emit('message', {type: 'debug', msg: 'Exceeded call limit [' + (config.get("maxCalls") || 10) + ']'});
            e.emit('message', {type: 'debug', msg: 'Adding job to queue [uri:"' + uri + '" script:' + script + ']'});
            jobs.push(function () {
                //console.log(params);
                startScript(params);
            });
        }
        else
        {
            var sessionID = params.sessionID || e.newSessionID();
            e.emit('message', {type: 'info', msg: 'Start new session [' + sessionID + '] script [' + script + ']'});
            var sipAccount = sipAccounts[serviceContactID];
            sipAccount = 'sip:' + sipAccount.user + '@' + sipAccount.host;
            if (!params.response) {
                //console.log(sip.parseUri(sipAccount).user);
                //console.log(sip.parseUri(ua.from[0].uri).user);
                dialogs[sessionID] = {
                    meta: {
                        //from: sip.parseUri(ua.from[0].uri).user,
                        from: sip.parseUri(sipAccount).user,
                        to: sip.parseUri(uri).user,
                        type: 'outgoing',
                        script: script,
                        sessionID: sessionID,
                        status: 'start',
                        times: {ringing: new Date().getTime()}
                    }
                };
            }
            dialogs[sessionID].script = script;
            dialogs[sessionID].meta.pin = e.getPin(dialogs[sessionID].meta.from);

            //console.log(dialogs[sessionID]);
            //console.log(serviceContactID, ua.contact);
            if (!sip.parseUri(uri))
            {
                e.emit('scriptStatus', {category: 'call', sessionID: sessionID, type: 'error', msg: 'Uri is invalid [' + uri + ']'});
            }
            else

            if (ua && ua.contact[serviceContactID] && scripts.length)
            {
                var scriptCfg = getScriptData(script);
                script = getScriptPath(script).replace('./scripts/', '');
                if (scriptCfg) {
                    e.emit('scriptStatus', {category: 'call', sessionID: sessionID, type: 'info', msg: 'Start script [' + script + '] from [' + sipAccount + '] to uri [' + uri + ']'});
                    var Script = require(libDir + '/script.js');
                    new Script().start(
                            {
                                Events: e,
                                sipUA: ua,
                                sipAccountID: serviceContactID,
                                config: config,
                                dialogs: dialogs,
                                clientUri: uri,
                                response: params.response,
                                sessionID: sessionID,
                                script: scriptCfg
                            }
                    );
                }
                else
                    e.emit('scriptStatus', {category: 'call', sessionID: sessionID, type: 'error', msg: 'Script [' + script + '] is invalid or not found'});
            }
            else
                e.emit('scriptStatus', {category: 'call', sessionID: sessionID, type: 'error', msg: 'Unable to find any script'});
        }
        ;
    }

    new (require(libDir + '/sipUA.js'))(
            {
                Events: e,
                config: config,
                //sipAccountID: sipAccountID,
                dialogs: dialogs,
                logger: log4js.getLogger('sip')
            }
    ).start(function (c) {
        ua = c;
    });

    new (require(libDir + '/company.js'))(
            {
                Events: e,
                config: config
            }
    ).start();

    require('./web/webApp').start(
            {
                Events: e,
                config: config,
                logger: log4js
            }
    );

    e.on('refresh', function (type) {
        e.emit('message', {type: 'debug', msg: 'Refresh status "' + type + '"'});
    });

    e.on('refresh', function (type) {
        if (type === 'config') {
            config = require('nconf').file({file: confFile});
            registerAccountEvent();
        }
    });

    e.emit('message', {type: 'info', msg: 'Start server'});
    e.emit('refresh', 'config');
    e.emit('refresh', 'companies');

    //external modules
    var extDir = './ext';

    require(extDir + '/nStore').init({
        Events: e
    });
    require(extDir + '/multifonSMS').init({
        Events: e
    });
    if (module.parent)
        module.exports = {
            events: e,
            config: config,
            dialogs: dialogs,
            sip: sip};
    //
})();