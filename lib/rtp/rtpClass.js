'use strict';

process.on('disconnect', () => {
    process.exit();
});

process.on('uncaughtException', (e) => {
    process.send('uncaughtException pid:' + process.pid + ': stack: ' + e.stack);

    setTimeout(() => {
        process.exit();
    }, 3000);
});

process.on('error', (e) => {
    process.send('pid:' + process.pid + ': ' + e + ' \r\n stack: ' + e);
});

let rtp;

process.on('message', (data) => {
    if (!data) return;

    let params = data.params;

    if (data.action === 'audioBuffer' && params.sessionID && params.data.length) {
        rtp.addAudioBuffer(params);
    }

    if (data.action === 'rtpInPort') {
        rtp = new Rtp(data.params.sessionID);
        rtp.rtpInPort(params);
    }

    if (data.action === 'init') {
        rtp.init(params, () => {
            data.action = 'stop';
            process.send(data);
        });
        process.send(data);
    }

    if (data.action === 'close') {
        rtp.close();
    }

    if (data.action === 'stop_play') {
        rtp.stopPlay();
    }

    if ( (data.action === 'start_play') && params && (params.file || params.audioBuffer) ) {
        rtp.startPlay(data);
    }

    if (data.action === 'rec' && (params)) {
        process.send(data);
        rtp.rec(params);
    }

});

class Rtp {
    constructor(sessionID) {
        this.client = require("dgram").createSocket('udp4');
        this.fs = require('fs');
        this.stun = require('vs-stun');
        this.stt;
        this.rtp_packet;
        this.stop_flag;
        this.stream_on;
        this.rec_start;
        this.rec_type;
        this.audio_stream_in;
        this.audio_stream_out;
        this.streaming;
        this.isBufferReceived;
        this.sessionID;

        this.bufferSize = 320; //8*30 //30 ms
        this.audioPayload = 0; //RFC3551//PCMU,
        this.fileCodec;
        this.wavDataOffset = 58;
        this.Buffer = require('buffer').Buffer,
        this.RtpPacket = require('./rtppacket').RtpPacket;
        this.audioBuffers = {};

        this.g711 = new(require('./G711').G711)();
        this.wav = require('wav');

        this.lastSttOpt;
    }

    // ******************** Добавить audioBuffer ********************
    addAudioBuffer(params) {
        if (this.streaming) {
            this.bufferSize = params.data.length;
            this.audioBuffers[params.sessionID] = new Buffer(params.data);
        } else {
            this.audioBuffers[params.sessionID] = this.audioBuffers[params.sessionID] || new Buffer(0);
            this.audioBuffers[params.sessionID] = Buffer.concat([this.audioBuffers[params.sessionID], new Buffer(params.data)]);
        };
    
        this.isBufferReceived = true;
        return;
    }

    // ******************** Поднять Rtp поток на порту ********************
    rtpInPort(params) {
        if (params && params.audioCodec === 'PCMA')
            this.audioPayload = 8;

        this.client.bind(0, () => {
            var rtpIn = { port: this.client.address().port };

            if (params && params.publicIP && params.stunServer) {
                rtpIn.host = params.publicIP;

                this.stun.resolve(this.client, params.stunServer, (err, value) => {
                    if (value && value.public) {
                        rtpIn = value.public
                    };
                    process.send({ action: 'rtpInPort', params: rtpIn });
                }, { count: 1, timeout: 100 });
            } else {
                process.send({ action: 'rtpInPort', params: rtpIn });
            }
        })
        return;
    }

