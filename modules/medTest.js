var bus = require('../lib/system/bus');
var config = bus.config;

bus.onRequest('getSpecialties', function (param, cb) {
    param.query = param.query || {};
    var data = require('../scripts/08 Запись к врачу/список специалистов.js');
    // data = data.join(',');
    // console.log('----------------------');
    // console.log(data);
    // console.log('----------------------');

    cb(null, data);
});

bus.onRequest('getDoctors', function (param, cb) {
    param = param.specialties || {};
    console.log('=====================param');
    console.log(param);
    console.log('param=======================');
    var data = require('../scripts/08 Запись к врачу/список врачей.js');
    // data = data.join(',');
    // console.log('----------------------');
    // console.log(data);
    // console.log('----------------------');

    cb(null, data);
});