Ext.define('IVR.model.Report', {
    extend: 'Ext.data.Model',
    proxy: {
        type: 'rest',
        url: _webPath + '/tableData/report',
        reader: {
            type: 'json',
            root: 'data',
            totalProperty: 'total'
        }
    },
    // gdate,step,session_id,msisdn,script,data,status,reason
    fields: [
        {
            name: 'gdate'
        },
        {
            name: 'step'
        },
        {
            name: 'session_id'
        },
        {
            name: 'parent_id'
        },
        {
            name: 'msisdn'
        },
        {
            name: 'script'
        },
        {
            name: 'data'
        },
        {
            name: 'status'
        },
        {
            name: 'reason'
        },
        {
            name: 'record'
        },
        {
            name: 'duration'
        },
        {
            name: 'service_contact'
        },
        {
            name: 'refer'
        },
        {
            name: 'type'
        }
    ]
});
