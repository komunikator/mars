Ext.define('IVR.store.Reports', {
    extend: 'Ext.data.Store',
    model: 'IVR.model.Report',
    //autoLoad: true,
    remoteSort: true,
    sortOnLoad: true, 
    sorters: { property: 'gdate', direction : 'DESC' },
    storeId:'Reports',	
    //autoSync: true,
    remoteFilter: true,
    pageSize: 10
});