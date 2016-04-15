Ext.define('IVR.view.dialogs.List', {
    extend: 'Ext.grid.Panel',
    xtype: 'dialogsList',
    id: 'dialogsList',
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
    onTimer: function () {
        var store = Ext.getStore('Dialogs');
        store.each(function (record, idx) {
            var diff = new Date().getTimezoneOffset() * 60 * 1000 * (-1);
            var serverTime = new Date(IVR.getApplication().serverTime - diff);
            var startTime = new Date(record.data.gdate);
            var diffMs = Math.floor(Math.abs(serverTime - startTime));
            /*
             function num(val) {
             val = Math.floor(val);
             return val < 10 ? '0' + val : val;
             }
             
             function getTime(ms) {
             var sec = ms / 1000
             , hours = sec / 3600
             , minutes = sec / 60 % 60
             , seconds = sec % 60;
             return num(hours) + ":" + num(minutes) + ":" + num(seconds);
             }
             ;
             
             var timeCall = getTime(diffMs);
             */
            
            record.set('duration', Math.floor(diffMs / 1000));
            record.commit();
        });
    },
    timerStart: function () {
        if (!window.dialogTimer) {
            window.dialogTimer = true;
            var self = this;
            setInterval(self.onTimer, 1000);
        }
    },
    constructor: function (config) {
        this.timerStart();
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
                    value = this.renderMsg(value, record);
                    if (record.data.reason)
                        value += '. ' + this.renderMsg(record.data.reason, record)
                    return value;
                }
            },
            {
                text: lang.duration,
                flex: 1,
                dataIndex: 'duration',
                style: 'text-align:left', 
                align: 'right',
                renderer: IVR.getApplication().timeRender
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