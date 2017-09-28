var rtp = require("dgram").createSocket('udp4'),
    fs = require('fs'),
    stun = require('vs-stun'),
    rtp_packet, stt,
    stop_flag = true,
    stream_on,
    rec_start,
    rec_type,
    audio_stream_in,
    audio_stream_out,
    streaming,
    isBufferReceived,
    sessionID;

var bufferSize = 320, //8*30 //30 ms
    audioPayload = 0, //RFC3551//PCMU,
    fileCodec,
    wavDataOffset = 58,
    Buffer = require('buffer').Buffer,
    RtpPacket = require('./rtppacket').RtpPacket;

audioBuffers = {};

process.on('disconnect', function() {
    console.log('parent exited')
    process.exit();
});

process.on('uncaughtException', function(e) {
    process.send('pid:' + process.pid + ': ' + e);
});

process.on('error', function(e) {
    process.send('pid:' + process.pid + ': ' + e);
});

process.on('message', function(data) {
    //    console.log(data);
    if (data) {

        var params = data.params;

        if (data.action === 'audioBuffer' && params.sessionID && params.data.length) {
            if (streaming){
                bufferSize = params.data.length;
                //process.send(params.sessionID + ':' + params.data.length);
                audioBuffers[params.sessionID] = new Buffer(params.data);
            } else {
                audioBuffers[params.sessionID] = audioBuffers[params.sessionID] || new Buffer(0);
                audioBuffers[params.sessionID] = Buffer.concat([audioBuffers[params.sessionID], new Buffer(params.data)]);
            };
		
            isBufferReceived = true;
            //params.data = audioBuffers[params.sessionID];
            //process.send(data);
            return;
        }

        if (data.action === 'rtpInPort') {
            if (params && params.audioCodec === 'PCMA')
                audioPayload = 8;
            rtp.bind(0, function() {
                var rtpIn = { port: rtp.address().port };
                if (params && params.publicIP && params.stunServer) {
                    rtpIn.host = params.publicIP;
                    //bus.emit('message', {category: 'call', sessionID: sessionID, type: 'debug', msg: 'STUN request to STUN server ' + stunServer.host + ':' + stunServer.port});
                    stun.resolve(rtp, params.stunServer, function(err, value) {
                        if (value && value.public) {
                            //bus.emit('message', {category: 'call', sessionID: sessionID, type: 'debug', msg: 'Resolved RTP external IP:port (' + value.public.host + ':' + value.public.port + ')'});
                            rtpIn = value.public
                        };
                        // else
                        //bus.emit('message', {category: 'call', sessionID: sessionID, type: 'error', msg: 'STUN request to STUN server ' + stunServer.host + ':' + stunServer.port + ' has timed out. ' + value.type});

                        process.send({ action: data.action, params: rtpIn });
                    }, { count: 1, timeout: 100 });
                } else
                    process.send({ action: data.action, params: rtpIn });
            })
            return;
        }

        if (data.action === 'init') {
            sessionID = params.sessionID;
            init(params, function() {
                data.action = 'stop';
                process.send(data);
            });
            process.send(data);
            return;
        }

        if (data.action === 'close')
            close();

        if (data.action === 'stop_play')
            stop_flag = true;

        if ((data.action === 'start_play') && params && (params.file || params.audioBuffer)) {
            if (params.file) {
                var files = params.file.split(";");
                files.forEach(function(f) {
                    // var f_ = f.slice(0, -4) + audioPostfix + '.wav';
                    // if (fs.existsSync(f_))
                    //     f = f_;
                    if (!fs.existsSync(f)) {
                        data.error = 'File not exists';
                        process.send(data);
                        return;
                    } else
                    //TODO 
                    //USE require('wav')!!!
                    if (!require('./wav').checkFormat(f, [6, 7])) { //6-pcma,7pcmu
                        data.error = 'Invalid File Format "' + f + '"';
                        process.send(data);
                        return;
                    }
                });
            }
            if (data.error)
                return;
            toDo = function() {
                process.send(data);
                start_play(params, function(resetFlag) {
                    if (!resetFlag) {
                        data.action = 'stop_play';
                        process.send(data);
                        stop_flag = true;
                    } else {
                        data.action = 'reset_play';
                        process.send(data);
                    }

                });
            };
            if (stop_flag === false) {
                stop_flag = true;
                setTimeout(toDo, 50);
            } else
                toDo();
            return;
        }

        if (data.action === 'rec' && (params)) {
            process.send(data);
            rec(params);
            return;
        }
    }
});

