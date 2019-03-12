var bus = require('./bus'),
    config = bus.config,
    jobs = bus.jobs,
    sip = require('sip'),
    libDir = '../';

bus.callCounts = {};

function init() {

    bus.on('restartApp', function () {
        process.exit(0);
    });

    bus.on('message', function (data) {
        var category = data.category || 'server';
        var logger = bus.getLogger(category);
        var type = data.type || 'info';
        if (category === 'call') {
            if (data.sessionID && sip.dialogs[data.sessionID]) {
                sip.dialogs[data.sessionID].log = sip.dialogs[data.sessionID].log || [];
                sip.dialogs[data.sessionID].log.push(require('dateformat')(Date.now(), 'yyyy.mm.dd HH:MM:ss.l') + ' ' + data.msg);
            };
            data.msg = data.sessionID + ' : ' + data.msg;
        }
        logger[type](data.msg || data);
    });

    bus.on('cdr', function (data) {
        bus.emit('message', { category: 'cdr', msg: JSON.stringify(data) });
        /*
         var fs = fs;
         fs.appendFile('cdr.log', JSON.stringify(data) + "\r\n", function(err) {
         if (err)
         console.log(err);
         });
         */
    });

    function createCDR(data) {
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
        //if (data.sipContext && data.sipContext.headers && data.sipContext.headers.to && data.sipContext.headers.to.uri)
        //    cdr.uri = data.sipContext.headers.to.uri;
        if (data.uri)
            cdr.uri = data.uri;
        if (data.parentID)
            cdr.parentID = data.parentID;
        cdr.script = cdr.script.replace('.js', '');;
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

    //  global dtmf_seq listener
    var dtmf_seqTimeOut = 1 * 50 * 20; //msec
    var dtmf_seqFn = function (data) {
        if (sip.dialogs[data.sessionID] && sip.dialogs[data.sessionID].lastDtmfSeq !== '')
            bus.emit('dtmf_seq', { sessionID: data.sessionID, seq: sip.dialogs[data.sessionID].lastDtmfSeq });
        if (sip.dialogs[data.sessionID])
            sip.dialogs[data.sessionID].lastDtmfSeq = '';
    };

    bus.on('dtmf_key', function (data) {
        if (data.key === undefined)
            return;
        bus.emit('message', { category: 'call', sessionID: data.sessionID, type: 'debug', msg: 'dtmf_key "' + data.key + '"' });

        if (!sip.dialogs[data.sessionID])
            return;
        if (sip.dialogs[data.sessionID].lastDtmfSeq === undefined)
            sip.dialogs[data.sessionID].lastDtmfSeq = '';
        var deltaTime;

        var dtmfOpt = sip.dialogs[data.sessionID].dtmfOpt;

        sip.dialogs[data.sessionID].lastKeyTime = new Date().getTime();
        //need for stt_seq

        if (dtmfOpt && dtmfOpt.endSeq) {
            if (data.key == dtmfOpt.endSeq) //like '#'
                dtmf_seqFn(data);
            else
                sip.dialogs[data.sessionID].lastDtmfSeq += '' + data.key;
            return;
        }

        if (sip.dialogs[data.sessionID].lastKeyTime) {
            deltaTime = new Date().getTime() - sip.dialogs[data.sessionID].lastKeyTime;
        }
        if (deltaTime && deltaTime < dtmf_seqTimeOut) {
            sip.dialogs[data.sessionID]._dtmf_seqTimer && clearTimeout(sip.dialogs[data.sessionID]._dtmf_seqTimer);
            sip.dialogs[data.sessionID].lastDtmfSeq += '' + data.key;
        } else
            sip.dialogs[data.sessionID].lastDtmfSeq = data.key;
        if (sip.dialogs[data.sessionID].lastDtmfSeq !== '')
            sip.dialogs[data.sessionID]._dtmf_seqTimer =
                setTimeout(function () {
                    dtmf_seqFn(data)
                }, dtmfOpt && dtmfOpt.seq ? dtmf_seqTimeOut : 0);

        //sip.dialogs[data.sessionID].lastKeyTime = new Date().getTime();
    });

    bus.on('dtmf_seq', function (data) {
        bus.emit('message', { category: 'call', sessionID: data.sessionID, type: 'info', msg: 'dtmf_seq "' + data.seq + '"' });
        bus.emit('dtmfData', data);
    });

    //  global stt_seq listener
    var stt_seqTimeOut = 2 * 50 * 20; //msec
    var stt_seqFn = function (data) {
        if (sip.dialogs[data.sessionID] && sip.dialogs[data.sessionID].lastSttSeq !== '')
            bus.emit('stt_seq', { sessionID: data.sessionID, seq: sip.dialogs[data.sessionID].lastSttSeq });
        if (sip.dialogs[data.sessionID])
            sip.dialogs[data.sessionID].lastSttSeq = '';
    };

    function sttAddSeq(text, data) {
        //     if (text.indexOf(sip.dialogs[data.sessionID].lastSttSeq) != -1)
        sip.dialogs[data.sessionID].lastSttSeq = text;
        //     else
        //       sip.dialogs[data.sessionID].lastSttSeq += '' + text;
    }

    bus.on('stt_text', function (data) {
        var lastKeyTimeOut = sip.dialogs[data.sessionID] && sip.dialogs[data.sessionID].lastKeyTime && (new Date().getTime() - sip.dialogs[data.sessionID].lastKeyTime);

        if (lastKeyTimeOut && lastKeyTimeOut < 5000) {
            //console.log("Don't trust!!! Recently pressed DTMF key!!!");
            return;
        }

        if (data.text === undefined)
            return;

        if (!sip.dialogs[data.sessionID])
            return;
        if (sip.dialogs[data.sessionID].lastSttSeq === undefined)
            sip.dialogs[data.sessionID].lastSttSeq = '';
        var deltaTime;

        var sttOpt = sip.dialogs[data.sessionID].sttOpt;

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

        bus.emit('message', { category: 'call', sessionID: data.sessionID, type: 'debug', msg: 'stt_text "' + text + '"' });

        if (sttOpt && sttOpt.endTextSeq) {
            if (data.text == sttOpt.endTextSeq || new RegExp(sttOpt.endTextSeq, 'i').test(data.text))
                stt_seqFn(data);
            else
                sttAddSeq(text, data);
            return;
        }

        if (sip.dialogs[data.sessionID].lastSttTime) {
            deltaTime = new Date().getTime() - sip.dialogs[data.sessionID].lastSttTime;
        }
        if (deltaTime && deltaTime < stt_seqTimeOut) {
            sip.dialogs[data.sessionID]._stt_seqTimer && clearTimeout(sip.dialogs[data.sessionID]._stt_seqTimer);
            sttAddSeq(text, data);
        } else
            sip.dialogs[data.sessionID].lastSttSeq = text;
        if (sip.dialogs[data.sessionID].lastSttSeq !== '')
            sip.dialogs[data.sessionID]._stt_seqTimer =
                setTimeout(function () {
                    stt_seqFn(data)
                }, sttOpt && sttOpt.seq ? stt_seqTimeOut : 0);

        sip.dialogs[data.sessionID].lastSttTime = new Date().getTime();
    });

    bus.on('stt_seq', function (data) {
        bus.emit('message', { category: 'call', sessionID: data.sessionID, type: 'info', msg: 'stt_seq "' + data.seq + '"' });
        bus.emit('dtmfData', data);
    });

    bus.on('dtmfData', function (data) {
        var rec = {
            time: Math.ceil((new Date().getTime() - sip.dialogs[data.sessionID].meta.times.answered) / 1000),
            keys: data.seq
        };
        //key - on which time (sec)
        if (data.dtmfDataMode) {
            if (!sip.dialogs[data.sessionID].dtmfData)
                sip.dialogs[data.sessionID].dtmfData = [];
            if (sip.dialogs[data.sessionID].dtmfDataFields &&
                sip.dialogs[data.sessionID].dtmfDataFields[sip.dialogs[data.sessionID].dtmfData.length])
                rec.name = sip.dialogs[data.sessionID].dtmfDataFields[sip.dialogs[data.sessionID].dtmfData.length];
            sip.dialogs[data.sessionID].dtmfData.push(rec);
        } else {
            if (!sip.dialogs[data.sessionID].dtmfTime)
                sip.dialogs[data.sessionID].dtmfTime = [];
            sip.dialogs[data.sessionID].dtmfTime.push(rec);
        }
    });

    bus.on('callEnded', function (data) {
        if (!sip.dialogs[data.sessionID]) return;
        var obj = { category: 'call', sessionID: data.sessionID, type: 'info' };
        if (data.msg) {
            obj.type = data.type ? data.type : 'info';
            obj.msg = data.msg;
        } else {
            if (data.by) {
                obj.msg = data.by + ' hang up';
            }
        }
        var msg = obj.msg;
        sip.dialogs[data.sessionID].meta.statusReason = msg;
        bus.emit('message', obj);
    });

    bus.on('updateOnEvent', async (cb) => {
        function clearOnEvents() {
            for (let key in bus.OnEvent) {
                delete bus.OnEvent[key];
            }
        }

        function refreshOnEventsKeys() {
            return new Promise(function(resolve, reject) {
                bus.request('getStatusUAList', {}, (err, connections) => {
                    for (let key in connections) {
                        if (connections[key] && ('status' in connections[key]) && (connections[key].status == 1) ) {
                            let event = 'on_call[' + key + ']';
                            bus.OnEvent[event] = null;
                        }
                    }
                    return resolve();
                });
            });
        }

        function setTaksOnEvent() {     
            return new Promise(function(resolve, reject) {
                bus.request('tasksListData', {}, (err, tasks) => {
                    tasks.forEach((item) => {
                        try {
                            let task = JSON.parse(item.value);
                            if ( ( ('active' in task) && task.active == 'true') && ('onEvent' in task && task.onEvent) ) {
                                let event = task.onEvent;

                                if (event in bus.OnEvent) {
                                    bus.OnEvent[event] = task.script;
                                }
                            }
                        } catch(err) {
                            console.warn(err);
                        }
                    });
                    return resolve();
                });
            });
        }

        clearOnEvents();
        await refreshOnEventsKeys();
        await setTaksOnEvent();

        if (cb) {
            cb();
        }
    });

    bus.on('nextJob', function () {
        if (jobs.length) {
            jobs.shift()();
        } else {
            bus.emit('message', { type: 'debug', msg: 'Queue is empty' });
        }
    });

    bus.on('incomingCall', function (data) {
        //if (!(bus.OnEvent['incomingCall']) >= 0) {
        bus.emit('startScript', { sessionID: data.sessionID, response: data.response, uri: data.response.headers.from.uri, script: data.script, sipAccountID: data.sipAccountID, parentID: data.parentID });
        // }
    });


    bus.on('callCancelled', function (data) {
        if (!sip.dialogs[data.sessionID]) return;
        sip.dialogs[data.sessionID].meta.status = 'cancelled';
        sip.dialogs[data.sessionID].meta.statusReason = data.msg;
        bus.emit('callEnded', data);
    });

    bus.on('callFailed', function (data) {
        if (!sip.dialogs[data.sessionID]) return;
        sip.dialogs[data.sessionID].meta.status = 'callFailed';
        sip.dialogs[data.sessionID].meta.statusReason = data.msg;
        bus.emit('callEnded', data);
    });

    bus.on('startScript', function (params) {
        var sipAccountID = params.sipAccountID;
        
        if (params.type_connect == 'sms') {            
            sendSMS(params);
            return;
        }

        if (!sipAccountID)
            sipAccountID = 0;
        if (params.sipAccountID == undefined) {
            var i = 0;
            while (i < sip.contact.length && !sip.contact[i])
                i++;
            if (sip.contact[i])
                params.sipAccountID = i;
        } else
            params.sipAccountID * 1;

        if (!sip.parseUri(params.uri))
            params.uri = 'sip:' + params.uri + '@' + (config.get("sipAccounts")[sipAccountID]).host;
        startScript(params);
    });

    function dialogUpdated() {
        bus.request('dialogData', {}, function (err, data) {
            bus.emit('updateData', { source: 'Dialogs', data: data });
        });
    }

    bus.on('invite', dialogUpdated);
    bus.on('ringing', dialogUpdated);
    bus.on('call', dialogUpdated);
    bus.on('answered', dialogUpdated);
    bus.on('dtmfData', dialogUpdated);

    bus.on('scriptStatus', function (data) {
        if (data.type === 'error')
            bus.emit('callCancelled', data);
        else
            bus.emit('message', data);
    });

    bus.on('setDtmfMode', function (data) {
        if (sip.dialogs[data.sessionID].meta && sip.dialogs[data.sessionID].meta.dtmf_mode != data.dtmf_mode)
            sip.dialogs[data.sessionID].meta.dtmf_mode = data.dtmf_mode;
        bus.emit('message', { category: 'call', sessionID: data.sessionID, type: 'info', msg: 'SET DTMF mode "' + data.dtmf_mode + '"' });
    });

    bus.on('callEnded', function (data) {
        if (!sip.dialogs[data.sessionID]) return;
        if (sip.dialogs[data.sessionID].meta && sip.dialogs[data.sessionID].meta.times) {
            sip.dialogs[data.sessionID].meta.times.end = new Date().getTime();
            var curDialog = sip.dialogs[data.sessionID];
            if (curDialog.meta.status == "callFailed" || curDialog.meta.status == "cancelled") {
                if (curDialog.meta.type == 'outgoing') {
                    if (!bus.callCounts[curDialog.parentID + ':' + curDialog.uri] && curDialog.callsCount)
                        bus.callCounts[curDialog.parentID + ':' + curDialog.uri] = curDialog.callsCount;
                    bus.callCounts[curDialog.parentID + ':' + curDialog.uri]--;
                    if (bus.callCounts[curDialog.parentID + ':' + curDialog.uri]) {
                        var params = {
                            uri: curDialog.uri,
                            script: curDialog.meta.script,
                            sipAccountID: curDialog.sipAccountID,
                            params: curDialog.params,
                            parentID: curDialog.parentID,
                            rejectTime: curDialog.rejectTime,
                            callsCount: curDialog.callsCount,
                        };
                        startScript(params);
                    } else {
                        delete bus.callCounts[curDialog.parentID + ":" + curDialog.uri];
                    }
                }
            } else {
                delete bus.callCounts[curDialog.parentID + ":" + curDialog.uri];
            }
        }
        var session = sip.dialogs[data.sessionID];
        /*
         ,
         sessionData = {uri: session.sipContext.uri, meta: session.meta, log: session.log};
         var cdr_data = JSON.parse(JSON.stringify(sessionData));
         */
        process.nextTick(function () {
            session.log = []
            bus.emit('cdr', createCDR(session));
        });
    });

    bus.on('callEnded', dialogUpdated);

    bus.on('RtpClose', function (data) {
        if (sip.dialogs[data.sessionID]) {
            if (sip.dialogs[data.sessionID].startTime) {
                var duration = Math.round((Date.now() - sip.dialogs[data.sessionID].startTime) / 1000);
                bus.emit('message', { category: 'call', type: 'debug', sessionID: data.sessionID, msg: 'Call duration "' + duration + '" sec.' });

                var sipAccounts = config.get("sipAccounts"),
                    sipAccountID = sip.dialogs[data.sessionID].sipAccountID,
                    sipAccount = sipAccounts[sipAccountID];

                if (sipAccount && sipAccount.availableTime && sipAccount.availableTime > 0)
                    sipAccount.availableTime -= duration;

                bus.emit('updateData', { source: 'config', data: { sipAccounts: sipAccounts } });
                bus.emit('refreshAvailableTime', { sessionID: data.sessionID, sipAccountID: sipAccountID, sipAccount: sipAccount });
            }
            if (data && data.sessionID && sip.dialogs[data.sessionID] && sip.dialogs[data.sessionID]._worker){
                if (sip.dialogs[data.sessionID].meta.status == "callFailed" || sip.dialogs[data.sessionID].meta.status == "cancelled") {
                    sip.dialogs[data.sessionID]._worker.kill()                   
                }
            } 
            delete sip.dialogs[data.sessionID];
            setTimeout(dialogUpdated, 3000);
        }
        bus.emit('nextJob');
    });

    bus.on('callEnded', function () {
        if (!Object.keys(sip.dialogs).length)
            bus.emit('lastCallEnded');
    });

    bus.on('refresh', function (type) {
        bus.emit('message', { type: 'debug', msg: 'Refresh status "' + type + '"' });
    });


    var fs = require('fs');

    function getTargetsDir() {
        return config.get("targetDir") || './targets';
    }

    function getTasksDir() {
        return config.get("taskDir") || './tasks';
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

    function getScriptList() {
        return require(libDir + '/util').getFiles(getScriptsDir());
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

    function getScriptData(name) {
        var script_path = getScriptPath(name);
        if (!script_path)
            return null;
        var scriptCfg;
        if (fs.existsSync(script_path) || fs.existsSync(script_path + '.js')) {
            try {
                scriptCfg = require(libDir + '/util').requireUncached(require("path").resolve(script_path));
                // console.log(scriptCfg.src);
            } catch (e_) {
                console.log(e_);
                //e.emit('scriptStatus', {category: 'call', sessionID: sessionID, type: 'error', msg: ' Script [' + script_path + '] invalid syntax'});
            }
        };
        if (scriptCfg && scriptCfg.src)
            return scriptCfg.src;
        return null;    
    }
    
    function sendSMS(params) {
        //console.log("out " + JSON.stringify(params));
        
        let data ={},
            sessionID = params.sessionID || (`sms_` + sip.newSessionID());
        data.sessionID = sessionID;
        data.to = params.uri;
        data.connect = params.sipAccountID;
        data.params = params.params;
        // data.send_number = ;
        // data.recive_number = ;

        if (!params.script)
            return bus.emit('message', { category: 'sms', type: 'error', msg: 'Error not find nameScript' });

        
        let script = getScriptData(params.script);        
        if (!script) {
            return bus.emit('message', { category: 'sms', type: 'error', msg: `Not found script data. NameScript: ${params.script}, script: ${script}.` });
        }        
        script(data, sendMsg);
    }

    function startScript(params) {
        function callLimit() {

            var callCount = 0;
            for (var sID in sip.dialogs)
                if (!(sip.dialogs[sID].meta.type == 'incoming' && (sip.dialogs[sID].meta.status == 'ringing' || sip.dialogs[sID].meta.status == 'start')))
                    callCount++;
            return (callCount >= (config.get("maxCalls") || 10));
            //return (Object.keys(dialogs).length >= (config.get("maxCalls") || 10));
        }
        // bus.recallsCount
        if (params.sessionID && params.response && !sip.dialogs.hasOwnProperty(params.sessionID)) {
            bus.emit('message', { type: 'info', msg: 'Session [' + params.sessionID + '] not found. Abort script' });
            return;
        }

        var script_dir = config.get("scriptDir") || './scripts',
            scripts = require(libDir + '/util').getFiles(script_dir),
            // sipAccountID = (params.sipAccountID != undefined) ? params.sipAccountID * 1 : 0,
            sipAccountID = params.sipAccountID,
            uri = params.uri || (params.response ? params.response.headers.from.uri : ''),
            script = params.script,
            sipAccount = config.get("sipAccounts")[sipAccountID];

        if (params.rejectTime && params.rejectTime < new Date().toISOString()) {
            bus.emit('message', { type: 'debug', msg: 'Exceeded call time limit ' + params.rejectTime });
            return;
        }

        if (!params.sessionID && ('availableTime' in sipAccount) && sipAccount.availableTime <= 0) { //for outgoing call 
            bus.emit('message', { type: 'debug', msg: 'Available time is expired ' + sipAccount.availableTime + ' sec' });
            return;
        }
        var cur_acc_dialogs = 0;
        var sipAccountLines = Number(sipAccount.lines) || 2;

        for (var dialog_id in sip.dialogs) {
            if (sip.dialogs[dialog_id].sipAccountID == sipAccountID) cur_acc_dialogs++;
        }
        if (sip.dialogs && sipAccountLines <= cur_acc_dialogs) {
            bus.emit('message', { type: 'debug', msg: 'Exceeded account lines limit [' + (sipAccountLines || 2) + ']' });
            bus.emit('message', { type: 'debug', msg: 'Adding job to queue [uri:"' + uri + '" script:' + script + ']' });
            jobs.push(function () {
                startScript(params);
            });
        } else if (sip.dialogs && callLimit()) {
            bus.emit('message', { type: 'debug', msg: 'Exceeded call limit [' + (config.get("maxCalls") || 10) + ']' });
            bus.emit('message', { type: 'debug', msg: 'Adding job to queue [uri:"' + uri + '" script:' + script + ']' });
            jobs.push(function () {
                startScript(params);
            });
        } else {
            var sessionID = params.sessionID || sip.newSessionID();
            var parentID = params.parentID || sip.newSessionID();
            bus.emit('message', { type: 'info', msg: 'Start new session [' + sessionID + '] script [' + script + ']' });
            //var sipAccount = config.get("sipAccounts")[sipAccountID];
            sipAccount = 'sip:' + sipAccount.user + '@' + sipAccount.host;
            if (!params.response) {
                //console.log(sip.parseUri(sipAccount).user);
                //console.log(sip.parseUri(sip.from[0].uri).user);
                sip.dialogs[sessionID] = {
                    meta: {
                        //from: sip.parseUri(sip.from[0].uri).user,
                        from: sip.parseUri(sipAccount).user,
                        to: sip.parseUri(uri) && sip.parseUri(uri).user,
                        type: 'outgoing',
                        script: script,
                        sessionID: sessionID,
                        status: 'start',
                        times: { ringing: new Date().getTime() }
                    },
                    parentID: parentID
                };
            }
            sip.dialogs[sessionID].script = script;
            sip.dialogs[sessionID].meta.pin = sip.getPin(sip.dialogs[sessionID].meta.from);
            if (params.params)
                sip.dialogs[sessionID].params = params.params;
            if (params.rejectTime)
                sip.dialogs[sessionID].rejectTime = params.rejectTime;
            if (params.callsCount)
                sip.dialogs[sessionID].callsCount = params.callsCount;

            if (!sip.parseUri(uri)) {
                bus.emit('scriptStatus', { category: 'call', sessionID: sessionID, type: 'error', msg: 'Uri is invalid [' + uri + ']' });
            } else if (sip && sip.connections[sipAccountID].contact && scripts.length) {
                var scriptCfg = getScriptData(script);
                script = getScriptPath(script).replace('./scripts/', '');
                
                if (scriptCfg) {
                    bus.emit('scriptStatus', { category: 'call', sessionID: sessionID, type: 'info', msg: 'Start script [' + script + '] from [' + sipAccount + '] to uri [' + uri + ']' + (sip.dialogs[sessionID].params && sip.dialogs[sessionID].params.length ? ' with params [' + sip.dialogs[sessionID].params.toString() + ']' : '') });
                    sip.dialogs[sessionID].sessionID = sessionID;
                    sip.dialogs[sessionID].parentID = parentID;
                    sip.dialogs[sessionID].scriptData = scriptCfg;
                    sip.dialogs[sessionID].sipAccountID = sipAccountID;
                    sip.dialogs[sessionID].response = params.response;
                    sip.dialogs[sessionID].uri = uri;

                    function isWebRtcCall(content) {
                        if (content.indexOf('icecandidates') + 1) {
                            return true;
                        }
                        return false;
                    }
                    if (sip.dialogs[sessionID] && sip.dialogs[sessionID].response && sip.dialogs[sessionID].response.content) {
                        if (isWebRtcCall(sip.dialogs[sessionID].response.content)) {
                            sip.dialogs[sessionID].webRtc = { direction: "incoming" };
                        } else {
                            sip.dialogs[sessionID].rtp = true;
                        }
                        bus.emit('runScript', { sessionID: sessionID, params });
                    } else {
                        uri = sip.dialogs[sessionID].uri;
                        sipAccountID = sip.dialogs[sessionID].sipAccountID;
                        sip.options(uri, sipAccountID, function (data) {

                            if (data && data.headers && data.headers['user-agent'] && data.headers['user-agent'] == 'MARS-softphone-wrtc') {
                                sip.dialogs[sessionID].webRtc = { direction: "outgoing" };
                            } else {
                                sip.dialogs[sessionID].rtp = true;
                            }
                            bus.emit('runScript', { sessionID: sessionID, params });
                        })
                    }
                } else {
                    bus.emit('scriptStatus', { category: 'call', sessionID: sessionID, type: 'error', msg: 'Script [' + script + '] is invalid or not found' });
                }
            } else {
                bus.emit('scriptStatus', { category: 'call', sessionID: sessionID, type: 'error', msg: 'Unable to find any script' });
            }
        };
    }

    bus.on('updateData', function (obj) {
        if (obj.source == 'config') {
            var path = 'config/config.js';

            if (fs.existsSync(path)) {
                bus.request('settingsListData', {}, function (err, data) {
                    if (err) {
                        console.log(err);
                        return;
                    }

                    if (data && data[0] && data[0].value) {
                        try {
                            var config = JSON.parse(data[0].value);
                            for (var key in obj.data) {
                                config[key] = obj.data[key];
                            }
                            config = JSON.stringify(config, null, 4);

                            fs.writeFile(path, config, function (err) {
                                if (err) {
                                    console.log(err);
                                    return;
                                }
                                bus.emit('refresh', 'config');
                            });
                        } catch (err) {
                            console.log(err);
                            return
                        }
                    }
                });

            } else {
                console.log('Not found file config.js');
            }
        }
    });

    // ********************** Running text scripts **********************
    function sendAnswer(data) {
        bus.emit('on_answer_message', data);
    }

    function sendMsg(data) {
        //console.log("out data " + JSON.stringify(data));
        bus.emit('send_message', data);
    }

    function requestData(req, cb) {
        bus.request('on_b24_request', req, (err, requestData) => {
            cb(err, requestData);
        });
    }

    bus.on('on_message_add', function (data) {
        if (!data.nameScript)
            return bus.emit('message', { category: 'call', type: 'error', msg: 'Error not find nameScript' });

        data.request = requestData;
        let script = getScriptData(data.nameScript);
        if (!script) {
            return bus.emit('message', { category: 'call', type: 'error', msg: `Not found script data. NameScript: ${data.nameScript}, script: ${script}.` });
        }
        script(data, sendAnswer);
    });

}
module.exports = init();
