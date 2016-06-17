var fs = require('fs'),
    path = './package.json',
    content = require('../package.json');
var cont = content.version.split('.');
var counter = (cont[2]);
console.log(counter);
counter++;
content.version = cont[0] + '.' + cont[1] + '.' + counter;
fs.writeFile(path, JSON.stringify(content, '', 2), function(err) {
    if(err) {
        console.log(err);
        return;
    }
});