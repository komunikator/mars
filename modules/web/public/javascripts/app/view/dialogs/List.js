Ext.define('IVR.view.dialogs.List', {
    extend: 'Ext.grid.Panel',
    xtype: 'dialogsList',
    title: lang['active_calls'],
    viewConfig: {
        loadMask: false,
        enableTextSelection: true,
        stripeRows: true
    },
    renderMsg: function (value, record) {
        if (lang[value])
            return lang[value];
        else
            return value;
    },
    store: 'Dialogs',
    iconCls: 'icon_menu_diag_monitor',

    timer: setInterval(function() {
        for(var key in window.answeredCalls) {
            window.answeredCalls[key]++;
            console.log('window.answeredCalls[key] = ' + window.answeredCalls[key]);
        }
    }, 1000),

    constructor: function (config) {
        this.selType = 'rowmodel';
        this.tools = [
            {xtype: 'container',
                width: 700,
                items: {
                    xtype: 'pagingtoolbar',
                    displayInfo: true,
                    store: 'Dialogs'
                }
            }
        ];
        this.columns = [
            {
                text: lang.date,
                flex: 1,
                dataIndex: 'gdate'
                        /*, hidden: true*/
            },
            {
                text: lang.idgroup,
                flex: 1,
                dataIndex: 'parent_id'
            },
            {
                text: lang.session,
                flex: 1,
                dataIndex: '_id'
                        /*, hidden: true*/
            },
            {
                text: lang.type,
                flex: 1,
                dataIndex: 'type',
                renderer: function (value, metaData, record, row, col, store, gridView) {
                    return this.renderMsg(value, record);
                }
            },
            {
                text: lang.msisdn,
                flex: 1,
                dataIndex: 'msisdn'
            },
            {
                text: lang.service_contact,
                flex: 1,
                dataIndex: 'service_contact'
            },
             /*
             {
             text: lang.operator_contact,
             flex: 1,
             dataIndex: 'refer'
             },*/
            {
                text: lang.status,
                flex: 1,
                dataIndex: 'status',
                renderer: function (value, metaData, record, row, col, store, gridView) {
                    if (value == 'answered') {
                        if (!window.answeredCalls) {
                            window.answeredCalls = {};
                        }
                        window.answeredCalls[record.internalId] = 0;

                        /*
                        for (var i = 0; i < this.columns.length; i++)
                        {
                            if (this.columns[i].dataIndex == 'call_duration') {
                                var callDuration = this.columns[i];
                                break;
                            }
                        }
                        */
                    } else if (value == 'ended') {
                        if (record.internalId in window.answeredCalls) {
                            delete window.answeredCalls[record.internalId];
                        }
                    }

                    value = this.renderMsg(value, record);
                    if (record.data.reason)
                        value += '. ' + this.renderMsg(record.data.reason, record)
                    return value;
                }
            },
            {
                text: lang.call_duration,
                flex: 1,
                dataIndex: 'call_duration',
                renderer: function (value) {
                    //console.log('renderer timer = ' + time);
                    return value;
                }
            },
            {
                text: lang.script,
                flex: 1,
                dataIndex: 'script'
            },
            {
                text: lang.findings,
                flex: 1,
                dataIndex: 'data'
            }
            /*
             {
             text: lang.rtp_local,
             flex: 1,
             dataIndex: 'rtp_local'
             },
             {
             text: lang.rtp_remote,
             flex: 1,
             dataIndex: 'rtp_remote'
             }*/
        ];

        //parent
        //this.callParent(arguments);
        this.callParent([config]);
    }
});