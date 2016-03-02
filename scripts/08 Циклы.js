exports.src = {
    action: {func: function (self) {
            self.session.user.stepID = 0;
            self.session.user.step = [
                {text: 'Привет, это шаг №1'},
                {text: 'Еще раз привет, это шаг №2'},
                {text: 'Снова привет, это шаг №3', action: {hangUp: true}}
            ];
            self.cb();
        },
        next: {
            ttsPlay: {text: 'Инициализация',
                next: {
                    mark: 'main',
                    ttsPlay: {text: function (self) {
                            return self.session.user.step[self.session.user.stepID].text;
                        },
                        next: function (self) {
                            var user = self.session.user,
                                    next = user.step[user.stepID] && user.step[user.stepID].action || {goto: 'main'};
                            user.stepID++;
                            return next
                        }}
                }
            }
        }
    }
};