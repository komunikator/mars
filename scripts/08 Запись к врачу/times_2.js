exports.src = function(self){
    var user = self.session.user;

    var text = self.sttText;
    var tmp = [];

    // text = '1120'; // после тестирования удалить эту строку

    // отделение количества минут от количества часов знаком "-"
    user.sttRes = text.slice(0, -2) + '-' + text.slice(-2);
    user.askRes = user.sttRes;
    var times = user.requestRes;
    // формируется список для сравнения времён приёма
    for (var i =0, len = times.length; i < len; i++) {
        tmp[i] = times[i].replace(/[^0-9]/g, "");
    }

    // если есть в списке распознанное время
    if (tmp.indexOf(text) !== -1)
    {
        text = 'меню_4';
    } else // если не найдено время
        {
            user.txt = 'Ваш ответ не понятен.    ';
            text = 'меню_2';
        }
    return text;
}