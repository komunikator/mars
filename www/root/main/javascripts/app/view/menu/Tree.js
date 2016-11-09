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

                switch(n.id) {
                  case 'logout':
                    window.location.href = '/logOut';
                    break;

                  case 'restart':
                    Ext.Msg.show({
                        title : lang['restart'],
                        msg : lang['confirmRestart'],
                        width : 350,
                        closable : false,
                        buttons : Ext.Msg.YESNO,
                        buttonText :
                        {
                            yes : lang['yes'],
                            no : lang['no']
                        },
                        multiline : false,
                        fn : function(buttonValue, inputText, showConfig){
                            if (buttonValue == 'yes') {
                                IVR.getApplication().socket.send( JSON.stringify(["restartApp"]) );

                                Ext.MessageBox.wait(lang['restartWait'], lang['restart']);

                                setInterval(function() {
                                    var request = new XMLHttpRequest();
                                    var url = window.location;
                                    request.onreadystatechange = function () {
                                        if (request.readyState === 4 && request.status === 200) {
                                            console.log('Перезагружаем страницу');
                                            window.location.reload();
                                        } else {
                                            console.log('Сервер не доступен');
                                        }
                                    }
                                    request.open('GET', window.location);
                                    request.send();
                                }, 2000);
                            }
                        },
                        icon : Ext.Msg.QUESTION
                    });
                    break;

                  case 'upgrade':
                    function startUpgrade() {
                        var request = new XMLHttpRequest();
                        var url = window.location.href + 'startUpdates';

                        request.onreadystatechange = function () {
                            if (request.readyState === 4 && request.status === 200) {
                                var response = JSON.parse(request.responseText);

                                if (response.success) {
                                    Ext.showInfo(lang['completeUpdate'] + '<br>' + lang['toRestart']);
                                } else {
                                    Ext.showInfo(lang['errorUpdate']);
                                }
                            }
                        }
                        request.open('GET', url);
                        request.send();
                    }

                    function showOfferUpgrade(msg) {
                        Ext.Msg.show({
                            title : lang['availableUpdates'],
                            msg : msg + '<br> ' + lang['toUpgrade'],
                            width : 270,
                            closable : false,
                            buttons : Ext.Msg.YESNO,
                            buttonText :
                            {
                                yes : lang['yes'],
                                no : lang['no']
                            },
                            multiline : false,
                            fn : function(buttonValue, inputText, showConfig){
                                if (buttonValue == 'yes') {
                                    startUpgrade();
                                    Ext.showInfo(lang['updating']);
                                }
                            },
                            icon : Ext.Msg.QUESTION
                        });
                    }

                    var request = new XMLHttpRequest();
                    var url = window.location.href + 'updates';

                    request.onreadystatechange = function () {
                        if (request.readyState === 4 && request.status === 200) {
                            var response = JSON.parse(request.responseText);
                            var current = response.data.current;
                            var last = response.data.last;
                            var availableUpdates = response.data.availableUpdates;

                            if (availableUpdates) {
                                var msg = lang['versionBuild'] + ' ' + current + '<br> ' + lang['availableVersionBuild'] + ' ' + last;
                                showOfferUpgrade(msg);
                            } else {
                                Ext.showInfo(lang['noUpdatesAvailable']);
                            }
                        }
                    }
                    request.open('GET', url);
                    request.send();
                    break;

                  default:
                    this.showPanel(n.id, n.parentId, n, e.shiftKey, e.ctrlKey);
                    break;
                }

                return;
            }
        });
        //parent
        this.callParent(arguments);
    }
});