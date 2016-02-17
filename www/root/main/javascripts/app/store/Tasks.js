Ext.define('IVR.store.Tasks', {
    extend: 'Ext.data.TreeStore',
    model: 'IVR.model.Task',
    autoLoad: true,
    //autoSync: true,
    //remoteFilter: true,
    root: {
	id:'root',
        text: 'Tasks',
        expanded: true
    }
});