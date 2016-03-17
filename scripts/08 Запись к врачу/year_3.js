exports.src = function(self){
    var user = self.session.user;
    // сохранение года рождения в объект записи на приём
    user.record.year = user.askRes;
    user.iteration = 5; // сообщаем, что переходим к выбору числа и месяца рождения пациента
    // инициализация параметров следующей итерации
    user.step[user.iteration].reqParams = {
                                            specialty: user.record.specialty,
                                            doctor: user.record.doctor,
                                            date: user.record.date,
                                            time: user.record.time,
                                            year: user.record.year
                                          };
    console.log('');
    console.log(user.record);
    console.log('');
    // для функции в последней итерации return 'меню_5', иначе return 'меню_1' с увеличением номера итерации
    return 'меню_1';
}
