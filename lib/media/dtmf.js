"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
class Dtmf extends events_1.EventEmitter {
    constructor() {
        super();
        this.dtmf_decoder = require('./dtmfDecoder');
        this.dtmf_mode;
        this.change_flag;
        this.prev_dtmf_dur = 0;
        this.audioPayload = 0; //RFC3551//PCMU,
        this.g711 = new (require('./G711').G711)();
        this.in = {};
        // ********* Обработка событий *********
        this.on('dtmf', (data) => {
            if (this.in && this.in.dtmf_detect) {
                this.setDtmfMode();
                this.checkDtmf(data);
            }
        });
        this.on('payload', (payload) => {
            if (this.in && this.in.dtmf_detect) {
                this.dtmfDetect(payload);
            }
        });
        this.on('rec', (params) => {
            this.rec(params);
        });
    }
    setDtmfMode() {
        // (process as any).send('!!! newDtmf: ' + data.source);
        if (this.dtmf_mode === 'inband') {
            this.change_flag = true;
        }
        if (!this.dtmf_mode || this.change_flag) {
            this.dtmf_mode = 'rfc2833';
        }
        this.emit('event', {
            action: 'set_dtmf_mode',
            params: this.dtmf_mode
        });
        // (process as any).send({
        //     action: 'set_dtmf_mode',
        //     params: this.dtmf_mode
        // });
    }
    checkDtmf(data) {
        let dtmf = this.dtmf_data(data);
        if ((dtmf.duration < this.prev_dtmf_dur && dtmf.duration > 0) || (this.prev_dtmf_dur == 0 && dtmf.duration > 0)) {
            if (!this.change_flag) {
                this.emit('event', {
                    action: 'dtmf_key',
                    params: {
                        key: dtmf.event
                    }
                });
                // (process as any).send({
                //     action: 'dtmf_key',
                //     params: {
                //         key: dtmf.event
                //     }
                // });
            }
            this.change_flag = false;
        }
        this.prev_dtmf_dur = dtmf.duration;
    }
    dtmf_data(pkt) {
        let keys = {
            10: '*',
            11: '#',
            12: 'A',
            13: 'B',
            14: 'C',
            15: 'D'
        };
        let key = pkt[0];
        if (keys[key]) {
            key = keys[key];
        }
        let result = {
            event: key,
            volume: (pkt[1] >>> 2),
            duration: (pkt[2] << 8 | pkt[3])
        };
        return result;
    }

    dtmfDetect(payload) {
        if (this.dtmf_mode !== 'rfc2833') {
            this.dtmf_decoder.filter(payload, (c) => {
                if (!this.dtmf_mode) {
                    this.dtmf_mode = 'inband';
                    this.setDtmfMode();
                }
                if (c.key !== undefined) {
                    this.emit('event', {
                        action: 'dtmf_key',
                        params: {
                            key: c.key
                        }
                    });
                    // (process as any).send({
                    //     action: 'dtmf_key',
                    //     params: {
                    //         key: c.key
                    //     }
                    // });
                    let last_key = c.key;
                }
                ;
                if (c.seq !== undefined)
                    this.emit('event', {
                        action: 'dtmf_seq',
                        params: {
                            key: c.seq
                        }
                    });
                // (process as any).send({
                //     action: 'dtmf_seq',
                //     params: {
                //         key: c.seq
                //     }
                // });
            });
        }
    }
    buf2array(buf) {
        let data = [];
        for (let i = 0; i < buf.length; i++) {
            if (this.audioPayload)
                data.push(this.g711.alaw2linear(buf.readInt8(i)));
            else
                data.push(this.g711.ulaw2linear(buf.readInt8(i)));
        }
        return data;
    }
    // ******************** Установка параметров ********************
    rec(params) {
        for (let key in params) {
            this.in[key] = params[key];
        }
    }
}
exports.Dtmf = Dtmf;
