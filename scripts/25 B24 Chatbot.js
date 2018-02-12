exports.src = async function (self, cb) {
    var promise = new Promise((resolve) => {
        setTimeout( () => {
            return resolve('Ответ на сообщение: ', self.message);
        }, 1000);
    });

    self.answer = await promise;
    cb(self);
}