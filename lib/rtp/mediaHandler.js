"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// ******************** Загрузка зависимостей ********************
const socket_1 = require("./socket");
const player_1 = require("./player");
const recorder_1 = require("./recorder");
// ******************** Глобавльные переменные ********************
let socket;
let player;
let recorder;
// ******************** Обработка событий текущего процесса ********************
process.on('disconnect', () => {
    process.exit();
});
process.on('uncaughtException', (e) => {
    process.send('uncaughtException pid:' + process.pid + ': stack: ' + e.stack);
    setTimeout(() => {
        process.exit();
    }, 3000);
});
process.on('warning', (e) => {
    process.send('pid:' + process.pid + ': ' + e + ' \r\n stack: ' + e);
});
// ******************** Обработка сообщений родительского процесса ********************
process.on('message', (data) => {
    if (!data)
        return;
    // (process as any).send(data.action);
    let params = data.params;
    if (data.action === 'audioBuffer' && params.sessionID && params.data.length) {
        socket.addAudioBuffer(params);
    }
    if (data.action === 'rtpInPort') {
        createHandlers(data);
        socket.rtpInPort(params);
    }
    if (data.action === 'init') {
        socket.init(params);
        process.send(data);
    }
    if (data.action === 'close') {
        socket.close();
    }
    if (data.action === 'stop_play') {
        socket.stopPlay();
    }
    if ((data.action === 'start_play') && params && (params.file || params.audioBuffer)) {
        player.startPlay(data);
    }
    if (data.action === 'rec' && (params)) {
        process.send(data);
        socket.rec(params);
        recorder.rec(params);
    }
});
// ******************** Создание и навешивание обработчиков ********************
function createHandlers(data) {
    // ******************** Создание экземпляров ********************
    socket = new socket_1.Socket(data.params.sessionID);
    player = new player_1.Player(data.params.sessionID);
    recorder = new recorder_1.Recorder(data.params.sessionID);
    // ******************** Обработчики Плеера ********************
    socket.on('writeDataIn', (buffer) => {
        recorder.emit('writeDataIn', buffer);
    });
    socket.on('socketClose', () => {
        recorder.emit('socketClose');
    });
    // ******************** Обработчики Плеера ********************
    player.on('buffer', (buffer) => {
        socket.emit('addBuffer', buffer);
    });
    player.on('startPlayFile', () => {
        // (process as any).send('startPlayFile Manager');
        recorder.emit('startPlayFile');
    });
    player.on('writeDataOut', (buffer) => {
        recorder.emit('writeDataOut', buffer);
    });
}
