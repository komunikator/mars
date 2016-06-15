var bus,
    exec = require('child_process').exec;

exports.init = function (_bus) {
    bus = _bus;
};

exports.read = function (req, res) {
    exec('git pull', function (error, stdout, stderr) {
        if (error) {
            res.send({success: false});
            bus.emit('message', {category: 'server', type: 'error', msg: 'Git pull error: ' + error});
            return;
        }
        if (stderr) {
            res.send({success: false});
            bus.emit('message', {category: 'server', type: 'error', msg: 'Git pull stdout: ' + stderr});
            return;
        }
        res.send({success: true});
        bus.emit('message', {category: 'server', type: 'info', msg: 'Git pull stdout: ' + stdout});
    });
};