var bus = require('../lib/system/bus');
var config = bus.config;
var path_ = '../scripts/08 Запись к врачу/';

bus.onRequest('getSpecialties', function (param, cb) {
    param.query = param.query || {};
    var data = require(path_ + 'список специалистов.js');
    cb(null, data);
});

bus.onRequest('getDoctors', function (param, cb) {
    // param = param.specialties || {};
    var data = require(path_ + 'список врачей.js');
    cb(null, data);
});

bus.onRequest('getDates', function (param, cb) {
    var data = require(path_ + 'даты приёма.js');
    cb(null, data);
});

bus.onRequest('getTimes', function (param, cb) {
    var data = require(path_ + 'время приёма.js');
    cb(null, data);
});

bus.onRequest('getYear', function (param, cb) {
    var data = require(path_ + 'годы рождения.js');
    cb(null, data);
});

bus.onRequest('getDayMonth', function (param, cb) {
    var data = require(path_ + 'число и месяц рождения.js');
    cb(null, data);
});

bus.onRequest('getFIO', function (param, cb) {
    var data = require(path_ + 'ФИО пациентов.js');
    cb(null, data);
});
