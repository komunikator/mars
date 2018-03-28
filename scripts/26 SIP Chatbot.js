exports.src = async function (self, cb) {
 
    // Для генерации ответа на сообщения вызвать cb(self);
    // Преждевременно присвоить сформированный ответ в self.answer

    self.answer = 'абв';
    cb(self);
}