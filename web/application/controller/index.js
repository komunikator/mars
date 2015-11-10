
/*
 * GET home page.
 */

exports.init = function(req, res){
    console.log('test')
};

exports.index = function(req, res){
  res.render('index', { title: 'MARS "'+req.user.username+'"', username: req.user.username});
};