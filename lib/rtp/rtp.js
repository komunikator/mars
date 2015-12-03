var rtp, rtp_packet, stt,
        stop_flag = true,
        stream_on,
        rec_type,
        audio_stream,
        sessionID;
var bufferSize = 320, //8*30 //30 ms
        pcmuPayload = 0, //RFC3551
        wavDataOffset = 58,
        Buffer = require('buffer').Buffer;
audioBuffers = {};

process.on('uncaughtException', function (e) {
    process.send('pid:' + process.pid + ': ' + e);
});

process.on('error', function (e) {
    process.send('pid:' + process.pid + ': ' + e);
});

process.on('message', function (data) {
    //    console.log(data);
    if (data) {
        if (data.action === 'audioBuffer' && data.params.sessionID && data.params.data.length) {
            audioBuffers[data.params.sessionID] = audioBuffers[data.params.sessionID] || new Buffer(0);
            audioBuffers[data.params.sessionID] = Buffer.concat([audioBuffers[data.params.sessionID], new Buffer(data.params.data)]);
            audioBuffers[data.params.sessionID] = audioBuffers[data.params.sessionID].slice(-2 * bufferSize);
            //data.params.data = audioBuffers[data.params.sessionID];
            //process.send(data);
            return;
        }
        if (data.action === 'init') {
            sessionID = data.params.sessionID;
            init(data.params, function () {
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
        if ((data.action === 'start_play') && data.params && (data.params.file || data.params.audioBuffer)) {
            if (data.params.file) {
                var files = data.params.file.split(";");
                files.forEach(function (f) {
                    if (!require('fs').existsSync(f)) {
                        data.error = 'File not exists';
                        process.send(data);
                        return;
                    } else
                    //TODO 
                    //USE require('wav')!!!
                    if (!require('./wav').checkFormat(f)) {
                        data.error = 'Invalid File Format';
                        process.send(data);
                        return;
                    }
                });
            }
            if (data.error)
                return;
            toDo = function () {
                process.send(data);
                start_play(data.params, function (resetFlag) {
                    if (!resetFlag) {
                        data.action = 'stop_play';
                        process.send(data);
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
        if (data.action === 'rec' && (data.params)) {
            process.send(data);
            rec(data.params);
            return;
        }
    }
});

var g711 = new (require('./G711').G711)();
var wav = require('wav');

init = function (params, cb) {
    function buf2array(buf) {
        var data = [];
        for (var i = 0; i < buf.length; i++) {
            data.push(g711.ulaw2linear(buf.readInt8(i)));
            //require('fs').appendFile("data.dat",el+"\n");
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
    var dtmf_decoder = require('./dtmf'),
            //audio_stream,
            dtmf_mode,
            min_dtmf_dur,
            change_flag,
            stream_on;

    rtp = require("dgram").createSocket('udp4');
    stt = require('./stt');

    rtp.bind(params.in.port);
    rtp.params = params;

    rtp.on("message", function (msg, rinfo) {
        var params = rtp.params.in;
        if (!(params.dtmf_detect || params.stt_detect || params.file || params.media_stream))
            return;
        if (rec_type != params.rec) { //it change
            rec_type = params.rec;
            if (rec_type == false) {
                if (audio_stream)
                    audio_stream.end();
                else {
                    process.send({
                        action: 'recOff',
                        params: {},
                        error: 'Record file not found'
                    });
                }
            }
        }
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
                if (min_dtmf_dur === undefined || dtmf.duration <= min_dtmf_dur) {
                    if (!change_flag)
                        process.send({
                            action: 'dtmf_key',
                            params: {
                                key: dtmf.event
                            }
                        });
                    change_flag = false;
                    min_dtmf_dur = dtmf.duration;
                }
            }
        } else
        /*if (msg.length == (bufferSize + 12)) */
        if (data.type == pcmuPayload) {
            if (params.media_stream) {
                if (!payload)
                    payload = buf2array(data.source);
                process.send({
                    action: 'mediaStream',
                    params: {
                        sessionID: sessionID,
                        data: data.source
                    }
                });
            }
            if (params.rec && params.file) {
                if (!audio_stream) {
                    audio_stream = new wav.FileWriter(params.file, {
                        format: 7, //pcmu
                        channels: 1,
                        sampleRate: 8000,
                        bitDepth: 8
                    });
                    audio_stream.on("finish", function () {
                        process.send({
                            action: 'recOff',
                            params: {
                                file: params.file
                            }
                        });
                        //audio_stream.emit('end');
                        //audio_stream = null; //???
                    });
                }
                audio_stream.push(data.source);
            }
            var payload;
            if (params.stt_detect) {
                var options = params.options && params.options.options;
                if (options) {
                    if (!stt.isReady()) {
                        if (!stt.isConnecting()) {
                            process.send({action: 'start_stt', params: options});
                            stt.init(options,
                                    function (error, params) {
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
                    }
                    else {
                        payload = buf2array(data.source);
                        stt.send(payload);
                    }
                }

            }
            ;
            if (params.dtmf_detect) {
                if (dtmf_mode !== 'rfc2833') {
                    if (!payload)
                        payload = buf2array(data.source);
                    dtmf_decoder.filter(payload, function (c) {
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
        }
    });

    rtp.on("close", function () {
        var f = function () {
            if (cb)
                cb();
            process.exit();
        };
        if (audio_stream) {
            audio_stream.on("finish", f);
            audio_stream.end();
        } else
            f();
    });

};

close = function () {
    if (rtp) {
        stop_flag = true;
        rtp.close();
    }
};


start_play = function (params, cb) {
    if (params.file) {
        var files = params.file.split(";");
        params.file = files.shift();
    }

    var f = function () {
        var fs = require('fs');
        if (params.file)
            try {
                fd = fs.openSync(params.file, 'r');
                var headerBuf = new Buffer(wavDataOffset);
                fs.readSync(fd, headerBuf, 0, headerBuf.length);
            } catch (e_) {
                console.log(e_);
                return;
            }
        ;
        stop_flag = false;
        if (!rtp)
            return;
        var writeInterval = bufferSize / 8; //20, //20;//ms
        process.send({action: 'audioBuffer', params: {data: [bytesRead]}});
        var start,
                i = 0,
                RtpPacket = require('./rtppacket').RtpPacket,
                fd,
                buf,
                bytesRead,
                writeData = function () {
                    bytesRead = 0;
                    if (fd && params.file)
                        bytesRead = fs.readSync(fd, buf, 0, buf.length);

                    //if (audioBuffers[params.audioBuffer])
                    //    process.send({action: 'audioBuffer', params: {data: audioBuffers[params.audioBuffer]}});

                    if (params.audioBuffer && audioBuffers[params.audioBuffer] && audioBuffers[params.audioBuffer].length >= buf.length) {
                        var bufferData = audioBuffers[params.audioBuffer].slice(0, buf.length);
                        buf = new Buffer(bufferData);
                        bytesRead = bufferData.length;
                        audioBuffers[params.audioBuffer] = audioBuffers[params.audioBuffer].slice(-1 * (audioBuffers[params.audioBuffer].length - bytesRead));
                    }

                    if (!stop_flag && (bytesRead > 0 || params.always)) {
                        if (!rtp_packet)
                            rtp_packet = new RtpPacket(buf);
                        else
                            rtp_packet.payload = buf;
                        rtp_packet.time += buf.length;
                        rtp_packet.seq++;

                        if (!start)
                            start = Date.now();
                        i++;

                        function tFn() {
                            var timeOut = start + writeInterval * i;
                            var t_ = timeOut - Date.now();
                            if (t_ > 0)
                                setTimeout(tFn, 0);
                            else {
                                //if (t_)
                                //    console.log('delay', t_);
                                if (writeInterval + t_ < 0)
                                    writeData(); //skip packet
                                else {
                                    if (bytesRead)
                                        rtp.send(rtp_packet.packet, 0, rtp_packet.packet.length, rtp.params.out.port, rtp.params.out.ip, writeData);
                                    else
                                        writeData();
                                }
                            }
                        }
                        tFn();

                    } else {
                        if (fd)
                            fs.closeSync(fd);
                        if (!stop_flag && files && files.length) {
                            params.file = files.shift();
                            f();
                        } else
                        {
                            if (!stop_flag && params.audioBuffer)
                                setTimeout(writeData, 0);
                            else
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
rec = function (params) {
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