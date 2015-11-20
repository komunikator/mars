Ext.Loader.setConfig({enabled: true});
Ext.Loader.setPath('IVR', '/javascripts/app');
Ext.onReady(function() {
    Ext.tip.QuickTipManager.init();

    var extScript = Ext.create('IVR.view.scripts.Editor', {
                position: 'absolute !important',
    });

    var ext1Script = Ext.create('Ext.Panel', {
                title: lang.user + ': <b>' + window['_username'] + '</b>',
    });

    var scripts = Ext.create('Ext.container.Viewport', {
        renderTo: Ext.getBody(),
        layout: 'fit',
        items:
        [
            ext1Script,
            extScript
        ]
    });

    //extScript.setHeight(200);
    //ext1Script.setHeight(200);
    scripts.setHeight(200);
});