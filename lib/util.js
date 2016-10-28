function getFiles(dir,fileOnly,mask) {
    if (fileOnly==undefined) fileOnly=true;
    if (mask==undefined) mask = '';
	mask = new RegExp(mask);		
    if (dir[dir.length] !== '/')
        dir += '/';
    var fs = require('fs'),
            files = [];
    try {
        if ( fs.existsSync(dir) ) {
        var f = fs.readdirSync(dir),isFile,isHiddden;
        for (var i in f) {
	isFile = fs.statSync(dir + f[i]).isFile();
	isHidden = /^\./.test(f[i]);
	if (!isHidden)
            if (!fileOnly || isFile)
		if (!isFile || (isFile && mask.test(f[i])))
                files.push(f[i]);
        }
        }
    } catch (err) {
        console.log(err);
    }
    return files;
}

function dateFormat (date, fstr, utc) {
  utc = utc ? 'getUTC' : 'get';
  return fstr.replace (/%[YmdHMS]/g, function (m) {
    switch (m) {
    case '%Y': return date[utc + 'FullYear'] (); // no leading zeros required
    case '%m': m = 1 + date[utc + 'Month'] (); break;
    case '%d': m = date[utc + 'Date'] (); break;
    case '%H': m = date[utc + 'Hours'] (); break;
    case '%M': m = date[utc + 'Minutes'] (); break;
    case '%S': m = date[utc + 'Seconds'] (); break;
    default: return m.slice (1); // unknown code, remove %
    }
    // add leading zero if required
    return ('0' + m).slice (-2);
  });
}

/* dateFormat (new Date (), "%Y-%m-%d %H:%M:%S", true) returns 
   "2012-05-18 05:37:21"  */

function requireUncached(module) {
    delete require.cache[require.resolve(module)];
    return require(module);
}

exports.isNumeric = function (obj) {
    	return obj - parseFloat(obj) >= 0;
    };

exports.getFiles = getFiles;
exports.requireUncached = requireUncached;