exports.src = function (self) {
    let sID = self.session.sessionID;

    // ******************* Получаем данные с микрофона *******************
    var Mic = require('node-microphone');
    var mic = new Mic({
        bitDepth: 16,
        rate: 8000,
        device: 'plughw:2,0',
        encoding: 'signed-integer',
        endian: 'little'
    });

    var micStream = mic.startRecording();

    var events = require('events');
    var stream = new events.EventEmitter();

    micStream.on('data', function (data) {
        function convertPcm2ulaw(data) {
            let ulawFact = { fileSize: data.length / 2 };
            let ulawData;
            let ulawAudio = new Buffer(ulawFact.fileSize),
                i = ulawFact.fileSize;

            while (i > 0) {
                i -= 1;
                ulawAudio[i] = g711.linear2ulaw(data.readInt16LE(i * 2));
            }
            return Array.from(ulawAudio);
        }

        let ulaw = convertPcm2ulaw(data);
        self.session._worker.send({
            action: 'audioBuffer',
            params: {
                // sessionID: self.session._worker.sendAudioBuffer,
                sessionID: self.session.sessionID,
                data: ulaw
            }
        });
        
        // stream.emit('data', ulaw);
        // console.log(ulaw);

        // var micBuffer;
        // for (var sID in dialogs) {
        //     if (activeSession == sID && dialogs[sID]._worker &&
        //         dialogs[sID]._worker.sendAudioBuffer &&
        //         dialogs[sID]._worker.sendAudioBuffer == '<MIC>') {
        //         if (!micBuffer) {
        //             var left = audioEvents.inputBuffer.getChannelData(0);
        //             micBuffer = resamplerObj.resampler(left);
        //             micBuffer = converFloat32ToPcmu(micBuffer);
        //         }
        //         dialogs[sID]._worker.send(
        //             {
        //                 action: 'audioBuffer',
        //                 params: {
        //                     sessionID: dialogs[sID]._worker.sendAudioBuffer,
        //                     data: micBuffer
        //                 }
        //             });
        //     }
        // }
    });

    mic.on('info', (info) => {
        console.log('info: ', String(info));
    });

    mic.on('error', (error) => {
        console.log('error: ', error);
    });
    
    // ******************* Воспроизведение данных *******************
    const Speaker = require('speaker');
    const speaker = new Speaker({
        bitDepth: 16,
        sampleRate: 8000,
        channels: 1,
        signed: true,
    });

    var g711 = new (require('../lib/media/G711.js').G711)();

    function convertoUlawToPcm16(buffer) {
        var l = buffer.length;
        var buf = new Int16Array(l);

        while (l--) {
            buf[l] = g711.ulaw2linear(buffer[l]); //convert to pcmu
        }

        return buf.buffer;
    }

    // ******************* Получаем данные *******************
    self.bus.on('playBuffer', (data) => {
        let buffer = new Buffer(convertoUlawToPcm16(data.data));
        speaker.write(buffer);
    });

    self.session.start_play({audioBuffer: sID, streaming: true});
    self.session.rec({ media_stream: true });
}