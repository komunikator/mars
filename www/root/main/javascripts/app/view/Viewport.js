Ext.define('IVR.view.Viewport', {
    extend: 'Ext.container.Viewport',
    //extend: 'Ext.container.Container',
    //renderTo: 'main', height: 300,
    id: 'IVR.view.Viewport',
    layout: 'border',
    title: lang.mainTitle,
    style: "padding: 5px;",
    items: [
            {
            xtype: 'container',
            region: 'north',
            layout: {
                type: 'hbox',
                align: 'middle'
            },
            style: {
                background: 'url(' + _webPath + '/main/images/layout-browser-hd-bg-gray.gif) repeat-x scroll center center'
            },
            //height: 24,
            items: [
                {
                    xtype: 'panel',
                    style: 'margin: 2px;',
                    border: true,
                    frame: true,
                    width: 192,
                    items:  [
                                {
                                    id: 'webSocket',
                                    xtype: 'button',
                                    style: {
                                        height: '22px',
                                        width: '22px',
                                        float: 'right',
                                        margin: '3px 7px 0 0',
                                        border: 'none',
                                        'background-color': 'none'
                                    },
                                    tooltip: lang['connect'],
                                    handler: function() {
                                        this.connect();
                                    },
                                    connect: function() {
                                        var app = IVR.getApplication();

                                        if (app.wsConnect === 'disable') {
                                            this.timerDelete();
                                            var ivr = Ext.getCmp("IVR.view.Viewport");
                                            var leds = ivr.items.items[0].items.items[0].items.items;

                                            for (var key in leds) {
                                                var id = leds[key].id;

                                                if (id == 'webSocket') {
                                                    var updateStatus = leds[key].updateStatus;
                                                    app.wsLaunch();
                                                    updateStatus();
                                                    return;
                                                }
                                            }
                                        }
                                    },
                                    updateStatus: function() {
                                        var ivr = Ext.getCmp("IVR.view.Viewport");
                                        var items = ivr.items.items[0].items.items[0].items.items;
                                        var btn;

                                        for (var key in items) {
                                            var id = items[key].id;

                                            if (id == 'webSocket') {
                                                btn = items[key];
                                                break;
                                            }
                                        }

                                        btn.removeCls('ws-online');
                                        btn.removeCls('ws-expect');
                                        btn.removeCls('ws-disable');

                                        var app = IVR.getApplication();

                                        switch (app.wsConnect) {
                                            case 'online':
                                                btn.setTooltip(lang['connectedWebSocket']);
                                                btn.addClass('ws-online');
                                                break;
                                            case 'expect':
                                                btn.setTooltip(lang['disabledWebSocket']);
                                                btn.addClass('ws-expect');
                                                break;
                                            case 'disable':
                                                btn.setTooltip(lang['disabledWebSocket']);
                                                btn.timerConnection();
                                                btn.addClass('ws-disable');
                                                break;
                                            default:
                                                btn.setTooltip(lang['disabledWebSocket']);
                                                btn.timerConnection();
                                                btn.addClass('ws-disable');
                                                break;
                                        };
                                    },
                                    timer: undefined,
                                    timerConnection: function() {
                                        var time = 30000;
                                        var ivr = Ext.getCmp("IVR.view.Viewport");
                                        var items = ivr.items.items[0].items.items[0].items.items;

                                        for (var key in items) {
                                            var id = items[key].id;

                                            if (id == 'webSocket') {
                                                clearTimeout(items[key].timer);
                                                items[key].timer = setTimeout(function() {
                                                    items[key].connect(this);
                                                }, time);
                                                return;
                                            }
                                        }
                                    },
                                    timerDelete: function() {
                                        var ivr = Ext.getCmp("IVR.view.Viewport");
                                        var items = ivr.items.items[0].items.items[0].items.items;

                                        for (var key in items) {
                                            var id = items[key].id;

                                            if (id == 'webSocket') {
                                                clearTimeout(items[key].timer);
                                                return;
                                            }
                                        }
                                    },
                                },
                                {
                                    xtype: 'container',
                                    style: {
                                        background: 'url(' + _webPath + '/main/images/apple-touch-icon-152x152.png) no-repeat center center',
                                        margin: '3px 0 0 4px'
                                    },
                                    height: 54
                                },
                                {
                                    xtype: 'displayfield',
                                    style: {
                                        margin: '0 0 0 25px'
                                    },
                                    value: '<b>' + lang.serverTime + '</b>'
                                }
                            ],
                },
                {
                    xtype: 'grid',
                    iconCls : 'connect',
                    //id: 'statusUAGrid',
                    frame: true,
                    style: 'margin: 2px;', // padding: 5px 3px;',
                    //autoWidth: true,
                    //bodyStyle: "background-color:transparent !important",
                    hideHeaders: true,
                    //flex: 1,
                    width: 216,
                    disableSelection: true,
                    renderer: function(value, metadata, record, rowIndex, colIndex, store) {
                        //var new_value = '<b>' + colIndex + '</b>';
                        var status;
                        switch (value) {
                            case 1:
                                metadata.css = 'ua-online';
                                status = lang['registered'];
                                break;
                            case 2:
                                metadata.css = 'ua-offline';
                                status = lang['unregistered'];
                                break;
                            case 0:
                                metadata.css = 'ua-disable';
                                status = lang['disabled'];
                                break;
                            default:
                                metadata.style = "background-color:white !important";
                                //new_value = '';
                                break;
                        };
                        metadata.style += ';color:white;';
                        if (status)
                          metadata.tdAttr = 'data-qtip="' + record.data['field' + (colIndex + 11) ] + ' ' + status + '"';
                        return '';//new_value;
                    },
                    onRefresh: function(grid) {
                        Ext.Ajax.request({
                            url: _webPath + '/statusUA',
                            method: 'get',
                            success: function(response, o) {
                                var resObj = Ext.decode(response.responseText);
                                if (resObj && resObj.success) {
                                    //Ext.getCmp('statusUAGrid')
                                    grid.store.loadData(resObj.data);
                                }
                                else
                                    Ext.showError(resObj.message || lang.error);

                            },
                            failure: function(response, o) {
                                Ext.showError(response.responseText);
                            }
                        });
                    },
                    listeners: {
                        afterrender: function() {
                            var columns = [];
                            var l = 10;
                            while (l--)
                                columns.push({dataIndex: 'field' + (l + 1), align: 'center', renderer: this.renderer, width: 20});
                            columns.reverse();
                            this.reconfigure(undefined, columns);
                            this.onRefresh(this);
                        }
                    },
                    columns: [
                        {dataIndex: 'field1'}
                    ],
                    store: [[
                            null, null, null, null, null, null, null, null, null, null, //status
                            null, null, null, null, null, null, null, null, null, null//name
                        ]],
                    title: lang['registerStatus'],
                    tools: [{
                            //type: 'refresh',
                            xtype: 'button',
                            iconCls: 'button-refresh',
                            tooltip: lang['refresh'],
                            handler: function() {
                                this.ownerCt.ownerCt.onRefresh(this.ownerCt.ownerCt);
                            }
                        }]
                },
                // {
                //     xtype: 'button',
                //     text: 'Запустить мастер настройки',
                //     renderTo: Ext.getBody(),        
                //     handler: function() {
                //         window.location = "wizard/";
                //     }
                // },
                {
                    xtype: 'container',
                    flex: 4
                },
                {
                    frame: false,
                    border: false,
                    bodyStyle: 'background:transparent;',
                    style: 'margin: 5px;',
                    items:[
                        {
                            xtype: 'displayfield',
                            value: lang.user +': <b>'+window['_username']+'</b>',
                        },
                        {
                            xtype: 'displayfield',
                            value: lang.VERSION,
                            fieldStyle: {
                                'font-family': 'lucida grande,tahoma,arial,sans-serif',
                                'font-weight': 'bold',
                                'font-size': '12px',
                                color: 'black',
                                marginRight: '5px',
                                paddingTop: '0px'
                            }
                        }
                    ]
                }],
            margins: '0 0 4 0'
        }, {
            layout: 'border',
            id: 'layout-browser',
            region: 'west',
            border: false,
            split: true,
            margins: '0 0 4 4',
            width: 190,
            minSize: 100,
            maxSize: 500,
            items: {
                region: 'center',
                height: '30%',
                autoScroll: true,
                xtype: 'menuTree'}
        },
        {
            // This is the main content center region that will contain each example layout panel.
            // It will be implemented as a CardLayout since it will contain multiple panels with
            // only one being visible at any given time.
            id: 'content-panel',
            region: 'center', // this is what makes this panel into a region within the containing layout
            layout: 'card',
            margins: '0 4 4 0',
            activeItem: 0,
            border: false,
            deferredRender: true,
            layoutConfig: {deferredRender: true}/*,
             items: [
             {
             id: 'start-panel',
             autoScroll: true,
             title: '',
             layout: 'fit',
             bodyStyle: 'padding:25px',
             contentEl: 'start-div'  // pull existing content from the page
             }
             ]*/
        }]
});

function checkXtypeExist(xtype) {
    return Ext.ClassManager.getNameByAlias('widget.' + xtype) != '';
}
;
