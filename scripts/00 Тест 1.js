exports.src = {recOn: {type:'stereo'},
    dtmfDataFields: ['Оценка оператора'], 
    play: {
        file:'media/Приветствие.wav',
            next: {
                mark: "Главное меню",
                    dtmfOn: {
                        0: {hangUp: true},
                            '#': {goto: "Главное меню"},
                                '[1-5]': {dtmfData: true, play: {file:'media/Ваша_оценка.wav;'
                                                                 +'media/number/<dtmfKeys>.wav;'
                                                                 +'media/Спасибо_за_оценку.wav;'
                                                                 +'media/Вы_можете_осавить_свое_сообщение.wav;'
                                                                 +'media/Сигнал_записи.wav',
                                                                 next: {
                                                                     recOn: {
                                                                         next: {
                                                                             wait: {time: 10,
                                                                                    next: {
                                                                                        play: {file:'media/Сигнал_записи.wav;' +
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
                        play: {file:'media/Оцените_работу_оператора2.wav',
                            next: {wait: {time: 120,
                                next: {hangUp: true}
                                         }
                                  }
                              }
            }
    }
}