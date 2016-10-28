var fs  = require('fs-extra');

function copyConfig() {
    try {
        var dir = './config';
        if ( !fs.existsSync(dir) ) {
            fs.mkdirSync(dir);
        }
        if ( !fs.existsSync('./config/config.js') ) {
            fs.copySync('./node_modules/mars/config/config.js', './config/config.js')
        }
    } catch (err) {
        console.log(err);
    }
}

copyConfig();
module.exports = 'config/config.js';