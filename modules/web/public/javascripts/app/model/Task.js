Ext.define('IVR.model.Task', {
    extend: 'Ext.data.Model',
    proxy: {
        type: 'rest',
        url: '/taskData',
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
