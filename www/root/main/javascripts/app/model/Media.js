Ext.define('IVR.model.Media', {
    extend: 'Ext.data.Model',
    proxy: {
        type: 'rest',
        url: _webPath + '/mediaData',
        reader: {
            type: 'json',
            root: 'data'
        },
        writer: {
            type: 'json',
            root: 'data'
        }
    },
    fields: ['id','text', 'cls','expanded','src'],
    autoLoad: true
});
