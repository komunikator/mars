exports.src = {
    recOn: true,
        mark: 'Начало',
            play: { file: 'media/Добро_пожаловать_в демонстрацию_системы_MARS.wav',
                next: { request: {source: 'reportData', query: function () {
                        var gdateS = require('dateformat')((function () {
                            var d = new Date();
                            d.setDate(d.getDate() - 30);//- 30 days
                            return d;
                        })(), "yyyy.mm.dd") + ' 00:00';
                        var gdateE = require('dateformat')((function () {
                            var d = new Date();
                            d.setDate(d.getDate() + 1);
                            return d;
                        })(), "yyyy.mm.dd") + ' 00:00';
                    return {search: JSON.stringify({gdate: gdateS+'|'+gdateE, msisdn: this.caller}), start: 0, limit: 1, page: 1, sort: JSON.stringify([{property: 'gdate', direction: 'DESC'}])}
                },
                    next:{ttsPlay: {text: function () {
                        var abonent = (this.session.params && this.session.params[0])?'Уважаемый ' + this.session.params[0]+'! ':'';
                        var res = this.requestRes && this.requestRes.items || [];
                        if (!res.length)
                            return abonent + 'Вы позвонили впервые';
                        var time = res[0].gdate.replace(/^(\d{4})\.(\d{2})\.(\d{2}) (\d{2}\:\d{2})\:\d{2}/, '$4 $3.$2.$1');
                        return abonent + 'Последний раз вы звонили в ' + time;
                    },
                        next : {play: {file:'media/uchet/Ваш_код_.wav;<pin>',
                            next: { mark: 'Главное меню',
                                play: {file: 'media/uchet/Введите_номер_лицевого_счёта_для_учёта_электроэнергии.wav;'
                                    + 'media/uchet/По_окончании_ввода_нажмите_клавишу_#.wav;'
                                    + 'media/uchet/Или_произнесите_последовательно_каждую_цифру.wav;'
                                    + 'media/uchet/Сигнал_записи.wav'},
                                        on: {'opt': {seq: true, endSeq: '#', model:'numbers', textFilter:'[\\d ]+'},
                                            '\\*': {goto: 'Главное меню'},
                                                '^\\d+$': {
                                                    dtmfData: { next: {
                                                        mark: 'Меню_1',
                                                        sendMESSAGE: {text: function(){return '№ лицевого счёта: '+ this.session.dtmfData[0].keys}},
                                                        play: {file: function(){return 'media/uchet/Вы_ввели_.wav;'+ this.session.dtmfData[0].keys +';'
                                                            + 'media/uchet/Если_верно_1да_если_неверно_2нет.wav;'
                                                            + 'media/uchet/Сигнал_записи.wav'}
                                                              },
                                                        on: {    'opt': {model:'general', textFilter:'да|нет'},
                                                             '^1$|да': {
                                                                 mark: 'Меню_2',
                                                                 sendMESSAGE: {text: 'правильность номера лицевого счёта подтверждена'},
                                                                 play: {file: 'media/uchet/Вход_в_меню.wav;'
                                                                        + 'media/uchet/Введите показания прибора.wav;'
                                                                        + 'media/uchet/По_окончании_ввода_нажмите_клавишу_#.wav;'
                                                                        + 'media/uchet/Или_произнесите_последовательно_каждую_цифру.wav;'
                                                                        + 'media/uchet/Сигнал_записи.wav'
                                                                       },
                                                                 on: {'opt': {seq: true, endSeq: '#', model:'numbers', textFilter:'[\\d ]+'},
                                                                      '^\\d+$': {
                                                                          dtmfData: { next: {
                                                                              mark: 'Меню_3',
                                                                              sendMESSAGE: {text: function(){return 'показание прибора: '+ this.session.dtmfData[1].keys}},
                                                                              play: {file: function(){return 'media/uchet/Вы_ввели_.wav;' + this.session.dtmfData[1].keys +';'
                                                                                  + 'media/uchet/Если_верно_1да_если_неверно_2нет.wav;'
                                                                                  + 'media/uchet/Сигнал_записи.wav'}
                                                                                    },
                                                                              on: {    'opt': {model:'general',textFilter:'да|нет'},
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
                                                                                       goto: function(){this.session.dtmfData.pop();return 'Меню_2'}
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
                                                                 goto: function(){this.session.dtmfData.pop();return 'Главное меню'}
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
                                      }
                               }
                                   }
                         }
                                 }
                      }
                  },
                      dtmfOn: {'^1$': {goto : 'Главное меню'}}
}
