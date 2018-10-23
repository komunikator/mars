'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const buffer_1 = require("buffer");

class Socket extends events_1.EventEmitter {
    constructor(params) {
        super();
        this.sessionID = params.sessionID;
        this.direction = params.direction;
        this.wrtc = require('wrtc');
        var RTCPeerConnection = this.wrtc.RTCPeerConnection;
        var RTCSessionDescription = this.wrtc.RTCSessionDescription

        this.defer = () => {
            let deferred = {};
            deferred.promise = new Promise((resolve, reject) => {
                deferred.resolve = resolve;
                deferred.reject = reject;
            });
            return deferred;
        }
        this.g711 = new (require('../G711').G711)();
        this.stream_on;

        this.onIceCompleted = this.defer();
        this.onIceCompleted.promise.then(() => {
            console.log('iceGatheringComplete');
            console.log('iceGatheringComplete icecandidates: ', this.pc.icecandidates);

            // process.send({ action: 'iceGatheringComplete' });

            if (this.iceCheckingTimer) {
                clearTimeout(this.iceCheckingTimer);
                this.iceCheckingTimer = null;
            }

            // process.send('getAnswer ' + this.getAnswer());
            this.emit('getSdp', { action: 'getSdp', params: this.getSdp() });
        })
            .catch((err) => {
                console.error('onIceCompleted Error: ', err);
            });

        this.initRtc();

        if (this.direction == "outgoing") {
            this.createOffer();

        } else {
            this.setRemoteSdp(params.offer);
        }

        this.on('close', () => {
            this.close();
        });

        this.on('answer', (data) => {
            this.setRemoteSdp(data);
        });

        this.on('addBuffer', (buffer) => {
            this.send(buffer);
        });

        this.on('rec', (params) => {
            this.rec(params);
        });
    }

