var bus;

exports.init = function (_bus) {
    bus = _bus;
};

exports.read = function (req, res) {
    res.send({success: false, data: {}});
};