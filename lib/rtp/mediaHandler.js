"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// ******************** Загрузка зависимостей ********************
const socket_1 = require("./socket");
const player_1 = require("./player");
const recorder_1 = require("./recorder");
const dtmf_1 = require("./dtmf");
const stt_1 = require("./stt");
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
                    this.dtmf.rec(params);
                    this.stt.rec(params);
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
        this.dtmf = new dtmf_1.Dtmf();
        this.stt = new stt_1.Stt();
        // ******************** Обработчики Плеера ********************
        this.socket.on('writeDataIn', (buffer) => {
            this.recorder.emit('writeDataIn', buffer);
        });
        this.socket.on('socketClose', () => {
            this.recorder.emit('socketClose');
        });
        this.socket.on('dtmf', (data) => {
            this.dtmf.emit('dtmf', data);
        });
        this.socket.on('payload', (data) => {
            this.dtmf.emit('payload', data);
        });
        this.socket.on('stt', (data) => {
            this.stt.emit('stt', data);
        });
        // ******************** Обработчики Плеера ********************
        this.player.on('buffer', (buffer) => {
            this.socket.emit('addBuffer', buffer);
        });
        this.player.on('startPlayFile', () => {
            this.recorder.emit('startPlayFile');
        });
        this.player.on('writeDataOut', (buffer) => {
            this.recorder.emit('writeDataOut', buffer);
        });
    }
}
let mediaHandler = new MediaHandler();
