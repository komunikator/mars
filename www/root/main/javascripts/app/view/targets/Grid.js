Ext.define('IVR.view.targets.Grid', {
    extend: 'Ext.grid.Panel',
    xtype: 'targetsGrid',
    title: lang['target'],
    store: [],
    columns: [
        {flex: 1, text: lang['msisdn'], dataIndex: 'field1'},
        {flex: 2, text: lang['params'], dataIndex: 'id'} //???
    ],
    viewConfig: {
        loadMask: false
    },
    columnLines: true,
    constructor: function(config) {
        config = Ext.applyIf(config || {}, {
            //id: 'targets-grid',
            iconCls: 'list'
        });

        var self = this;
        this.exportToExcel = function(params, url) {
            var id, frame, form, hidden, callback;

            frame = Ext.fly('exportframe').dom;
            frame.src = Ext.SSL_SECURE_URL;

            form = Ext.fly('exportform').dom;
            form.action = url;
            hidden = document.getElementById('excelconfig');
            hidden.value = Ext.encode(params);
            form.submit();
        };
        this.selType = 'rowmodel';
        this.dockedItems = [
            {
                dock: 'top',
                xtype: 'toolbar',
                beforePageText: '',
                itemId: 'toptoolbar',
                items:
                        [{
                                xtype: 'form',
                                frame: false,
                                border: false,
                                bodyStyle: 'background:transparent;',
                                itemId: 'importForm',
                                layout: 'hbox',
                                items: [
                                    {
                                        style: 'top:2px;',
                                        xtype: 'fileuploadfield',
                                        itemId: 'importExcel',
                                        buttonConfig: {
                                            iconCls: 'exportExcel'
                                        },
                                        buttonOnly: true,
                                        buttonText: lang.import,
                                        //anchor: '100%',
                                        //emptyText: 'Select File',
                                        name: 'fileData',
                                        //fieldLabel: 'Select File',
                                        allowBlank: false,
                                        align: 'left',
                                        forceSelection: true,
                                        listeners: {
                                            change: function(f, new_val) {
                                                var form = f.ownerCt.getForm();
                                                if (form.isValid()) {
                                                    //console.log(form.getValues());
                                                    //return;
                                                    form.submit({
                                                        url: _webPath + '/upload/' + 'targets/' + self.ownerCt.getComponent('list').selectedRow.data.text,
                                                        headers: {'Content-Type': 'multipart/form-data; charset=UTF-8'},
                                                        method: 'POST',
                                                        waitMsg: lang['uploading'],
                                                        success: function(form, action) {
                                                            self.ownerCt.getComponent('list').store.load();
                                                            Ext.showInfo(lang["dataSaved"]);
                                                            //Ext.getCmp('uploadWindow').destroy();
                                                        },
                                                        failure: function(form, action) {
                                                            Ext.Msg.alert(lang['uploading'], action.result.message);
                                                        }
                                                    });
                                                    Ext.Function.defer(Ext.MessageBox.hide, 5000, Ext.MessageBox);
                                                }
                                            }
                                        }
                                    },
                                    {},
                                    {
                                        xtype: 'button',
                                        text: lang.export,
                                        itemId: 'exportExcel',
                                        iconCls: 'exportExcel',
                                        stretch: false,
                                        align: 'left',
                                        handler: function(btn, e, node) {
                                            self.exportToExcel({name: self.ownerCt.getComponent('list').selectedRow.data.text}, '/tableData/target');
                                        }
                                    }, 
                                    {},
                                    {
                                        xtype: 'button',
                                        iconCls: 'button-refresh',
                                        text: lang['refresh'],
                                        handler: function() {
                                            self.ownerCt.getComponent('list').store.reload();
                                        }
                                    }
                                ]
                            }]
            }/*,
             {
             xtype: 'pagingtoolbar',
             dock: 'bottom',
             width: 360,
             displayInfo: false,
             store: 'Targets'
             }*/
        ];
        this.callParent([config]);
    }
});