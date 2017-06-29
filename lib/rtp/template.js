exports.src = {
    recOn: true,
    action: {
        func: function(self) {
            //Настройки - начало
            self.session.user = {
                phone: "<@self_phone@>",
                mail: "<@email@>",
                mail_pass: "<@email_password@>",
                text: "<@hello_text@>",
                self_name: "<@name@>",
                answer_self_name: "<@name_dat@>"
            };
            //Настройки - конец
            self.session.user.name = "Неизвестный";
            self.session.user.contacts = <@contacts@>;
            self.session.user.messages = [];
            self.session.user.finded = false;
            self.session.user.minutes = 0;
            self.session.user.requestRes = {};
            self.session.user.id = "<@id@>";
            var bus = require('../lib/system/bus');
            var fs = require('fs');
            bus.onRequest('deleteTask', function(param, cb) {
                fs.unlink("scripts/" + param + ".js", function(err) {
                    bus.emit('refresh', "scripts");
                    fs.unlink("tasks/" + param + ".js", function(err) {
                        bus.emit('refresh', "tasks");
                        cb(null, null);
                    })
                })
            });
            bus.onRequest('updateTask', function(param, cb) {
                fs.writeFile("scripts/" + param.name + ".js", param.script_value, function(err) {
                    bus.emit('refresh', "scripts");
                    fs.writeFile("tasks/" + param.name + ".js", param.task_value, function(err) {
                        bus.emit('refresh', "tasks");
                        cb(null, null);
                    })
                })
            });
        }
    },
    goto: "список_контактов",
    sub: {
        0: {
            mark: "список_контактов",
            goto: "идентификация"
        },
        1: {
            mark: "идентификация",
            goto: function(self) {
                for (var i = 0; i < self.session.user.contacts.length; i++) {
                    if (self.session.user.contacts[i][0] == self.caller) {
                        self.session.user.name = self.session.user.contacts[i][1];
                        self.session.user.finded = true;
                    }
                }
                if (self.session.user.finded) {
                    self.session.user.text += " " + self.session.user.name;
                }
                self.session.user.text += ".";
                return "приветствие"
            }
        },
        2: {
            mark: "приветствие",
            ttsPlay: {
                text: function(self) { return self.session.user.text },
                next: {
                    goto: "ответ"
                }
            }
        },
        3: {
            mark: "ответ",
            ttsPlay: {
                text: function(self) { return self.session.user.answer_self_name + " что-то передать или Вы хотите чтобы он перезвонил?" },
                next: {
                    play: {
                        file: 'media/Сигнал_записи.wav',
                        next: {
                            on: {
                                'opt': {
                                    model: 'general',
                                    // customGrammar: ["позвонит", "перезвонит", "позвонил", "перезвонил", "передать", "сообщение", "сказать", "говорить"],
                                    developer_key: "<@speech_key@>"
                                },
                                keys: {
                                    'звон': { goto: "перезвонить" },
                                    'перед|cooбщ|сказ|говор': { goto: "сообщение" },
                                    'def': {
                                        play: {
                                            file: 'media/Сигнал_получения_данных.wav',
                                            next: {
                                                ttsPlay: {
                                                    text: "Не понятно, что Вы сказали.",
                                                    next: {
                                                        goto: "ответ"
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
            }
        },
        4: {
            mark: "перезвонить",
            play: {
                file: 'media/Сигнал_получения_данных.wav',
                next: {
                    ttsPlay: {
                        text: "Через сколько минут перезвонить?",
                        next: {
                            play: {
                                file: 'media/Сигнал_записи.wav',
                                next: {
                                    on: {
                                        'opt': {
                                            model: 'general'
                                        },
                                        keys: {
                                            '/*': {
                                                goto: function(self) {
                                                    self.session.user.minutes = parseInt(self.sttText.replace(/\D/g, ""));
                                                    if (self.session.user.minutes) return "создать_задачу";
                                                    else {
                                                        return "перезвонить";
                                                    }
                                                }
                                            },
                                            'def': {
                                                play: {
                                                    file: 'media/Сигнал_получения_данных.wav',
                                                    next: {
                                                        ttsPlay: {
                                                            text: "Не понятно, что Вы сказали.",
                                                            next: {
                                                                goto: "перезвонить"
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
                    }
                }
            }
        },
        5: {
            mark: "создать_задачу",
            request: {
                source: 'deleteTask',
                query: function(self) { return self.caller },
                next: {
                    request: {
                        source: 'updateTask',
                        query: function(self) {
                            var date = new Date();
                            var call_minutes = (date.getMinutes() + self.session.user.minutes) % 60;
                            var call_hours = date.getHours();
                            var add_hour = ((date.getMinutes() + self.session.user.minutes) - call_minutes) / 60;
                            call_hours = call_hours + add_hour;
                            var cron_hour = call_hours + add_hour;
                            var cron_minutes = call_minutes;
                            var day = date.getDate();
                            var month = date.getMonth() + 1;
                            var year = (date.getFullYear().toString()).substr(2, 2);
                            if (call_minutes < 10) call_minutes = "0" + call_minutes;
                            if (call_hours < 10) call_hours = "0" + call_hours;
                            if (day < 10) day = "0" + day;
                            if (month < 10) month = "0" + month;
                            return {
                                name: self.caller+"_"+ self.session.user.phone,
                                script_value: "exports.src = {\n\
                                    mediaStream: true,\n\
                                    ttsPlay:{\n\
                                        text: '" + self.session.user.self_name + ", тебе звонил абонент " + self.session.user.name + " просил перезвонить в " + parseInt(date.getHours() + 3) + " " + date.getMinutes() + ". Вас соединить?',\n\
                                        next: {\n\
                                            mark: \"ответить\",\n\
                                            on: {\n\
                                                'opt': {\n\
                                                        model: 'general',\n\
                                                        //customGrammar: ['да','соединить','соедини','давай','не','нет'],\n\
                                                        developer_key: '<@speech_key@>'\n\
                                                },\n\
                                                keys: {\n\
                                                    'да|соед|дава': { goto: \"соединить\" },\n\
                                                    'не': { hangUp: true },\n\
                                                    'def': {\n\
                                                        ttsPlay: {\n\
                                                            text: \"Не понятно что Вы сказали. Повторите.\",\n\
                                                            next: {\n\
                                                                goto: \"ответить\"\n\
                                                            }\n\
                                                        }\n\
                                                    }\n\
                                                }\n\
                                            }\n\
                                        }\n\
                                    },\n\
                                    sub: {\n\
                                        0: {\n\
                                            mark: \"соединить\",\n\
                                            startScript : { \n\
                                                to: \"" + self.caller + "\", \n\
                                                script : 'Соединение.js', \n\
                                                params: function(self){return [self.sessionID]}, \n\
                                                next : {\n\
                                                    goto: function(self){return self.requestRes.event == 'answered' ? 'вызов' : 'абонент_не_найден'} \n\
                                                }\n\
                                            }\n\
                                        },\n\
                                        1: {\n\
                                            mark:'абонент_не_найден',\n\
                                            ttsPlay: {text: 'К сожалению, абонент не доступен', next: {hangUp: true}}\n\
                                        },\n\
                                        2 : {\n\
                                            mark:'вызов',\n\
                                            play:  {audioBuffer: function(self){return self.requestRes.sessionID},streaming: true}\n\
                                        }\n\
                                    }\n\
                                }",
                                task_value: 'exports.src = {\
                                    "active":"true",\
                                    "script":"' + self.caller+"_"+ self.session.user.phone + '",\
                                    "onEvent":"",\
                                    "startTime_time":"' + call_hours + ':' + call_minutes + '",\
                                    "styleTime":"0",\
                                    "startTime_date":"' + day + '.' + month + '.' + year + '",\
                                    "startTime":"' + cron_minutes + ' ' + cron_hour + ' ' + day + ' ' + date.getMonth() + ' *",\
                                    "callsCount":"0",\
                                    "rejectTime":"00:00",\
                                    "target":"'+self.session.user.id+'.assistant",\
                                    "sipAccountID":0 \
                                }'
                            }
                        },
                        next: {
                            goto: "прощание"
                        }
                    }
                }
            }
        },
        6: {
            mark: "сообщение",
            play: {
                file: 'media/Сигнал_получения_данных.wav',
                next: {
                    ttsPlay: {
                        text: "Оставьте своё сообщение после звукового сигнала",
                        next: {
                            play: {
                                file: 'media/Сигнал_записи.wav',
                                next: {
                                    on: {
                                        'opt': {
                                            model: 'general'
                                        },
                                        keys: {
                                            '/*': {
                                                goto: function(self) {
                                                    var send = require('gmail-send')({
                                                        user: self.session.user.mail,
                                                        pass: self.session.user.mail_pass,
                                                        to: self.session.user.mail,
                                                        subject: 'Сообщение от ' + self.session.user.name + ' (' + self.caller + ')',
                                                        text: self.sttText
                                                    })();
                                                    return "прощание"
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
        7: {
            mark: "прощание",
            ttsPlay: {
                text: function(self) {
                    return "Я всё передам. До свидания " + self.session.user.name
                },
                next: {
                    hangUp: true
                }
            }
        }
    }
}