    // ******************** Инициализация ********************
    init(params, cb) {

        let buf2array = (buf) => {
            var data = [];
            for (var i = 0; i < buf.length; i++) {
                if (this.audioPayload)
                    data.push(this.g711.alaw2linear(buf.readInt8(i)));
                else
                    data.push(this.g711.ulaw2linear(buf.readInt8(i)));
            }
            return data;
        }

        let dtmf_data = (pkt) => {
            var keys = {
                10: '*',
                11: '#',
                12: 'A',
                13: 'B',
                14: 'C',
                15: 'D'
            };
            var key = pkt[0];
            if (keys[key])
                key = keys[key];
            return {
                event: key,
                volume: (pkt[1] >>> 2),
                duration: (pkt[2] << 8 | pkt[3])
            };
        }

        let rtp_data = (pkt) => {
            return {
                type: (pkt[1] & 0x7F),
                seq: (pkt[2] << 8 | pkt[3]),
                time: (pkt[4] << 24 | pkt[5] << 16 | pkt[6] << 8 | pkt[7]),
                source: pkt.slice(12, pkt.length)
            };
        }

        var dtmf_decoder = require('./dtmf'),
            dtmf_mode,
            prev_dtmf_dur = 0,
            change_flag;

        this.stt = require('./stt');

        this.client.params = params;

        this.client.on("message", (msg, rinfo) => {
            if (!this.stream_on) {
                process.send({
                    action: 'stream_on',
                    params: {
                        port: this.client.address().port,
                        rinfo: rinfo
                    }
                });
                this.stream_on = true;
            }

            var params = this.client.params.in;

            if (!(params.dtmf_detect || params.stt_detect || params.file || params.media_stream))
                return;

            if (this.rec_type != params.rec) {

                this.rec_type = params.rec;

                if (this.rec_type == false) {
                    if (this.audio_stream_in)
                        this.audio_stream_in.end();
                    else {
                        process.send({
                            action: 'recOff',
                            params: {},
                            error: 'Record file not found'
                        });
                    }
                }
            }

            var data = rtp_data(msg);

            if (data.type == params.dtmf_payload_type) {

                if (params.dtmf_detect) {
                    if (dtmf_mode === 'inband')
                        change_flag = true;
                    if (!dtmf_mode || change_flag) {
                        dtmf_mode = 'rfc2833';
                        process.send({
                            action: 'set_dtmf_mode',
                            params: dtmf_mode
                        });
                    }

                    var dtmf = dtmf_data(data.source);

                    if (dtmf.duration < prev_dtmf_dur || prev_dtmf_dur == 0) {
                        if (!change_flag)
                            process.send({
                                action: 'dtmf_key',
                                params: {
                                    key: dtmf.event
                                }
                            });
                        change_flag = false;
                    }

                    prev_dtmf_dur = dtmf.duration;
                }
            } else {
                if (data.type == this.audioPayload) {

                    if (params.media_stream) {
                        if (!payload)
                            payload = buf2array(data.source);
                        process.send({
                            action: 'mediaStream',
                            params: {
                                sessionID: this.sessionID,
                                data: Array.from(new Uint8Array(data.source)) // for webkit - data.source
                            }
                        });
                    }

                    if (params.rec && params.file) {
                        if (!this.audio_stream_in) {
                            this.audio_stream_in = new this.wav.FileWriter(params.file + '.in', {
                                format: this.audioPayload ? 6 : 7, //7 pcmu, 6 pcma
                                channels: 1,
                                sampleRate: 8000,
                                bitDepth: 8
                            });
                            this.audio_stream_out = new this.wav.FileWriter(params.file + '.out', {
                                format: this.audioPayload ? 6 : 7, //7 pcmu, 6 pcma
                                channels: 1,
                                sampleRate: 8000,
                                bitDepth: 8
                            });

                            this.audio_stream_in.on("finish", () => {
                                process.send({
                                    action: 'recOff',
                                    params: {
                                        file: params.file
                                    }
                                });
                            });
                            this.rec_start = process.hrtime(); //время старта входящего потока
                        }
                        if (!this.audio_stream_in.ending)
                            this.audio_stream_in.write(data.source);
                    }

                    var payload;

                    if (params.stt_detect) {
                        var options = params.options && params.options.options;
                        if (options) {
                            if (!this.stt.isReady()) {
                                if (!this.stt.isConnecting()) {
                                    process.send({ action: 'start_stt', params: options });
                                    this.stt.init(options,
                                        (error, params) => {
                                            var res = {
                                                action: 'sttInit'
                                            };
                                            if (error)
                                                res.error = error;
                                            else {
                                                res.params = params;
                                            }
                                            process.send(res);
                                        });
                                }
                            } else {
                                payload = buf2array(data.source);
                                this.stt.send(payload);
                            }
                        }
                    };

                    if (params.dtmf_detect) {
                        if (dtmf_mode !== 'rfc2833') {
                            if (!payload)
                                payload = buf2array(data.source);
                            dtmf_decoder.filter(payload, (c) => {
                                if (!dtmf_mode) {
                                    dtmf_mode = 'inband';
                                    process.send({
                                        action: 'set_dtmf_mode',
                                        params: dtmf_mode
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
                                };
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
                }
            }
        });

        this.client.on("close", () => {
            var f = () => {
                let toDo = () => {
                    if (cb)
                        cb();
                    process.nextTick(process.exit());
                };
                var recFile = this.client.params.in.file;

                if (this.fs.existsSync(recFile + '.in') &&
                    this.fs.existsSync(recFile + '.out')) {
                    var spawn = require('child_process').spawn,
                        //микшируем записи входящего и исходящего потока
                        // -m: все в один моно файл
                        // -M: стерео файл, левый канал - входящий поток, правый - исходящий 
                        sox = spawn('sox', [this.client.params.in.type || '-m', recFile + '.in', recFile + '.out', recFile]);
                    sox.on('error', (e) => {
                        process.send('SOX on Error pid:' + process.pid + ': ' + e.stack);
                        toDo();
                    });
                    sox.stdout.on('finish', () => {
                        this.fs.unlinkSync(recFile + '.in');
                        this.fs.unlinkSync(recFile + '.out');
                        toDo();
                    });
                } else
                    toDo();
            };
            if (this.audio_stream_in) {
                this.audio_stream_in.on("finish", () => {
                    if (this.audio_stream_out) {
                        this.audio_stream_out.on("finish", f);
                        this.audio_stream_out.end();
                        this.audio_stream_out.ending = true;
                    } else
                        f();
                });
                this.audio_stream_in.end();
            } else
                f();
        });

        this.rtp_packet = new this.RtpPacket(new Buffer(1)); //send empty packet
        this.rtp_packet.time += 1;
        this.rtp_packet.seq++;
        this.client.send(this.rtp_packet.packet, 0, this.rtp_packet.packet.length, this.client.params.out.port, this.client.params.out.ip);
    }

    // ******************** Закрыть сокет ********************    
    close() {
        this.stop_flag = true;
        this.client.close();
    }

    // ******************** Оставовка проигрывания ********************    
    stopPlay() { 
        this.stop_flag = true;
    }

    // ******************** Воспроизведение файла или буфера ********************    
    startPlay(data) {
        let params = data.params;

        if (params.file) {
            var files = params.file.split(";");

            files.forEach((f) => {
                if (!this.fs.existsSync(f)) {
                    data.error = 'File not exists';
                    process.send(data);
                    return;
                } else {
                    if (!require('./wav').checkFormat(f, [6, 7])) { //6-pcma,7pcmu
                        data.error = 'Invalid File Format "' + f + '"';
                        process.send(data);
                        return;
                    }
                }
            });
        }

        if (data.error)
            return;

        let toDo = () => {
            process.send(data);

            this.play(params, (resetFlag) => {
                if (!resetFlag) {
                    data.action = 'stop_play';
                    process.send(data);
                    this.stop_flag = true;
                } else {
                    data.action = 'reset_play';
                    process.send(data);
                }
            });
        };

        if (this.stop_flag === false) {
            this.stop_flag = true;
            setTimeout(toDo, 50);
        } else
            toDo();
        return;
    }

    // ******************** Оставовка проигрывания ********************    
    rec(params) { 
        for (var key in params)
            this.client.params.in[key] = params[key];

        if (params.stt_detect) {
            if (JSON.stringify(params) != JSON.stringify(this.lastSttOpt) &&
                this.stt && this.stt.isReady())
                this.stt.stop();
            this.lastSttOpt = params;
        }
    }

    // ******************** Транскодинг ********************    
    transcoding(buf) {
        if (this.fileCodec === 7 //pcmu 
            && this.audioPayload === 8) { //pcma   //u->a transcoding
            //process.send('pid:' + process.pid + ': pcmu->pcma transcoding');
            for (var i = 0; i < buf.length; i++)
                buf[i] = this.g711.ulaw2alaw(buf.readInt8(i));
        } else {
            if (this.fileCodec === 6 //pcma 
                && this.audioPayload === 0) { //pcmu  a->u transcoding
                //process.send('pid:' + process.pid + ': pcmu->pcma transcoding');
                for (var i = 0; i < buf.length; i++)
                    buf[i] = this.g711.alaw2ulaw(buf.readInt8(i));
            }
        }
        return buf;
    }

    // ******************** Проигрывание ********************    
    play(params, cb) {
        var files;

        if (params.file) {
            files = params.file.split(";");
            params.file = files.shift();
        }

        this.streaming = params.streaming;

        var f = () => {
            if (this.client.params.in.rec &&
                this.client.params.in.file &&
                this.audio_stream_out && this.rtp_packet) {

                var rec_end = process.hrtime(this.rec_start),
                    streamTimeout = rec_end[0] * 1000 + rec_end[1] / 1000000;

                var silenceLen = (streamTimeout - (this.bufferSize / 8)).toFixed(); //ms

                if (silenceLen > (this.bufferSize / 8)) { //прошло больше времени размера пакета
                    var silenceBuf = new Buffer(silenceLen * 8);
                    silenceBuf.fill(this.audioPayload ? 213 : 127); //тишина 127 - pcmu, 213 - pcma
                    if (!this.audio_stream_out.ending) {
                        this.audio_stream_out.write(silenceBuf);
                    }
                }
            }
            var start,
                i = 0,
                contents,
                buf,
                bytesRead;
            if (params.file)
                try {
                    contents = this.fs.readFileSync(params.file);
                    this.fileCodec = contents.readUInt16LE(20);
                    contents = new Buffer(contents.slice(this.wavDataOffset, contents.length - 1));
                } catch (e_) {
                    console.log(e_);
                    return;
                };
            this.stop_flag = false;
            if (!this.client)
                return;
            var writeInterval = this.bufferSize / 8; //20, //20;//ms

            process.send({ action: 'audioBuffer', params: { data: [bytesRead] } });

            var writeData = () => {
                if (this.client.params.in.rec &&
                    this.client.params.in.file &&
                    this.audio_stream_out && this.rtp_packet && bytesRead) {

                    if (!this.audio_stream_out.ending) {
                        var _buf = new Buffer(buf.length);
                        this.rtp_packet.packet.copy(_buf, 0, 12);
                        this.audio_stream_out.write(_buf);
                    }
                    this.rec_start = process.hrtime();
                }

                bytesRead = 0;
                buf.fill(this.audioPayload ? 213 : 127); //пакет заполняем тишиной );//тишина 127 - pcmu, 213 - pcma

                if (params.file && (buf.length * i < contents.length)) {
                    bytesRead = buf.length * (i + 1) > contents.length ?
                        buf.length * (i + 1) - contents.length : buf.length;
                    contents.copy(buf, 0, buf.length * i, buf.length * i + bytesRead);
                }
                buf = this.transcoding(buf);

                //if (audioBuffers[params.audioBuffer])
                //    process.send({action: 'audioBuffer', params: {data: audioBuffers[params.audioBuffer]}});

                if (params.audioBuffer &&
                    this.audioBuffers[params.audioBuffer] &&
                    this.audioBuffers[params.audioBuffer].length > 0
                    //	&& (!params.streaming || params.streaming && audioBuffers[params.audioBuffer].length >= 2 * buf.length)/*buf.length*/
                ) {
                    var bufferData = this.audioBuffers[params.audioBuffer].slice(0, buf.length);
                    buf = new Buffer(bufferData);
                    bytesRead = bufferData.length;
                    //
                    //process.send(audioBuffers[params.audioBuffer].length + ':' + bytesRead);
                    //
                    if (bytesRead < this.bufferSize)
                        this.audioBuffers[params.audioBuffer] = new Buffer(0);
                    else
                        this.audioBuffers[params.audioBuffer] = this.audioBuffers[params.audioBuffer].slice(-1 * (this.audioBuffers[params.audioBuffer].length - bytesRead));
                }

                if (!this.stop_flag && (bytesRead > 0 || params.streaming)) {
                    if (!this.rtp_packet)
                        this.rtp_packet = new this.RtpPacket(buf);
                    else
                        this.rtp_packet.payload = buf;
                    this.rtp_packet.type = this.audioPayload;
                    this.rtp_packet.time += buf.length;
                    this.rtp_packet.seq++;

                    if (!start)
                        start = Date.now();
                    i++;

                    let tFn = () => {
                        var timeOut = start + writeInterval * i;
                        var t_ = timeOut - Date.now();
                        if (params.streaming) {
                            if (this.isBufferReceived)
                                t_ = 0;
                            else
                                t_ = 1;
                        }
                        if (t_ > 0)
                            setTimeout(tFn, 0);
                        else {
                            this.isBufferReceived = false;
                            //if (t_)
                            //    console.log('delay', t_);
                            if (writeInterval + t_ < 0)
                                writeData(); //skip packet
                            else {
                                if (bytesRead) {
                                    this.client.send(this.rtp_packet.packet, 0, this.rtp_packet.packet.length, this.client.params.out.port, this.client.params.out.ip, writeData);
                                } else {
                                    writeData();
                                }
                            }
                        }
                    }
                    tFn();

                } else {
                    if (!this.stop_flag && files && files.length) {
                        params.file = files.shift();
                        f();
                    } else {
                        //
                        if (!this.stop_flag && params.streaming)
                            setTimeout(writeData, 0);
                        else
                        //
                            cb(this.stop_flag);
                        // dgram module automatically listens on the port even if we only wanted to send... -_-
                    }
                }
            };
            buf = new Buffer(this.bufferSize);
            writeData();
        };
        f();
    }

}