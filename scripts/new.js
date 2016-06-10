exports.src = {
    play: {file:'media/Добро_пожаловать_в демонстрацию_системы_MARS.wav' ,
        next: {
            mark: "Главное меню",
            dtmfOn: {
                0: {hangUp: true},
                '#': {goto: "Главное меню"},
                '[1-5]': {
                    dtmfData: true,
                    play: {file: 'media/Ваша_оценка.wav;'
                                + 'media/number/<dtmfKeys>.wav;'
                                + 'media/Спасибо_за_звонок.wav',
                        next: {hangUp: true}
                    }
                },
                'def': {goto: "Главное меню"}
            }

        }
    }
}