'use strict';

function recognizer (settings) {
    settings = settings || {
        "type": "yandex",
        "options": {
            "developer_key": "",
            "model": "general"
        }
    };
    if (settings && settings['type']) {
        switch (settings['type']) {
            case 'yandex':
                this.engine = new require('./yandex')(settings['options']);
                break;
            case 'google':
                this.engine = new require('./google')(settings['options']);
                break;
            default:
                throw new Error('Unknown type of engine');
        }
    } else {
        throw new Error('No settings for recognize');
    }
};

recognizer.prototype.recognize = function (file, callback) {
    this.engine.recognize(file, callback);
};

module.exports = recognizer;