Ext.define('IVR.view.menu.Tree', {
    extend: 'Ext.tree.Panel',
    xtype: 'menuTree',
    id: 'menuTree',
    title: lang['menu'],
    autoScroll: true,
    rootVisible: false,
    lines: true,
    singleExpand: true,
    useArrows: true,
    iconCls: 'menu',
    tools: [{
            //type: 'refresh',
            xtype: 'button',
            hidden: true,
            iconCls: 'button-refresh',
            tooltip: lang['refresh'],
            handler: function () {
                this.ownerCt.ownerCt.store.reload();
            }
        }],
    columns: [{
            xtype: 'treecolumn',
            dataIndex: 'text',
            //hidden: true,
            hideable: false,
            sortable: false,
            renderer: function (value) {
                if (lang[value])
                    return lang[value];
                return value;
            },
            flex: 1
        }],
    hideHeaders: true,
    viewConfig: {
        listeners: {
            itemclick: function (view, record) {
                if (record.data.children) {
                    // view.toggle(record);
                }
            }
        }
    },
    viewConfig1: {
        enableTextSelection: true,
        stripeRows: true
    },
    store: 'Menu',
    panels: [],
    listeners: {
        afterrender: function () {
            //this.showPanel('settingsMaster');
        }
    },
    showPanel: function (panelId, parentId, n, shiftKey, ctrlKey) {
        //console.log(panelId, parentId, n, shiftKey, ctrlKey);
        if (!checkXtypeExist(panelId)) {
            // console.log("xtype not exist!");
            return;
        }
        if (typeof (this.panels[panelId]) === 'undefined') {
            //console.log("id undefined!");
            Ext.getCmp('content-panel').add({xtype: panelId, itemId: panelId});
            Ext.getCmp('content-panel').doLayout();
            this.panels[panelId] = true;
        }
        ;//else
        Ext.getCmp('content-panel').layout.setActiveItem(panelId);
        if (document.getElementById('setMasterFrame'))
            document.getElementById('setMasterFrame').src = document.getElementById('setMasterFrame').src;

        var panel = Ext.getCmp('content-panel').getComponent(panelId);
        if (panel && panel.store)
            panel.store.load();
        //if ('dialogsList')
        //    Ext.data.StoreManager.lookup('Dialogs').load();
        /*
         if (!createPanel) {
         var panel = Ext.getCmp('content-panel').getComponent(panelId);
         if (panel.reactivate)
         panel.reactivate();
         }
         */
    },
    initComponent: function () {
        this.on('itemclick', function (treePanel, record, item, index, e) {
            var n = record.data;
            var sn = this.selModel.selNode || {};
            //console.log(n);
            if ((n.leaf || n._leaf) && n.id != sn.id) {  // ignore clicks on folders and currently selected node
                /* show panel */
                // if (n.id == 'settingsMaster'){
                //
                // }else
                if (n.id == 'logout') {
                    window.location.href = '/logOut';
                } else if (n.id == 'restart') {
                    IVR.getApplication().socket.send( JSON.stringify(["restartApp"]) );

                    // Попытка переподключения
                    setTimeout(function() {
                        IVR.getApplication().wsLaunch();
                    }, 5000);
                } else {
                    this.showPanel(n.id, n.parentId, n, e.shiftKey, e.ctrlKey);
                }
                return;
            }
        });
        //parent
        this.callParent(arguments);
    }
});