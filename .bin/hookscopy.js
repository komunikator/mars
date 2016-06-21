
var fse = require('fs-extra')
 
fse.copy('./.bin/pre-commit', './.git/hooks/pre-commit', function (err) {
    if (err) return console.error(err)
    console.log("success!")
});