Ext.define('IVR.store.Media', {
    extend: 'Ext.data.TreeStore',
    model: 'IVR.model.Media',
    autoLoad: true,
    //autoSync: true,
    //remoteFilter: true,
    sortOnLoad: true,
    folderSort : true,		
    sorters: [{
            property: 'text',
            direction: 'asc'
        }],
    root: {
	id:'root',
        text: 'Media',
        expanded: true
    }
});