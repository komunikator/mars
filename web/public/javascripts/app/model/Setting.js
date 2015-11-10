Ext.define('IVR.model.Setting', {
    extend: 'Ext.data.Model',
    proxy: {
        type: 'rest',
        url: '/settingData',
        reader: {
            type: 'json',
            root: 'data'
        },
        writer: {
            type: 'json',
            root: 'data'
        }
    },
    fields: ['id', 'key', 'value', 'cls', 'expanded'],
    autoLoad: true
});
