exports.src = {
    mediaStream: true,
    startScript: {
        to: function (self) { return 3 },
        script: '23 Call_B.js',
        params: function (self) { return [self.sessionID] },
        next: {
            goto: function (self) { return self.requestRes.event == 'answered' ? 'вызов' : 'абонент_не_найден' }
        }
    },
    mark: {
        1: {
            mark: 'абонент_не_найден',
            ttsPlay: { text: 'К сожалению, абонент не доступен', next: { hangUp: true } }
        },
        2: {
            mark: 'вызов',
            play: { audioBuffer: function (self) { return self.requestRes.sessionID }, streaming: true }
        }
    }
}
