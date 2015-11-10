Ext.define('IVR.model.CompanyList', {
    extend: 'Ext.data.Model',
    proxy: {
        type: 'rest',
        url: '/resourceData/companies',
        reader: {
            type: 'json',
            root: 'data'
        }
    },
    fields: ['id', 'text', 'value'],
    autoLoad: true
});
