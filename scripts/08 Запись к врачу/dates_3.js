exports.src = function(self){
    var user = self.session.user;
    // сохранение даты в объект записи на приём
    user.record.date = user.askRes;
    user.iteration = 3; // сообщаем, что переходим к выбору времени приёма
    // инициализация параметров следующей итерации
    user.step[user.iteration].reqParams = {specialty: user.record.specialty, doctor: user.record.doctor, date: user.record.date};
    console.log('');
    console.log(user.record);
    console.log('');
    // для функции в последней итерации return 'меню_5', иначе return 'меню_1' с увеличением номера итерации
    return 'меню_1';
}
