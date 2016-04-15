Ext.define('IVR.view.tasks.Tree', {
    extend: 'IVR.view.EditTree', //Ext.tree.Panel',
    xtype: 'tasksTree',
    title: lang['tasks'],
    autoScroll: true,
    rootVisible: false,
    lines: true,
    //singleExpand: true,
    useArrows: true,
    store: 'Tasks',
    editor: Ext.create('IVR.view.editor.Window', {}),
    actions: ['refresh', 'createFolder', 'add', 'edit', 'remove'],
    columns: [
        {
            xtype: 'actioncolumn',
            width: 30,
            items: [{
                    icon: 'images/ivr/menu_editor.png',
                    tooltip: 'Menu',
                    handler: function(gridview, el, rowIndex, colIndex, e, rec, rowEl) {
                        console.log(gridview.ownerCt.menu.showAt(e.xy));
                        //gridview.menu.showAt(e.xy);
                        /*
                         Ext.create('Ext.menu.Menu', {
                         items: [
                         {text: 'test'},
                         {text: 'test2'}
                         ]
                         }).showAt(e.xy);
                         */

                        //var rec = grid.getStore().getAt(rowIndex);
                        //alert("Terminate " + rec.get('firstname'));
                    }
                }]
        },
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
    constructor: function(config) {
        config = Ext.applyIf(config || {}, {
            //id: 'tasks-tree',
            iconCls: 'file'
        });

        this.callParent([config]);
        this.removeDocked(this.getDockedComponent('player'), true);
        var self = this;
        self.nameTest = function(text, cfg, flag) {
            if (flag == undefined)
                flag = true;
            if (!(/^[ a-яА-Яa-zA-Z0-9_/-]+$/.test(text) && flag)) {
                var newMsg = '<span style="color:red">' + lang.enterTaskName + ':</span>';
                cfg.value = text;
                Ext.Msg.show(Ext.apply({}, {msg: newMsg}, cfg));
                return false;
            }
            ;
            return true;
        };
        this.addDocked(
                {
                    dock: 'top',
                    xtype: 'toolbar',
                    itemId: 'toptoolbar',
                    items:
                            [
                                {
                                    xtype: 'button',
                                    text: lang.refresh,
                                    itemId: 'refresh',
			    	    hidden: true,
                                    iconCls: 'button-refresh',
                                    stretch: false,
                                    align: 'left',
                                    handler: function(btn, e, node) {
                                        if (node)
                                        {
                                            self.refreshNode(node);
                                            return;
                                        }
                                        self.refreshNode(self.getSelNode() || self.getRootNode());
                                    }
                                },
                                {
                                    xtype: 'button',
                                    text: lang.create,
                                    itemId: 'createFolder',
                                    iconCls: 'x-tree-icon-parent',
                                    stretch: false,
                                    align: 'right',
                                    handler: function() {
                                        Ext.MessageBox.prompt(lang.createTask, lang.enterTaskName + ':', function(btn, text, cfg) {
                                            if (btn == 'ok') {
                                                if (!self.nameTest(text, cfg))
                                                    return;
                                                Ext.Ajax.request({
                                                    url: _webPath + '/taskData/create',
                                                    method: 'post',
                                                    params: {
                                                        name: text
                                                    },
                                                    success: function(response, o) {
                                                        var resObj = Ext.decode(response.responseText);
                                                        if (resObj && resObj.success)
                                                            self.getDockedComponent('toptoolbar').getComponent('refresh').handler(null, null, self.getRootNode());
                                                        else
                                                            Ext.showError(resObj.message || lang.error);

                                                    },
                                                    failure: function(response, o) {
                                                        Ext.showError(response.responseText);
                                                    }
                                                });
                                            }
                                        });
                                    }
                                },
                                {
                                    xtype: 'button',
                                    itemId: 'add',
                                    text: lang.add,
                                    handler: function() {
                                        if (self.getSelectionModel().hasSelection()) {
                                            var selectedNode = self.getSelectionModel().getSelection();
                                            if (selectedNode[0])
                                            {
                                                var cb = function() {
                                                    self.editor.editNode = selectedNode[0];
                                                    self.editor.show();
                                                };
                                                if (!selectedNode[0].isExpanded() && !selectedNode[0].isLeaf())
                                                    selectedNode[0].expand(false, cb);
                                                else
                                                    cb();
                                            }
                                            //var path = selectedNode[0].data.key;
                                            //console.log(selectedNode[0].parentNode.data.id == 'root');
                                        }
                                    },
                                    iconCls: 'button-add',
                                    stretch: false,
                                    align: 'right'
                                },
                                {
                                    xtype: 'button',
                                    disabled: true,
                                    itemId: 'edit',
                                    text: lang.edit,
                                    handler: function() {
                                        if (self.getSelectionModel().hasSelection()) {
                                            var selectedNode = self.getSelectionModel().getSelection();
                                            var path = selectedNode[0].data.key;
                                            if (selectedNode[0].parentNode.data.id == 'root') {
                                                Ext.MessageBox.prompt(lang.renamePath + ' "' + path + '"', lang.enterNewName + ':', function(btn, text, cfg) {
                                                    if (btn == 'ok') {
                                                        if (!self.nameTest(text, cfg, (text != selectedNode[0].data.text)))
                                                            return;
                                                        Ext.Ajax.request({
                                                            url: _webPath + '/taskData/rename',
                                                            method: 'put',
                                                            params: {
                                                                newPath: text,
                                                                oldPath: path
                                                            },
                                                            success: function(response, o) {
                                                                var resObj = Ext.decode(response.responseText);
                                                                if (resObj && resObj.success) {
                                                                    var refreshNode = self.getSelNode();
                                                                    if (refreshNode)
                                                                        refreshNode = refreshNode.parentNode;
                                                                    else
                                                                        refreshNode = self.getRootNode();
                                                                    self.getDockedComponent('toptoolbar').getComponent('refresh').handler(null, null, refreshNode);
                                                                }
                                                                else
                                                                    Ext.showError(resObj.message || lang.error);

                                                            },
                                                            failure: function(response, o) {
                                                                Ext.showError(response.responseText);
                                                            }
                                                        });
                                                    }
                                                }, null, null, selectedNode[0].data.text);
                                            }
                                        }
                                    },
                                    iconCls: 'button-edit',
                                    stretch: false,
                                    align: 'right'
                                },
                                {
                                    xtype: 'button',
                                    disabled: true,
                                    itemId: 'remove',
                                    text: lang.remove,
                                    handler: function() {
                                        if (self.getSelectionModel().hasSelection()) {
                                            var selectedNode = self.getSelectionModel().getSelection();
                                            if (selectedNode[0].parentNode.data.id == 'root') {
                                                var path = '/tasks/' + selectedNode[0].data.key + '.js';
                                                Ext.MessageBox.confirm(lang.removing, lang.removePath + ' "' + selectedNode[0].data.key + '"?', function(btn, text) {
                                                    if (btn == 'yes') {
                                                        Ext.Ajax.request({
                                                            url: _webPath + '/taskData/removePath',
                                                            method: 'DELETE',
                                                            params: {
                                                                path: path
                                                            },
                                                            success: function(response, o) {
                                                                var resObj = Ext.decode(response.responseText);
                                                                if (resObj && resObj.success) {
                                                                    self.getDockedComponent('toptoolbar').getComponent('refresh').handler(null, null, self.getRootNode());
                                                                }
                                                                else
                                                                    Ext.showError(resObj.message || lang.error);

                                                            },
                                                            failure: function(response, o) {
                                                                Ext.showError(response.responseText);
                                                            }
                                                        });
                                                    }
                                                });
                                            }
                                        }
                                    },
                                    iconCls: 'ux-mu-icon-action-remove',
                                    stretch: false,
                                    align: 'right'
                                }
                            ]
                }
        );
    }
});