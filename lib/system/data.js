var bus = require('./bus'),
        config = bus.config,
        sip = require('../sip/sip');

function init() {

    var util = require('../util'),
            fs = require('fs'),
            rootPath = './';

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
        if (fs.existsSync(script_path))
        {
            try {
                scriptCfg = util.requireUncached(require("path").resolve(script_path));
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

    function getSettingData() {
        var conf;
        if (fs.existsSync(config.stores.file.file))
        {
            try {
                conf = JSON.parse(fs.readFileSync(config.stores.file.file));
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
        if (fs.existsSync(company_path))
        {
            try {
                companyCfg = util.requireUncached(require("path").resolve(company_path));
                // console.log(scriptCfg.src);
            }
            catch (e_) {
                console.log(e_);
                //e.emit('scriptStatus', {category: 'call', sessionID: sessionID, type: 'error', msg: ' Script [' + scripts[scriptID] + '] invalid syntax'});
            }
        }
        if (companyCfg && companyCfg.src)
            return  companyCfg.src;
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
        var data = [];
        sip.auth.forEach(function (account, i) {
            var status;
            if (account.disable)
                status = 0;
            else {
                if (sip.status[i] == 'registered')
                    status = 1;
                if (sip.status[i] == 'unregistered')
                    status = 2;
            }
            ;
            data[i] = {name: account.user + '@' + (account.domain || account.host), status: status};
        });
        return data;
    }

    function getListSIP() {
        var data = [];
        sip.auth.forEach(function (account, i) {
            data[i] = {id: i, name: account.user + '@' + (account.domain || account.host)};
        });
        return data;
    }

    function getEventsList() {
        var list = [],
                sipAccounts = config.get("sipAccounts"),
                match,
                el;
        for (var key in bus.OnEvent) {
            el = {id: key, text: key};
            if (match = key.match(/on_call\[(\d+)\]/))
                if (sipAccounts[match[1]]) {
                    el.text = '✆ ' + sipAccounts[match[1]].user + '@' + (sipAccounts[match[1]].domain || sipAccounts[match[1]].host);
                    list.push(el);
                }
        }
        return list;
    }

    function setResourceData(list, dir) {
        var data = [];//,
        //list = getScriptData('root');
        list.forEach(function (el) {
            data.push({text: el, value: getDataRaw(el, dir)});
        });
        return data;
    }


    bus.onRequest('newSessionID', function (param, cb) {
        cb(null, sip.newSessionID());
    });
    bus.onRequest('onEvent', function (param, cb) {
        cb(null, bus.OnEvent[param.id]);
    });
    bus.onRequest('dialogData', function (param, cb) {
        var stringify = require('json-stringify-safe');
        //console.log(stringify(sip.dialogs));
        cb(null, stringify(sip.dialogs));
    });
    bus.onRequest('mediaList', function (param, cb) {
        cb(null, getMediaData(param.id));
    });
    bus.onRequest('recList', function (param, cb) {
        cb(null, getRecData(param.id));
    });
    bus.onRequest('scriptData', function (param, cb) {
        cb(null, getScriptData(param.id));
    });
    bus.onRequest('settingData', function (param, cb) {
        cb(null, getSettingData(param.id));
    });
    bus.onRequest('taskData', function (param, cb) {
        cb(null, getTaskData(param.id));
    });
    bus.onRequest('sipAccounts', function (param, cb) {
        cb(null, config.get("sipAccounts"));
    });
    bus.onRequest('webAccounts', function (param, cb) {
        cb(null, config.get("webAccounts"));
    });
    bus.onRequest('activeAccount', function (param, cb) {
        cb(null, config.get("activeAccount"));
    });
    bus.onRequest('getLogger', function (param, cb) {
        cb(null, bus.getLogger(param.id));
    });
    bus.onRequest('eventsListData', function (param, cb) {
        cb(null, getEventsList());
    });
    bus.onRequest('scriptsListData', function (param, cb) {
        cb(null, setResourceData(getScriptList(), getScriptsDir()));
    });
    bus.onRequest('tasksListData', function (param, cb) {
        cb(null, setResourceData(getTasksList(), getTasksDir()));
    });
    bus.onRequest('settingsListData', function (param, cb) {
        cb(null, [{text: config.stores.file.file.replace(/^(.+)\/(.+)$/, '$2'), value: getDataRaw(config.stores.file.file.replace('./', ''), '.')}]);
    });
    bus.onRequest('targetsListData', function (param, cb) {
        var data = [];
        util.getFiles(getTargetsDir()).forEach(function (el) {
            data.push({text: el});
        });
        cb(null, data);
    });

    bus.onRequest('targetData', function (param, cb) {
        var items = [];
        try {
            items = JSON.parse(getDataRaw(param.query && param.query.name + '.js', './targets') || '[]');
        }
        catch (e) {
        }
        var data = {total: items.length, items: items};
        cb(null, data);
    });

    bus.onRequest('getStatusUAList', function (param, cb) {
        cb(null, getStatusUAList());
    });

    bus.onRequest('getListSIP', function (param, cb) {
        cb(null, getListSIP());
    });
}
module.exports = init();

