'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const EventEmitter = require("events");
class Rtp extends EventEmitter {
    constructor(sessionID) {
        super();
    }
}
module.exports = {
    Rtp: Rtp
};
