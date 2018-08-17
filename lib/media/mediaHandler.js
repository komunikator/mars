"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

// ******************** Загрузка зависимостей ********************
const rtpSocket = require("./rtp/socket");
const rtcSocket = require("./rtc/socket");
const player_1 = require("./player");
const recorder_1 = require("./recorder");
const dtmf_1 = require("./dtmf");
const events_1 = require("events");

// ***************** STT *****************
// const stt_1 = require("./stt");
let stt_1;

class MediaHandler extends events_1.EventEmitter {
    constructor() {
        super();

        // ******************** Обработчики RTC звонка ********************
        this.on('createRtc', (data) => {
            this.socket = new rtcSocket.Socket(data.params);

            this.createHandlers();

            this.socket.on('getAnswer', (data) => {
                this.emit('event', data);
            });

            this.socket.on('getSdp', (data) => {
                this.emit('event', data);
            });

            this.socket.on('dataChannel', (data) => {
                this.emit('event', data);
            });

            this.socket.on('message', (data) => {
                this.emit('event', data);
            });
        });

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
            //this.socket.emit('close');
            this.socket.close();
            this.emit('event', data);
            if (stt_1) stt_1.kill();
        });
        this.on('stop_play', (data) => {
            this.player.emit('stop_play');
        });
        this.on('answer', (data) => {
            this.socket.emit('answer', data);
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
            // this.stt.emit('rec', data.params);

            if (stt_1) {
                stt_1.send(data);
            } else {
                if (data && data.params && data.params.stt_detect) {
                    stt_1 = require('child_process').fork(__dirname + "/stt.js", { silent: true, execPath: 'node' });
                    stt_1.send(data);

                    stt_1.on('message', function (msg) {
                        if (msg) {
                            process.send(msg);
                        }
                    });
                    stt_1.on('error', function (err) {
                        process.send(err);
                    });
                    
                    stt_1.on('close', function (code) {
                        process.send(code);
                    });
                }
            }
        });
    }

    // ******************** Создание и добавление компонентов класса ********************
    createHandlers() {

        // ******************** Создание экземпляров ********************
        this.player = new player_1.Player();
        this.recorder = new recorder_1.Recorder();
        this.dtmf = new dtmf_1.Dtmf();
        // this.stt = new stt_1.Stt();

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
        // this.stt.on('event', onEvent);
        // stt_1.on('event', onEvent);

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
            // this.stt.emit('stt', data);

            if (stt_1) {
                stt_1.send({ action: 'stt', params: data });
            }
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
