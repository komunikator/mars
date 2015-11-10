Ext.Loader.setConfig({enabled: true});
Ext.Loader.setPath('IVR', '/javascripts/app');

Ext.require([
    'IVR.store.Reports',
    'IVR.view.reports.List'
]);

Ext.onReady(function() {
    Ext.create('Ext.container.Viewport', {
        renderTo: Ext.getBody(),
        layout: 'fit',
        items:
                Ext.create('IVR.view.reports.List', {
            store: Ext.create('IVR.store.Reports')//,
        })
    })
});