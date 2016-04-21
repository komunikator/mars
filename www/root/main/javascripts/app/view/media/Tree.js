Ext.define('IVR.view.media.Tree', {
    extend: 'IVR.view.EditTree',
    xtype: 'mediaTree',
    title: lang['media'],
    store: 'Media',
    /*    columns: [{
     xtype: 'treecolumn',
     dataIndex: 'text',
     flex: 1,
     editor: {
     xtype: 'textfield',
     allowBlank: false,
     allowOnlyWhitespace: false
     }
     }],
     */
    selModel: Ext.create('Ext.selection.TreeModel', {
        mode: 'MULTI'
    }),
    actions: ['refresh', 'createFolder', 'add', 'edit', 'remove'],
    constructor: function (config) {
        config = Ext.applyIf(config || {}, {
            //id: 'media-tree',
            iconCls: 'sound'
        });

        this.callParent([config]);
        var self = this;
        this.getPath = function (i) {
            if (!i)
                i = 0;
            var path = '/media/';
            var sr = self.selModel.getSelection();
            if (sr.length > 0 && sr[i])
                path = decodeURIComponent(sr[i].data.id).replace(/^(.+)\/(.+\.wav)$/, "$1");
            else
                return null;
            return path;
        };

        this.onAdd = function () {
            var path = self.getPath();
            var uploadDialog = Ext.create('Ext.ux.upload.Dialog', {
                modal: true,
                dialogTitle: lang.load + ' "' + path + '"',
                textClose: lang.close,
                panel: Ext.create('Ext.ux.upload.Panel', {
                    textOk: lang.OK,
                    textUpload: lang.upload,
                    textBrowse: lang.browse,
                    textAbort: lang.abort,
                    textRemoveSelected: lang.remove_selected,
                    textRemoveAll: lang.remove_all,
                    // grid strings
                    textFilename: lang.filename,
                    textSize: lang.size,
                    textType: lang.type,
                    textStatus: lang.status,
                    // status toolbar strings
                    selectionMessageText: lang.selection_message,
                    uploadMessageText: lang.upload_message,
                    // browse button
                    buttonText: lang.browse,
                    accept: 'audio/x-wav',
                    uploaderOptions: {
                        url: _webPath + '/mediaData/file-upload/' + window.btoa(unescape(encodeURIComponent(path)))
                    },
                    filenameEncoder: 'Ext.ux.upload.header.Base64FilenameEncoder',
                    listeners: {
                        'uploadcomplete': {
                            scope: this,
                            fn: function (upDialog, manager, items, errorCount) {
                                if (!errorCount) {
                                    self.getDockedComponent('toptoolbar').getComponent('refresh').handler();
                                    //upDialog.close();
                                }

                            }
                        }
                    }
                })
            });

            uploadDialog.show();
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
                                    handler: function (btn, e, node) {
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
                                    handler: function () {
                                        var node;
                                        if (self.getSelectionModel().hasSelection()) {
                                            node = self.getSelectionModel().getSelection()[0];
                                        }
                                        else
                                            node = self.getRootNode();
                                        var path = self.getPath() || '/media';
                                        Ext.MessageBox.prompt(lang.createForder + ' "' + path + '"', lang.enterFolderName + ':', function (btn, text) {
                                            if (btn == 'ok') {
                                                // send node text and parent id to server using ajax
                                                Ext.Ajax.request({
                                                    url: _webPath + '/mediaData/createFolder',
                                                    params: {
                                                        name: text,
                                                        path: path//selectedNode[0].data.id
                                                    },
                                                    success: function (response, o) {
                                                        var resObj = Ext.decode(response.responseText);
                                                        if (resObj && resObj.success)
                                                            self.getDockedComponent('toptoolbar').getComponent('refresh').handler();
                                                        else
                                                            Ext.showError(resObj.message || lang.error);

                                                    },
                                                    failure: function (response, o) {
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
                                    handler: self.onAdd,
                                    iconCls: 'button-add',
                                    stretch: false,
                                    align: 'right'
                                },
                                {
                                    xtype: 'button',
                                    disabled: true,
                                    itemId: 'edit',
                                    text: lang.edit,
                                    handler: function () {
                                        var path = self.getPath();
                                        if (self.getSelectionModel().hasSelection()) {
                                            var selectedNode = self.getSelectionModel().getSelection();
                                            if (selectedNode[0].isLeaf())
                                                path += '/' + selectedNode[0].data.text;
                                            Ext.MessageBox.prompt(lang.renamePath + ' "' + path + '"', lang.enterNewName + ':', function (btn, text, cfg) {

                                                if (btn == 'ok') {
                                                    if (text == selectedNode[0].data.text ||
                                                            !(selectedNode[0].isLeaf() ?
                                                                    /^[ a-яА-Яa-zA-Z0-9_/-]+\.wav$/.test(text) :
                                                                    /^[ a-яА-Яa-zA-Z0-9_/-]+$/.test(text)
                                                                    )) {
                                                        var newMsg = '<span style="color:red">' + lang.enterNewName + ':</span>';
                                                        Ext.Msg.show(Ext.apply({}, {msg: newMsg}, cfg));
                                                        return;
                                                    }
                                                    Ext.Ajax.request({
                                                        url: _webPath + '/mediaData/renamePath', //+'/'+path
                                                        method: 'put',
                                                        params: {
                                                            newPath: path.replace(/^(.+\/)[^\/]+$/, "$1") + text,
                                                            oldPath: path
                                                        },
                                                        success: function (response, o) {
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
                                                        failure: function (response, o) {
                                                            Ext.showError(response.responseText);
                                                        }
                                                    });
                                                }
                                            }, null, null, selectedNode[0].data.text);
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
                                    handler: function () {
                                        if (self.getSelectionModel().hasSelection()) {
                                            var selectedNode = self.getSelectionModel().getSelection(),
                                                    paths = [],
                                                    path,
                                                    i = 0;
                                            while (selectedNode[i]) {
                                                path = self.getPath(i);
                                                if (selectedNode[i].isLeaf())
                                                    path += '/' + selectedNode[i].data.text;
                                                paths.push(path);
                                                i++;
                                            }
                                            Ext.MessageBox.confirm(lang.removing, lang.removePath + (i > 1 ? '<br>' : '') + ' "' + paths.join('"<br>"') + '"?', function (btn, text) {
                                                if (btn == 'yes') {
                                                    Ext.Ajax.request({
                                                        url: _webPath + '/mediaData/removePath',
                                                        method: 'DELETE',
                                                        params: {
                                                            path: path,
                                                            paths: JSON.stringify(paths)
                                                        },
                                                        success: function (response, o) {
                                                            var resObj = Ext.decode(response.responseText);
                                                            if (resObj && resObj.success) {
                                                                var refreshNode = self.getSelectionModel().getSelection();
                                                                if (refreshNode[0])
                                                                    refreshNode = refreshNode[0].parentNode;
                                                                self.getDockedComponent('toptoolbar').getComponent('refresh').handler(null, null, refreshNode);
                                                            }
                                                            else
                                                                Ext.showError(resObj.message || lang.error);

                                                        },
                                                        failure: function (response, o) {
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
                            ]
                }
        );
    }
});