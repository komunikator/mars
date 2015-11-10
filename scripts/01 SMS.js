exports.src = {
    play: {file: 'media/Приветствие.wav',
        next: {
            mark: "Главное меню",
            dtmfOn: {
                //8: {recOn: {file: 'rec/<session_id>.wav'}},
                //9: {play: {file: 'rec/<session_id>.wav'}},
                0: {hangUp: true},
                '#': {goto: "Главное меню"},
                '[1-5]': {
                    dtmfData: true,
                    sendSMS: {text: 'Ваша оценка <dtmfKeys>. Спасибо за звонок!'},
                    play: {file: 'media/Ваша_оценка.wav;'
                                + 'media/number/<dtmfKeys>.wav;'
                                + 'media/Спасибо_за_оценку.wav;'
                                + 'media/Вы_можете_осавить_свое_сообщение.wav;'
                                + 'media/Сигнал_записи.wav',
                        next: {
                            recOn: {
                                next: {
                                    wait: {time: 10,
                                        next: {
                                            play: {file: 'media/Сигнал_записи.wav;' +
                                                        'media/Спасибо_за_звонок.wav',
                                                next: {hangUp: true}
                                            }
                                        }
                                    }}
                            }
                        }
                    }
                },
                'def': {goto: "Главное меню"}
            },
            play: {file: 'media/Оцените_работу_оператора2.wav'},
            wait: {time: 15,
                next: {hangUp: true}
            }

        }
    }
};