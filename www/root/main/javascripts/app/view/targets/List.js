Ext.define('IVR.view.targets.List', {
    extend: 'Ext.grid.Panel',
    xtype: 'targetsList',
    title: lang['target'],
    store: 'Targets',
    columnLines: true,
    constructor: function(config) {
        config = Ext.applyIf(config || {}, {
            //id: 'targets-list',
            iconCls: 'icon_menu_diag_system'
        });

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
                                                    console.log(form.getValues());
                                                    //return;
                                                    form.submit({
                                                        url: _webPath + '/upload',
                                                        headers: {'Content-Type': 'multipart/form-data; charset=UTF-8'},
                                                        method: 'POST',
                                                        waitMsg: lang['uploading'],
                                                        success: function(form, action) {
                                                            //Ext.Msg.alert(lang['uploading'], action.result.message);
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
                                            function getParamsObject(store) {
                                                var options = {
                                                    //groupers: store.groupers.items,
                                                    page: store.currentPage,
                                                    start: (store.currentPage - 1) * store.pageSize,
                                                    limit: store.pageSize,
                                                    //addRecords: false,
                                                    //action: 'read',
                                                    search: store.proxy.extraParams,
                                                    sorters: store.getSorters()
                                                };
                                                var operation = new Ext.data.Operation(options);

                                                var fakeRequest = store.getProxy().buildRequest(operation);
                                                var params = fakeRequest.params;

                                                return params;
                                            }
                                            self.exportToExcel(getParamsObject(self.store), '/targetData');
                                        }
                                    }
                                ]
                            }]
            },
            {
                xtype: 'pagingtoolbar',
                dock: 'bottom',
                width: 360,
                displayInfo: false,
                //store: Ext.data.StoreManager.lookup('Targets'),
                store: 'Targets'
                /*,
                 items: [{
                 width: 200,
                 fieldLabel: 'Search',
                 paramName: 'dateQuery',
                 labelWidth: 50,
                 xtype: 'searchfield',
                 store: Ext.data.StoreManager.lookup('Targets')
                 }]
                 */
            }
        ];
        var self = this;
        self.emptyStore = function() {
            var searchFn = function() {
                self.getPlugin('xFilter').storeSearch();
            };
            return {proxy: {}, filter: searchFn, clearFilter: searchFn};
        };
        this.columns = [
            {flex: 1, text: lang['msisdn'], dataIndex: 'msisdn', xfilter: {xtype: 'searchfield', store: self.emptyStore()}},
        ];
        // grid.getPlugin('xFilter')
        this.plugins = [
            // When remotefilter is active it will 
            // send with the datastore the "search variables"
            Ext.create('Ext.ux.grid.xFilterRow', {
                pluginId: 'xFilter',
                remoteFilter: true
            })
        ];
        this.callParent([config]);
    }
});