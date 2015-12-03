/**
 * It's only static background,
 * in real world everything goes automatically
 *
 * @param app
 * @param models
 */
exports.init = function (app, models)
{
    var index = require('./controller'),
            user = require('./controller/user'),
            menu = require('./controller/menu'),
            makeCall = require('./controller/makeCall'),
            dialog = require('./controller/dialog'),
            report = require('./controller/report'),
            table = require('./controller/table'),
            script = require('./controller/script'),
            setting = require('./controller/setting'),
            task = require('./controller/task'),
            resource = require('./controller/resource'),
            media = require('./controller/media'),
            statusUA = require('./controller/statusUA'),
            listSIP = require('./controller/listSIP'),
            userPage = require('./controller/userPage'),
            moduleReports = require('./controller/module/reports'),
            moduleScripts = require('./controller/module/scripts'),
            moduleMedia = require('./controller/module/media'),
            moduleManager = require('./controller/module/manager'),
            moduleDialogs = require('./controller/module/dialogs');

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
    listSIP.init(app.bus);

    /* set models */
    user.model = models.User;

    /* set controllers */
    app.get('/', app.isLoggedIn, index.index);
    app.get('/user', app.isLoggedIn, userPage.index);

    app.get('/module/reports', app.isLoggedIn, moduleReports.index);
    app.get('/module/scripts', app.isLoggedIn, moduleScripts.index);
    app.get('/module/media', app.isLoggedIn, moduleMedia.index);
    app.get('/module/manager', app.isLoggedIn, moduleManager.index);
    app.get('/module/dialogs', app.isLoggedIn, moduleDialogs.index);

    //read
    app.get('/users', app.isLoggedIn, user.read);
    //create
    app.post('/users', user.add);
    //update
    app.put('/users', user.update);
    //remove
    app.delete('/users', user.destroy);

    app.get('/dialogData', dialog.read);
    app.get('/menu', menu.read);
    app.get('/makeCall/:msisdn', makeCall.post);
    app.get('/makeCall/:sipAccountID/:msisdn/:script', makeCall.post);

    app.get('/refresh/:store', function (req, res) {
        app.bus.emit('refresh', req.params['store']);
        res.send({success: true});
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

    app.get('/statusUA', statusUA.read);
    app.get('/listSIP', listSIP.read);

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