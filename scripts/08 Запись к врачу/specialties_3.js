exports.src = function(self){
    var user = self.session.user;
    // сохранение специальности в объект записи на приём
    user.record.specialty = user.askRes;
    user.iteration = 1; // сообщаем, что переходим к вводу фамилии врача
    // инициализация параметров следующей итерации
    user.step[user.iteration].reqParams = {specialty: user.record.specialty};
    console.log('');
    console.log(user.record);
    console.log('');
    // для функции в последней итерации return 'меню_5', иначе return 'меню_1' с увеличением номера итерации
    return 'меню_1';
}
