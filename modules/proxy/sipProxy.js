var bus = require('../../lib/system/bus');
var sip = require('sip');
var digest = require('sip/digest');
var proxy = require('sip/proxy');
var os = require('os');
var util = require('util');
var conf = bus.config.get('sipClients');
var contacts = {};
var request = require('request');
var btoa = require('btoa');
var realm = os.hostname();
var lastToSend;
var registry = {};

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
  // process.send(JSON.stringify(toSendContacts));
}

function sipDigestRegister(rq, username) {
  var userinfo = registry[username];
  if(!userinfo) { // we don't know this user and answer with a challenge to hide this fact 
    var session = {realm: realm};
    sip.send(digest.challenge({realm: realm}, sip.makeResponse(rq, 401, 'Authentication Required')));
  } else {
    userinfo.session = userinfo.session || {realm: realm};
    // console.log(userinfo);
    registry[username] = userinfo;
    if(!digest.authenticateRequest(userinfo.session, rq, {user: username, password: userinfo.password})) {
      sip.send(digest.challenge(userinfo.session, sip.makeResponse(rq, 401, 'Authentication Required')));
    }
    else {
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
    registry[conf[i].username] = { password: conf[i].password}
  }
}
bus.emit('message', {msg: 'SIP_SERVER STARTED:' + require("ip").address()});
proxy.start({
  // logger: {
  //    //recv: function(m) { JSON.stringify(sip.parseUri(m.headers.to.uri).user) },
  //   // send: function(m) {console.log('------------SEND-----------'); console.log(m); console.log('------------SEND-----------'); },
  //   //error: function(e) { bus.emit('message', {msg: 'SIP_SERVER Error: ' + e.toString()}); }
  // }
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
