"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

// ******************** Обработка событий текущего процесса ********************
process.on('uncaughtException', (e) => {
    process.send('uncaughtException pid:' + process.pid + ': stack: ' + e.stack);
});


process.on('warning', (e) => {
    process.send('pid:' + process.pid + ': ' + e + ' \r\n stack: ' + e);
});

// ******************** Обработка сообщений родительского процесса ********************
process.on('message', (data) => {
    if ((!data) || (!data.action)) {
        return false;
    }

    if (data.action == 'rec') {
        stt.emit('rec', data.params);
    }

    if (data.action == 'stt') {
        stt.emit('stt', data.params);
    }
});


const events_1 = require("events");

class Stt extends events_1.EventEmitter {
    constructor() {
        super();
        this.stt;
        this.lastSttOpt;
        this.in = {};
        this.stt = require('./sttMethods');
        // ********* Обработка событий *********
        this.on('stt', (payload) => {         
            if (this.in && this.in.stt_detect) {
                this.speechToText(payload);
            }
        });
        this.on('rec', (params) => {
            this.rec(params);
        });
    }
    speechToText(payload) {
        let options = this.in.options && this.in.options.options;
        if (options) {
            if (!this.stt.isReady()) {
                if (!this.stt.isConnecting()) {
                    // (process as any).send({ action: 'start_stt', params: options });
                    this.emit('event', { action: 'start_stt', params: options });
                    this.stt.init(options, (error, params) => {
                        let res = {
                            action: 'sttInit'
                        };
                        if (error) {
                            res.error = error;
                        } else {
                            res.params = params;
                        }
                        // (process as any).send(res.params);
                        // process.send(res);
                        this.emit('event', res);
                    });
                }
            } else {
                this.stt.send(payload);
            }
        }
    }
    // ******************** Установка параметров ********************
    rec(params) {
        for (let key in params) {
            this.in[key] = params[key];
        }
        if (params && params.stt_detect) {
            if (JSON.stringify(params) != JSON.stringify(this.lastSttOpt) &&
                this.stt && this.stt.isReady())
                this.stt.stop();
            this.lastSttOpt = params;
        }
    }
}
let stt = new Stt();

// exports.Stt = Stt;
