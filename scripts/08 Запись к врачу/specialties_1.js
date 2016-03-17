exports.src = function(self){
    var user = self.session.user;
    // в качестве проговариваемого текста подставляется список врачебных специальностей
    var res = self.requestRes || '';
    var txt = user.txt;
    user.txt = '';
    user.requestRes = res; // запоминаем список специальностей
    res = res.join(',');
    return txt + 'Ведётся запись к следующим специалистам:   ' + res;
}