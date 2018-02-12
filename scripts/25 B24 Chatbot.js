// Для генерации ответа на сообщения вызвать cb(self);
// Преждевременно присвоить сформированный ответ в self.answer

exports.src = async function (self, cb) {
    switch(self.message) {
        case 'что горит':
            let params = {};

            self.request(self, params, (err, data) => {
                if (err) {
                    self.answer = 'Ошибка при получении тасков';
                    break;
                }
                self.answer = data;
                cb(self);
            });
            break;
        default:
            self.answer = await new Promise((resolve) => {
                setTimeout( () => {
                    return resolve(`Стандартный ответ на сообщение: ${self.message}`);
                }, 1000);
            });
            cb(self);
            break;
    }
}