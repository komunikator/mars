var bus = require('./system/bus'),
    config = bus.config,
    sip = require('sip'),
    fs = require('fs');

var dir = './tasks';
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
}

function init() {
    var logCategory = 'task';
    var cronJob = require('cron').CronJob;
    var jobs = [];

    bus.on('refresh', function(type) {
        if (type === 'tasks') {
            if (jobs) {
                jobs.forEach(function(job) {
                    bus.emit('message', { category: logCategory, type: 'info', msg: ' Job from [' + job.context.name + '] onTime: "' + job.context.startTime + '" canceled due to task reset' });
                    job.stop();
                });
                jobs.length = 0;
            }

            var task_dir = config.get("taskDir") || './tasks',
                Tasks = [],
                cFiles = require('./util').getFiles(task_dir);
            if (cFiles)
                cFiles.forEach(function(file) {
                    var script_path = task_dir + '/' + file;
                    if (require('fs').existsSync(script_path))
                        try {
                            var taskCfg = require('./util').requireUncached(require("path").resolve(script_path));
                            var task = taskCfg.src;
                            task.name = file;
                            if (!task.script) {
                                bus.emit('message', { category: logCategory, type: 'error', msg: ' Task [' + file + '] is invalid. Property "script" not found.' });
                            } else
                                Tasks.push(task);
                        }
                    catch (err) {
                        bus.emit('message', { category: logCategory, type: 'error', msg: ' Task [' + file + '] invalid syntax' });
                    }
                });

            if (Tasks) {
                var parentID = sip.newSessionID();
                Tasks.forEach(function(c) {
                    if (c.active == 'true') {
                        if (!/\.js$/.test(c.script))
                            c.script += '.js';
                        if (c.onEvent) {
                            bus.emit('message', { category: logCategory, type: 'debug', msg: ' Creating onEvent task [' + c.name + '] event: "' + c.onEvent + '"' });
                        } else
                        if (c.startTime) {
                            bus.emit('message', { category: logCategory, type: 'debug', msg: ' Creating onTime  task [' + c.name + '] time: ' + JSON.stringify(c.startTime) });
                            var job = new cronJob({
                                cronTime: '00 ' + c.startTime,
                                onTick: function() {
                                    bus.request('targetData', { query: { name: c.target.replace(/\.js$/, '') } }, function(err, data) {
                                        if (data.items && data.items.length) {
                                            bus.emit('message', { type: 'debug', msg: ' Job from [' + c.name + '] onTime: "' + c.startTime + '" added' });
                                            var rejectTime = new Date();
                                            rejectTime.setMinutes(parseInt(c.rejectTime.split(":")[1]));
                                            rejectTime.setHours(parseInt(c.rejectTime.split(":")[0]));
                                            rejectTime.setSeconds(0);
                                            data.items.forEach(function(params) {
                                                bus.emit('startScript', { uri: params.shift(), script: c.script, sipAccountID: c.sipAccountID, params: params, parentID: parentID, rejectTime: rejectTime, callsCount: parseInt(c.callsCount), type_connect: c.type_connect});                                                
                                            });
                                        } else
                                            bus.emit('message', { type: 'debug', msg: ' Target list is empty in task [' + c.name + '] ' });
                                    });
                                },
                                start: true,
                                context: c
                            });
                            jobs.push(job);
                        }
                    } else {
                        bus.emit('deactivateTask', c.name);
                        bus.emit('message', { category: logCategory, type: 'debug', msg: ' Task [' + c.name + '] not active' });
                    }
                });
            }
        }
        bus.emit('updateOnEvent');
    });
};
module.exports = init();
