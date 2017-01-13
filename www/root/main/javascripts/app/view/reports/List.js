Ext.apply(Ext.form.field.VTypes, {
    DateRange: function (val, field) {
        var date = field.parseDate(val);

        if (!date) {
            return false;
        }
        if (field.startDateField && (!field.dateRangeMax || (date.getTime() != field.dateRangeMax.getTime()))) {
            var start = field.up(field.ownerCt.xtype).down('datefield[vfield=beginDate]');
            start.setMaxValue(date);
            field.dateRangeMax = date;
            start.validate();
        }
        else if (field.endDateField && (!field.dateRangeMin || (date.getTime() != field.dateRangeMin.getTime()))) {
            var end = field.up(field.ownerCt.xtype).down('datefield[vfield=endDate]');
            end.setMinValue(date);
            field.dateRangeMin = date;
            end.validate();
        }
        /*
         * Always return true since we're only using this vtype to set the
         * min/max allowed values (these are tested for after the vtype test)
         */
        return true;
    },
    DateRangeText: 'From date must be before To date'
});

Ext.define('IVR.view.reports.List', {
    extend: 'Ext.grid.Panel',
    xtype: 'reportsList',
    title: lang['reports'],
    requires: ['Ext.ux.button.AutoRefresher', 'Ext.ux.grid.PageSize'],
    /*
     viewConfig: {
     enableTextSelection: true,
     stripeRows: true
     },
     */
    store: 'Reports',
    columnLines: true,
    listeners: {
        afterrender: function (grid) {
            var searchParams = Ext.Object.fromQueryString(location.search.substring(1));
            //console.log(searchParams);
            if (Object.keys(searchParams).length)
            {
                var columns = grid.columns;
                for (var k = 0; k < columns.length; k++)
                    for (var key in searchParams)
                        if (columns[k].dataIndex === key)
                            grid.columns[k].xfilter.value = searchParams[key];
            }
        }
    },
    constructor: function (config) {
        config = Ext.applyIf(config || {}, {
            //id: 'reports-list',
            iconCls: 'icon_menu_diag_system'
        });

        this.exportToExcel = function (params, url) {
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
        this.tools = [
            {xtype: 'container',
                //layout: {type: 'hbox', align: 'stretch'},
                width: 900, //700,
                items: [/*, */{
                        xtype: 'pagingtoolbar',
                        plugins: [{
                                ptype: 'pagesize',
                                uxPageSize: 50,
                                beforeText: lang.showPg,
                                afterText: lang.perPage
                            }],
                        displayInfo: true,
                        store: 'Reports',
                        items: [
                            {
                                frame: true,
                                itemId: 'refresh',
                                //tooltip: lang['refresh'],
                                //overflowText: lang['refresh'],
                                xtype: 'autorefresher',
                                minuteText: lang['referesh_m'],
                                secondText: lang['referesh_s'],
                                btnText: lang['refresh'],
                                menu: {
                                    items: [
                                        {text: lang['refresh_manually'], value: 0},
                                        {text: Ext.String.format(lang['refresh_every_s'], 15), value: 15},
                                        {text: Ext.String.format(lang['refresh_every_s'], 30), value: 30},
                                        {text: Ext.String.format(lang['refresh_every_m'], 1), value: 60},
                                        {text: Ext.String.format(lang['refresh_every_m'], 3), value: 180},
                                        {text: Ext.String.format(lang['refresh_every_m'], 5), value: 300}
                                    ]
                                },
                                listeners: {
                                    afterrender: function () {
                                        this.doRefresh = this.ownerCt.doRefresh;
                                        this.store = this.ownerCt.store;
                                    },
                                    refresh: {
                                        fn: function () {
                                            this.doRefresh();
                                        }
                                    }
                                }},
                            {
                                xtype: 'button',
                                text: lang.export,
                                itemId: 'exportExcel',
                                iconCls: 'exportExcel',
                                stretch: false,
                                align: 'left',
                                handler: function (btn, e, node) {
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
                                    self.exportToExcel(getParamsObject(self.store), '/tableData/report');
                                }
                            }
                        ]
                    }]
            }
        ];
        var self = this;
        this.dockedItems = [{
                xtype: 'form',
                frame: true,
                layout: {type: 'hbox', align: 'stretch', pack: 'center'},
                defaults: {xtype: 'fieldcontainer', style: 'border:none;'},
                items: [
                    {xtype: 'label', text: lang.range, style: 'margin: 15px 10px 0px 0px;'},
                    {itemId: 'date', defaults: {style: 'margin: 0px;', listeners: {change: function () {
                                    self.setDateFilter(this);
                                }}, xtype: 'datefield', labelWidth: 14, width: 110, format: 'Y.m.d'}, items: [
                            {fieldLabel: lang.from, vtype: 'DateRange', endDateField: 'dateEnd', itemId: 'dateStart', vfield: 'beginDate',
                                value: (function () {
                                    var today = new Date();
                                    today.setHours(0, 0, 0, 0);
                                    return today;
                                })()
                            },
                            {fieldLabel: lang.to, vtype: 'DateRange', startDateField: 'dateStart', itemId: 'dateEnd', vfield: 'endDate',
                                value: (function () {
                                    var today = new Date();
                                    today.setDate(today.getDate() + 1);
                                    return today;
                                })()
                            }
                        ]},
                    {itemId: 'time', defaults: {style: 'margin: 0px;', listeners: {change: function () {
                                    self.setDateFilter(this);
                                }}, xtype: 'timefield', format: 'H:i', altFormats: 'H:i', width: 60, increment: 30}, items: [
                            {itemId: 'timeStart', value: '00:00'
                            },
                            {itemId: 'timeEnd', value: '00:00'
                            }
                        ]}
                ]
            }];

        self.emptyStore = function () {
            var searchFn = function () {
                self.getPlugin('xFilter').storeSearch();
            };
            return {proxy: {}, filter: searchFn, clearFilter: searchFn};
        };
        self.setDateFilter = function (c) {
            var dateStart = c.ownerCt.ownerCt.getComponent('date').getComponent('dateStart');
            var dateEnd = c.ownerCt.ownerCt.getComponent('date').getComponent('dateEnd');
            var timeStart = c.ownerCt.ownerCt.getComponent('time').getComponent('timeStart');
            var timeEnd = c.ownerCt.ownerCt.getComponent('time').getComponent('timeEnd');
            if (!dateStart.isValid() || !dateEnd.isValid() || !timeStart.isValid() || !timeEnd.isValid())
                return;
            var filterDate = dateStart.rawValue + ' ' + timeStart.rawValue + '|' + dateEnd.rawValue + ' ' + timeEnd.rawValue;
            var filters = Ext.getCmp(self.id + 'docked-filter');
            filters.items.items[0].xtype = 'textfield';
            if (!filters.items.items[0].getValue)
                filters.items.items[0].getValue = function () {
                    return this.value
                };
            filters.items.items[0].value = filterDate;
            self.getPlugin('xFilter').storeSearch();
        };
        this.columns = [
            {
                text: lang['date'],
                dataIndex: 'gdate',
                width: 120,
                //sortable: true,
                //renderer: Ext.util.Format.dateRenderer('m/d/Y'),
                //format: 'Y.m.d',
                xfilter: {},
                xfilter1: {
                    xtype: 'datefield',
                    startDay: 1,
                    value: (function () {
                        var today = new Date();
                        today.setHours(0, 0, 0, 0);
                        return today;
                    })(),
                    //regex: /^\d{1,4}\.?\d{0,2}\.?\d{2} ?\d{0,2}\:?\d{0,2}:?\d{0,2}$/,
                    format: 'Y.m.d', //'Y.m.d H:i:s',
                    //isValid: function(){this.regex.test(this.value)},
                    getValue: function () {
                        if (this.isValid())
                            return Ext.Date.format(this.value, this.format);
                        return this.rawValue;
                    }
                }
            },
            //{xtype: 'textfield', showClear: true}
            {flex: 1, text: lang['type'], dataIndex: 'type', xfilter: {xtype: 'searchfield', store: self.emptyStore()}, renderer: function (value) {
                    if (lang[value])
                        return lang[value];
                    return value;
                }, xfilter: {
                    xtype: 'combo',
                    editable: false,
                    displayField: 'name',
                    valueField: 'value',
                    triggerAction: 'all',
                    typeAhead: false,
                    mode: 'local',
                    listWidth: 160,
                    hideTrigger: false,
                    //emptyText: 'Select',
                    store: [[null, '*'], ['incoming', lang['incoming']], ['outgoing', lang['outgoing']]]
                }
            },
            {hidden: true, flex: 1, text: lang['idgroup'], dataIndex: 'parent_id', xfilter: {xtype: 'searchfield', store: self.emptyStore()}},
            {flex: 1, text: lang['msisdn'], dataIndex: 'msisdn', xfilter: {xtype: 'searchfield', store: self.emptyStore()}},
            {flex: 1, text: lang['service_contact'], dataIndex: 'service_contact', xfilter: {xtype: 'searchfield', store: self.emptyStore()}},
            {hidden: true, flex: 1, text: lang['operator_contact'], dataIndex: 'refer', xfilter: {xtype: 'searchfield', store: self.emptyStore()}},
            {flex: 1, text: lang['script'], dataIndex: 'script', xfilter: {xtype: 'searchfield', store: self.emptyStore()}},
            //{flex: 1, text: lang['step'], dataIndex: 'step', xfilter: {xtype: 'searchfield', store: self.emptyStore()}},
            {flex: 1, text: lang['findings'], dataIndex: 'data', xfilter: {xtype: 'searchfield', store: self.emptyStore()}},
            {flex: 1, text: lang['duration'], dataIndex: 'duration', xfilter: {xtype: 'searchfield', store: self.emptyStore()}, align: 'right', style: 'text-align:left', renderer: Ext.ux.timeRender},
            {flex: 1, text: lang['status'], dataIndex: 'status', xfilter: {
                    xtype: 'combo',
                    editable: false,
                    displayField: 'name',
                    valueField: 'value',
                    triggerAction: 'all',
                    typeAhead: false,
                    mode: 'local',
                    listWidth: 160,
                    hideTrigger: false,
                    //emptyText: 'Select',
                    store: [[null, '*'], ['answered', lang['answered']], ['callFailed', lang['callFailed']], ['cancelled', lang['cancelled']]]
                },
                renderer: function (value) {
                    if (lang[value])
                        return lang[value];
                    return value
                }
            },
            {hidden: true, flex: 1, text: lang['reason'], dataIndex: 'reason', xfilter: {xtype: 'searchfield', store: self.emptyStore()},
                renderer: function (value) {
                    return value.replace(/\s/g, '_');
                }},
            {width: 130, text: lang['record'], dataIndex: 'record', xfilter: {}, renderer: function (value) {
                    if (value)
                        value = '<audio class="rec" type="audio/wav" src="/' + value + '?dc_=' + new Date().getTime() + '" controls autobuffer></audio>';
                    return value;
                }
            }
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