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
        this.on('newDtmf', (data) => {
            this.newDtmf(data);
        });
        this.on('newPayload', (data) => {
            this.newPayload(data);
        });
    }
    newDtmf(data) {
        // (process as any).send('!!! newDtmf: ' + data.source);
        if (this.dtmf_mode === 'inband') {
            this.change_flag = true;
        }
        if (!this.dtmf_mode || this.change_flag) {
            this.dtmf_mode = 'rfc2833';
            process.send({
                action: 'set_dtmf_mode',
                params: this.dtmf_mode
            });
        }
        let dtmf = this.dtmf_data(data.source);
        if (dtmf.duration < this.prev_dtmf_dur || this.prev_dtmf_dur == 0) {
            if (!this.change_flag) {
                process.send({
                    action: 'dtmf_key',
                    params: {
                        key: dtmf.event
                    }
                });
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
    newPayload(msg) {
        let payload = msg.payload;
        let data = msg.data;
        if (this.dtmf_mode !== 'rfc2833') {
            if (!payload) {
                payload = this.buf2array(data.source);
            }
            this.dtmf_decoder.filter(payload, (c) => {
                if (!this.dtmf_mode) {
                    this.dtmf_mode = 'inband';
                    process.send({
                        action: 'set_dtmf_mode',
                        params: this.dtmf_mode
                    });
                }
                if (c.key !== undefined) {
                    process.send({
                        action: 'dtmf_key',
                        params: {
                            key: c.key
                        }
                    });
                    let last_key = c.key;
                }
                ;
                if (c.seq !== undefined)
                    process.send({
                        action: 'dtmf_seq',
                        params: {
                            key: c.seq
                        }
                    });
            });
        }
    }
    buf2array(buf) {
        var data = [];
        for (var i = 0; i < buf.length; i++) {
            if (this.audioPayload)
                data.push(this.g711.alaw2linear(buf.readInt8(i)));
            else
                data.push(this.g711.ulaw2linear(buf.readInt8(i)));
        }
        return data;
    }
}
exports.Dtmf = Dtmf;
