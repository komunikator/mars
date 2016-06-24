var bus = require('../../../lib/system/bus'),
        request = require('request');

// Попытка 
function auth(req) {
    if ( ('code' in req.query) && ('state' in req.query) &&
         ('domain' in req.query) && ('member_id' in req.query) &&
         ('scope' in req.query) && ('server_domain' in req.query) ) {
        /*
        bus.emit('message', {category: 'server', type: 'info', msg: 'code = ' + req.query['code']});
        bus.emit('message', {category: 'server', type: 'info', msg: 'state = ' + req.query['state']});
        bus.emit('message', {category: 'server', type: 'info', msg: 'domain = ' + req.query['domain']});
        bus.emit('message', {category: 'server', type: 'info', msg: 'member_id = ' + req.query['member_id']});
        bus.emit('message', {category: 'server', type: 'info', msg: 'scope = ' + req.query['scope']});
        bus.emit('message', {category: 'server', type: 'info', msg: 'server_domain = ' + req.query['server_domain']});

        bus.emit('message', {category: 'server', type: 'info', msg: 'config.portal_link  = ' + bus.config.get("bitrix24").portal_link});
        bus.emit('message', {category: 'server', type: 'info', msg: 'config.client_id  = ' + bus.config.get("bitrix24").client_id});
        bus.emit('message', {category: 'server', type: 'info', msg: 'config.client_secret  = ' + bus.config.get("bitrix24").client_secret});
        bus.emit('message', {category: 'server', type: 'info', msg: 'config.grant_type  = ' + bus.config.get("bitrix24").grant_type});
        bus.emit('message', {category: 'server', type: 'info', msg: 'config.redirect_uri  = ' + bus.config.get("bitrix24").redirect_uri});
        */

        // добавить указание портала
        var url = 'https://' + bus.config.get("bitrix24").portal_link + '/oauth/token/?client_id=' + bus.config.get("bitrix24").client_id + 
           '&grant_type=authorization_code&client_secret=' + bus.config.get("bitrix24").client_secret + '&redirect_uri=' + 
            bus.config.get("bitrix24").redirect_uri + '&code=' + req.query['code'] + '&scope=' + req.query['scope'];

        request(url, function (err, res, data) {
            if (err) {
                bus.emit('message', {category: 'server', type: 'error', msg: 'Bitrix24 request error: ' + err});
            } else {
                bus.emit('message', {type: 'info', msg: data});
            }
        });
    }
}

function read(req, res) {
    // добавить указание портала
    res.redirect('https://' + bus.config.get("bitrix24").portal_link + '/oauth/authorize/?client_id=' + bus.config.get("bitrix24").client_id + 
        '&response_type=code&redirect_uri=' + bus.config.get("bitrix24").redirect_uri);
}

module.exports.auth = auth;
module.exports.read = read;
