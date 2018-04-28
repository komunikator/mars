"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const FileStream = require("fs");
class Player extends events_1.EventEmitter {
    constructor() {
        super();
        this.audioBuffers = {};
        this.streaming;
        this.stop_flag;
        this.bufferSize = 320; //8*40 //40 ms
        this.g711 = new (require('./G711').G711)();
        this.fileCodec;
        this.wavDataOffset = 58;
        this.rtp_packet;
        this.audioPayload = 0; //RFC3551//PCMU,
        this.RtpPacket = require('./rtp/rtppacket').RtpPacket;
        this.audio_stream_out;
        this.isBufferReceived;
        // ********* Обработка событий *********
        this.on('audioBuffer', (params) => {
            this.audioBuffer(params);
        });
        this.on('stop_play', () => {
            this.stopPlay();
        });
        this.on('start_play', (data) => {
            this.startPlay(data);
        });
        this.on('stop_flag', (data) => {
            this.stop_flag = true;
        });
    }
    // ******************** Воспроизведение файла или буфера ********************    
    startPlay(data) {
        let params = data.params;
        if (params.file) {
            let files = params.file.split(";");
            files.forEach((f) => {
                if (!FileStream.existsSync(f)) {
                    data.error = 'File not exists';
                    // (process as any).send(data);
                    this.emit('event', data);
                    return;
                }
                else {
                    if (!require('./wav').checkFormat(f, [6, 7])) {
                        data.error = 'Invalid File Format "' + f + '"';
                        // (process as any).send(data);
                        this.emit('event', data);
                        return;
                    }
                }
            });
        }
        if (data.error)
            return;
        let toDo = () => {
            // (process as any).send(data);
            this.emit('event', data);
            this.play(params, (resetFlag) => {
                if (!resetFlag) {
                    data.action = 'stop_play';
                    // (process as any).send(data);
                    this.emit('event', data);
                    this.stop_flag = true;
                }
                else {
                    data.action = 'reset_play';
                    this.emit('event', data);
                    // (process as any).send(data);
                }
            });
        };
        if (!this.stop_flag) {
            this.stop_flag = true;
            setTimeout(toDo, 50);
        }
        else
            toDo();
    }
    // ******************** Проигрывание ********************    
    play(params, cb) {
        // (process as any).send('rtpPlayer method play');
        let files;
        if (params.file) {
            files = params.file.split(";");
            params.file = files.shift();
        }
        this.streaming = params.streaming;
        let f = () => {
            this.startPlayFile();

            let start, i = 0, contents, buf, bytesRead;

            if (params.file) {
                try {
                    contents = FileStream.readFileSync(params.file);
                    this.fileCodec = contents.readUInt16LE(20);
                    contents = new Buffer(contents.slice(this.wavDataOffset, contents.length - 1));
                } catch (e_) {
                    console.log(e_);
                    return;
                }
            }

            this.stop_flag = false;

            let writeInterval = this.bufferSize / 8; //20, //20;//ms

            // (process as any).send({ action: 'audioBuffer', params: { data: [bytesRead] } });
            this.emit('event', { action: 'audioBuffer', params: { data: [bytesRead] } });

            let writeData = () => {
                if (this.rtp_packet && bytesRead) {
                    let _buf = new Buffer(buf.length);
                    this.rtp_packet.packet.copy(_buf, 0, 12);
                    this.emit('writeDataOut', _buf);
                }
                bytesRead = 0;
                buf.fill(this.audioPayload ? 213 : 127); //пакет заполняем тишиной );//тишина 127 - pcmu, 213 - pcma
                if (params.file && (buf.length * i < contents.length)) {
                    bytesRead = buf.length * (i + 1) > contents.length ?
                        buf.length * (i + 1) - contents.length : buf.length;
                    contents.copy(buf, 0, buf.length * i, buf.length * i + bytesRead);
                }

                buf = this.transcoding(buf);
                
                if (params.audioBuffer &&
                    this.audioBuffers[params.audioBuffer] &&
                    this.audioBuffers[params.audioBuffer].length > 0) {

                    let bufferData = this.audioBuffers[params.audioBuffer].slice(0, this.bufferSize);

                    buf = new Buffer(bufferData);
                    bytesRead = bufferData.length;

                    if (bytesRead < this.bufferSize) {
                        this.audioBuffers[params.audioBuffer] = new Buffer(0);
                    } else {
                        this.audioBuffers[params.audioBuffer] = this.audioBuffers[params.audioBuffer].slice(-1 * (this.audioBuffers[params.audioBuffer].length - bytesRead));
                    }
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
                        let timeOut = start + writeInterval * i;
                        let t_ = timeOut - Date.now();
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
                            if (writeInterval + t_ < 0)
                                writeData(); //skip packet
                            else {
                                if (bytesRead && (!this.stop_flag)) {
                                    this.emit('buffer', this.rtp_packet.packet);
                                    // this.emit('buffer', this.rtp_packet.payload);
                                    writeData();
                                }
                                else {
                                    writeData();
                                }
                            }
                        }
                    };
                    tFn();
                }
                else {
                    if (!this.stop_flag && files && files.length) {
                        params.file = files.shift();
                        f();
                    }
                    else {
                        if (!this.stop_flag && params.streaming)
                            setTimeout(writeData, 0);
                        else
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
    // ******************** Добавить audioBuffer ********************
    audioBuffer(params) {
        if (this.streaming) {
            this.bufferSize = params.data.length;
            this.audioBuffers[params.sessionID] = new Buffer(params.data);
        } else {
            this.audioBuffers[params.sessionID] = this.audioBuffers[params.sessionID] || new Buffer(0);
            this.audioBuffers[params.sessionID] = Buffer.concat([this.audioBuffers[params.sessionID], new Buffer(params.data)]);
        }
        this.isBufferReceived = true;
        return;
    }
    // ******************** Транскодинг ********************    
    transcoding(buf) {
        if (this.fileCodec === 7 //pcmu 
            && this.audioPayload === 8) {
            //process.send('pid:' + process.pid + ': pcmu->pcma transcoding');
            for (let i = 0; i < buf.length; i++)
                buf[i] = this.g711.ulaw2alaw(buf.readInt8(i));
        }
        else {
            if (this.fileCodec === 6 //pcma 
                && this.audioPayload === 0) {
                //process.send('pid:' + process.pid + ': pcmu->pcma transcoding');
                for (let i = 0; i < buf.length; i++)
                    buf[i] = this.g711.alaw2ulaw(buf.readInt8(i));
            }
        }
        return buf;
    }
    // ******************** Оставовка проигрывания ********************    
    stopPlay() {
        this.stop_flag = true;
    }
    // ******************** Запись данных ********************    
    startPlayFile() {
        if (this.rtp_packet) {
            this.emit('startPlayFile');
        }
    }
}
exports.Player = Player;
