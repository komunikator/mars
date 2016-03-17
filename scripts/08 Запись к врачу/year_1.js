exports.src = function(self){
    var user = self.session.user;
    user.requestRes = self.requestRes || ''; // запоминаем список годов рождения
    var txt = user.txt;
    user.txt = '';
    // console.log(`years: ${user.requestRes}`);
    return txt;
}