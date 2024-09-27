exports.src = {
    recOn: true,
    mark: {
        1: {
            mark: 'абонент_не_найден',
            ttsPlay: {
                text: 'К сожалению, абонент не доступен',
                next: {
                    hangUp: true
                }
            }
        },
        2: {
            mark: 'вызов',
            mediaStream: true,
            play: { audioBuffer: function (self) { return self.requestRes.sessionID }, streaming: true }
        },
        3: {
            mark: 'перевод_звонка',
            play: { file: 'media/moh.wav' },
            startScript: {
                to: '89297343140',
                // to: '89991459660',
                script: '23 Call_B.js',
                params: function (self) { return [self.session.sessionID] },
                next: {
                    goto: function (self) {
                        console.warn('Перевод звонка NEXT GOTO');
                        return self.requestRes.event == 'answered' ? 'вызов' : 'абонент_не_найден'
                    }
                }
            }
        },
        4: {
            mark: 'начало',
            ttsPlay: {
                text: function (self) {
                    return 'Добрый день ' + self.session.params[1] + '! Это компания Норвик Банк, у нас для вас выгодное предложение, вам интересно послушать?'
                },
                voice: 'zahar',
                next: {
                    sttOn: {
                        opt: { model: 'general', developer_key: '069b6659-984b-4c5f-880e-aaedcfd84102' },
                        keys: {
                            'спасибо|не|ничего|отвечает|аппарат|вызыв|парад|абон|занят|ваш|звонок|был|переадрес|голосов|почт|ящик|можете|оставить|сообщение|после|сигнала': {
                                goto: function (self) {
                                    console.warn('Поймали голосовую почту или отказ mark:началом');
                                    require('request')('https://localhost:7000/records/update/' + self.session.params[0] + 'reject_loan?=true&token=YWRtaW46UWExV3MyRWQzUmY0', function () { });
                                    return 'завершение'
                                }
                            },
                            'да|интересно|нужно': {
                                goto: function (self) {
                                    console.warn('да|интеренсо|нужно перед_переводом');
                                    return 'перед_переводом';
                                }
                            }
                        }
                    },
                    wait: {
                        time: 20,
                        next: {
                            goto: function () {
                                console.warn('Время вышло перед_переводом')
                                return 'перед_переводом'
                            }
                        }
                    }
                }
            }
        },
        5: {
            mark: 'завершение',
            wait: {
                time: 2,
                next: {
                    hangUp: true
                }
            }
        },
        6: {
            mark: 'перед_переводом',
            goto: function (self) {
                require("request")("https://localhost:7000/records/update/" + self.session.params[0] + "?resolve_loan=true&token=YWRtaW46UWExV3MyRWQzUmY0", function () { });

                // ****************** Старт звонка ******************
                var onStartScript = function (data) {
                    if (data && data.params && data.params[0] == self.session.sessionID) {
                        self.session.requestRes = { sessionID: data.sessionID };
                        console.log('Удалили обработчик startScript');
                        self.bus.removeListener('startScript', onStartScript);
                    }
                }

                console.log('Добавили обработчик startScript');
                self.bus.on('startScript', onStartScript);

                // ****************** Окончание звонка ******************
                var _endCall = function (data) {
                    var sip = require("../lib/sip/sip");

                    if (self && self.session && self.session.sessionID && data && data.sessionID) {
                        // Завершение звонка с оператором
                        if (data.sessionID == self.session.sessionID) {
                            console.log('Удалили обработчик callEnded в перед_переводом data.sessionID == self.session.sessionID');
                            self.bus.removeListener('callEnded', _endCall);

                            if (self.session.requestRes && self.session.requestRes.sessionID) {
                                sip.cancel(self.session.requestRes.sessionID);
                                sip.bye(self.session.requestRes.sessionID);
                                return;
                            }

                            if (self && self.requestRes && self.requestRes.sessionID) {
                                sip.cancel(self.requestRes.sessionID);
                                sip.bye(self.requestRes.sessionID)
                                return;
                            }
                        }

                        // Завершение звонка с клиентом
                        if (self.requestRes && self.requestRes.sessionID && (self.requestRes.sessionID == data.sessionID)) {
                            console.log('Удалили обработчик callEnded в перед_переводом self.requestRes.sessionID == data.sessionID');
                            self.bus.removeListener('callEnded', _endCall);

                            sip.cancel(self.session.sessionID);
                            sip.bye(self.session.sessionID);
                            return;
                        }

                        // Завершение звонка с клиентом
                        if (self.session.requestRes.sessionID && self.session.requestRes.sessionID && (self.session.requestRes.sessionID == data.sessionID)) {
                            console.log('Удалили обработчик callEnded в перед_переводом self.session.requestRes.sessionID == data.sessionID');
                            self.bus.removeListener('callEnded', _endCall);

                            sip.cancel(self.session.sessionID);
                            sip.bye(self.session.sessionID);
                            return;
                        }
                    }
                }
                console.log('Добавили обработчик callEnded перед звонком');

                self.bus.on('callEnded', _endCall);
                return 'перевод_звонка'
            }
        },
        7: {
            mark: 'перед_началом',
            sttOn: {
                opt: { model: 'general', developer_key: '069b6659-984b-4c5f-880e-aaedcfd84102' },
                keys: {
                    'спасибо|не|ничего|аппарат|отвечает|вызыв|парад|абон|занят|ваш|звонок|был|переадрес|голосов|почт|ящик|можете|оставить|сообщение|после|сигнала': {
                        goto: function (self) {
                            console.warn('Поймали голосовую почту mark:перед_началом');
                            return 'завершение'
                        }
                    }
                }
            },
            goto: 'начало'
        }
    },
    goto: 'перед_началом'
}