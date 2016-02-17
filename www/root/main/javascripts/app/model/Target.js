Ext.define('IVR.model.Target', {
    extend: 'Ext.data.Model',
    proxy: {
        type: 'rest',
        url: _webPath + '/targetData',
        reader: {
            type: 'json',
            root: 'data',
            totalProperty: 'total'
        }
    },
    // gdate,step,session_id,msisdn,script,data,status,reason
    fields: [
        {
            name: 'msisdn',
            name: 'params'
        }
    ]
});
