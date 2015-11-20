Ext.Loader.setConfig({enabled: true});
Ext.Loader.setPath('IVR', '/javascripts/app');

Ext.onReady(function() {
    Ext.tip.QuickTipManager.init();

    Ext.create('Ext.container.Viewport', {
        renderTo: Ext.getBody(),
        layout: 'border',
        items:
        [
            Ext.create('Ext.Panel', {
                height: 64,
                region: 'north',
                title: lang.user + ': <b>' + window['_username'] + '</b><p>Выход</p>'
            }),
            Ext.create('IVR.view.scripts.Editor', {
                region: 'center'
            })
        ]
    });
});