Ext.Loader.setConfig({enabled: true});
Ext.Loader.setPath('IVR', _webPath + '/main/javascripts/app');

Ext.onReady(function() {
    Ext.tip.QuickTipManager.init();

    Ext.create('Ext.container.Viewport', {
        renderTo: Ext.getBody(),
        layout: 'border',
        items:
        [
            Ext.create('IVR.view.Header'),
            Ext.create('IVR.view.scripts.Editor', {
                region: 'center'
            })
        ]
    });
});