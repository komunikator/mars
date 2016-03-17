exports.src = function(self){
    var user = self.session.user;

    var text = self.sttText;
    if (text === 'любой врач')
    {
    	// выбираем случайно какого-то врача из доступных
    	text = user.requestRes[Math.round(- 0.5 + Math.random() * (user.requestRes.length + 1))];
    	console.log('vrach: ', text);
    }

    // text = 'павлов'; // после тестирования удалить эту строку

    user.sttRes = self.sttText;
    user.askRes = text;
    var doctors = user.requestRes;
    // если есть в списке распознанный врач
    if (doctors.indexOf(text) !== -1)
    {
        text = 'меню_4';
    } else // если не найден врач
        {
            user.txt = 'Ваш ответ не понятен.    ';
            text = 'меню_2';
        }

    return text;
}