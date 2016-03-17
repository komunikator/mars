var bus = require('../lib/system/bus');
var config = bus.config;

bus.onRequest('getSpecialties', function (param, cb) {
    param.query = param.query || {};
    var data = require('../scripts/08 Запись к врачу/список специалистов.js');
    cb(null, data);
});

bus.onRequest('getDoctors', function (param, cb) {
    // param = param.specialties || {};
    var data = require('../scripts/08 Запись к врачу/список врачей.js');
    cb(null, data);
});

bus.onRequest('getDates', function (param, cb) {
    var data = require('../scripts/08 Запись к врачу/даты приёма.js');
    cb(null, data);
});

bus.onRequest('getTimes', function (param, cb) {
    var data = require('../scripts/08 Запись к врачу/время приёма.js');
    cb(null, data);
});

bus.onRequest('getYear', function (param, cb) {
    var data = require('../scripts/08 Запись к врачу/годы рождения.js');
    cb(null, data);
});

bus.onRequest('getDayMonth', function (param, cb) {
    var data = require('../scripts/08 Запись к врачу/число и месяц рождения.js');
    cb(null, data);
});

bus.onRequest('getFIO', function (param, cb) {
    var data = require('../scripts/08 Запись к врачу/ФИО пациентов.js');
    cb(null, data);
});
