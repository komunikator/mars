Ext.Loader.setConfig({enabled: true});
Ext.Loader.setPath('IVR', '/javascripts/app');

Ext.require([
    'IVR.store.Media',
    'IVR.view.media.Tree'
]);

Ext.onReady(function() {
    Ext.create('IVR.view.media.Tree', {
        store: Ext.create('IVR.store.Media'),
        renderTo: Ext.getBody()
    });
});