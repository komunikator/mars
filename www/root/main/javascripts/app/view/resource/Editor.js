Ext.define('IVR.view.resource.Editor', {
    extend: 'Ext.grid.Panel',
    xtype: 'resourceEditor',
    width: 216,
    itemId: 'list',	
    split: true,
    minSize: 130,
    savePrefix: "exports.src = ",
    updateAction: function(params) {
        var self = this;
        Ext.Ajax.request({
            url: _webPath + '/resourceData/update',
            method: 'put',
            params: {
                create: params.isCreate ? true : false,
                name: self.basePath + params.name,
                value: self.savePrefix + (params.value ? params.value : '{}')
            },
            success: function(response, o) {
                var resObj = Ext.decode(response.responseText);
                if (resObj && resObj.success)
                {
                    if (params.cb)
                        params.cb();
                }
                else
                    {
			Ext.showError(resObj.message || lang.error);
                    if (params.cb_f)
                        params.cb_f();
		    }	

            },
            failure: function(response, o) {
                Ext.showError(response.responseText);
                    if (params.cb_f)
                        params.cb_f();
            }
        });
    },
    nameTest: function(text, cfg, flag) {
        if (flag == undefined)
            flag = true;
        if (!(/^[ a-яА-Яa-zA-Z0-9_/-]+$/.test(text) && flag)) {
            var newMsg = '<span style="color:red">' + lang.enterNewName + ':</span>';
            cfg.value = text;
            Ext.Msg.show(Ext.apply({}, {msg: newMsg}, cfg));
            return false;
        }
        ;
        return true;
    },
    tools:
            [
                {
                    xtype: 'button',
                    tooltip: lang.refresh,
                    itemId: 'refresh',
		    hidden: true,
                    iconCls: 'button-refresh',
                    stretch: false,
                    align: 'left',
                    handler: function(me) {
                        me.ownerCt.ownerCt.store.load();
                    }
                },
                {
                    xtype: 'button',
                    tooltip: lang.create,
                    itemId: 'add',
                    iconCls: 'button-add',
                    stretch: false,
                    align: 'right',
                    handler: function(me) {
                        var editor = me.ownerCt.ownerCt.ownerCt;
                        Ext.MessageBox.prompt(Ext.String.format(lang['createNew'], editor.getComponent('list').elementName), Ext.String.format(lang['enterName'], editor.getComponent('list').elementName) + ':', function(btn, text, cfg) {
                            if (btn == 'ok') {
                                if (!editor.getComponent('list').nameTest(text, cfg))
                                    return;
                                editor.getComponent('list').updateAction({
                                    name: text,
                                    value: '{}',
                                    isCreate: true,
                                    cb: function() {
                                        var store = me.ownerCt.ownerCt.store;
                                        store.selectOnLoad = store.selectOnLoad || {};
                                        store.selectOnLoad.itemText = text;
                                        store.load();
                                        //me.ownerCt.getComponent('refresh').handler();
                                    }
                                });
                            }
                        });
                    }
                },
                {
                    xtype: 'button',
                    tooltip: lang.copy,
                    itemId: 'copy',
                    iconCls: 'button-copy',
                    stretch: false,
                    align: 'right',
                    handler: function(me) {
                        var editor = me.ownerCt.ownerCt.ownerCt;
                        if (editor.getComponent('list').selectedRow) {
                            Ext.MessageBox.prompt(Ext.String.format(lang['createNew'], editor.getComponent('list').elementName), Ext.String.format(lang['enterName'], editor.getComponent('list').elementName) + ':', function(btn, text, cfg) {
                                if (btn == 'ok') {
                                    if (!editor.getComponent('list').nameTest(text, cfg, (text != editor.getComponent('list').selectedRow.data.text)))
                                        return;
                                    editor.getComponent('list').updateAction({
                                        name: text,
                                        value: editor.getComponent('list').selectedRow.data.value,
                                        isCreate: true,
                                        cb: function() {
                                            me.ownerCt.ownerCt.store.load();
                                            //me.ownerCt.getComponent('refresh').handler();
                                        }
                                    });
                                }
                            }, null, null, editor.getComponent('list').selectedRow.data.text + '_copy');
                        }
                    }
                },
                {
                    xtype: 'button',
                    //disabled: true,
                    itemId: 'edit',
                    tooltip: lang.rename,
                    handler: function(me) {
                        var editor = me.ownerCt.ownerCt.ownerCt;
                        if (editor.getComponent('list').selectedRow) {
                            var path = editor.getComponent('list').selectedRow.data.text;
                            Ext.MessageBox.prompt(lang.renamePath + ' "' + path + '"', lang.enterNewName + ':', function(btn, text, cfg) {
                                if (btn == 'ok') {
                                    if (!editor.getComponent('list').nameTest(text, cfg, (text != editor.getComponent('list').selectedRow.data.text)))
                                        return;
                                    Ext.Ajax.request({
                                        url: _webPath + '/resourceData/rename',
                                        method: 'put',
                                        params: {
                                            newPath: editor.getComponent('list').basePath + text,
                                            oldPath: editor.getComponent('list').basePath + path
                                        },
                                        success: function(response, o) {
                                            var resObj = Ext.decode(response.responseText);
                                            if (resObj && resObj.success) {
                                                Ext.showInfo(lang["dataSaved"]);
                                                me.ownerCt.ownerCt.store.load();
                                            }
                                            else
                                                Ext.showError(resObj.message || lang.error);

                                        },
                                        failure: function(response, o) {
                                            Ext.showError(response.responseText);
                                        }
                                    });
                                }
                            }, null, null, editor.getComponent('list').selectedRow.data.text);
                        }
                    },
                    iconCls: 'button-edit',
                    stretch: false,
                    align: 'right'
                },
                {
                    xtype: 'button',
                    //disabled: true,
                    itemId: 'remove',
                    tooltip: lang.remove,
                    handler: function(me) {
                        var editor = me.ownerCt.ownerCt.ownerCt;
                        if (editor.getComponent('list').selectedRow) {
                            var path = editor.getComponent('list').basePath + editor.getComponent('list').selectedRow.data.text;
                            Ext.MessageBox.confirm(lang.removing, lang.removePath + ' "' + editor.getComponent('list').selectedRow.data.text + '"?', function(btn, text) {
                                if (btn == 'yes') {
                                    Ext.Ajax.request({
                                        url: _webPath + '/resourceData/removePath',
                                        method: 'DELETE',
                                        params: {
                                            path: path
                                        },
                                        success: function(response, o) {
                                            var resObj = Ext.decode(response.responseText);
                                            if (resObj && resObj.success) {
                                                var scriptGrid = editor.getComponent('list');
                                                if (scriptGrid)
                                                    scriptGrid.getSelectionModel().deselect(scriptGrid.getSelectionModel().getLastSelected().index);
                                                me.ownerCt.ownerCt.store.load();
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
                    },
                    iconCls: 'ux-mu-icon-action-remove',
                    stretch: false,
                    align: 'right'
                }
            ],
    columns: [
        {
            text: lang['name'],
            flex: 1,
            menuDisabled: true,
            dataIndex: 'text'
        }
    ],
    listeners: {
        afterrender: function() {
            var self = this;
            self.store.on('load', function() {
                var lastSelected = self.getSelectionModel().getLastSelected();
                if (!lastSelected && (self.selectOnLoad != undefined && self.selectOnLoad.index != undefined)) {
                    self.getSelectionModel().select(self.selectOnLoad.index);
                    lastSelected = self.selectOnLoad.index;
                }

                if (self && self.store && self.store.selectOnLoad && self.store.selectOnLoad.itemText) {
                    var itemText = self.store.selectOnLoad.itemText;
                    delete self.store.selectOnLoad.itemText;
                    var totalCount = self.store.getAt(lastSelected.index).store.totalCount;

                    for (var i = 0; i < totalCount; i++) {
                        if (itemText == self.store.getAt(i).data.text) {
                            //self.fireEvent('selectionchange', self, [self.store.getAt(i)]);
                            self.getSelectionModel().select(i);
                            break;
                        }
                    }
                    return;
                }

                if (lastSelected)
                    self.fireEvent('selectionchange', self, [self.store.getAt(lastSelected.index)]);
            });
            self.store.load();
            var me = self.dockedItems.items[0].items.items[0];//for compatibility
            var menuItems = [];
            me.ownerCt.items.items.forEach(function(item) {
                if (item.itemId && item.handler)
                    menuItems.push(
                            Ext.create('Ext.Action', {
                        iconCls: item.iconCls,
                        text: item.text || item.tooltip,
                        itemId: item.itemId,
                        disabled: item.disabled,
                        handler: function() {
                            return item.handler(me);
                        }
                    })
                            );
            });
            if (menuItems.length)
                self.menu = Ext.create('Ext.menu.Menu', {
                    items: menuItems
                });

        },
        itemcontextmenu: function(view, r, node, index, e) {
            var self = view.panel;
            if (self.menu) {
                //self.setDisabledBtn();
                e.stopEvent();
                self.menu.showAt(e.getXY());
                return false;
            }
        }
    }

});