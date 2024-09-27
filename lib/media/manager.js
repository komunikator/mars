"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// ******************** Обработка событий текущего процесса ********************
process.on('disconnect', () => {
    process.exit();
});
process.on('uncaughtException', (e) => {
    process.send('uncaughtException pid:' + process.pid + ': stack: ' + e.stack);
    setTimeout(() => {
        process.exit();
    }, 3000);
});
process.on('warning', (e) => {
    process.send('pid:' + process.pid + ': ' + e + ' \r\n stack: ' + e);
});

// ******************** Навешивание таймеров на завершение ********************
setTimeout(function () {
    process.exit(2);
}, 1800000); //30 min

let timerFirstPackage = setTimeout(function () {
    process.exit(3);
}, 180000); //3 min

// ******************** Загрузка зависимостей ********************
const mediaHandler_1 = require("./mediaHandler");
let mediaHandler = new mediaHandler_1.MediaHandler();
mediaHandler.on('event', (data) => {
    if (data) {
        // process.send('Manager action: ' + data.action);
        if (data.action && data.action == 'stream_on') {
            clearTimeout(timerFirstPackage);
            process.send('Остановлен таймер на 3 минуты stream_on');
        }
        process.send(data);
    }
});
// ******************** Обработка сообщений родительского процесса ********************
process.on('message', (data) => {
    if ((!data) || (!data.action)) {
        return false;
    }
    mediaHandler.emit(data.action, data);
});