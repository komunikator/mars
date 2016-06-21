var bus,
    exec = require('child_process').exec,
    fse = require('fs-extra'),
    fs = require('fs');

exports.init = function (_bus) {
    bus = _bus;
};

exports.read = function (req, res) {
    // Создание каталога tmp
    fse.mkdirs('./tmp', function(err) {
        if (err) return bus.emit('message', {category: 'server', type: 'error', msg: 'Error create directory tmp: ' + err});
        bus.emit('message', {category: 'server', type: 'info', msg: 'Create directory tmp'});

        // Создание каталога tmp/config
        fse.mkdirs('./tmp/config', function(err) {
            if (err) return bus.emit('message', {category: 'server', type: 'error', msg: 'Error create directory config: ' + err});
            bus.emit('message', {category: 'server', type: 'info', msg: 'Create directory config'});

            // Копирование содержимого каталога config в tmp/config
            fse.copy('./config', './tmp/config', function (err) {
                if (err) return bus.emit('message', {category: 'server', type: 'error', msg: 'Error copy directory config: ' + err});
                bus.emit('message', {category: 'server', type: 'info', msg: 'Copy directory config'});

                // Создание каталога tmp/scripts
                fse.mkdirs('./tmp/scripts', function(err) {
                    if (err) return bus.emit('message', {category: 'server', type: 'error', msg: 'Error create directory scripts: ' + err});
                    bus.emit('message', {category: 'server', type: 'info', msg: 'Create directory scripts'});

                    // Копирование содержимого каталога scripts в tmp/scripts
                    fse.copy('./scripts', './tmp/scripts', function (err) {
                        if (err) return bus.emit('message', {category: 'server', type: 'error', msg: 'Error copy directory scripts: ' + err});
                        bus.emit('message', {category: 'server', type: 'info', msg: 'Copy directory scripts'});

                        // Создание каталога tmp/tasks
                        fse.mkdirs('./tmp/tasks', function(err) {
                            if (err) return bus.emit('message', {category: 'server', type: 'error', msg: 'Error create directory tasks: ' + err});
                            bus.emit('message', {category: 'server', type: 'info', msg: 'Create directory tasks'});

                            // Копирование содержимого каталога tasks в tmp/tasks
                            fse.copy('./tasks', './tmp/tasks', function (err) {
                                if (err) return bus.emit('message', {category: 'server', type: 'error', msg: 'Error copy directory tasks: ' + err});
                                bus.emit('message', {category: 'server', type: 'info', msg: 'Copy directory tasks'});

                                // Реверт файлов
                                exec('git reset --hard', function (error, stdout, stderr) {
                                    if (error) {
                                        res.send({success: false});
                                        bus.emit('message', {category: 'server', type: 'error', msg: 'Git reset error: ' + error});
                                        return;
                                    }
                                    if (stderr) {
                                        res.send({success: false});
                                        bus.emit('message', {category: 'server', type: 'error', msg: 'Git reset stderr: ' + stderr});
                                        return;
                                    }
                                    bus.emit('message', {category: 'server', type: 'info', msg: 'Git reset stdout: ' + stdout});

                                    // Получить файлы с репозитория
                                    exec('git pull', function (error, stdout, stderr) {
                                        if (error) {
                                            res.send({success: false});
                                            bus.emit('message', {category: 'server', type: 'error', msg: 'Git pull error: ' + error});
                                            return;
                                        }
                                        if (stderr) {
                                            res.send({success: false});
                                            bus.emit('message', {category: 'server', type: 'error', msg: 'Git pull stderr: ' + stderr});
                                            return;
                                        }
                                        bus.emit('message', {category: 'server', type: 'info', msg: 'Git pull stdout: ' + stdout});

                                        // Копирование содержимого каталога config в tmp/config
                                        fse.copy('./tmp/config', './config', function (err) {
                                            if (err) return bus.emit('message', {category: 'server', type: 'error', msg: 'Error copy directory config: ' + err});
                                            bus.emit('message', {category: 'server', type: 'info', msg: 'Copy directory config'});

                                            // Копирование содержимого каталога scripts в tmp/scripts
                                            fse.copy('./tmp/scripts', './scripts', function (err) {
                                                if (err) return bus.emit('message', {category: 'server', type: 'error', msg: 'Error copy directory scripts: ' + err});
                                                bus.emit('message', {category: 'server', type: 'info', msg: 'Copy directory scripts'});

                                                // Копирование содержимого каталога tasks в tmp/tasks
                                                fse.copy('./tmp/tasks', './tasks', function (err) {
                                                    if (err) return bus.emit('message', {category: 'server', type: 'error', msg: 'Error copy directory tasks: ' + err});
                                                    bus.emit('message', {category: 'server', type: 'info', msg: 'Copy directory tasks'});
                                                    res.send({success: true});
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
};