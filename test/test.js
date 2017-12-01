let fs = require('fs');

describe('Call Tests PCM FILES', () => {
    function renameConfigMars() {
        fs.renameSync('config/config.js', 'config/config_mars.js'); 
    }

    function copyConfigMarsTest() {
        fs.copyFileSync('test/config.json', 'config/config.js'); 
    }

    function copyTestTask() {
        fs.copyFileSync('test/task1', 'tasks/1.js'); 
    }

    function deleteConfigMars() {
        fs.unlinkSync('config/config.js'); 
    }

    if ( !fs.existsSync('config/config_mars.js') ) {
        renameConfigMars();
    }

    if ( fs.existsSync('config/config.js') ) {
        deleteConfigMars();
    }
    copyConfigMarsTest();
    copyTestTask();

    let mars = require('../mars.js');
    let SIP = require('sip_client');
    let g711 = new (require('../lib/media/G711').G711)();
    let player_1 = require("../lib/media/player");
    let file = 'test/entrance_data.wav';
    let hostIp = '127.0.0.1';

    // ********************** Общие функции **************************
    function convertoUlawToPcmu(buffer) {
        var l = buffer.length;
        var buf = new Int16Array(l);

        while (l--) {
            buf[l] = g711.ulaw2linear(buffer[l]); //convert to pcmu
        }

        return buf.buffer;
    }

    it('Call MARS <- UDP', (done) => {
        // let mars = require('../mars.js');

        setTimeout(() => {
            // Тестовый звонок на марс для отладки rtc канала на Марсе
            // ********************** 1 **************************
            let ua1 = new SIP.UA({
                uri: 'sip:1@' + hostIp,
                user: '1',
                password: '1',
                // wsServers: ['ws://' + hostIp + ':8506'],
                wsServers: ['udp://' + hostIp + ':5060'],
                // wsServers: ['tcp://' + hostIp + ':5060'],
                // wsServers: ['tls://' + hostIp + ':5061'],
                register: true,
                //mediaHandlerFactory: SIP.WebRTC.MediaHandler.defaultFactory,
                mediaHandlerFactory: SIP.RTC.MediaHandler.defaultFactory,
                //mediaHandlerFactory: SIP.WRTC.MediaHandler.defaultFactory,
                registerExpires: 120,
                //transport: 'ws'
                transport: 'udp'
                    //transport: 'tcp'
                    //transport: 'tls'
            });
            let logger = ua1.getLogger('test');

            setTimeout(() => {
                // ****** Исходящий звонок ****** //
                const EventEmitter = require('events');
                const stream = new EventEmitter();

                let options = {
                    media: {
                        stream: stream
                    }
                };

                let session = ua1.invite('sip:alice@' + hostIp, options);

                // ****** Воспроизведение входящего потока ****** //
                var remoteStream = session.getRemoteStreams();

                var remoteBuffers;

                remoteStream.on('data', (data) => {
                    data = new Buffer( convertoUlawToPcmu(data) );

                    if (remoteBuffers) {
                        var totalLength = remoteBuffers.length + data.length;
                        remoteBuffers = Buffer.concat([remoteBuffers, data], totalLength);

                        if (totalLength > 500) {
                            remoteBuffers = null;
                        }
                    } else {
                        remoteBuffers = data;
                    }

                });

                var rightResult = '4567';
                var resultInput = '';

                ua1.on('message', (message) => {
                    if (message.body) {
                        resultInput += message.body;

                        if (resultInput == rightResult) {
                            session.bye();

                            setTimeout(() => {
                                // console.log('bye');
                                done();
                            }, 3000);
                        } else {
                            if (resultInput.length >= rightResult.length) {
                                // done('Введенные показания не соответствуют ' + resultInput + ' != ' + rightResult);
                            }
                        }
                    }
                });

                setTimeout(() => {
                    let player = new player_1.Player();

                    player.on('buffer', (data) => {
                        var newData = new Buffer(data.length - 12);
                        data.copy(newData, 0, 12);

                        newData = new Buffer( convertoUlawToPcmu(newData) );

                        let rtcBuffer = new Buffer(newData.length);
                        newData.copy(rtcBuffer);

                        stream.emit('data', newData);
                    });

                    player.emit('start_play', {
                        params: {
                            file: file
                        }
                    });

                    player.on('event', (data) => {
                        // console.log('event data: ', data);
                    });
                }, 1000);
            });
        }, 2000);
    }).timeout(70000);



    it('Call MARS <- WS', (done) => {
        // let mars = require('../mars.js');

        // setTimeout(() => {
            // Тестовый звонок на марс для отладки rtc канала на Марсе
            // ********************** 1 **************************
            let ua1 = new SIP.UA({
                uri: 'sip:1@' + hostIp,
                user: '1',
                password: '1',
                wsServers: ['ws://' + hostIp + ':8506'],
                // wsServers: ['udp://' + hostIp + ':5060'],
                //wsServers: ['tcp://' + hostIp + ':5060'],
                //wsServers: ['tls://' + hostIp + ':5061'],
                register: true,
                //mediaHandlerFactory: SIP.WebRTC.MediaHandler.defaultFactory,
                mediaHandlerFactory: SIP.RTC.MediaHandler.defaultFactory,
                //mediaHandlerFactory: SIP.WRTC.MediaHandler.defaultFactory,
                registerExpires: 120,
                transport: 'ws'
                // transport: 'udp'
                    //transport: 'tcp'
                    //transport: 'tls'
            });
            let logger = ua1.getLogger('test');

            setTimeout(() => {
                // ****** Исходящий звонок ****** //
                const EventEmitter = require('events');
                const stream = new EventEmitter();

                let options = {
                    media: {
                        stream: stream
                    }
                };

                let session = ua1.invite('sip:alice@' + hostIp, options);

                // ****** Воспроизведение входящего потока ****** //
                var remoteStream = session.getRemoteStreams();

                var remoteBuffers;

                remoteStream.on('data', (data) => {
                    data = new Buffer( convertoUlawToPcmu(data) );

                    if (remoteBuffers) {
                        var totalLength = remoteBuffers.length + data.length;
                        remoteBuffers = Buffer.concat([remoteBuffers, data], totalLength);

                        if (totalLength > 500) {
                            remoteBuffers = null;
                        }
                    } else {
                        remoteBuffers = data;
                    }

                });

                var rightResult = '4567';
                var resultInput = '';

                ua1.on('message', (message) => {
                    if (message.body) {
                        resultInput += message.body;

                        if (resultInput == rightResult) {
                            session.bye();

                            setTimeout(() => {
                                // console.log('bye');
                                done();
                            }, 3000);
                        } else {
                            if (resultInput.length >= rightResult.length) {
                                // done('Введенные показания не соответствуют ' + resultInput + ' != ' + rightResult);
                            }
                        }
                    }
                });

                setTimeout(() => {
                    let player = new player_1.Player();

                    player.on('buffer', (data) => {
                        var newData = new Buffer(data.length - 12);
                        data.copy(newData, 0, 12);

                        newData = new Buffer( convertoUlawToPcmu(newData) );

                        let rtcBuffer = new Buffer(newData.length);
                        newData.copy(rtcBuffer);

                        stream.emit('data', newData);
                    });

                    player.emit('start_play', {
                        params: {
                            file: file
                        }
                    });

                    player.on('event', (data) => {
                        // console.log('event data: ', data);
                    });
                }, 1000);
            });
        // }, 2000);
    }).timeout(70000);


    it('Call MARS <- TCP', (done) => {
        // let mars = require('../mars.js');

        // setTimeout(() => {
            // Тестовый звонок на марс для отладки rtc канала на Марсе
            // ********************** 1 **************************
            let ua1 = new SIP.UA({
                uri: 'sip:1@' + hostIp,
                user: '1',
                password: '1',
                //wsServers: ['ws://' + hostIp + ':8506'],
                // wsServers: ['udp://' + hostIp + ':5060'],
                wsServers: ['tcp://' + hostIp + ':5060'],
                //wsServers: ['tls://' + hostIp + ':5061'],
                register: true,
                //mediaHandlerFactory: SIP.WebRTC.MediaHandler.defaultFactory,
                mediaHandlerFactory: SIP.RTC.MediaHandler.defaultFactory,
                //mediaHandlerFactory: SIP.WRTC.MediaHandler.defaultFactory,
                registerExpires: 120,
                //transport: 'ws'
                // transport: 'udp'
                    transport: 'tcp'
                    //transport: 'tls'
            });
            let logger = ua1.getLogger('test');

            setTimeout(() => {
                // ****** Исходящий звонок ****** //
                const EventEmitter = require('events');
                const stream = new EventEmitter();

                let options = {
                    media: {
                        stream: stream
                    }
                };

                let session = ua1.invite('sip:alice@' + hostIp, options);

                // ****** Воспроизведение входящего потока ****** //
                var remoteStream = session.getRemoteStreams();

                var remoteBuffers;

                remoteStream.on('data', (data) => {
                    data = new Buffer( convertoUlawToPcmu(data) );

                    if (remoteBuffers) {
                        var totalLength = remoteBuffers.length + data.length;
                        remoteBuffers = Buffer.concat([remoteBuffers, data], totalLength);

                        if (totalLength > 500) {
                            remoteBuffers = null;
                        }
                    } else {
                        remoteBuffers = data;
                    }

                });

                var rightResult = '4567';
                var resultInput = '';

                ua1.on('message', (message) => {
                    if (message.body) {
                        resultInput += message.body;

                        if (resultInput == rightResult) {
                            session.bye();

                            setTimeout(() => {
                                // console.log('bye');
                                done();
                            }, 3000);
                        } else {
                            if (resultInput.length >= rightResult.length) {
                                // done('Введенные показания не соответствуют ' + resultInput + ' != ' + rightResult);
                            }
                        }
                    }
                });

                setTimeout(() => {
                    let player = new player_1.Player();

                    player.on('buffer', (data) => {
                        var newData = new Buffer(data.length - 12);
                        data.copy(newData, 0, 12);

                        newData = new Buffer( convertoUlawToPcmu(newData) );

                        let rtcBuffer = new Buffer(newData.length);
                        newData.copy(rtcBuffer);

                        stream.emit('data', newData);
                    });

                    player.emit('start_play', {
                        params: {
                            file: file
                        }
                    });

                    player.on('event', (data) => {
                        // console.log('event data: ', data);
                    });
                }, 1000);
            });
        // }, 2000);
    }).timeout(70000);
    


    it('Call MARS <- TLS', (done) => {
        // let mars = require('../mars.js');

        // setTimeout(() => {
            // Тестовый звонок на марс для отладки rtc канала на Марсе
            // ********************** 1 **************************
            let ua1 = new SIP.UA({
                uri: 'sip:1@' + hostIp,
                user: '1',
                password: '1',
                //wsServers: ['ws://' + hostIp + ':8506'],
                // wsServers: ['udp://' + hostIp + ':5060'],
                // wsServers: ['tcp://' + hostIp + ':5060'],
                wsServers: ['tls://' + hostIp + ':5061'],
                register: true,
                //mediaHandlerFactory: SIP.WebRTC.MediaHandler.defaultFactory,
                mediaHandlerFactory: SIP.RTC.MediaHandler.defaultFactory,
                //mediaHandlerFactory: SIP.WRTC.MediaHandler.defaultFactory,
                registerExpires: 120,
                //transport: 'ws'
                // transport: 'udp'
                // transport: 'tcp'
                transport: 'tls'
            });
            let logger = ua1.getLogger('test');

            setTimeout(() => {
                // ****** Исходящий звонок ****** //
                const EventEmitter = require('events');
                const stream = new EventEmitter();

                let options = {
                    media: {
                        stream: stream
                    }
                };

                let session = ua1.invite('sip:alice@' + hostIp, options);

                // ****** Воспроизведение входящего потока ****** //
                var remoteStream = session.getRemoteStreams();

                var remoteBuffers;

                remoteStream.on('data', (data) => {
                    data = new Buffer( convertoUlawToPcmu(data) );

                    if (remoteBuffers) {
                        var totalLength = remoteBuffers.length + data.length;
                        remoteBuffers = Buffer.concat([remoteBuffers, data], totalLength);

                        if (totalLength > 500) {
                            remoteBuffers = null;
                        }
                    } else {
                        remoteBuffers = data;
                    }

                });

                var rightResult = '4567';
                var resultInput = '';

                ua1.on('message', (message) => {
                    if (message.body) {
                        resultInput += message.body;

                        if (resultInput == rightResult) {
                            session.bye();

                            setTimeout(() => {
                                // console.log('bye');
                                done();
                            }, 3000);
                        } else {
                            if (resultInput.length >= rightResult.length) {
                                // done('Введенные показания не соответствуют ' + resultInput + ' != ' + rightResult);
                            }
                        }
                    }
                });

                setTimeout(() => {
                    let player = new player_1.Player();

                    player.on('buffer', (data) => {
                        var newData = new Buffer(data.length - 12);
                        data.copy(newData, 0, 12);

                        newData = new Buffer( convertoUlawToPcmu(newData) );

                        let rtcBuffer = new Buffer(newData.length);
                        newData.copy(rtcBuffer);

                        stream.emit('data', newData);
                    });

                    player.emit('start_play', {
                        params: {
                            file: file
                        }
                    });

                    player.on('event', (data) => {
                        // console.log('event data: ', data);
                    });
                }, 1000);
            });
        // }, 2000);
    }).timeout(70000);
});

describe('Revert config mars', () => {
    it('Revert config mars', (done) => {
        function deleteConfigMarsTest() {
            fs.unlinkSync('config/config.js'); 
        }

        function deleteTestTasks() {
            fs.unlinkSync('tasks/1.js');
        }

        function renameConfigMars() {
            fs.renameSync('config/config_mars.js', 'config/config.js'); 
        }

        if ( fs.existsSync('config/config.js') ) {
            deleteConfigMarsTest();
        }

        if ( fs.existsSync('tasks/1.js') ) {
            deleteTestTasks();
        }
        
        renameConfigMars();
        done();
    });
});