Ext.define('IVR.store.Settings', {
    extend: 'Ext.data.TreeStore',
    model: 'IVR.model.Setting',
    autoLoad: true,
    //autoSync: true,
    //remoteFilter: true,
    sortOnLoad: true,
    folderSort : true,		
    root: {
	id:'root',
        text: 'Settings',
        expanded: true
    }
});