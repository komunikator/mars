exports.src = function(self){
    var user = self.session.user;
    user.requestRes = self.requestRes || ''; // запоминаем список врачей
    var txt = user.txt;
    user.txt = '';
    return txt;
}