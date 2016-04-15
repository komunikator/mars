Ext.define('IVR.view.editor.List', {
    extend: 'Ext.grid.Panel',
    tools: [{
            //type: 'refresh',
	    hidden: true,
            xtype: 'button',
            iconCls: 'button-refresh',
            tooltip: lang['refresh'],
            handler: function() {
                this.ownerCt.ownerCt.store.reload();
            }
        }],
    height: 300,
    width: 200,
    //store: Ext.data.StoreManager.lookup('EventsList') ? Ext.data.StoreManager.lookup('EventsList') : Ext.create('IVR.store.EventsList'),
    listeners: {
        afterrender: function() {
            this.store.load();
        }
    },
    insertText: function(text) {
        //console.log(text);
        if (this.codeMirror.editor.getSelection())
            this.codeMirror.editor.replaceSelection(text);
        else
            this.codeMirror.editor.replaceRange(text, this.codeMirror.editor.getCursor());
    },
    resizable: true,
    dockedItems: [
        {
            xtype: 'toolbar',
            dock: 'top', // bottom, right, left
            items: [{
                    xtype: 'button',
                    text: lang.insertText,
                    itemId: 'insertText',
                    iconCls: 'insert_text',
                    stretch: false,
                    align: 'left',
                    handler: function(btn, e, node) {
                        var self = this.ownerCt.ownerCt;
                        if (self.getSelectionModel().hasSelection()) {
                            var selectedNode = self.getSelectionModel().getSelection();
                            self.insertText("'" + selectedNode[0].data.text + "'");
                        }
                    }
                }]
        }
    ],
    columns: [{
            //text: lang['name'],
            flex: 1,
            menuDisabled: true,
            dataIndex: 'text'
        }]
});