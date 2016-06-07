exports.src = function (self) {
    self.session.start_play({file: 'media/Приветствие.wav'}, function () {
        setTimeout(function () {
            self.session.bye();
        }, 3000);
    })
}