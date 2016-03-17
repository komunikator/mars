exports.src = function(self){
    var user = self.session.user;

    var text = self.sttText.split(' ');
    if (text.length > 1)
    {
        user.sttRes = text[0].replace(/[^0-9]/g, "") + '-е ' + text[1];
        text = text[0].replace(/[^0-9]/g, "") + ' ' + text[1];
    } else  text = '!';

    // text = '9 апреля'; // после тестирования удалить эту строку

    user.askRes = text; // после тестирования удалить эту строку
    // user.askRes = user.sttRes; // после тестирования раскомментировать эту строку
    var day_month = user.requestRes;
    // если есть в списке распознанная специальность
    if (day_month.indexOf(text) !== -1)
    {
        text = 'меню_4';
    } else // если не найдена специальность
        {
            user.txt = 'Ваш ответ не понятен.    ';
            text = 'меню_2';
        }
    return text;
}