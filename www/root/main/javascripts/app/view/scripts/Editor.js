Ext.define('IVR.view.scripts.Editor', {
    extend: 'IVR.view.code.Editor',
    xtype: 'scriptsEditor',
    layout: 'border',
    listTitle: lang['script'],
    listStore: Ext.data.StoreManager.lookup('ScriptsList') ? Ext.data.StoreManager.lookup('ScriptsList') : Ext.create('IVR.store.ScriptsList'),
    constructor: function (config) {
        this.items[0].iconCls = 'script';
        this.callParent([config]);
        var list = this.getComponent('list');
        list.basePath = 'scripts/';
        list.elementName = lang.script_;
        var c = this.getComponent('form').getForm().findField('f');
        var insertTextFn = function (me) {
            me.ownerCt.ownerItem.ownerCt.getComponent('media').menu.getComponent('mediaTree').insertText(this.text + ((this.text == 'true' || this.text == 'false') ? '' : ':'));
        };
        var clipboardData;
        c.menu = Ext.create('Ext.ux.protoMenu', {
            items: [
                {text: lang['copy'], iconCls: 'button-copy', handler: function () {
                        clipboardData = c.editor.getSelection();
                    }
                },
                {text: lang['paste'], iconCls: 'button-paste', handler: function () {
                        this.ownerCt.getComponent('media').menu.getComponent('mediaTree').insertText(clipboardData);
                    }},
                {
                    text: lang['command'],
                    iconCls: 'terminal',
                    menu: {
                        items: [
                            {
                                text: 'play',
                                iconCls: 'play',
                                tooltip: 'play',
                                handler: insertTextFn
                            },
                            {
                                text: 'stopPlay',
                                iconCls: 'stopPlay',
                                handler: insertTextFn
                            },
                            {
                                text: 'file',
                                iconCls: 'sound',
                                handler: insertTextFn
                            },
                            {
                                text: 'next',
                                iconCls: 'next',
                                handler: insertTextFn
                            },
                            {
                                text: 'dtmfOn',
                                iconCls: 'dtmfOn',
                                handler: insertTextFn
                            },
                            {
                                text: 'dtmfData',
                                iconCls: 'dtmfData',
                                handler: insertTextFn
                            },
                            {
                                text: 'wait',
                                iconCls: 'wait',
                                handler: insertTextFn
                            },
                            {
                                text: 'time',
                                iconCls: 'play',
                                handler: insertTextFn
                            },
                            {
                                text: 'goto',
                                iconCls: 'goto',
                                handler: insertTextFn
                            },
                            {
                                text: 'recOn',
                                iconCls: 'recOn',
                                handler: insertTextFn
                            },
                            {
                                text: 'recOff',
                                iconCls: 'recOff',
                                handler: insertTextFn
                            },
                            {
                                text: 'mark',
                                iconCls: 'mark',
                                handler: insertTextFn
                            },
                            {
                                text: 'true',
                                iconCls: 'true',
                                handler: insertTextFn
                            },
                            {
                                text: 'false',
                                iconCls: 'false',
                                handler: insertTextFn
                            }
                        ]
                    }
                },
                {
                    text: lang['media'],
                    itemId: 'media',
                    iconCls: 'sound',
                    menu: {
                        items: Ext.create('IVR.view.media.Tree', {
                            itemId: 'mediaTree',
                            height: 300,
                            width: 500,
                            insertText: function (text) {
                                //console.log(text);
                                if (c.editor.getSelection())
                                    c.editor.replaceSelection(text);
                                else
                                    c.editor.replaceRange(text, c.editor.getCursor());
                            },
                            resizable: true,
                            listeners: {
                                itemclick: {
                                    fn: function (view, record, item, index, event) {
                                        view.panel.setDisabledBtn();
                                    }
                                },
                                afterrender: function (self) {
                                    self.getDockedComponent('toptoolbar').removeAll(true);
                                    self.getDockedComponent('toptoolbar').add(
                                            {
                                                xtype: 'button',
                                                text: lang.insertText,
                                                itemId: 'insertText',
                                                iconCls: 'insert_text',
                                                stretch: false,
                                                align: 'left',
                                                handler: function (btn, e, node) {
                                                    if (self.getSelectionModel().hasSelection()) {
                                                        var selectedNode = self.getSelectionModel().getSelection();
                                                        self.insertText("'" + selectedNode[0].data.src + "'");
                                                    }
                                                }
                                            }
                                    )
                                }},
                            store: Ext.data.StoreManager.lookup('Media') ? Ext.data.StoreManager.lookup('Media') : Ext.create('IVR.store.Media')
                        })
                    }
                }
            ]
        });
    }
});