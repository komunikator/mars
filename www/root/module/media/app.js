Ext.Loader.setConfig({enabled: true});
Ext.Loader.setPath('IVR', _webPath + '/main/javascripts/app');

Ext.require([
    'IVR.store.Media',
    'IVR.view.media.Tree'
]);

Ext.onReady(function() {
    Ext.create('Ext.container.Viewport', {
        renderTo: Ext.getBody(),
        layout: 'border',
        items:
        [
            Ext.create('IVR.view.Header'),
		    Ext.create('IVR.view.media.Tree', {
		        store: Ext.create('IVR.store.Media'),
				region: 'center'
		    })
        ]
    });
});