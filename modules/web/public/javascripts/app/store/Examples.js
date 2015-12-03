Ext.define('IVR.store.Examples', {
    extend : 'Ext.data.Store',
    requires : [
        'IVR.model.Example'
    ],
    model : 'IVR.model.Example',
    storeId : "Examples",
    autoLoad : true,
    autoSync: true,
    proxy : {
        type : 'direct',
        api : {
            //crud here
        },
        reader : {
            type : 'json',
            root: 'Example'
        }
    }
});