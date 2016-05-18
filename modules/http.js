var bus = require('../lib/system/bus');

function init() {
    var worker = require('child_process').fork(__dirname + '/web/webApp', {silent: true, execPath: 'node'});

    worker.on('error', function (err) {
        bus.emit('message', {category: 'http', type: 'error', msg: err});
    });

    bus.setWorker(worker);

    bus.on('restartApp', function() {
        process.exit(0);
    });
}
if (!(bus.config.get("web") == "disable"))
 init();