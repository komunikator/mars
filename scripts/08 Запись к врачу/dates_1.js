exports.src = function(self){
	var user = self.session.user;
    var res = self.requestRes || '';
    var tmp = [];
    var txt = user.txt;
    user.txt = '';
    user.requestRes = res;
    // собираем даты в строку
    for (var i =0, len = res.length; i < len; i++) {
        tmp[i] = res[i].a + ' ' + res[i].b;
    }
    res = tmp.join(',');
    return txt + 'Доступны следующие даты:    ' + res;
}