Ext.define('IVR.view.settings.Tree', {
    extend: 'Ext.tree.Panel',
    xtype: 'settingsTree',
    title: lang['settings'],
    autoScroll: true,
    rootVisible: false,
    lines: true,
    //singleExpand: true,
    useArrows: true,
    store: 'Settings',
    plugins: [
        Ext.create('Ext.grid.plugin.CellEditing', {
            clicksToEdit: 2
        })
    ],
    columns: [
        {
            xtype: 'treecolumn',
            dataIndex: 'key',
            flex: 1//
                    //sortable: false,
        },
        {
            dataIndex: 'value',
            flex: 4,
            //sortable: false,
            editor: {
                xtype: 'textfield',
                allowBlank: false,
                allowOnlyWhitespace: false
            }
        }
    ],
    //hideHeaders: true,
    constructor: function(config) {
        config = Ext.applyIf(config || {}, {
            //id: 'settings-tree',
            iconCls: 'icon_wrench'
        });

        this.callParent([config]);
    }
});