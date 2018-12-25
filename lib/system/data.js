var bus = require('./bus'),
    config = bus.config,
    sip = require('sip'),
    pckg = require('../../package.json');

function init() {

    var util = require('../util'),
        fs = require('fs'),
        currentSipCli,
        b24accounts,
        rootPath = './';

    var ip = bus.config.get('hostIp');
    if (!ip) {
        bus.config.set('hostIp', require('ip').address());
    }

    function getTargetsDir() {
        return config.get("targetDir") || (rootPath + 'targets');
    }

    function getTasksDir() {
        return config.get("companyDir") || (rootPath + 'tasks');
    }

    function getScriptsDir() {
        return config.get("scriptDir") || (rootPath + 'scripts');
    }

    function getMediaDir() {
        return config.get("mediaDir") || (rootPath + 'media');
    }

    function getRecDir() {
        return config.get("recDir") || (rootPath + 'rec');
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
        if (util.isNumeric(name))
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
        if (fs.existsSync(script_path)) {
            try {
                scriptCfg = util.requireUncached(require("path").resolve(script_path));
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

    function getSettingData() {
        var conf;
        if (fs.existsSync(config.stores.file.file)) {
            try {
                conf = JSON.parse(fs.readFileSync(config.stores.file.file));
                // console.log(scriptCfg.src);
            } catch (e_) {
                console.log(e_);
                //e.emit('scriptStatus', {category: 'call', sessionID: sessionID, type: 'error', msg: ' Script [' + scripts[scriptID] + '] invalid syntax'});
            }
        };
        if (conf)
            return conf;
        return null;
    }

    function getTaskData(name) {
        var tasks = getTasksList();
        if (!name)
            return null;
        if (name == 'root')
            return tasks;
        var company_path = getTasksDir() + '/';
        if (util.isNumeric(name))
            company_path += tasks[name];
        else
            company_path += name;
        //            console.log(script_path);
        var companyCfg;
        if (fs.existsSync(company_path)) {
            try {
                companyCfg = util.requireUncached(require("path").resolve(company_path));
                // console.log(scriptCfg.src);
            } catch (e_) {
                console.log(e_);
                //e.emit('scriptStatus', {category: 'call', sessionID: sessionID, type: 'error', msg: ' Script [' + scripts[scriptID] + '] invalid syntax'});
            }
        }
        if (companyCfg && companyCfg.src)
            return companyCfg.src;
        return null;
    }

    function getTasksList() {
        return util.getFiles(getTasksDir());
    }

    function getScriptList() {
        return util.getFiles(getScriptsDir());
    }

    function getMediaData(path) {
        path = path || '';
        return util.getFiles('.' + path, false, '.wav$');
    }

    function getRecData(path) {
        path = path || '';
        return util.getFiles('.' + path, false, '.wav$');
    }

    function getStatusUAList() {
        var data = {};
        if (sip.connections && Object.keys(sip.connections).length) {
            for (var i in sip.connections) {
                if (sip.connections[i].auth) {
                    var account = sip.connections[i].auth;
                    var status;
                    if (account.disable) {
                        status = 0;
                    } else {
                        if (sip.connections[i].status == 'registered') {
                            status = 1;
                        }
                        if (sip.connections[i].status == 'unregistered') {
                            status = 2;
                        }
                        if (sip.connections[i].status == 'registration') {
                            status = 3;
                        }
                    };

                    switch(sip.connections[i].auth.type) {
                        case 'sip':
                            data[i] = { name: account.user + '@' + (account.domain || account.host), status: status };
                            break;
                        case 'b24':
                            data[i] = { name: account.clientId + '@' + account.clientSecret, status: status };
                            break;
                        default:
                            data[i] = { name: account.user + '@' + (account.domain || account.host), status: status };
                            break;
                    }
                }
            }
        }
        // console.log(data);
        return data;
    }

    function getStatusSipCliList() {
        return currentSipCli;
    }

    function getListSIP() {
        var data = [],
            smpp_connect = config.get("SMPP_connections");

        if (sip.connections && Object.keys(sip.connections).length) {
            for (var i in sip.connections) {
                var account = sip.connections[i].auth;
                data.push({ id: i, type_connect: 'sip', name: '✆ ' + account.user + '@' + (account.domain || account.host) });
            }
        }

        for (var key in smpp_connect) {            
            if (smpp_connect[key].disable != 1)
                data.push({ id: key, type_connect: 'sms', name:  '✉ ' + smpp_connect[key].output + '@' + key });
        }

        return data;
    }

    function getEventsList() {
        var list = [],
            sipAccounts = config.get("sipAccounts"),
            smpp_connect = config.get("SMPP_connections"),
            match, el;

        for (var key in bus.OnEvent) {
            el = { id: key, text: key };
            if (bus.OnEvent[key]) {
                continue;
            }

            if (match = key.match(/on_call\[(.+)\]/)) {
                if (sipAccounts && sipAccounts[match[1]]) {
                    el.text = '✆ ' + sipAccounts[match[1]].user + '@' + (sipAccounts[match[1]].domain || sipAccounts[match[1]].host);
                    list.push(el);
                }
            }
            // else if (match = key.match(/on_sms\[(.+)\]/)) {
            //     if (SMPP_connections && SMPP_connections[match[1]]) {
            //         el.text = '✉ ' + SMPP_connections[match[1]].input + '@' + match[1];
            //         list.push(el);
            //     }
            // }
        }

        for (var key in smpp_connect) {            
            if (smpp_connect[key].disable != 1)
                list.push({  id: 'on_sms[' + key + ']', text:  '✉ ' + smpp_connect[key].input + '@' + key });
        }

        function getB24accounts() {
            let listB24accounts = [];

            for (var key in b24accounts) {
                if (b24accounts[key].auth.disable != 1) {
                    el = { id: `on_call[${key}]`, text: `⌧ b24@${key}` };
                    listB24accounts.push(el);
                }
            }
            return listB24accounts;
        }
        list = list.concat(getB24accounts());
        return list;
    }

    function setResourceData(list, dir) {
        var data = []; //,
        //list = getScriptData('root');
        list.forEach(function(el) {
            data.push({ text: el, value: getDataRaw(el, dir) });
        });
        return data;
    }


    bus.onRequest('newSessionID', function(param, cb) {
        cb(null, sip.newSessionID());
    });
    bus.onRequest('onEvent', function(param, cb) {
        cb(null, bus.OnEvent[param.id]);
    });
    bus.onRequest('dialogData', function(param, cb) {
        var stringify = require('json-stringify-safe');
        //console.log(stringify(sip.dialogs));
        cb(null, stringify(sip.dialogs));
    });
    bus.onRequest('mediaList', function(param, cb) {
        cb(null, getMediaData(param.id));
    });
    bus.onRequest('recList', function(param, cb) {
        cb(null, getRecData(param.id));
    });
    bus.onRequest('scriptData', function(param, cb) {
        cb(null, getScriptData(param.id));
    });
    bus.onRequest('settingData', function(param, cb) {
        cb(null, getSettingData(param.id));
    });
    bus.onRequest('taskData', function(param, cb) {
        cb(null, getTaskData(param.id));
    });
    bus.onRequest('sipAccounts', function(param, cb) {
        cb(null, config.get("sipAccounts"));
    });
    bus.onRequest('webAccounts', function(param, cb) {
        cb(null, config.get("webAccounts"));
    });
    bus.onRequest('b24accounts', function(param, cb) {
        cb(null, b24accounts);
    });
    bus.on('setB24accounts', function(accounts) {
        b24accounts = JSON.parse(accounts);
        bus.emit('updateData', { source: 'b24accounts', accounts });
    });
    bus.onRequest('sipClients', function(param, cb) {
        var sipClients = [];
        if (config.get("sipServer") && config.get("sipServer")['accounts']) {
            sipClients = config.get("sipServer")['accounts'];
        }
        cb(null, sipClients);
    });
    bus.onRequest('sipServer', function(param, cb) {
        cb(null, config.get("sipServer"));
    });
    bus.onRequest('activeAccount', function(param, cb) {
        cb(null, config.get("activeAccount"));
    });
    bus.onRequest('getLogger', function(param, cb) {
        cb(null, bus.getLogger(param.id));
    });
    bus.onRequest('eventsListData', function(param, cb) {
        bus.emit('updateOnEvent', () => {
            cb(null, getEventsList());
        });
    });
    bus.onRequest('scriptsListData', function(param, cb) {
        cb(null, setResourceData(getScriptList(), getScriptsDir()));
    });
    bus.onRequest('tasksListData', function(param, cb) {
        cb(null, setResourceData(getTasksList(), getTasksDir()));
    });
    bus.onRequest('settingsListData', function(param, cb) {
        cb(null, [{ text: config.stores.file.file.replace(/^(.+)\/(.+)$/, '$2'), value: getDataRaw(config.stores.file.file.replace('./', ''), '.') }]);
    });
    bus.onRequest('targetsListData', function(param, cb) {
        var data = [];
        util.getFiles(getTargetsDir()).forEach(function(el) {
            data.push({ text: el });
        });
        cb(null, data);
    });
    bus.onRequest('version', function(param, cb) {
        cb(null, pckg.version);
    });
    bus.onRequest('hostIp', function(param, cb) {
        cb(null, bus.config.get('hostIp'));
    });


    bus.onRequest('targetData', function(param, cb) {
        var items = [];
        try {
            items = JSON.parse(getDataRaw(param.query && param.query.name + '.js', './targets') || '[]');
        } catch (e) {}
        var data = { total: items.length, items: items };
        cb(null, data);
    });

    bus.onRequest('getStatusUAList', function(param, cb) {

        cb(null, getStatusUAList());
    });

    bus.onRequest('getStatusSipCliList', function(param, cb) {
        cb(null, getStatusSipCliList());
    });

    bus.onRequest('getListSIP', function(param, cb) {
        cb(null, getListSIP());
    });
    bus.on('refresh', function(type) {
        if (type === 'config') {
            bus.emit('updateOnEvent');
            config.load(function(err, data) {
                if (!err)
                    bus.emit('refresh', 'configData');
            });
        };
    });
    bus.on('setSipClients', function(clients) {
        currentSipCli = JSON.parse(clients);
        bus.emit('updateData', { source: 'statusSipCli', data: clients });
    });
}
module.exports = init();
