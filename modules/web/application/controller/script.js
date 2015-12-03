/*
 * script module
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
    var nodes = [];
    if (id == 'root')
        //if (Array.isArray(data)) //script list	
        data.forEach(function (key) {
            nodes.push({
                text: key.replace('.js', ''),
                //"iconCls":"icon_menu_cdr",
                id: key,
                //"leaf":true,
                enabled: true
            });
        });
    else {
//if (typeof data === 'object') //script source
        var curNode = data;
        var ids = id.split(":");
        ids.shift();
        ids.forEach(function (key) {
            if (curNode[key])
                curNode = curNode[key];
        });
        var isLeaf;
        for (var key in curNode)
        {
            if (typeof curNode[key] == 'function' || curNode[key] instanceof Function)
                curNode[key] = curNode[key].toString();
            if (typeof curNode[key] == 'string')
                curNode[key] = curNode[key].replace(/<(\w+)>/, '[$1]');

            isLeaf = (typeof curNode[key] !== 'object');
            var text = curNode[key];
            var src = '';
            if (!isLeaf && curNode[key] && curNode[key]['mark'])
                src = lang['mark'] + ':' + curNode[key]['mark'];
            var iconCls = key;
            text = isLeaf ? text : key;
            if (text == true || key == 'time' || key == 'mark' || key == 'goto')
                text = key;
            text = lang[text] ? lang[text] : text;
            if (key == 'time')
                text += ' "' + curNode[key] + '" (sec)';
            if (key == 'mark')
                text += ' "' + curNode[key] + '"';
            if (key == 'goto')
                text += ': ' + lang['mark'] + ' "' + curNode[key] + '"';
            if (ids && ids[ids.length - 1] == 'dtmfOn')
            {
                var keys = key;
                if (keys == 'def')
                    keys = lang['default'];
                text = lang['keys'] + ' "' + keys + '"';
                iconCls = 'keys';
            }

            function pushNode() {
                var nodeParam =
                        {
                            text: text,
                            iconCls: iconCls,
                            src: src,
                            id: encodeURIComponent(id + ':' + key), //.replace(/%20/g,'+')
                            leaf: isLeaf,
                            expanded: true
                        };
                if (!nodeParam.leaf)
                {
                    nodeParam.data = getTreeNode(data, id + ':' + key)
                }
                nodes.push(nodeParam);
            }

            if (key == 'file')
            {
                iconCls = 'sound';
                var files = curNode[key].split(';');
                if (/^function/.test(curNode[key]))
                    files = [curNode[key]];
                files.forEach(function (file) {
                    //text += '<audio type="audio/wav" src="/' + file + '" controls="" autobuffer="">Your browser does not support the audio element.</audio>';
                    id += ':' + file;
                    text = /^function/.test(file) ? file : file.split("/").pop();
                    src = '/' + file;
                    pushNode();
                });
            }
            else
                pushNode();
        }
    }
    return nodes;
}
;

exports.read = function (req, res) {
    var id = decodeURIComponent(req.query['node']);
    var ids = id.split(":");
    //request = {source: 'scriptData', id: ids[0]};

    bus.request('scriptData', {id: ids[0]}, function (err, data) {
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