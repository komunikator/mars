'use strict';

class DataWorker {
    constructor(sessionID) {
        this.sessionID = sessionID;
    }

    // ******************** Воспроизвести аудио файл или буфер ********************
    startPlayFileOrBuffer() {
    }

}

// ******************** Экспорт данных ********************
module.exports = {
    DataWorker: DataWorker
};