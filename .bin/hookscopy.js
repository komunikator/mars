
var fse = require('fs-extra')
 
fse.copy('./.bin/pre-commit', './.git/hooks/pre-commit', function (err) {
    if (err) return console.error(err)
    console.log("success!")
});
 
try {
    fse.copySync('./.bin/pre-commit', './.git/hooks/pre-commite')
    console.log("success!")
} catch (err) {
      console.error(err)
}