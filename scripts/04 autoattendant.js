exports.src = {
    play: { file: 'media/Добрый_день.wav;media/Что__вас__интересует.wav', next: {
                     mark: "Главное меню",
                     on: {
                         'opt': {model: 'general', textFilter: 'продаж|поддержк|опрос'},
                         '^1$|продаж': {recOn: true, ttsPlay: {text: 'Сейчас вы будете переведены в отдел продаж', next: {goto: "Главное меню"}}},
                         '^2$|поддержк': {recOn: true, ttsPlay: {text: 'Сейчас вы будете переведены в отдел техподдержки', next: {goto: "Главное меню"}}},
                         '^3$|опрос': require('./00 Тест 1.js').src
                     }
                 }
           }
}
