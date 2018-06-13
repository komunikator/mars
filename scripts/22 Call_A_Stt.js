exports.src = {
    mediaStream: true,
    mark: {
        1: {
            mark: 'абонент_не_найден',
            ttsPlay: { text: 'К сожалению, абонент не доступен', next: { hangUp: true } }
        },
        2: {
            mark: 'вызов',
            play: { audioBuffer: function (self) { return self.requestRes.sessionID }, streaming: true }
        },
        3: {
            mark: 'Начало',
            ttsPlay: {
                text: 'Произнесите номер абонента',
                next: {
                    on: {
                        'opt': { seq: true, endSeq: '#', model: 'numbers', textFilter: '(\\d+)' },
                        '\\*': { goto: 'Начало' },
                        '^\\d+$': {
                            dtmfData: {
                                next: {
                                    play: {
                                        file: 'media/moh.wav'
                                    },
                                    startScript: {
                                        to: function (self) {
                                            return self.session.dtmfData[0].keys
                                        },
                                        script: '23 Call_B.js',
                                        params: function (self) {
                                            return [self.sessionID]
                                        },
                                        next: {
                                            goto: function (self) {
                                                self.session.rec({ stt_detect: false });
                                                return self.requestRes.event == 'answered' ? 'вызов' : 'абонент_не_найден'
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    wait: {
                        time: 20,
                        next: {
                            goto: 'Начало'
                        }
                    }
                }
            }
        }
    },
    goto: 'Начало'
}