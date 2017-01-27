exports.src = {
    action: {
        func: function (self) {
            var fileName = 'media/Добро_пожаловать_в демонстрацию_системы_MARS.wav';
            var buffer = new Uint8Array(require('fs').readFileSync(fileName));
		buffer = buffer.slice(58, buffer.length-1);

            self.session._worker.send({
                action: 'audioBuffer',
                params: {
                    sessionID: 'file',
                    data: Array.from(buffer)
                }
            });
            //send buffer again
            self.session._worker.send({
                action: 'audioBuffer',
                params: {
                    sessionID: 'file',
                    data: Array.from(buffer)
                }
            });
            self.cb();
        },
        next: {
            play: {audioBuffer: 'file'}
        }
    }
}