exports.src = async function (self, cb) {
    self.message = 'Добрый день абонент ' + self.params[0] + ' выш номер: +' + self.to + ' данная СМС отправлена в ' + self.params[0] + ' выш номер: +' + self.to + ' Добрый день абонент ' + self.params[0] + ' выш номер: +' + self.to;
    //self.message = '';
    cb(self);
}