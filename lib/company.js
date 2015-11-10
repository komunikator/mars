var Company = function(cntx) {
    var logCategory = 'company';
    var e = cntx.Events;
    var config = cntx.config;
    //var schedule = require('node-schedule');
    //var schedule = require('./schedule/schedule');
    var cronJob = require('cron').CronJob;
    var jobs = [];


    this.start = function() {
        e.on('refresh', function(type) {
            if (type === 'companies') {
                if (jobs)
                {
                    jobs.forEach(function(job) {
                        e.emit('message', {category: logCategory, type: 'info', msg: ' Job from [' + job.context.name + '] onTime: "' + job.context.startTime + '" canceled due to company reset'});
                        job.stop();
                    });
                    jobs.length = 0;
                }

                var company_dir = config.get("companyDir") || './companies',
                        Companies = [],
                        cFiles = require('./util').getFiles(company_dir);
                if (cFiles)
                    cFiles.forEach(function(file) {
                        var script_path = company_dir + '/' + file;
                        if (require('fs').existsSync(script_path))
                            try {
                                var companyCfg = require('./util').requireUncached('.' + script_path);
                                var company = companyCfg.src;
                                company.name = file;
                                if (!company.script)
                                {
                                    e.emit('message', {category: logCategory, type: 'error', msg: ' Company [' + file + '] is invalid. Property "script" not found.'});
                                }
                                else
                                    Companies.push(company);
                            }
                            catch (err) {
                                // console.log(err);
                                e.emit('message', {category: logCategory, type: 'error', msg: ' Company [' + file + '] invalid syntax'});
                            }
                    });

                if (Companies)
                    Companies.forEach(function(c) {
                        if (c.active == 'true') {
                            if (!/\.js$/.test(c.script))
                                c.script += '.js';
                            if (c.onEvent)
                            {
                                e.emit('message', {category: logCategory, type: 'debug', msg: ' Creating onEvent company [' + c.name + '] event: "' + c.onEvent + '"'});
                                e.emit('setOnEvent', {event: c.onEvent, script: c.script});
                            }
                            else
                            if (c.startTime) {
                                e.emit('message', {category: logCategory, type: 'debug', msg: ' Creating onTime  company [' + c.name + '] time: ' + JSON.stringify(c.startTime)});
                                //console.log(jobName);
                                var job = new cronJob(
                                        {
                                            cronTime: '00 ' + c.startTime,
                                            onTick: function() {
                                                e.getData({source: 'targetData', query: {name: c.target.replace(/\.js$/, '')}}, function(obj) {
                                                    if (obj.data.items && obj.data.items.length) {
                                                        e.emit('message', {type: 'debug', msg: ' Job from [' + c.name + '] onTime: "' + c.startTime + '" added'});
                                                        obj.data.items.forEach(function(uri) {
                                                            e.emit('startScript', {uri: uri[0], script: c.script, serviceContactID: c.serviceContactID});
                                                        });
                                                    }
                                                    else
                                                        e.emit('message', {type: 'debug', msg: ' Target list is empty in company [' + c.name + '] '});
                                                });
                                            },
                                            start: true,
                                            context: c
                                        });
                                jobs.push(job);
                            }
                        }
                        else
                            e.emit('message', {category: logCategory, type: 'debug', msg: ' Company [' + c.name + '] not active'});

                    });

            }
        });
    };
};
module.exports = Company;