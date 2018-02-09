exports.src = async function (self) {
    var promise = new Promise((resolve) => {
        setTimeout( () => {
            return resolve('Ответ на сообщение: ', self.message);
        }, 1000);
    });

    self.answer = await promise;

    self.sendAnswer(self);
}