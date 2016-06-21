var bus = require('../../lib/system/bus');
var sip = require('sip');
var digest = require('sip/digest');
var proxy = require('sip/proxy');
var os = require('os');
var util = require('util');
var conf = bus.config.get('sipClients');
var contacts = {};
var realm = os.hostname();
var lastToSend;
var registry = {};
var timer;
process.on('uncaughtException', function (e) {
    bus.emit('message', {category: 'debug', type: 'error', msg: e.toString()});
    //console.log(e);
});

function sendContacts() {
  var toSendContacts = [];
  for(var item in contacts) {
    if (!contacts[item][0].params || (contacts[item][0].params.expires != 0)){
      toSendContacts.push(item + '@' + sip.parseUri(contacts[item][0].uri).host + ':' + sip.parseUri(contacts[item][0].uri).port);
    } 
  };
  if (lastToSend != toSendContacts){
    bus.emit('setSipClients', JSON.stringify(toSendContacts));
  }
  lastToSend = toSendContacts;
}

function sipDigestRegister(rq, username) {
  var userinfo = registry[username];
  if(!userinfo) { // we don't know this user and answer with a challenge to hide this fact 
    var session = {realm: realm};
    sip.send(digest.challenge({realm: realm}, sip.makeResponse(rq, 401, 'Authentication Required')));
  } else {
    userinfo.session = userinfo.session || {realm: realm};
    registry[username] = userinfo;
    if(!digest.authenticateRequest(userinfo.session, rq, {user: username, password: userinfo.password})) {
      sip.send(digest.challenge(userinfo.session, sip.makeResponse(rq, 401, 'Authentication Required')));
    }
    else {
      clearTimeout(timer);
      timer = setTimeout(function () {
        delete contacts[username]; 
        sendContacts();
      },parseInt(rq.headers.expires) * 1000);
      userinfo.contact = rq.headers.contact;
      registry[username] = userinfo;
      var rs = sip.makeResponse(rq, 200, 'Ok');
      
      contacts[username] = rq.headers.contact;
      sendContacts();
      rs.headers.contact = rq.headers.contact;
      sip.send(rs);
    }
  }
}
if (conf){
    for (var i = 0; i < conf.length; i++){
      registry[conf[i].user] = { password: conf[i].password}
    }
}

bus.emit('message', {msg: 'SIP_SERVER STARTED:' + require("ip").address()});

proxy.start({
  logger: {
    recv: function (m, i) {
      bus.emit('message', {category: 'sip_proxy', msg: 'RECV from ' + i.protocol + ' ' + i.address + ':' + i.port + '\n' + sip.stringify(m) + '\n'});
    },
    send: function (m, i) {
      bus.emit('message', {category: 'sip_proxy', msg: 'SEND to ' + i.protocol + ' ' + i.address + ':' + i.port + '\n' + sip.stringify(m) + '\n'});
    },
    error: function (e) {
      bus.emit('message', {category: 'error', type: 'error', msg: e.stack});
    }
  }
}, function(rq) {
  if(rq.method === 'REGISTER') {  
    var username = sip.parseUri(rq.headers.to.uri).user;
    sipDigestRegister(rq, username);
  }
  else {
    if (rq.headers.contact && rq.headers.contact[0].uri){
      var tmp_uri = sip.parseUri(rq.headers.contact[0].uri);
      tmp_uri.host = require("ip").address();
      tmp_uri.port = '5060';
      rq.headers.contact[0].uri = sip.stringifyUri(tmp_uri);
    }
    var user = sip.parseUri(rq.uri).user;
    if(contacts[user] && Array.isArray(contacts[user]) && contacts[user].length > 0) {
      rq.uri = contacts[user][0].uri;
      proxy.send(sip.makeResponse(rq, 100, 'Trying'));
      proxy.send(rq);
    }
    else {
      proxy.send(sip.makeResponse(rq, 404, 'Not Found'));
    }
  }
});

bus.on('refresh', function (type) {
  if (type == 'configData') {
    bus.request('sipClients', {}, function (err, data) {
      if (data){
        var tmp=[];
        for (var i = 0; i < data.length; i++){
          tmp[i] = data[i].user;
        }
  
        for (var i = 0; i < data.length; i++){
          if (!registry[data[i].user]){
            registry[data[i].user] = { password: data[i].password}
          } else {
            for( var item in registry ) {
              if (tmp.indexOf(item)+1 == 0){
                delete registry[item];
              }
            } 
          }
        } 
      }
    });
    sendContacts();
  }
});

