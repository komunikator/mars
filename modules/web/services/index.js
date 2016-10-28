'use strict';
const contact = require('./registeredCall');
// const myserv = require('./myserv');
// const authentication = require('./authentication');
// const user = require('./user');

module.exports = function() {
  const app = this;


  app.configure(authentication);
  app.configure(user);
  app.configure(myserv);
  app.configure(contact);
};
