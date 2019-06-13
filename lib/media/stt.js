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

class sttModule extends events_1.EventEmitter {
    constructor() {
        super();

        this.lastSttOpt;
        this.in = {};
        // this.stt = require('./sttMethods');
        let speech = require('speech');
        this.stt = new speech();

        this.stt.on('sttInit', (err, data) => {
            let res = {
                action: 'sttInit'
            };
            if (err) {
                res.params = err;
            } else {
                res.params = data;
            }
            this.emit('event', res);
        });

        this.stt.on('sttOn', (data) => {
            process.send({
                action: 'sttOn',
                params: {
                    text: data.text
                }
            });

            // console.log('sttOn data.text', data.text);
        
            // speech.sttStop();
        });

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
            if (!this.stt.isReadyStt()) {
                if (!this.stt.isConnectingStt()) {
                    // (process as any).send({ action: 'start_stt', params: options });
                    this.emit('event', { action: 'start_stt', params: options });

                    this.stt.sttInit(options);
                }
            } else {
                this.stt.speechToText(payload);
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
                this.stt && this.stt.isReadyStt())
                this.stt.sttStop();
            this.lastSttOpt = params;
        }
    }
}
let stt = new sttModule();

// exports.Stt = Stt;