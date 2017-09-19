"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// ******************** Загрузка зависимостей ********************
const socket_1 = require("./socket");
const player_1 = require("./player");
const recorder_1 = require("./recorder");
class MediaHandler {
    constructor() {
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
                this.socket.addAudioBuffer(params);
            }
            if (data.action === 'rtpInPort') {
                this.createHandlers();
                this.socket.rtpInPort(params);
            }
            if (data.action === 'init') {
                this.socket.init(params);
                process.send(data);
            }
            if (data.action === 'close') {
                this.socket.close();
            }
            if (data.action === 'stop_play') {
                this.socket.stopPlay();
            }
            if ((data.action === 'start_play') && params && (params.file || params.audioBuffer)) {
                this.player.startPlay(data);
            }
            if (data.action === 'rec' && (params)) {
                process.send(data);
                this.socket.rec(params);
                this.recorder.rec(params);
            }
        });
    }
    // ******************** Создание и добавление компонентов класса ********************
    createHandlers() {
        // ******************** Создание экземпляров ********************
        this.socket = new socket_1.Socket();
        this.player = new player_1.Player();
        this.recorder = new recorder_1.Recorder();
        // ******************** Обработчики Плеера ********************
        this.socket.on('writeDataIn', (buffer) => {
            this.recorder.emit('writeDataIn', buffer);
        });
        this.socket.on('socketClose', () => {
            this.recorder.emit('socketClose');
        });
        // ******************** Обработчики Плеера ********************
        this.player.on('buffer', (buffer) => {
            this.socket.emit('addBuffer', buffer);
        });
        this.player.on('startPlayFile', () => {
            // (process as any).send('startPlayFile Manager');
            this.recorder.emit('startPlayFile');
        });
        this.player.on('writeDataOut', (buffer) => {
            this.recorder.emit('writeDataOut', buffer);
        });
    }
}
let mediaHandler = new MediaHandler();
