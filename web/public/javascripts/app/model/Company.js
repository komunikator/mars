Ext.define('IVR.model.Company', {
    extend: 'Ext.data.Model',
    proxy: {
        type: 'rest',
        url: '/companyData',
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
