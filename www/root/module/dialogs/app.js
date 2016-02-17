Ext.Loader.setConfig({enabled: true});
Ext.Loader.setPath('IVR', _webPath + '/main/javascripts/app');

Ext.require([
    'IVR.store.Dialogs',
    'IVR.view.dialogs.List'
]);

Ext.onReady(function() {
    Ext.create('Ext.container.Viewport', {
        renderTo: Ext.getBody(),
        layout: 'border',
        items:
        [
            Ext.create('IVR.view.Header'),
            Ext.create('IVR.view.dialogs.List', {
                store: Ext.create('IVR.store.Dialogs'),
                region: 'center'
            })
        ]
    });
});