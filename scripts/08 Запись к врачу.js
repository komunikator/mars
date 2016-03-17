exports.src = {
    recOn: true,
    action: { func: function(self){
                        // var that = self;
                        var session = self.session;
                        session.user = {}; // в свойстве user (object) будут храниться переменные для работы сценарию
                        session.user.record = {
                            specialty: '', // специализация врача
                            doctor: '', // фамилия врача
                            date: '', // дата приёма
                            time: '', // время приёма
                            year: '', // год рождения пациента
                            day_month: '', // число и месяц рождения пациента
                            FIO: '' // ФИО пациента
                        }; // подготавливается объект текущей записи к врачу
                        session.user.txt = ''; // добавка текста, который надо произнести перед текстом вопроса
                        // session.user.curDate = Date.now(); // текущая дата
                        session.user.requestRes = []; // результаты запроса команды сценария request
                        session.user.askRes = ''; // результат ответа пользователя
                        session.user.sttRes = ''; // результат распознавания голосового ввода
                        session.user.iteration = 0; // номер текущей итерации, чтобы подготовить для неё входные данные
                                                    // (всего в данном сценарии 7 итераций)
                        session.user.step = require('../lib/util').requireUncached('../scripts/08 Запись к врачу/step.js').src; // массив объектов конфигураций для каждого прохода цикла

                        // var res = ...
                        // that.cb(res)
                        //request({},function(res){that.cb(res)})
                    }
            },
    mark: 'Начало',
    ttsPlay: {text: 'Здравствуйте! Добро пожаловать в систему демонстрации записи на приём к врачу.',
                next: {
                        mark: 'меню_1',
                        // делается запрос на врачебные специальности
                        request: { source: function(self){return self.session.user.step[self.session.user.iteration].request},
                                   query: function(self){return self.session.user.step[self.session.user.iteration].reqParams;},
                                    next: {
                                            mark: 'меню_2',
                                            ttsPlay: {rewrite: true, text: function(self){ return require('../lib/util').requireUncached(self.session.user.step[self.session.user.iteration].pathFunc[0]).src(self)},
                                                        next: {
                                                                mark: 'меню_3',
                                                                ttsPlay: {rewrite: true, text: function(self){return self.session.user.step[self.session.user.iteration].question} },
                                                                sttOn: {
                                                                           'opt': {model: function(self){return self.session.user.step[self.session.user.iteration].model;}},
                                                                           '^[а-я,0-9,ё\\- ]+$': {
                                                                                            goto: function(self){ return require('../lib/util').requireUncached(self.session.user.step[self.session.user.iteration].pathFunc[1]).src(self)}
                                                                           },
                                                                           '^[^а-я,0-9,ё\\- ]+$': { goto: function(self){
                                                                                                                    self.session.user.txt = 'Ваш ответ не понятен.    ';
                                                                                                                    return 'меню_2';
                                                                                                                  }
                                                                            },
                                                                            '^!!!$': { // (это заведомо не произносимый вариант) для реализации действий для подтверждения и после подтверждения после того как <sttText> (введённый вариант) найден
                                                                                        mark: 'меню_4',
                                                                                        ttsPlay: {rewrite: true, text: function(self){return self.session.user.step[self.session.user.iteration].preface + self.session.user.sttRes + '. Скажите да или нет.'}},
                                                                                        sttOn: {
                                                                                                    'opt': {model: 'general'},
                                                                                                    '^да$': { goto: function(self){ return require('../lib/util').requireUncached(self.session.user.step[self.session.user.iteration].pathFunc[2]).src(self)}
                                                                                                            },
                                                                                                    '^нет$': {goto: 'меню_2'},
                                                                                                    '^!!!$': { // (это заведомо не произносимый вариант) для реализации завершающих действий после всех итераций
                                                                                                                mark: 'меню_5',
                                                                                                                // сохранение объекта записи на приём в файл
                                                                                                                action: { func: function(self){
                                                                                                                                    var user = self.session.user;
                                                                                                                                    var record = JSON.stringify(user.record) + '\n'; // добаляем перевод строки, чтобы следующая строка в файле писалась с новой строки
                                                                                                                                    var fs = require('fs');
                                                                                                                                    var file = 'scripts/08 Запись к врачу/record.txt';
                                                                                                                                    fs.open(file, "a", function(err, fd) {
                                                                                                                                    if (!err)
                                                                                                                                    {
                                                                                                                                        fs.write(fd, record, null, 'utf-8', function(err, countWrittenBytes) {
                                                                                                                                            if (!err)
                                                                                                                                            {
                                                                                                                                                // Всё прошло хорошо
                                                                                                                                                console.log("File write successfully.");
                                                                                                                                                fs.close(fd, function(err){
                                                                                                                                                         if (err){
                                                                                                                                                            console.log('err_close: ', err);
                                                                                                                                                         } else
                                                                                                                                                           {
                                                                                                                                                             console.log("File closed successfully.");
                                                                                                                                                             self.cb(true);
                                                                                                                                                           }
                                                                                                                                                      });
                                                                                                                                            } else {
                                                                                                                                                // Произошла ошибка при записи
                                                                                                                                                console.log('err_write: ', err);
                                                                                                                                                self.cb(false);
                                                                                                                                            }
                                                                                                                                        });
                                                                                                                                    } else {
                                                                                                                                        // Обработка ошибок при открытии
                                                                                                                                        console.log('err_open: ', err)
                                                                                                                                        self.cb(false);
                                                                                                                                    }
                                                                                                                                    });
                                                                                                                                },
                                                                                                                          next: {
                                                                                                                                    // переход в зависимости от того, удалось записать данные в файл или нет
                                                                                                                                    goto: function(self){
                                                                                                                                            var res = '';
                                                                                                                                            console.log('actionRes: ', self.actionRes);
                                                                                                                                            if (self.actionRes === true)
                                                                                                                                            {
                                                                                                                                                res = 'меню_6';
                                                                                                                                            } else res = 'меню_7';
                                                                                                                                            return res;
                                                                                                                                          }
                                                                                                                                }
                                                                                                                        }
                                                                                                                //hangUp: true
                                                                                                             },
                                                                                                    '^!!!!$': { // (это заведомо не произносимый вариант) если запись успешно завершилась переходим сюда
                                                                                                                mark: 'меню_6',
                                                                                                                ttsPlay: {text: 'Спасибо. Вы записаны на приём. Всего доброго.', next: {hangUp: true}},
                                                                                                              },
                                                                                                    '^!!!!!$': { // (это заведомо не произносимый вариант) если запись неуспешно завершилась переходим сюда
                                                                                                                mark: 'меню_7',
                                                                                                                ttsPlay: {text: 'Ошибка записи на приём. Вы будете перенаправлены на оператора.', next: {hangUp: true}},
                                                                                                               }
                                                                                               }
                                                                                     }
                                                                       },
                                                                wait: {time: 30,
                                                                        next: {
                                                                                ttsPlay: {text: 'Мы не получили от вас никаких данных',
                                                                                            next: {goto: 'меню_2'} // этот переход не срабатывает
                                                                                         }
                                                                              }
                                                                      }
                                                              }
                                                     } // ttsPlay
                                          }
                                 } // request
                      }
             }
}
