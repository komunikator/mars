/*
 * setting module
 */

/**
 * This method read records
 *
 * @param req
 * @param res
 */

var bus;
var lang;
exports.init = function (_bus) {
    bus = _bus;
    bus.request('lang', {}, function (err, data) {
        lang = data || {};
    });

};

function getTreeNode(data, id) {
    //console.log(data);
    //return [];
    var nodes = [];
    var curNode = data;
    var curID = '';
    if (id != 'root') {
        curID = id + ':';
        var ids = id.split(":");
        //ids.shift();
        ids.forEach(function (key) {
            if (curNode[key])
                curNode = curNode[key];
        });
    }
    ;
    for (var key in curNode) {
        var node = {
            id: encodeURIComponent(curID + key),
            key: key,
            leaf: false,
            iconCls: "folder-value"
        };
        if (typeof curNode[key] !== 'object') {
            node.value = curNode[key];
            node.leaf = true;
            node.iconCls = "param-value";
        }
        ;
        nodes.push(node);
    }
    return nodes;
}
;

exports.read = function (req, res) {
    var params = req.body;
    var id = req.params['id'];

    var ids = id.split(":");
    //request = {source: 'settingData', id: ids[0]};

    bus.request('settingData', {id: ids[0]}, function (err, data) {
        res.send({success: true, data: getTreeNode(data, id)});
    });
};

/**
 * This method create records
 *
 * @param req
 * @param res
 */
exports.add = function (req, res) {
    var params = req.body,
            item;

    item = new exports.model.User(params);

    item.save(function (err) {
        if (!err) {
            res.send({success: true, User: item});
        }
        else {
            res.send({success: false, User: item});
        }
    });
};

/**
 * This method update records
 *
 * @param req
 * @param res
 */
exports.update = function (req, res) {
    var params = req.body, id = params._id;

    //remove id from values to update
    delete params._id;

    exports.model.User.update({"_id": id}, {$set: params}, {upsert: false}, function (err) {
        if (!err) {
            res.send({success: true});
        }
        else {
            res.send({success: false});
        }
    });
};

/**
 * This method remove records
 *
 * @param req
 * @param res
 */
exports.destroy = function (req, res) {
    var params = req.body;

    exports.model.User.remove({"_id": params._id}, function (err) {
        if (!err) {
            res.send({success: true});
        }
        else {
            res.send({success: false});
        }
    });
};