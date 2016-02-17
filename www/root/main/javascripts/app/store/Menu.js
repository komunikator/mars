Ext.define('IVR.store.Menu', {
    extend: 'Ext.data.TreeStore',
    model: 'IVR.model.Menu',
    autoLoad: true,
    //autoSync: true,
    //remoteFilter: true,
    root: {
	id:'root',
        text: 'Menu',
        expanded: true
    }
});