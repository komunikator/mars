"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

// ******************** Загрузка зависимостей ********************
const rtpSocket = require("./rtp/socket");
const rtcSocket = require("./rtc/socket");
const player_1 = require("./player");
const recorder_1 = require("./recorder");
const dtmf_1 = require("./dtmf");
const stt_1 = require("./stt");
const events_1 = require("events");

class MediaHandler extends events_1.EventEmitter {
    constructor() {
        super();
        // ******************** Обработчики RTP звонка ********************
        this.on('audioBuffer', (data) => {
            if (data.params.sessionID && data.params.data.length) {
                this.player.emit('audioBuffer', data.params);
            }
        });
        this.on('rtpInPort', (data) => {
            this.socket = new rtpSocket.Socket(data);
            this.createHandlers();
            this.socket.emit('rtpInPort', data.params);
        });
        this.on('init', (data) => {
            this.socket.emit('init', data.params);
            // (process as any).send(data);
            this.emit('event', data);
        });
        this.on('close', (data) => {
            this.player.emit('stop_flag', true);
            this.socket.emit('close');
        });
        this.on('stop_play', (data) => {
            this.player.emit('stop_play');
        });
        this.on('start_play', (data) => {
            if (data.params.file || data.params.audioBuffer) {
                this.player.emit('start_play', data);
            }
        });
        this.on('rec', (data) => {
            // (process as any).send(data);
            this.emit('event', data);
            this.socket.emit('rec', data.params);
            this.recorder.emit('rec', data.params);
            this.dtmf.emit('rec', data.params);
            this.stt.emit('rec', data.params);
        });


        // ******************** Обработчики RTC звонка ********************
        this.on('createRtc', (data) => {
            this.socket = new rtcSocket.Socket(data.params);

            this.createHandlers();

            this.socket.on('getAnswer', (data) => {
                this.emit('event', data);
            });

            this.socket.on('dataChannel', (data) => {
                this.emit('event', data);
            });
        });
        
    }

    // ******************** Создание и добавление компонентов класса ********************
    createHandlers() {

        // ******************** Создание экземпляров ********************
        this.player = new player_1.Player();
        this.recorder = new recorder_1.Recorder();
        this.dtmf = new dtmf_1.Dtmf();
        this.stt = new stt_1.Stt();

        // ******************** Подписка на проксирующие данные ********************
        let onEvent = (data) => {
            // process.send('MediaHandler EVENT ' + data.action);

            if (data) {
                this.emit('event', data);
            }
        };
        this.socket.on('event', onEvent);
        this.player.on('event', onEvent);
        this.recorder.on('event', onEvent);
        this.dtmf.on('event', onEvent);
        this.stt.on('event', onEvent);

        // ******************** Обработчики Сокета ********************
        this.socket.on('writeDataIn', (buffer) => {
            this.recorder.emit('writeDataIn', buffer);
        });
        this.socket.on('close', () => {
            this.recorder.emit('close');
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

        // ******************** Обработчики Recorder ********************
        this.recorder.on('finish', (buffer) => {
            process.exit();
        });
    }
}
exports.MediaHandler = MediaHandler;
