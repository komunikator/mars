exports.src = function(self){
    var user = self.session.user;
    user.requestRes = self.requestRes || ''; // запоминаем список число и месяц рождения
    var txt = user.txt;
    user.txt = '';
    // console.log(`day_month: ${user.requestRes}`);
    return txt;
}