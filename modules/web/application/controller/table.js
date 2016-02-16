/*
 * table module
 */

/**
 * This method read records
 *
 * @param req
 * @param res
 */
var bus;
exports.init = function (_bus) {
    bus = _bus;
};


exports.read = function (req, res) {
    var tableName = req.params['name'];
    //console.time('tableData');
    //console.log(req.query.config);
    if (req.query.config)
    {
        req.query = JSON.parse(req.query.config);
        req.query.exportToExcel = true;
    }
    bus.request(tableName + 'Data', {query: req.query}, function (err, data) {
        //console.timeEnd('tableData');
        if (req.query.exportToExcel) {
            var conf = {};
            // uncomment it for style example  
            //conf.stylesXmlFile = "styles.xml";
            conf.cols = [];
            conf.rows = [];
            if (data && data.items && data.items[0]) {
                for (var name in data.items[0]) {
                    conf.cols.push(
                            {
                                caption: (typeof name === 'number') ? 'field' + name : name.toUpperCase(),
                                captionStyleIndex: 1,
                                type: 'string',
                                width: 20
                            });
                }
                data.items.forEach(function (row) {
                    var rowData = [];
                    for (var name in row) {
                        rowData.push(row[name]);
                    }
                    ;
                    conf.rows.push(rowData);
                }
                );
            }
            var result = require('excel-export').execute(conf);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats');
            res.setHeader("Content-Disposition", "attachment; filename=" + tableName + ".xlsx");
            res.end(result, 'binary');
        }
        else
            res.send({success: true, data: data && data.items || [], total: data && data.total || 0});
    });
};

