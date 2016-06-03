var bus = require('../lib/system/bus');
var cp = require('child_process').fork(__dirname + '/proxy/sipProxy', {silent: true, execPath: 'node'});
bus.setWorker(cp);

// cp.on('message', function(m) {
//   bus.emit('message', {category: 'console', type: 'info', msg: m});
//   for(var item in m) {
//     if (m[item] == 'ready'){
//       bus.emit('message', {category: 'console', type: 'info', msg: 'SIP server is started'});
//     } else {
//       if (contacts != m) {
//         bus.emit('setSipClients', m);
//       }
//       contacts = m;
//     }
//   };
// });
