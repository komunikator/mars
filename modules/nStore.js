var dbPath = 'data/cdr.db',
        cdrs,
        connection,
        nStore = require('nstore'),
        bus = require('../lib/system/bus'),
        scriptList = [];

nStore = nStore.extend(require('nstore/query')());

function connect() {
    cdrs = nStore.new(dbPath, function () {
        bus.emit('message', {type: 'info', msg: "nStore DB connected"});
        /*
         cdrs.filterFn = function(doc, meta) {
         return doc.lastAccess > Date.now() - 360000;
         };
         */
    });
}

function sortHashTableByKey(hash, key_order, desc)
{

    function IsNumeric(num) {
        return (num >= 0 || num < 0);
    }
    ;

    var tmp = [],
            end = [],
            f_order = null;
    desc = (desc.toUpperCase() == 'DESC') || false;
    for (var key in hash)
    {
        if (hash.hasOwnProperty(key))
        {
            tmp.push(hash[key][key_order] + "\t" + key);
        }
    }
    //console.log(tmp);

    if (hash && hash[0] && IsNumeric(hash[0][key_order].split(/\t/)[0]))
    {
        f_order = function (a, b) {
            a = a.split(/\t/)[0];
            b = b.split(/\t/)[0];
            if (desc)
                return b - a;
            return a - b;
        };
    }
    else
    {
        tmp.sort(f_order);
        if (desc)
            tmp.reverse();
    }
    for (var i = 0, l = tmp.length; i < l; i++)
    {
        var key = tmp[i].split(/\t/)[1];
        end.push(hash[key]);
    }
    return end;
}

bus.on('cdr', function (data) {
    var dtmfString = '';
    var i = 0,
            len = data.dtmfData ? data.dtmfData.length : 1;

    var date = data.dtmfData ? new Date(data.times.ringing) : new Date(data.times.end);
    if (data.dtmfData && data.dtmfData[0] && data.dtmfData[0].keys) {
        dtmfString = String(data.dtmfData[0].keys).replace(';', '');
        //console.log(dtmfString);
        while (++i < len)
        {
            dtmfString += ';' + String(data.dtmfData[i].keys).replace(';', '');
        }
    }

    var rec = {
        gdate: require('dateformat')(date, 'yyyy.mm.dd HH:MM:ss'),
        step: i,
        session_id: data.sessionID,
        parent_id: data.parentID,
        msisdn: (data.type == 'outgoing') ? data.to : data.from,
        service_contact: (data.type == 'outgoing') ? data.from : data.to,
        script: data.script != undefined ? data.script : '',
        //     data: data.dtmfData ? data.dtmfData[i].keys : '',
        data: dtmfString,
        status: data.status ? data.status : '',
        reason: data.statusReason ? data.statusReason : '',
        duration: data.duration,
        type: data.type,
        pin: data.pin,
        log: data.log.join('\n')
    };

    if (data.refer)
        rec.refer = data.refer;
    cdrs.save(null, rec, function (err, key) {
        if (err) {
            bus.emit('message', {category: 'call', sessionID: data.sessionID, type: 'error', msg: "Error executing query:" + err});
            console.log("Error executing query:", err, key);
            return;
        }
    });

})

bus.onRequest('reportData', function (param, cb) {
    param.query = param.query || {};
    var search = param.query.search && JSON.parse(param.query.search);
    //console.log(param.query);
    //console.log(search);
    //console.log(new Date(search.gdate))
    var start = param.query.start * 1 || 0;
    var limit = param.query.page * param.query.limit * 1 || 50;
    //console.log(start, limit);

    //CONDITION
    var gdateS = require('dateformat')(new Date(), "yyyy.mm.dd") + ' 00:00';
    var gdateE = require('dateformat')((function () {
        var d = new Date();
        d.setDate(d.getDate() + 1);
        return d;
    })(), "yyyy.mm.dd") + ' 00:00';
    if (search && search.gdate)
    {
        var gdates = search.gdate.split('|');
        if (gdates[1]) {
            gdateS = gdates[0];
            gdateE = gdates[1];
        }
    }
    ;
    cdrs.find(function (doc, key) {
        if (doc.data && typeof doc.data === "string")
            doc.data = doc.data.replace(/\;/g, '<br>');
        var flag = (doc.gdate >= gdateS && doc.gdate <= gdateE);
        if (!flag)
            return flag;
        if (search)
            for (var k in search)
                if (k != 'gdate')
                    flag = (flag && ((doc[k] + '').search(search[k]) != -1));
        return flag;
        //CONDITION
    }, function (err, results) {
        if (err) {
            console.log('nStore query Error:', err);
            return;
        }
        //console.timeEnd('find');
        //console.time('sort');
        //TOTAL
        var total = 0;
        if (results)
            total = Object.keys(results).length;
        if (param.query.exportToExcel)
        {
            start = 0;
            limit = total;
        }
        //TOTAL

        var data = {total: total, items: []};

        //SORT
        if (param.query.sort) {
            var sort = JSON.parse(param.query.sort);
            if (sort && sort[0] && sort[0].property)
                results = sortHashTableByKey(results, sort[0].property, sort[0].direction);
        }
        //console.timeEnd('sort');
        //console.time('page');
        //SORT
        ;

        //PAGE
        var i = 0;
        for (var id in results) {
            if (i >= limit)
                break;
            if (i >= start) {
                var rec_file = 'rec/' + (results[id] && results[id].session_id) + '.wav';
                if (results[id] && require('fs').existsSync(rec_file))
                    results[id].record = rec_file;
                data.items.push(results[id]);
            }
            ;
            i++;
        }

        cb(null, data);
        //console.timeEnd('page');
        //PAGE
    });
})

connect();