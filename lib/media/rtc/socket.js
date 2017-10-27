'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const buffer_1 = require("buffer");

class Socket extends events_1.EventEmitter {
    constructor(params) {
        super();
        this.wrtc = require('node-webrtc');

        this.defer = () => {
            let deferred = {};
            deferred.promise = new Promise((resolve, reject) => {
                deferred.resolve = resolve;
                deferred.reject = reject;
            });
            return deferred;
        }
        this.g711 = new (require('../G711').G711)();

        this.onIceCompleted = this.defer();
        this.onIceCompleted.promise.then(() => {
            console.log('iceGatheringComplete');
            console.log('iceGatheringComplete icecandidates: ', this.rtc.icecandidates);

            // process.send({ action: 'iceGatheringComplete' });

            if (this.iceCheckingTimer) {
                clearTimeout(this.iceCheckingTimer);
                this.iceCheckingTimer = null;
            }

            // process.send('getAnswer ' + this.getAnswer());
            this.emit('getAnswer', { action: 'getAnswer', params: this.getAnswer() } ); 
        })
        .catch((err) => {
            console.error('onIceCompleted Error: ', err);
        });

        this.initRtc();
        this.setRemoteSdp(params.offer);

        this.on('close', () => {
            this.close();
        });

        this.on('addBuffer', (buffer) => {
            this.send(buffer);
        });
    }

    // ******************** Init RTC ********************
    initRtc() {
        console.log('initRtc');

        let servers = {'iceServers':[{'urls':'stun:stun.iptel.org'}]};

        this.rtc = new this.wrtc.RTCPeerConnection(servers);
        this.rtc.onicecandidate = e => this.onIceCandidate(e);
        this.rtc.onicegatheringstatechange = () => this.onIceGatheringStateChange;
        this.rtc.oniceconnectionstatechange = () => this.onIceConnectionStateChange;
        this.rtc.onstatechange = (state) => this.onStateChange(state);
        this.channelOpen = 0;
    }

    onIceCandidate(e) {
        console.log('onIceCandidate', e);

        // process.send({ action: 'iceCandidate',  params: { iceCandidate: e } });

        if (e.candidate) {
            console.log('ICE candidate received: ' + (e.candidate.candidate == null ? null : e.candidate.candidate.trim()));

            this.rtc.icecandidates = this.rtc.icecandidates || [];
            this.rtc.icecandidates.push(e);
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

        try {
            remoteSdp = JSON.parse(remoteSdp);
        } catch(err) {
            return console.error('rtc.js setRemoteSdp JSON.parse error: ', err);
        }

        function handleError(error) {
            console.error('setRemoteSdp handleError: ', error);
            throw error;
        }

        let setIceCandidate = () => {
            console.log('setRemoteSdp icecandidates: ', remoteSdp.icecandidates);

            if ( (remoteSdp.icecandidates)
                && Array.isArray(remoteSdp.icecandidates) ) {

                let iceCandidates = remoteSdp.icecandidates;

                iceCandidates.forEach((item) => {
                    if (item.candidate) {
                        console.log('setRemoteSdp set icecandidates: ', item.candidate);
                        this.rtc.addIceCandidate(item.candidate);
                    }
                });
            }

            // process.send('setIceCandidate');

            this.listenDataChannel();
            this.createAnswer();
        };

        let wait = () => {
            console.log('wait');
            // process.send('wait');
            setIceCandidate();
            // process.send({ action: 'setRemoteSdp', params: { sessionID: this.sessionID } });

            let stateEvent = 'iceConnectionConnected';
            // process.send({ action: stateEvent });
        }

        this.rtc.setRemoteDescription(
            new this.wrtc.RTCSessionDescription(remoteSdp),
            wait,
            handleError
        );
    }

    listenDataChannel() {
        let buf2array = (buf) => {
            var data = [];
            for (var i = 0; i < buf.length/2; i++) {
                // process.send('buf.length: ' + buf.length + ' i: ' + i);

                data.push(buf.readInt16LE(2*i));
            }
            return data;
        };

        this.rtc.ondatachannel = (event) => {
            this.dataChannel = event.channel;

            this.dataChannel.onopen = () => {
                this.channelOpen = 1;

                // process.send({ action: 'stream_on' });
                this.emit('event', { action: 'stream_on' });

                this.dataChannel.onmessage = (event) => {
                    let data = new Buffer(event.data);
                    // this.emit('dataChannel', { action: 'dataChannel', params: { data: data } } ); 
                    // process.send({ action: 'dataChannel', params: { data: data } });
                    let payload = buf2array(data);
                    this.emit('stt', payload);
                }
                this.dataChannel.onclose = () => {
                    this.channelOpen = 0;

                    var currentdate = new Date();
                    var datetime = currentdate.getHours() + ":" + currentdate.getMinutes() + ":" + currentdate.getSeconds();

                    this.emit('event', 'Close RTC Channel ' + datetime);

                    // process.send('close!!!!!!!!!!!!!!!!!!');
                    this.emit('event', { action: 'close' });

                    process.nextTick(process.exit());
                }
                // this.dataChannel.send(new Buffer('ping MARS'));
            }
        }
        // process.send({ action: 'listenDataChannel' });
    }

    close() {
        if (this.dataChannel && this.dataChannel.close) {
            this.dataChannel.close();
        }
    }

    createAnswer() {
        console.log('createAnswer');

        let handleError = (error) => {
            console.error('createAnswer error: ', error);
            throw error;
        }

        let rtcAnswer = (answerSdp) => {
            console.log('rtcAnswer answer: ', answerSdp);
            this.rtc.answerSdp = answerSdp;

            // process.send({ action: 'createAnswer', params: { 'answerSdp': answerSdp } });

            this.setLocalDescription();
        }

        this.rtc.createAnswer(rtcAnswer, handleError);
    }

    setLocalDescription() {
        console.log('setLocalDescription');

        let handleError = (error) => {
            console.error('setLocalDescription error: ', error);
            throw error;
        }

        this.rtc.setLocalDescription(
            new this.wrtc.RTCSessionDescription(this.rtc.answerSdp),
            () => {
                console.log('success setLocalDescription: ', this.rtc.answerSdp);
            },
            handleError
        );
    }

    getAnswer() {
        let sdp = this.rtc.answerSdp;

        let iceCandidate = [];

        this.rtc.icecandidates.forEach(function(item) {
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

    send(buffer) {
        if (this.channelOpen) {
            this.dataChannel.send(buffer);
        }
    }
}
exports.Socket = Socket;