var bus = require('../lib/system/bus');

function init() {
    var worker = require('child_process').fork(__dirname + '/sipServer/index', {silent: true, execPath: 'node'});

    worker.on('error', function (err) {
        bus.emit('message', {type: 'error', msg: err});
    });

    bus.setWorker(worker);
}
if (!(bus.config.get("sipServer") == "disable")){
	init();
}