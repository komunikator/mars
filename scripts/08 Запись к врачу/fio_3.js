exports.src = function(self){
    var user = self.session.user;
    // сохранение числа и месяца рождения в объект записи на приём
    user.record.FIO = user.askRes;
    console.log('');
    console.log(user.record);
    console.log('');
    // переходим к завершающему шагу
    return 'меню_5';
}
