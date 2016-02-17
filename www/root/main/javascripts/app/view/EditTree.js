Ext.define('IVR.view.EditTree', {
    extend: 'IVR.view.AudioTree',
    xtype: 'editorTree',   
    constructor: function(config) {
        var self = this;
        this.listeners = {
            afterrender: function() {
                var actions = self.actions;// ['refresh', 'createFolder', 'add', 'edit', 'remove'];
                if (!actions)
                    return;
                var menuItems = [];
                actions.forEach(function(action) {
                    var item = self.getDockedComponent('toptoolbar');
                    if (item)
                        item = self.getDockedComponent('toptoolbar').getComponent(action);
                    if (item)
                        menuItems.push(
                                Ext.create('Ext.Action', {
                            iconCls: item.iconCls,
                            text: item.text,
                            itemId: item.itemId,
                            disabled: item.disabled,
                            handler: item.handler})
                                );
                });
                if (menuItems.length)
                    self.menu = Ext.create('Ext.menu.Menu', {
                        items: menuItems
                    });

            },
            itemclick: {
                fn: function(view, record, item, index, event) {
                    self.setDisabledBtn();
                }
            },
            itemcontextmenu: function(view, r, node, index, e) {
	if (!self.insertText)
                if (self.menu) {
                    self.setDisabledBtn();
                    e.stopEvent();
                    self.menu.showAt(e.getXY());
                    return false;
                }

            }
        };
        this.callParent([config]);
        this.refreshNode = function(node) {
            //var node = this.store.getNodeById(id);
            //console.log(node);
	    var self = this;
            if (node) {
                this.store.load({node: node});
            }
        };
        this.showError = function(msg) {
            Ext.MessageBox.show({
                title: lang.error,
                msg: msg,
                buttons: Ext.MessageBox.OK,
                animateTarget: 'mb9',
                //fn: showResult,
                icon: Ext.MessageBox.ERROR
            });
        };

        this.setDisabledBtn = function() {
            var toptoolbar = self.getDockedComponent('toptoolbar');
            if (!toptoolbar)
                return;
            var isSel = !self.getSelectionModel().hasSelection();
            toptoolbar.getComponent('remove') && toptoolbar.getComponent('remove').setDisabled(isSel);
            toptoolbar.getComponent('edit') && toptoolbar.getComponent('edit').setDisabled(isSel);
            if (self.menu) {
                self.menu.getComponent('remove') && self.menu.getComponent('remove').setDisabled(isSel);
                self.menu.getComponent('edit') && self.menu.getComponent('edit').setDisabled(isSel);
            }
        };

        this.getSelNode = function() {
            var sel = self.getSelectionModel().selected.items;
            if (sel.length > 0) {
                //console.log(sel[0].isLeaf());
                if (sel[0].isLeaf())
                    return(sel[0].parentNode);
                else
                    return(sel[0]);
            }
            else
                return null;
        };

    }
});