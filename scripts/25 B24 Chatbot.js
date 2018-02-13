// Для генерации ответа на сообщения вызвать cb(self);
// Преждевременно присвоить сформированный ответ в self.answer

exports.src = async function (self, cb) {
    switch(self.message) {
        case 'что горит':
            console.log('24 B24 Chatbot start request что горит');
            let params = {};

            self.request(self, params, (err, data) => {
                console.log('24 B24 Chatbot callback');
                if (err) {
                    console.log(err);
                    self.answer = 'Ошибка при получении тасков';
                } else {
                    self.answer = data;
                }
                cb(self);
            });
            break;
        default:
            console.log('24 B24 Chatbot start default');
            self.answer = await new Promise((resolve) => {
                setTimeout( () => {
                    return resolve(`Стандартный ответ на сообщение: ${self.message}`);
                }, 1000);
            });
            cb(self);
            break;
    }
}