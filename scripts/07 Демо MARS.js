exports.src = {
    dtmfDataFields: ['Номер счета','Показания прибора'],
    recOn: true,
        mark: 'Начало',
            play: { file: 'media/Добро_пожаловать_в демонстрацию_системы_MARS.wav',
                            next: { 
                                mark: 'Главное меню',
                                play: {file: 'media/uchet/Введите_номер_лицевого_счёта_для_учёта_электроэнергии.wav;'
                                    + 'media/uchet/По_окончании_ввода_нажмите_клавишу_#.wav;'
                                    + 'media/uchet/Или_произнесите_последовательно_каждую_цифру.wav;'
                                    + 'media/uchet/Сигнал_записи.wav'},
                                        on: {'opt': {seq: true, endSeq: '#', model:'numbers', textFilter:'(\\d+)'},
                                            '\\*': {goto: 'Главное меню'},
                                                '^\\d+$': {
                                                    dtmfData: { next: {
                                                        mark: 'Меню_1',
                                                        sendMESSAGE: {text: function(self){return '№ лицевого счёта: '+ self.session.dtmfData[0].keys}},
                                                        play: {file: function(self){return 'media/uchet/Вы_ввели_.wav;'+ self.session.dtmfData[0].keys +';'
                                                            + 'media/uchet/Если_верно_1да_если_неверно_2нет.wav;'
                                                            + 'media/uchet/Сигнал_записи.wav'}
                                                              },
                                                        on: {    'opt': {model: 'questionnaire', textFilter:'да|нет'},
                                                             '^1$|да': {
                                                                 mark: 'Меню_2',
                                                                 sendMESSAGE: {text: 'правильность номера лицевого счёта подтверждена'},
                                                                 play: {file: 'media/uchet/Вход_в_меню.wav;'
                                                                        + 'media/uchet/Введите показания прибора.wav;'
                                                                        + 'media/uchet/По_окончании_ввода_нажмите_клавишу_#.wav;'
                                                                        + 'media/uchet/Или_произнесите_последовательно_каждую_цифру.wav;'
                                                                        + 'media/uchet/Сигнал_записи.wav'
                                                                       },
                                                                 on: {'opt': {seq: true, endSeq: '#', model:'numbers', textFilter:'(\\d+)'},
                                                                      '^\\d+$': {
                                                                          dtmfData: { next: {
                                                                              mark: 'Меню_3',
                                                                              sendMESSAGE: {text: function(self){return 'показание прибора: '+ self.session.dtmfData[1].keys}},
                                                                              play: {file: function(self){return 'media/uchet/Вы_ввели_.wav;' + self.session.dtmfData[1].keys +';'
                                                                                  + 'media/uchet/Если_верно_1да_если_неверно_2нет.wav;'
                                                                                  + 'media/uchet/Сигнал_записи.wav'}
                                                                                    },
                                                                              on: {    'opt': {model: 'questionnaire',textFilter:'да|нет'},
                                                                                   '^1$|да': {
                                                                                              sendMESSAGE: {text: 'правильность показания прибора подтверждена'},
                                                                                              play: {file: 'media/uchet/Вход_в_меню.wav;'
                                                                                                     + 'media/uchet/Ваши_данные_приняты.wav;'
                                                                                                     + 'media/uchet/Спасибо_за_звонок_До_свиданья.wav',
                                                                                                     next: {hangUp: true}
                                                                                                    }
                                                                                             },
                                                                                   '^2$|нет': {
                                                                                       sendMESSAGE: {text: 'показание прибора не подтверждено'},
                                                                                       goto: function(self){self.session.dtmfData.pop();return 'Меню_2'}
                                                                                   }
                                                                                  },
                                                                              wait: {time: 20,
                                                                                     next: {
                                                                                         play: {file: 'media/uchet/Мы_не_получили_от_вас_никаких_данных.wav',
                                                                                                next: {goto: 'Меню_3'}
                                                                                               }
                                                                                     }
                                                                                    }
                                                                          }}
                                                                      }
                                                                     },
                                                                 wait: {time: 20,
                                                                        next: {
                                                                            play: {file: 'media/uchet/Мы_не_получили_от_вас_никаких_данных.wav',
                                                                                   next: {goto: 'Меню_2'}
                                                                                  }
                                                                        }
                                                                       }
                                                             },
                                                             '^2$|нет': {
                                                                 sendMESSAGE: {text: '№ лицевого счёта не подтверждён'},
                                                                 goto: function(self){self.session.dtmfData.pop();return 'Главное меню'}
                                                             }
                                                            },
                                                        wait: {time: 20,
                                                               next: {
                                                                   play: {file: 'media/uchet/Мы_не_получили_от_вас_никаких_данных.wav',
                                                                          next: {goto: 'Меню_1'}
                                                                         }
                                                               }
                                                              }
                                                    }}
                                                }
                                            },
                                                wait: {time: 30,
                                                    next: {
                                                        play: {file: 'media/uchet/Мы_не_получили_от_вас_никаких_данных.wav',
                                                            next: {goto: 'Главное меню'}
                                                              }
                                                    }
                                                      }
                                  }
                  },
                      dtmfOn: {'^1$': {goto : 'Главное меню'}}
}
