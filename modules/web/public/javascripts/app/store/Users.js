Ext.define('IVR.store.Users', {
    extend: 'Ext.data.Store',
    model: 'IVR.model.User',
    autoLoad: true,
    autoSync: true,
    remoteFilter: true
});