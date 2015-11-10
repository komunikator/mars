findPort = function (defPort) {
    var port = defPort;
    function getPort(cb, bPorts) {
        if (bPorts) {
            bPorts.sort();
            port = bPorts[bPorts.length - 1] + 2;
        }
        ;
        var server = require('net').createServer();
        server.listen(port, function (err) {
            port = server.address().port;
            server.once('close', function () {
                cb(port);
            });
            server.close();
        });
        server.on('error', function (err) {
            port += 2;
            getPort(cb);
        });
    }
    this.getPort = getPort;
    ;
};

module.exports = findPort;