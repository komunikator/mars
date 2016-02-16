
/*
 * GET home page.
 */

exports.init = function(req, res){
    console.log('test')
};

exports.index = function(req, res){
  res.render('dialogs', { username: req.user.username});
};