Ext.define('IVR.model.SipConnection', {
    extend: 'Ext.data.Model',
    proxy: {
        type: 'rest',
        url: _webPath + '/listSIP',
        reader: {
            type: 'json',
            root: 'data'
        }
    },
    fields: ['id','type_connect','name'],
    autoLoad: false
});
