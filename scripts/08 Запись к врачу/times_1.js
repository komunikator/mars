exports.src = function(self){
    var user = self.session.user;
    var res = self.requestRes || '';
    var txt = user.txt;
    user.txt = '';
    user.requestRes = res;
    res = res.join(' ');
    return txt + 'На эту дату доступно:    ' + res;
}