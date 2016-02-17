Ext.define('IVR.model.TargetList', {
    extend: 'Ext.data.Model',
    proxy: {
        type: 'rest',
        url: _webPath + '/resourceData/targets',
        reader: {
            type: 'json',
            root: 'data'
        }
    },
    fields: ['id', 'text', 'value'],
    autoLoad: true
});