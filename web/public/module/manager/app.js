Ext.Loader.setConfig({enabled: true});
Ext.Loader.setPath('IVR', '/javascripts/app');

Ext.require([
    'IVR.store.Reports',
    'IVR.view.reports.List'
]);

Ext.onReady(function() {
    Ext.QuickTips.init();
    Ext.create('Ext.container.Viewport', {
        style: 'padding: 2px 5px;',
        renderTo: Ext.getBody(),
        layout: 'fit',
        items:
          	Ext.create('IVR.view.companies.Editor')
    })
});