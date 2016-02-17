Ext.define('IVR.view.settings.Editor', {
    extend: 'IVR.view.code.Editor',
    xtype: 'settingsEditor',
    layout: 'border',
    listTitle: lang['settings'],
    listStore: Ext.data.StoreManager.lookup('SettingsList') ? Ext.data.StoreManager.lookup('SettingsList') : Ext.create('IVR.store.SettingsList'),
    constructor: function(config) {
        this.items[0].iconCls = 'icon_wrench';
        this.callParent([config]);
        var c = this.getComponent('form').getForm().findField('f');
        var insertTextFn = function(me) {
            me.ownerCt.ownerItem.ownerCt.getComponent('events').menu.getComponent('eventsGrid').insertText(this.text);
        };
        var list = this.getComponent('list');
        list.basePath = 'config/';
        list.savePrefix = '';
        list.elementName = lang.task_;
        //list.getSelectionModel().selectRow(0);
        list.selectOnLoad = {index: 0};
        list.hide();
        list.ownerCt.doLayout();
        this.getComponent('form').getForm().findField('f').mode = 'application/json';
    }
});
