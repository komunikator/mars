exports.src = {
    async: {
        recOn: true,
        play: {file: 'media/Приветствие.wav', next: {play: {file: 'media/Ваша_оценка.wav'}}},
        wait: {time: 3},
        hangUp: true
    }
}