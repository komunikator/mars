exports.src = function(self) {
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

    self.bus.on('playBuffer', (data) => {
        // console.log(typeof data);

        let buffer = new Buffer( convertoUlawToPcm16(data.data) );
        speaker.write(buffer);
    });
    self.session.rec({media_stream: true});
}