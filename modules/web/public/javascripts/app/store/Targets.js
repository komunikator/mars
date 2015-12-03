Ext.define('IVR.store.Targets', {
    extend: 'Ext.data.Store',
    model: 'IVR.model.Target',
    //autoLoad: true,
    remoteSort: true,
    //sortOnLoad: true, 
    //sorters: { property: 'msisdn', direction : 'DESC' },
    storeId:'Targets',	
    //autoSync: true,
    remoteFilter: true,
    pageSize: 10
});