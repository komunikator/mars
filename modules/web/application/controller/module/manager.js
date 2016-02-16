
/*
 * GET home page.
 */

exports.init = function(req, res){
    console.log('test')
};

exports.index = function(req, res){
  res.render('manager', { username: req.user.username});
};