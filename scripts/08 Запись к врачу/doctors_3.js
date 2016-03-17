exports.src = function(self){
    var user = self.session.user;
    // сохранение врача в объект записи на приём
    user.record.doctor = user.askRes;
    user.iteration = 2; // сообщаем, что переходим к выбору даты
    // инициализация параметров следующей итерации
    user.step[user.iteration].reqParams = {specialty: user.record.specialty, doctor: user.record.doctor};
    console.log('');
    console.log(user.record);
    console.log('');
    // для функции в последней итерации return 'меню_5', иначе return 'меню_1' с увеличением номера итерации
    return 'меню_1';
}
