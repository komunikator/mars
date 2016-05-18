Ext.define('IVR.view.restart.List', {
    extend: 'Ext.container.Container',
    xtype: 'restart',
    id: 'restart',
    title: lang['restart'],
    html: '<iframe id="setMasterFrame" src="/wizard" width="100%" style="min-height: 100%"></iframe>'
});