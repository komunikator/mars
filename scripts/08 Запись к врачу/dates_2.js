exports.src = function(self){
    var user = self.session.user;

    // убираем из распознанного числа не цифровые символы
    var text = self.sttText.replace(/[^0-9]/g, "");
    var tmp = [];
    var tmp1 = -1;

    // text = '15'; // после тестирования удалить эту строку

    var dates = user.requestRes;
    // console.log(dates);
    // формируется список чисел приёма
    for (var i =0, len = dates.length; i < len; i++) {
        tmp[i] = dates[i].a;
    }

    // если есть в списке распознанное число
    tmp1 = tmp.indexOf(text);
    if (tmp1 !== -1)
    {
    	user.sttRes = text;
    	user.askRes = text + ' ' + dates[tmp1].b;
        text = 'меню_4';
    } else // если не найдена специальность
        {
            user.txt = 'Ваш ответ не понятен.    ';
            text = 'меню_2';
        }
    return text;
}