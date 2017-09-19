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
            if (!params)
                return false;
            switch (data.action) {
                case 'audioBuffer':
                    if (params.sessionID && params.data.length) {
                        this.socket.addAudioBuffer(params);
                    }
                    break;
                case 'rtpInPort':
                    this.createHandlers();
                    this.socket.rtpInPort(params);
                    break;
                case 'init':
                    this.socket.init(params);
                    process.send(data);
                    break;
                case 'close':
                    this.socket.close();
                    break;
                case 'stop_play':
                    this.socket.stopPlay();
                    break;
                case 'start_play':
                    if (params.file || params.audioBuffer) {
                        this.player.startPlay(data);
                    }
                    break;
                case 'rec':
                    process.send(data);
                    this.socket.rec(params);
                    this.recorder.rec(params);
                    break;
                default:
                    break;
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