var g711 = new(require('./G711').G711)();
var wav = require('wav');

init = function(params, cb) {
    function buf2array(buf) {
        var data = [];
        for (var i = 0; i < buf.length; i++) {
            if (audioPayload)
                data.push(g711.alaw2linear(buf.readInt8(i)));
            else
                data.push(g711.ulaw2linear(buf.readInt8(i)));
            //fs.appendFile("data.dat",el+"\n");
        }
        return data;
    }

    function dtmf_data(pkt) {
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
            //event: pkt[0],
            event: key,
            //e: (pkt[1] & 0x01),
            //r: (pkt[1]>>> 1 & 0x01),
            volume: (pkt[1] >>> 2),
            duration: (pkt[2] << 8 | pkt[3])
        };
    }

    function rtp_data(pkt) {
        /*V = (bufpkt[0] >>> 6 & 0x03);
         P = (bufpkt[0] >>> 5 & 0x01);
         X = (bufpkt[0] >>> 4 & 0x01);
         CC = (bufpkt[0] & 0x0F);
         M = (bufpkt[1] >>> 7 & 0x01);
         PT = (bufpkt[1] & 0x7F);
         SN = (bufpkt[2] << 8 | bufpkt[3]);
         TS = (bufpkt[4] << 24 | bufpkt[5] << 16 | bufpkt[6] << 8 | bufpkt[7]);
         SSRC = (bufpkt[8] << 24 | bufpkt[9] << 16 | bufpkt[10] << 8 | bufpkt[11]);*/
        // bufpkt[12..bufpkg.length-1] == payload data
        return {
            type: (pkt[1] & 0x7F),
            seq: (pkt[2] << 8 | pkt[3]),
            time: (pkt[4] << 24 | pkt[5] << 16 | pkt[6] << 8 | pkt[7]),
            source: pkt.slice(12, pkt.length)
        };
    }
    var dtmf_decoder = require('./dtmfDecoder'),
        //audio_stream,
        dtmf_mode,
        prev_dtmf_dur = 0,
        change_flag,
        stream_on;

    stt = require('./sttMethods');

    rtp.params = params;

    rtp.on("message", function(msg, rinfo) {
        if (!stream_on) {
            process.send({
                action: 'stream_on',
                params: {
                    port: rtp.address().port,
                    rinfo: rinfo
                }
            });
            stream_on = true;
        }
        var params = rtp.params.in;

        if (!params.dtmf_detect && !params.stt_detect && !params.file && !params.media_stream)
            return;
        if (rec_type != params.rec) { //it change
            rec_type = params.rec;
            if (rec_type == false) {
                if (audio_stream_in)
                    audio_stream_in.end();
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
                if (dtmf_mode === 'inband') //auto change dtmf mode
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
        } else
        /*if (msg.length == (bufferSize + 12)) */
        if (data.type == audioPayload) {
            if (params.media_stream) {
                if (!payload)
                    payload = buf2array(data.source);
                process.send({
                    action: 'mediaStream',
                    params: {
                        sessionID: sessionID,
                        data: Array.from(new Uint8Array(data.source)) // for webkit - data.source
                    }
                });
            }
            if (params.rec && params.file) {
                if (!audio_stream_in) {
                    audio_stream_in = new wav.FileWriter(params.file + '.in', {
                        format: audioPayload ? 6 : 7, //7 pcmu, 6 pcma
                        channels: 1,
                        sampleRate: 8000,
                        bitDepth: 8
                    });
                    audio_stream_out = new wav.FileWriter(params.file + '.out', {
                        format: audioPayload ? 6 : 7, //7 pcmu, 6 pcma
                        channels: 1,
                        sampleRate: 8000,
                        bitDepth: 8
                    });

                    audio_stream_in.on("finish", function() {
                        process.send({
                            action: 'recOff',
                            params: {
                                file: params.file
                            }
                        });
                    });
                    rec_start = process.hrtime(); //время старта входящего потока
                }
                if (!audio_stream_in.ending)
                    audio_stream_in.write(data.source);
            }
            var payload;
            if (params.stt_detect) {
                var options = params.options && params.options.options;
                if (options) {
                    if (!stt.isReady()) {
                        if (!stt.isConnecting()) {
                            process.send({ action: 'start_stt', params: options });
                            stt.init(options,
                                function(error, params) {
                                    //console.log(error, params);
                                    var res = {
                                        action: 'sttInit'
                                    };
                                    if (error)
                                        res.error = error;
                                    else {
                                        res.params = params;
                                    }
                                    process.send(res);
                                    //console.log(res);
                                });
                        }
                    } else {
                        payload = buf2array(data.source);
                        stt.send(payload);
                    }
                }

            };
            if (params.dtmf_detect) {
                if (dtmf_mode !== 'rfc2833') {
                    if (!payload)
                        payload = buf2array(data.source);
                    dtmf_decoder.filter(payload, function(c) {
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
                            last_key = c.key;
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
    });

    rtp.on("close", function() {
        var f = function() {
            function toDo() {
                if (cb)
                    cb();
                process.nextTick(process.exit());
            };
            var recFile = rtp.params.in.file;

            if (fs.existsSync(recFile + '.in') &&
                fs.existsSync(recFile + '.out')) {
                var spawn = require('child_process').spawn,
                    //микшируем записи входящего и исходящего потока
                    // -m: все в один моно файл
                    // -M: стерео файл, левый канал - входящий поток, правый - исходящий 
                    sox = spawn('sox', [rtp.params.in.type || '-m', recFile + '.in', recFile + '.out', recFile]);
                sox.on('error', function(e) {
                    process.send('pid:' + process.pid + ': ' + e.toString());
                    toDo();
                });
                sox.stdout.on('finish', function() {
                    fs.unlinkSync(recFile + '.in');
                    fs.unlinkSync(recFile + '.out');
                    toDo();
                });
            } else
                toDo();
        };
        if (audio_stream_in) {
            audio_stream_in.on("finish", function() {
                if (audio_stream_out) {
                    audio_stream_out.on("finish", f);
                    audio_stream_out.end();
                    audio_stream_out.ending = true;
                } else
                    f();
            });
            audio_stream_in.end();
        } else
            f();
    });

    rtp_packet = new RtpPacket(new Buffer(1)); //send empty packet
    rtp_packet.time += 1;
    rtp_packet.seq++;
    rtp.send(rtp_packet.packet, 0, rtp_packet.packet.length, rtp.params.out.port, rtp.params.out.ip);
};

close = function() {
    if (rtp) {
        stop_flag = true;
        rtp.close();
    }
};

function transcoding(buf) {
    if (fileCodec === 7 //pcmu 
        &&
        audioPayload === 8) //pcma  
    //u->a transcoding
    {
        //process.send('pid:' + process.pid + ': pcmu->pcma transcoding');
        for (var i = 0; i < buf.length; i++)
            buf[i] = g711.ulaw2alaw(buf.readInt8(i));
    } else
    if (fileCodec === 6 //pcma 
        &&
        audioPayload === 0) //pcmu  
    //a->u transcoding
    {
        //process.send('pid:' + process.pid + ': pcmu->pcma transcoding');
        for (var i = 0; i < buf.length; i++)
            buf[i] = g711.alaw2ulaw(buf.readInt8(i));
    }
    return buf;
}

start_play = function(params, cb) {
    if (params.file) {
        var files = params.file.split(";");
        params.file = files.shift();
    }

    streaming = params.streaming;

    var f = function() {
        if (rtp.params.in.rec &&
            rtp.params.in.file &&
            audio_stream_out &&
            rtp_packet) {

            var rec_end = process.hrtime(rec_start),
                streamTimeout = rec_end[0] * 1000 + rec_end[1] / 1000000;

            var silenceLen = (streamTimeout - (bufferSize / 8)).toFixed(); //ms

            if (silenceLen > (bufferSize / 8)) { //прошло больше времени размера пакета
                var silenceBuf = new Buffer(silenceLen * 8);
                silenceBuf.fill(audioPayload ? 213 : 127); //тишина 127 - pcmu, 213 - pcma
                if (!audio_stream_out.ending) {
                    audio_stream_out.write(silenceBuf);
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
                contents = fs.readFileSync(params.file);
                fileCodec = contents.readUInt16LE(20);
                contents = new Buffer(contents.slice(wavDataOffset, contents.length - 1));
            } catch (e_) {
                console.log(e_);
                return;
            };
        stop_flag = false;
        if (!rtp)
            return;
        var writeInterval = bufferSize / 8; //20, //20;//ms
        process.send({ action: 'audioBuffer', params: { data: [bytesRead] } });
        writeData = function() {
            if (rtp.params.in.rec &&
                rtp.params.in.file &&
                audio_stream_out &&
                rtp_packet && bytesRead) {
                if (!audio_stream_out.ending) {
                    var _buf = new Buffer(buf.length);
                    rtp_packet.packet.copy(_buf, 0, 12);
                    audio_stream_out.write(_buf);
                }
                rec_start = process.hrtime();
            }

            bytesRead = 0;
            buf.fill(audioPayload ? 213 : 127); //пакет заполняем тишиной );//тишина 127 - pcmu, 213 - pcma

            if (params.file && (buf.length * i < contents.length)) {
                bytesRead = buf.length * (i + 1) > contents.length ?
                    buf.length * (i + 1) - contents.length : buf.length;
                contents.copy(buf, 0, buf.length * i, buf.length * i + bytesRead);
            }
            buf = transcoding(buf);

            //if (audioBuffers[params.audioBuffer])
            //    process.send({action: 'audioBuffer', params: {data: audioBuffers[params.audioBuffer]}});

            if (params.audioBuffer &&
                audioBuffers[params.audioBuffer] &&
                audioBuffers[params.audioBuffer].length > 0
                //	&& (!params.streaming || params.streaming && audioBuffers[params.audioBuffer].length >= 2 * buf.length)/*buf.length*/
            ) {
                var bufferData = audioBuffers[params.audioBuffer].slice(0, buf.length);
                buf = new Buffer(bufferData);
                bytesRead = bufferData.length;
                //
                //process.send(audioBuffers[params.audioBuffer].length + ':' + bytesRead);
                //
                if (bytesRead < bufferSize)
                    audioBuffers[params.audioBuffer] = new Buffer(0);
                else
                    audioBuffers[params.audioBuffer] = audioBuffers[params.audioBuffer].slice(-1 * (audioBuffers[params.audioBuffer].length - bytesRead));
            }

            if (!stop_flag && (bytesRead > 0 || params.streaming)) {
                if (!rtp_packet)
                    rtp_packet = new RtpPacket(buf);
                else
                    rtp_packet.payload = buf;
                rtp_packet.type = audioPayload;
                rtp_packet.time += buf.length;
                rtp_packet.seq++;

                if (!start)
                    start = Date.now();
                i++;

                function tFn() {
                    var timeOut = start + writeInterval * i;
                    var t_ = timeOut - Date.now();
                    if (params.streaming) {
                        if (isBufferReceived)
                            t_ = 0;
                        else
                            t_ = 1;
                    }
                    if (t_ > 0)
                        setTimeout(tFn, 0);
                    else {
                        isBufferReceived = false;
                        //if (t_)
                        //    console.log('delay', t_);
                        if (writeInterval + t_ < 0)
                            writeData(); //skip packet
                        else {
                            if (bytesRead) {
                                // process.send('Отправка данных rtp: ');
                                rtp.send(rtp_packet.packet, 0, rtp_packet.packet.length, rtp.params.out.port, rtp.params.out.ip, writeData);
                            } else {
                                writeData();
                            }
                        }
                    }
                }
                tFn();

            } else {
                if (!stop_flag && files && files.length) {
                    params.file = files.shift();
                    f();
                } else {
                    //
                    if (!stop_flag && params.streaming)
                        setTimeout(writeData, 0);
                    else
                    //
                        cb(stop_flag);
                    // dgram module automatically listens on the port even if we only wanted to send... -_-
                }
            }
        };
        buf = new Buffer(bufferSize);
        writeData();
    };
    f();
};

var lastSttOpt;
rec = function(params) {
    if (!rtp)
        return;
    for (var key in params)
        rtp.params.in[key] = params[key];

    if (params.stt_detect) {
        if (JSON.stringify(params) != JSON.stringify(lastSttOpt) &&
            stt && stt.isReady())
            stt.stop();
        lastSttOpt = params;
    }
};