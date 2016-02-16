Ext.define('IVR.view.scripts.Tree', {
    extend: 'IVR.view.AudioTree',
    xtype: 'scriptsTree',
    title: 'Scripts',
    autoScroll: true,
    rootVisible: false,
    lines: true,
    //singleExpand: true,
    useArrows: true,
    store: 'Scripts',
    constructor:  function (config) {
        config = Ext.applyIf(config || {}, {
            id: 'scripts-tree',
            iconCls: 'icon_menu_diag_monitor'
        });

        this.callParent([config]);
    }
});