    // ******************** Init RTC ********************
    initRtc() {
        console.log('initRtc');
        var pc;
        var servers = {
            iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }]
        }
        this.pc = new this.wrtc.RTCPeerConnection(servers);
        this.pc.onicecandidate = e => this.onIceCandidate(e);
        this.pc.onicegatheringstatechange = () => this.onIceGatheringStateChange();
        this.pc.oniceconnectionstatechange = () => this.onIceConnectionStateChange();
        this.pc.onstatechange = (state) => this.onStateChange(state);
        this.pc.icecandidates = [];
        this.pc.in = {};

        this.channelOpen = 0;

        this.dataChannel = this.pc.createDataChannel('text');
    }

    createOffer() {
        this.pc.createOffer().then(function (e) {
            this.pc.sdp = e;
            // this.emit('message', e);
            this.pc.setLocalDescription(new this.wrtc.RTCSessionDescription(e));
            // this.dataChannel = this.pc.createDataChannel('text');
            this.listenDataChannel();
        }.bind(this));
    }

    onIceCandidate(e) {
        console.log('onIceCandidate', e);
        if (e.candidate) {
            console.log('ICE candidate received: ' + (e.candidate.candidate == null ? null : e.candidate.candidate.trim()));
            this.pc.icecandidates = this.pc.icecandidates || [];
            this.pc.icecandidates.push(e);
            this.startIceCheckingTimer();
        } else {
            console.log('onIceCandidate resolve');

            this.onIceCompleted.resolve();
        }
    }

    startIceCheckingTimer() {
        console.log('startIceCheckingTimer');

        if (!this.iceCheckingTimer) {
            let time = 5000;
            this.iceCheckingTimer = setTimeout(() => {
                console.log('RTCIceChecking Timeout Triggered after ' + time + ' milliseconds');
                console.log('startIceCheckingTimer resolve');
                this.onIceCompleted.resolve();
            }, time);
        }
    }

    onIceGatheringStateChange() {
        console.log('onIceGatheringStateChange changed: ' + this.iceGatheringState);

        if (this.iceGatheringState === 'gathering') {
            // process.send({ action: 'iceGathering' });
        }
        if (this.iceGatheringState === 'complete') {
            this.onIceCompleted.resolve(this);
        }
    }

    onIceConnectionStateChange() {
        console.log('onIceConnectionStateChange changed: ' + this.iceGatheringState);

        let stateEvent;

        if (this.iceConnectionState === 'checking') {
            console.log('onIceConnectionStateChange this: ', this);
            this.startIceCheckingTimer();
        }

        switch (this.iceConnectionState) {
            case 'new':
                stateEvent = 'iceConnection';
                break;
            case 'checking':
                stateEvent = 'iceConnectionChecking';
                break;
            case 'connected':
                stateEvent = 'iceConnectionConnected';
                break;
            case 'completed':
                stateEvent = 'iceConnectionCompleted';
                break;
            case 'failed':
                stateEvent = 'iceConnectionFailed';
                break;
            case 'disconnected':
                stateEvent = 'iceConnectionDisconnected';
                break;
            case 'closed':
                stateEvent = 'iceConnectionClosed';
                break;
            default:
                console.warn('Unknown iceConnection state:', this.iceConnectionState);
                return;
        }
        console.log(stateEvent);
        // process.send({ action: stateEvent });
    }

    onStateChange(state) {
        console.log('onStateChange ', state);
    }

    // ******************** Remote SDP ********************
    setRemoteSdp(remoteSdp) {
        console.log('setRemoteSdp: ', remoteSdp);

        if (remoteSdp.action == "answer") {
            remoteSdp = remoteSdp.data;
        }

        try {
            remoteSdp = JSON.parse(remoteSdp);
        } catch (err) {
            return console.error('rtc.js setRemoteSdp JSON.parse error: ', err);
        }

        function handleError(error) {
            console.error('setRemoteSdp handleError: ', error);
            throw error;
        }

        let setIceCandidate = () => {
            console.log('setRemoteSdp icecandidates: ', remoteSdp.icecandidates);

            if ((remoteSdp.icecandidates)
                && Array.isArray(remoteSdp.icecandidates)) {

                let iceCandidates = remoteSdp.icecandidates;

                iceCandidates.forEach((item) => {
                    if (item.candidate) {
                        console.log('setRemoteSdp set icecandidates: ', item.candidate);
                        this.pc.addIceCandidate(item.candidate);
                    }
                });
            }

            // process.send('setIceCandidate');

            this.listenDataChannel();
            if (this.direction == "incoming") {
                this.createAnswer();
            };
        };

        let wait = () => {
            setIceCandidate();
            // process.send({ action: 'setRemoteSdp', params: { sessionID: this.sessionID } });

            let stateEvent = 'iceConnectionConnected';
            // process.send({ action: stateEvent });
        }

        this.pc.setRemoteDescription(
            new this.wrtc.RTCSessionDescription(remoteSdp),
            wait,
            handleError
        );
    }

    listenDataChannel() {
        // let buf2array = (buf) => {
        //     var data = [];
        //     for (var i = 0; i < buf.length / 2; i++) {
        //         // process.send('buf.length: ' + buf.length + ' i: ' + i);

        //         data.push(buf.readInt16LE(2 * i));
        //     }
        //     return data;
        // };

        // let buf2array = (buf) => {
        //     var data = [];
        //     for (var i = 0; i < buf.length; i++) {
        //         if (this.audioPayload)
        //             data.push(this.g711.alaw2linear(buf.readInt8(i)));
        //         else
        //             data.push(this.g711.ulaw2linear(buf.readInt8(i)));
        //     }
        //     return data;
        // };

        let buf2array = (buf) => {
            var data = [];
            for (var i = 0; i < buf.length; i++) {
                if (this.audioPayload)
                    data.push(this.g711.alaw2linear(buf.readInt8(i)));
                else
                    data.push(this.g711.ulaw2linear(buf.readInt8(i)));
            }
            return data;
        };

        let rtp_data = (pkt) => {
            return {
                type: (pkt[1] & 0x7F),
                seq: (pkt[2] << 8 | pkt[3]),
                time: (pkt[4] << 24 | pkt[5] << 16 | pkt[6] << 8 | pkt[7]),
                source: pkt.slice(12, pkt.length)
            };
        };
        let addHandlersChannel = () => {
            this.dataChannel.onopen = () => {
                this.channelOpen = 1;
                this.dataChannel.onmessage = (event) => {
                    if (!this.stream_on) {
                        this.stream_on = true;
                        this.emit('event', { action: 'stream_on' });
                    }

                    var params = this.pc.in;
                    if (!params.dtmf_detect && !params.stt_detect && !params.file && !params.media_stream)
                        return;

                    let data = new Buffer(event.data);

                    // data = rtp_data(data);

                    if (params.media_stream) {
                        this.emit('event', {
                            action: 'mediaStream',
                            params: {
                                sessionID: this.sessionID,
                                data: Array.from(new Uint8Array(data)) // for webkit - data.source
                            }
                        });
                    }
                    if (params.rec && params.file) {
                        // Запись входящего потока
                        let bufferIn = new Buffer(data.length);
                        // data.copy(bufferIn);

                        // let buf = new Int8Array(data.length);

                        // let counter = 0;

                        // for (let i = 0; i < bufferIn.length; i++) {
                            // let buf16 = bufferIn.readInt16LE(i * 2);
                            // buf[counter] = this.g711.linear2ulaw(buf16);
                            // buf[counter] = this.g711.linear2ulaw(buf16);
                            // counter++;
                        // }
                        // Запись входящего потока

                        this.emit('writeDataIn', new Buffer(data));
                    }
                    let payload = buf2array(data);
                    if (params.stt_detect) {
                        this.emit('stt', payload);
                    }
                    this.emit('payload', payload);
                }

                this.dataChannel.onclose = () => {
                    this.channelOpen = 0;

                    var currentdate = new Date();
                    var datetime = currentdate.getHours() + ":" + currentdate.getMinutes() + ":" + currentdate.getSeconds();

                    // this.emit('event', 'Close RTC Channel ' + datetime);

                    //this.emit('event', { action: 'close' });
                    this.emit('close');
                }
            }
        }
        if (this.direction == "incoming") {
            this.pc.ondatachannel = (event) => {
                this.dataChannel = event.channel;
                addHandlersChannel();
            }
        } else {
            addHandlersChannel();
        }
    }

    close() {
        if (this.dataChannel && this.dataChannel.close) {
            this.dataChannel.close();
        }
    }

    createAnswer() {
        let handleError = (error) => {
            console.error('createAnswer error: ', error);
            throw error;
        }

        let rtcAnswer = (answerSdp) => {

            console.log('rtcAnswer answer: ', answerSdp);
            this.pc.sdp = answerSdp;

            // process.send({ action: 'createAnswer', params: { 'answerSdp': answerSdp } });

            this.setLocalDescription();
        }


        this.pc.createAnswer(rtcAnswer, handleError);
    }

    setLocalDescription() {
        console.log('setLocalDescription');

        let handleError = (error) => {
            console.error('setLocalDescription error: ', error);
            throw error;
        }
        this.pc.setLocalDescription(
            new this.wrtc.RTCSessionDescription(this.pc.sdp),
            () => {
                console.log('success setLocalDescription: ', this.pc.sdp);
            },
            handleError
        );
    }

    getAnswer() {
    
        let sdp = this.pc.answerSdp;
        let iceCandidate = [];

        this.pc.icecandidates.forEach(function (item) {
            if (item && item['candidate'] && item['candidate']['candidate']) {
                iceCandidate.push({
                    candidate: item['candidate']
                });
            } else {
                iceCandidate.push(item);
            }
        });
        sdp["icecandidates"] = iceCandidate;

        // Создание клона объекта sdp из за некорректной сериализации объекта sdp
        let cloneSdp = {
            'sdp': sdp['sdp'],
            'icecandidates': sdp['icecandidates'],
            'type': sdp['type']
        }

        let answerSdp = JSON.stringify(cloneSdp);

        return answerSdp;
    }

    getOffer() {
        let sdp = this.pc.offerSdp;

        let iceCandidate = [];

        this.pc.icecandidates.forEach(function (item) {
            if (item && item['candidate'] && item['candidate']['candidate']) {
                iceCandidate.push({
                    candidate: item['candidate']
                });
            } else {
                iceCandidate.push(item);
            }
        });
        sdp["icecandidates"] = iceCandidate;

        // Создание клона объекта sdp из за некорректной сериализации объекта sdp
        let cloneSdp = {
            'sdp': sdp['sdp'],
            'icecandidates': sdp['icecandidates'],
            'type': sdp['type']
        }

        let offerSdp = JSON.stringify(cloneSdp);

        return offerSdp;
    }

    getSdp() {

        let sdp = this.pc.sdp;

        let iceCandidate = [];

        this.pc.icecandidates.forEach(function (item) {
            if (item && item['candidate'] && item['candidate']['candidate']) {
                iceCandidate.push({
                    candidate: item['candidate']
                });
            } else {
                iceCandidate.push(item);
            }
        });
        sdp["icecandidates"] = iceCandidate;

        // Создание клона объекта sdp из за некорректной сериализации объекта sdp
        let cloneSdp = {
            'sdp': sdp['sdp'],
            'icecandidates': sdp['icecandidates'],
            'type': sdp['type']
        }
        return JSON.stringify(cloneSdp);
    }

    send(buffer) {
        let rtcBuffer = new Buffer(buffer.length - 12);
        buffer.copy(rtcBuffer, 0, 12);

        if (this.channelOpen) {
            this.dataChannel.send(rtcBuffer);
        }
    }

    // ******************** Установка параметров ********************
    rec(params) {
        for (var key in params) {
            this.pc.in[key] = params[key];
        }
    }
}
exports.Socket = Socket;
