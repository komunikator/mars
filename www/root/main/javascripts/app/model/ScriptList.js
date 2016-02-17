Ext.define('IVR.model.ScriptList', {
    extend: 'Ext.data.Model',
    proxy: {
        type: 'rest',
        url: _webPath + '/resourceData/scripts',
        reader: {
            type: 'json',
            root: 'data'
        }
    },
    fields: ['id', 'text', 'value'],
    autoLoad: true
});