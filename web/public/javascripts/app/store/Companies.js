Ext.define('IVR.store.Companies', {
    extend: 'Ext.data.TreeStore',
    model: 'IVR.model.Company',
    autoLoad: true,
    //autoSync: true,
    //remoteFilter: true,
    root: {
	id:'root',
        text: 'Companies',
        expanded: true
    }
});