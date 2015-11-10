Ext.Loader.setConfig({enabled: true});
Ext.Loader.setPath('IVR', '/javascripts/app');

Ext.require([
    'IVR.store.Dialogs',
    'IVR.view.dialogs.List'
]);

Ext.onReady(function() {
    Ext.create('IVR.view.dialogs.List', {
        store: Ext.create('IVR.store.Dialogs'),
        renderTo: Ext.getBody()
    });
});