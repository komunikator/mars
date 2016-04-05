Ext.define('IVR.view.master.List', {
    extend: 'Ext.container.Container',
    xtype: 'settingsMaster',
    id: 'settingsMaster',
    title: lang['sett_master'],
    html: '<iframe id="setMasterFrame" src="/wizard" width="100%" style="height: calc(100vh - 110px)"></iframe>'
});
