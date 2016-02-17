Ext.define('IVR.model.SettingList', {
    extend: 'Ext.data.Model',
    proxy: {
        type: 'rest',
        url: _webPath + '/resourceData/settings',
        reader: {
            type: 'json',
            root: 'data'
        }
    },
    fields: ['id', 'text', 'value'],
    autoLoad: true
});
