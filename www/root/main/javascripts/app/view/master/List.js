Ext.define('IVR.view.master.List', {
    extend: 'Ext.container.Container',
    xtype: 'settingsMaster',
    id: 'settingsMaster',
    title: lang['sett_master'],
    html: '<iframe id="setMasterFrame" src="/wizard" width="100%" style="min-height: 100%"></iframe>'
});