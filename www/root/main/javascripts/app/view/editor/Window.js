Ext.define('IVR.view.editor.Window', {
    extend: 'Ext.Window',
    xtype: 'editorWindow',
    title: lang.editor,
    modal: true,
    //height: 200,
    width: 300,
    resizable: false,
    closeAction: 'hide',
    plain: true,
    bodyStyle: 'padding: 5px;',
    listeners: {
        beforeshow: function()
        {
            if (this.editNode) {
                var self = this;
                var node = self.editNode;
                var storeId = node.store.storeId || (node.store.treeStore && node.store.treeStore.storeId);
                if (!storeId)
                    return false;
                var xtype = 'IVR.view.editor.' + storeId + '.' + (node.parentNode.data.id == 'root' ? 'root' : 'root');
                console.log(xtype);
                var elements = self.getComponent('main').getDockedComponent('toptoolbar').getComponent('element');

                var container = self.getComponent('main').getComponent('container');
                container.removeAll(true);
                container.add(Ext.create(xtype, {}));
                var data = [];
                Ext.each(container.getComponent('root').items.items, function(item) {
                    var exists = false;
                    if (node.childNodes)
                        node.eachChild(function(n) {
                            if (item.itemId == n.data.id.split(encodeURIComponent(':')).pop())
                                exists = true;
                        });
                    if (!exists)
                        data.push([item.itemId, item.itemId]);
                });
                elements.store.loadData(data);
                if (elements.rendered)
                    elements.fireEvent('afterrender', elements);//set default panel

                if (!data.length)
                {
                    Ext.showInfo(lang.allParamsExists);
                    return false;
                }

            }
            else
                return false;
        }
    },
    items:
            {// xtype: 'container',
                itemId: 'main',
                style: 'border: none;',
                border: false,
                bodyStyle: 'background-color: transparent !important;',
                items: [
                    {
                        layout: 'card',
                        xtype: 'form',
                        itemId: 'container',
                        //height: 200,
                        border: false,
                        style: 'border: none;',
                        //labelStyle: 'padding: 2px 5px;',
                        defaults: {
                            bodyStyle: "background: transparent none !important;border: none;"
                        },
                        bodyStyle: 'background-color: transparent !important;'

                    }

                ],
                dockedItems: [
                    {
                        xtype: 'toolbar',
                        dock: 'top',
                        style: 'border: none;',
                        itemId: 'toptoolbar',
                        items: [
                            {
                                xtype: 'combobox',
                                itemId: 'element',
                                //lastQuery: '',
                                labelStyle: 'padding: 2px 5px;font-size: 12px;',
                                width: '96%',
                                mode: 'local',
                                triggerAction: 'all',
                                store: [],
                                listeners: {
                                    select: function(c, r) {
                                        //console.log('select', r);
                                        var container = c.ownerCt.ownerCt.getComponent('container').getComponent('root');
                                        //console.log(r[0].data);
                                        container.getLayout().setActiveItem(r[0].data.field1);
                                    },
                                    afterrender: function() {
                                        var self = this;
                                        var store = self.getStore();
                                        if (store.getCount() != 0) {
                                            var recordSelected = store.getAt(0);
                                            self.setValue(recordSelected.get('field1'));
                                            self.fireEvent('select', self, [recordSelected]);
                                        }
                                        else
                                            self.clearValue();
                                    }
                                },
                                fieldLabel: lang.element
                            }
                        ]
                    },
                    {
                        xtype: 'toolbar',
                        dock: 'bottom',
                        style: 'border: none;',
                        items: ['->',
                            {
                                text: lang.save, handler: function() {
                                    var form = this.ownerCt.ownerCt.ownerCt.getComponent('main').getComponent('container').getForm();
                                    //console.log(form.getValues());
                                    //findField("NameField")
                                    var param = {};
                                    /*
                                     form.items.each(function(item) {
                                     console.log(item);
                                     //if (item.name)
                                     //param[item.name] = item.getValue();
                                     });
                                     */
                                    var vals = form.getValues();
                                    for (var k in vals)
                                        if (form.findField(k).name != form.findField(k).inputId)
                                        {
                                            console.log(k, form.findField(k).id);
                                            param[k] = form.findField(k).getGroupValue ? form.findField(k).getGroupValue() : form.findField(k).getValue();
                                            var self = form.findField(k);
                                            if (self.getGroupValue)
                                            {
                                                //console.log(self.getManager().getChecked);
                                                // console.log(self.getFormId());

                                            }
                                            //if (self.getFormId)
                                            //console.log(k, self.checked);
                                        }
                                    ;
                                    //console.log(param);
                                    var win = this.ownerCt.ownerCt.ownerCt;
                                    //console.log(win.editNode.store.storeId + '.' + win.editNode.parentNode.data.id);
                                    win.editNode.store.load({node: win.editNode});
                                    win.editNode.expand(false);
                                    var node = win.editNode;
                                    var storeId = node.store.storeId || (node.store.treeStore && node.store.treeStore.storeId);
                                    Ext.Ajax.request({
                                        url: _webPath + '/addData',
                                        method: 'put',
                                        params: {
                                            data: Ext.JSON.encode(param),
                                            id: storeId + '.' + win.editNode.parentNode.data.id
                                        },
                                        success: function(response, o) {
                                            var resObj = Ext.decode(response.responseText);
                                            if (!resObj || !resObj.success)
                                                Ext.showError(resObj.message || lang.error);
                                            win.close();
                                        },
                                        failure: function(response, o) {
                                            Ext.showError(response.responseText);
                                            win.close();
                                        }
                                    });
                                }},
                            '-',
                            {
                                text: lang.cancel, handler: function() {
                                    this.ownerCt.ownerCt.ownerCt.close();
                                }}]
                    }
                ]}
});