Ext.define('IVR.model.Script', {
    extend: 'Ext.data.Model',
    proxy: {
        type: 'rest',
        url: _webPath + '/scriptData',
        reader: {
            type: 'json',
            root: 'data'
        },
        writer: {
            type: 'json',
            root: 'data'
        }
    },
    fields: ['id','text', 'cls','children','expanded'],
    autoLoad: false
});
