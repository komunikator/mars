"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const FileStream = require("fs");
const child_process_1 = require("child_process");
class RtpRecorder extends events_1.EventEmitter {
    constructor(sessionID) {
        super();
        this.bufferSize = 320; //8*30 //30 ms
        this.rec_start;
        this.audioPayload = 0; //RFC3551//PCMU
        this.audio_stream_out;
        this.audio_stream_in;
        this.wav = require('wav');
        this.in = {};
        this.rec_type;
        this.fs = FileStream;
        this.on('startPlayFile', (buffer) => {
            process.send('!!!!! rtpRecorder [startPlayFile]');
            this.startPlayFile();
        });
        this.on('writeDataOut', (buffer) => {
            // (process as any).send('!!!!! rtpRecorder [writeData] buffer: ' + buffer);
            this.writeDataOut(buffer);
        });
        this.on('writeDataIn', (buffer) => {
            // (process as any).send('!!!!! rtpRecorder [writeData] buffer: ' + buffer);
            this.writeDataIn(buffer);
        });
        this.on('socketClose', () => {
            this.closeStreams();
        });
    }
    // ******************** Событие старта файла ********************    
    startPlayFile() {
        if (this.in.rec && this.in.file && this.audio_stream_out) {
            let rec_end = process.hrtime(this.rec_start), streamTimeout = rec_end[0] * 1000 + rec_end[1] / 1000000;
            let silenceLen = (streamTimeout - (this.bufferSize / 8)).toFixed(); //ms
            if (silenceLen > (this.bufferSize / 8)) {
                let silenceBuf = new Buffer(silenceLen * 8);
                silenceBuf.fill(this.audioPayload ? 213 : 127); //тишина 127 - pcmu, 213 - pcma
                if (!this.audio_stream_out.ending) {
                    process.send('!!!!! rtpRecorder [startPlayFile] silenceBuf: ' + silenceBuf);
                    this.audio_stream_out.write(silenceBuf);
                }
            }
        }
    }
    // ******************** Запись данных ********************    
    writeDataOut(buffer) {
        if (this.in.rec && this.in.file && this.audio_stream_out) {
            this.rec_start = process.hrtime();
            if (!this.audio_stream_out.ending) {
                this.audio_stream_out.write(buffer);
            }
        }
    }
    // ******************** Запись данных ********************    
    writeDataIn(buffer) {
        if (this.rec && ('file' in this.in)) {
            if (!this.audio_stream_out) {
                this.audio_stream_out = new this.wav.FileWriter(this.in.file + '.out', {
                    format: this.audioPayload ? 6 : 7,
                    channels: 1,
                    sampleRate: 8000,
                    bitDepth: 8
                });
            }
            if (!this.audio_stream_in) {
                this.audio_stream_in = new this.wav.FileWriter(this.in.file + '.in', {
                    format: this.audioPayload ? 6 : 7,
                    channels: 1,
                    sampleRate: 8000,
                    bitDepth: 8
                });
                this.audio_stream_in.on("finish", () => {
                    process.send({
                        action: 'recOff',
                        params: {
                            file: this.in.file
                        }
                    });
                });
            }
        }
        if (!this.rec_start) {
            this.rec_start = process.hrtime(); //время старта входящего потока
        }
        if (this.in.rec && this.in.file && this.audio_stream_in) {
            this.rec_start = process.hrtime();
            if (!this.audio_stream_in.ending) {
                this.audio_stream_in.write(buffer);
            }
        }
    }
    // ******************** Установка параметров ********************
    rec(params) {
        for (let key in params) {
            this.in[key] = params[key];
        }
        this.checkCloseStream(params);
    }
    // ******************** Закрыть запись разговора в случае если выставлен флаг ********************    
    checkCloseStream(params) {
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
    }
    // ******************** Закрытие входящего исходящего стрима в случае необходимости ********************
    closeStreams() {
        let f = () => {
            let toDo = () => {
                let data = {
                    action: 'stop'
                };
                process.send(data);
                process.nextTick(process.exit());
            };
            let recFile = this.in.file;
            if (this.fs.existsSync(recFile + '.in') &&
                this.fs.existsSync(recFile + '.out')) {
                //микшируем записи входящего и исходящего потока
                // -m: все в один моно файл
                // -M: стерео файл, левый канал - входящий поток, правый - исходящий 
                let sox = child_process_1.spawn('sox', [this.in.type || '-m', recFile + '.in', recFile + '.out', recFile]);
                sox.on('error', (e) => {
                    process.send('SOX on Error pid:' + process.pid + ': ' + e.stack);
                    toDo();
                });
                sox.stdout.on('finish', () => {
                    this.fs.unlinkSync(recFile + '.in');
                    this.fs.unlinkSync(recFile + '.out');
                    toDo();
                });
            }
            else
                toDo();
        };
        if (this.audio_stream_in) {
            this.audio_stream_in.on("finish", () => {
                if (this.audio_stream_out) {
                    this.audio_stream_out.on("finish", f);
                    this.audio_stream_out.end();
                    this.audio_stream_out.ending = true;
                }
                else
                    f();
            });
            this.audio_stream_in.end();
        }
        else
            f();
    }
}
exports.RtpRecorder = RtpRecorder;
