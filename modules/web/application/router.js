/**
 * It's only static background,
 * in real world everything goes automatically
 *
 * @param app
 */
exports.init = function (app)
{
    var makeCall = require('./controller/makeCall'),
            dialog = require('./controller/dialog'),
            report = require('./controller/report'),
            table = require('./controller/table'),
            script = require('./controller/script'),
            setting = require('./controller/setting'),
            task = require('./controller/task'),
            resource = require('./controller/resource'),
            media = require('./controller/media'),
            statusUA = require('./controller/statusUA'),
            statusB24UA = require('./controller/statusB24UA'),
            statusSMPP = require('./controller/statusSMPP'),
            updates = require('./controller/updates'),
            startUpdates = require('./controller/startUpdates'),
            statusSipCli = require('./controller/statusSipCli'),
            getTTS = require('./controller/getTTS'),
            keyCheck = require('./controller/keyCheck'),
            listSIP = require('./controller/listSIP');

    makeCall.init(app.bus);
    dialog.init(app.bus);
    report.init(app.bus);
    table.init(app.bus);
    script.init(app.bus);
    setting.init(app.bus);
    task.init(app.bus);
    resource.init(app.bus);
    media.init(app.bus);
    statusUA.init(app.bus);
    statusB24UA.init(app.bus);
    statusSMPP.init(app.bus);
    updates.init(app.bus);
    startUpdates.init(app.bus);
    statusSipCli.init(app.bus);
    getTTS.init(app.bus);
    keyCheck.init(app.bus);
    listSIP.init(app.bus);


    /* set controllers */

    app.get('/getTTS', getTTS.get);

    app.get('/dialogData', dialog.read);
    app.get('/makeCall/:msisdn', makeCall.post);
    app.get('/makeCall/:sipAccountID/:msisdn/:script', makeCall.post);
    //app.get('/sendSMS/:smppID/:msisdn/:script', statusSMPP.post);

    app.get('/refresh/:store', function (req, res) {
        app.bus.emit('refresh', req.params['store']);
        res.send({success: true});
    });

    app.get('/registerB24tasks/:nameTask/', async (req, res) => {
        let nameTask = req.params['nameTask'];

        app.bus.emit('message', { type: 'info', msg: 'registerB24tasks nameTask: ' +  nameTask });

        if (nameTask) {
            app.bus.emit('message', { type: 'info', msg: 'Start register' });

            app.bus.request('registerB24Bot', nameTask, function (err, data) {
                if (err) return res.send({ success: false, error: err });
                if (data) {
                    res.send({ success: true, data: data });
                }
            });
        } else {
            res.send({ success: false });
        }
    });

    app.get('/b24accounts', async (req, res) => {
        function getB24accounts() {
            return new Promise((resolve) => {
                app.bus.request('b24accounts', {}, function (err, data) {
                    if (err) return resolve([]);
                    if (data) {
                        return resolve(data);
                    }
                    return resolve([]);
                });
            });
        }

        let b24accounts = await getB24accounts();

        if (b24accounts) {
            res.send({ success: true, data: b24accounts });
        } else {
            res.send({ success: false });
        }
    });

    app.get('/statusB24tasks/:nameTask/:onEvent', async (req, res) => {
        let nameTask = req.params['nameTask'];
        let onEvent = req.params['onEvent'];

        if (nameTask && onEvent) {
            function getB24accounts() {
                return new Promise((resolve) => {
                    app.bus.request('b24accounts', {}, function (err, data) {
                        if (err) return resolve([]);
                        if (data) {
                            return resolve(data);
                        }
                        return resolve([]);
                    });
                });
            }

            let b24accounts = await getB24accounts();

            if (b24accounts && b24accounts[onEvent] && b24accounts[onEvent].chatBots && b24accounts[onEvent].chatBots[nameTask]) {
                res.send({ success: true, data: b24accounts[ onEvent ].chatBots[ nameTask ] });
            } else {
                res.send({ success: false });
            }
        } else {
            res.send({ success: false });
        }
    });

    app.all('/b24/:id', function (req, res) {
        let request = {
            headers:  req.headers      || '',
            path:     req.path         || '',
            protocol: req.protocol     || '',
            query:    req.query        || '',
            body:     req.body         || '',
            id:       req.params['id'] || ''
        };
        app.bus.emit('b24.message.incoming', request);
        res.send({ success: true });
    });


    //scripts
    app.get('/scriptData/:id', script.read);
    app.get('/scriptData', script.read);
    //app.post('/scripts', script.add);
    //app.put('/scripts', script.update);
    //app.delete('/scripts', script.destroy);

    //settings
    app.get('/settingData/:id', setting.read);
    //app.post('/settings', setting.add);
    //app.put('/settings', setting.update);
    //app.delete('/settings', setting.destroy);

    //tasks
    app.get('/taskData/:id', task.read);
    app.post('/taskData/create', task.create);
    app.put('/taskData/rename', task.rename);
    app.delete('/taskData/removePath', task.delete);
    //app.delete('/tasks', task.destroy);

    //resource
    app.get('/resourceData/:id', resource.read);
    app.put('/resourceData/rename', resource.rename);
    app.put('/resourceData/update', resource.update);
    app.delete('/resourceData/removePath', resource.delete);

    //media
    app.get('/mediaData/:id', media.read);
    app.post('/mediaData/createFolder', media.create);
    app.delete('/mediaData/removePath', media.delete);
    //app.put('/renamePath:id', media.rename);
    app.put('/mediaData/renamePath', media.rename);
    app.put('/mediaData/file-upload/:id', media.put);

    //report
    app.get('/reportData', report.read);
    //app.get('/targetData', report.read);

    app.get('/tableData/:name', table.read);

    //events
    app.get('/eventsListData', function (req, res) {
        app.bus.request('eventsListData', {}, function (err, _data) {
            var data = [];
            if (_data)
                _data.forEach(function (el) {
                    data.push(el);//{id: el, text: el});
                });
            res.send({success: true, data: data});
        });
    });

    app.get('/scriptsListData', function (req, res) {
        app.bus.request('scriptsListData', {}, function (err, _data) {
            var data = [];
            if (_data)
                _data.forEach(function (el) {
                    data.push({id: data.length, text: el.text.replace('.js', ''), value: el.value});
                });
            res.send({success: true, data: data});
        });
    });
    app.put('/addData', function (req, res) {
        var data = JSON.parse(req.body.data),
                id = req.body.id;
        console.log(data, id);
        res.send({success: true});
    });

    app.get('/updates', updates.read);
    app.get('/startUpdates', startUpdates.read);
    app.get('/statusUA', statusUA.read);
    app.get('/statusB24UA', statusB24UA.read);
    app.get('/statusSMPP', statusSMPP.read);
    app.get('/statusSipCli', statusSipCli.read);
    app.get('/listSIP', listSIP.read);

    app.get('/keyCheck', keyCheck.check);

    app.post('/upload/:path/:name', function (req, res) {
        //var fs = require('fs');
        var formidable = require('formidable'),
                fs = require('fs');
        var form = new formidable.IncomingForm();
        form.parse(req, function (err, fields, files) {
            var path = files.fileData.path;
            //console.log(path);
            var fastCsv = require("fast-csv");
            var fileStream = fs.createReadStream(path),
                    parser = fastCsv({delimiter: ';'});
            var store = [];
            fileStream
                    .on("readable", function () {
                        var data;
                        while ((data = fileStream.read()) !== null) {
                            parser.write(data);
                        }
                    })
                    .on("end", function () {
                        parser.end();
                    });
            parser
                    .on("readable", function () {
                        var data;
                        while ((data = parser.read()) !== null) {
                            if (data.length)
                                store.push(data);
                        }
                    })
                    .on("end", function () {
                        var fileName = './' + req.params['path'] + '/' + req.params['name'] + '.js';
                        fs.writeFile(fileName, JSON.stringify(store), function (err) {
                            var result = {success: !err};
                            if (err)
                                result.message = lang[err.code] ? lang[err.code] : err.code;
                            res.end(JSON.stringify(result));
                        });

                        fs.unlink(path, function (err) {
                            if (err)
                                console.log(err);
                            //console.log('unlink');
                        });
                    });
        });
    });
}
;