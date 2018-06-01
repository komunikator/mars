/**
 * IVR App
 * @DIGT Telecom
 */

Ext.application({
    name: 'IVR',
    appFolder: _webPath + '/main/javascripts/app',
    requires: [
        'IVR.lib.form.field.VTypes',
        'IVR.lib.form.field.override.Text',
        'Ext.ux.form.field.CodeMirror',
        'Ext.ux.upload.Dialog',
        'Ext.ux.upload.Panel',
        'Ext.ux.upload.uploader.ExtJsUploader',
        'Ext.ux.upload.header.Base64FilenameEncoder',
        'Ext.ux.grid.xFilterRow',
        'Ext.ux.form.SearchField',
        'IVR.view.editor.*'
    ],
    views: [
        'menu.Tree',
        'dialogs.List',
        'reports.List',
        'scripts.Editor',
        'master.List',
        'settings.Tree',
        'tasks.Editor',
        'settings.Editor',
        'targets.Editor',
        'targets.Grid',
        'media.Tree'
    ],
    controllers: [],
    stores: [
        'Menu',
        //'Scripts',
        'Dialogs',
        'Tasks',
        'Settings',
        'Media',
        'Reports',
        //'EventsList',
        //'ScriptsList',
        //'TasksList',
        //'SettingsList'
    ],
    wsConnect: 'disable',
    timerClock: null,
    serverTime: 0,
    deltaTime: 0,
    socket: {},
    wsLaunch: function() {

        //-----
        // console.log("ws" + (window.location.protocol == "https:" ? "s" : "") + "://" + window.location.hostname + ":" + window.location.port + _webPath);
        // = ws://localhost:8000
        //-----


        if (!window.WebSocket) {
            console.log('WebSocket: is not available');
        }

        if (IVR.getApplication().wsConnect === 'disable') {
            IVR.getApplication().wsConnect = 'expect';

            //---old for ws
            // var socket = new WebSocket("ws" + (window.location.protocol == "https:" ? "s" : "") + "://" + window.location.hostname + ":" + window.location.port + _webPath);
            IVR.getApplication().socket = io("ws" + (window.location.protocol == "https:" ? "s" : "") + "://" + window.location.hostname + ":" + window.location.port + _webPath, { "transports": ["websocket"] });
            var socket = IVR.getApplication().socket;

            //---old for ws
            //socket.onmessage = function (event) {
            socket.on('message', function(event) {
                //var incomingMessage = event.data;
                //console.log(incomingMessage);

                //---old for ws
                //var obj = Ext.JSON.decode(event.data).data;
                //  if (Ext.JSON.decode(event.data).source == 'hideSipCli') {
                //      if (Ext.JSON.decode(event.data).data) {
                //         Ext.getCmp('statusSipClientGrid').hide();
                //     } else {
                //         Ext.getCmp('statusSipClientGrid').show();
                //     }
                // }

                var obj = Ext.JSON.decode(event).data;
                if (Ext.JSON.decode(event).source == 'hideSipCli') {
                    if (Ext.JSON.decode(event).data) {
                        Ext.getCmp('statusSipClientGrid').hide();
                    } else {
                        Ext.getCmp('statusSipClientGrid').show();
                    }
                }
                if (obj.source) {
                    var store = Ext.data.StoreManager.lookup(obj.source) || (Ext.getCmp(obj.source + 'Grid') && Ext.getCmp(obj.source + 'Grid').store);
                    //if (store && store.store)
                    //    store = store.store;
                    //console.log(obj.source, store);

                    if (store) {
                        if (obj.data) {
                            store.loadRawData(obj.data, false);
                            if (obj.source == 'Dialogs') {
                                Ext.getCmp('dialogsList').onTimer();
                            }
                        } else {
                            store.removeAll();
                        }
                    } else {
                        if (obj.source == 'statusUA') {
                            refreshSipAccounts(obj);
                        }
                        if (obj.source == 'statusSipCli') {
                            refreshSipClients(obj);
                        }
                        if (obj.source == 'statusB24UA') {
                            refreshB24UA(obj);
                        }
                        if (obj.source == 'b24accounts') {
                            showMessageOfferRefreshTokens(obj);
                        }
                        if (obj.source == 'statusSMPP') {
                            refreshSMPP(obj);
                        }
                    }
                } else {

                    //---old for ws
                    //var msg = JSON.parse(event.data);
                    var msg = JSON.parse(event);
                    if (msg.source == 'time') {
                        if (msg.data) {
                            var ivr = Ext.getCmp("IVR.view.Viewport");

                            function formatDate(date) {
                                var dd = date.getUTCDate()
                                if (dd < 10)
                                    dd = '0' + dd;

                                var mm = date.getUTCMonth() + 1
                                if (mm < 10)
                                    mm = '0' + mm;

                                var yy = date.getUTCFullYear();

                                var hh = date.getUTCHours();
                                if (hh < 10)
                                    hh = '0' + hh;

                                var min = date.getUTCMinutes();
                                if (min < 10)
                                    min = '0' + min;

                                var sec = date.getUTCSeconds();
                                if (sec < 10)
                                    sec = '0' + sec;

                                var strData = dd + '.' + mm + '.' + yy + ' ' + hh + ':' + min + ':' + sec + '';

                                return strData;
                            };

                            IVR.getApplication().serverTime = msg.data;
                            IVR.getApplication().deltaTime = IVR.getApplication().serverTime - new Date().getTime();

                            function updateTime() {
                                IVR.getApplication().serverTime = new Date().getTime() + IVR.getApplication().deltaTime;
                                var curTime = formatDate(new Date(IVR.getApplication().serverTime));
                                var componentTime = ivr.items.items[0].items.items[0].items.items[2];
                                componentTime.setValue('<b>' + curTime + '</b>');
                            }

                            updateTime();

                            clearInterval(IVR.getApplication().timerClock);
                            IVR.getApplication().timerClock = window.setInterval(updateTime, 1000);
                        }
                    }
                }
            });

            //---old for ws
            function showMessageOfferRefreshTokens(data) {
                if (data) {
                    try {
                        var accounts = JSON.parse(data.accounts);
                        for (let key in accounts) {
                            if (accounts[key] && accounts[key].auth  && (!accounts[key].auth.refresh_token) && 
                                accounts[key].auth.portalLink && accounts[key].auth.clientId && accounts[key].auth.redirectUri &&
                                (accounts[key].auth.disable != 1)) {
                                    Ext.showInfo(`${lang.updateRefreshToken} <a href=${accounts[key].auth.portalLink}/oauth/authorize/?client_id=${accounts[key].auth.clientId}&response_type=code&redirect_uri=${accounts[key].auth.redirectUri} target="_blank"> ${lang.link} </a>`);
                            }
                        }
                    } catch(err) {
                        return console.log(err);
                    }
                } else {
                    Ext.Ajax.request({
                        url: _webPath + '/b24accounts',
                        method: 'get',
                        success: function(response, o) {
                            var resObj = Ext.decode(response.responseText);

                            if (resObj && resObj.success) {
                                if (resObj.data) {
                                    for (let key in resObj.data) {
                                        if (resObj.data[key] && resObj.data[key].auth  && (!resObj.data[key].auth.refresh_token) && 
                                            resObj.data[key].auth.portalLink && resObj.data[key].auth.clientId && resObj.data[key].auth.redirectUri &&
                                            (resObj.data[key].auth.disable != 1)) {
                                            Ext.showInfo(`${lang.updateRefreshToken} <a href=${resObj.data[key].auth.portalLink}/oauth/authorize/?client_id=${resObj.data[key].auth.clientId}&response_type=code&redirect_uri=${resObj.data[key].auth.redirectUri} target="_blank"> ${lang.link} </a>`);
                                        }
                                    }
                                }
                            }
                        },
                        failure: function(response, o) {
                            Ext.showError(response.responseText);
                        }
                    });
                }
            };

            socket.on('connect', function() {
                showMessageOfferRefreshTokens();
            });
            socket.on('message', function(e) {
                //console.log(e);
                IVR.getApplication().socket = socket;
                IVR.getApplication().wsConnect = 'online';
                refreshAllData();
            });

            //---old for ws
            //socket.onclose = function (event) {
            socket.on('disconnect', function(event) {
                if (event.wasClean) {
                    console.log('WebSocket: Соединение закрыто чисто');
                } else {
                    console.log('WebSocket: Обрыв соединения'); // Например, "убит" процесс сервера
                }
                console.log('WebSocket: Код: ' + event.code + ' причина: ' + event.reason + "/" + event);
                IVR.getApplication().wsConnect = 'disable';
                refreshStatusConnect();
                clearInterval(IVR.getApplication().timerClock);
            });

            //---old for ws
            // socket.onerror = function (error) {
            socket.on('error', function(error) {
                console.log("WebSocket: Error " + error.message);
                IVR.getApplication().wsConnect = 'disable';
                refreshStatusConnect();
                clearInterval(IVR.getApplication().timerClock);
            });

            socket.on('new rec', function(data) {
                console.log("new rec in history: " + data);
            })
            var onsubmit = function() {
                var outgoingMessage = this.message.value;
                //---old for ws
                //socket.send(outgoingMessage);
                socket.emit('message', outgoingMessage);
                return false;
            };

            function refreshAllData() {
                refreshStatusConnect();
                refreshStoreDialogs();
                refreshSipAccounts();
                refreshSipClients();
                refreshB24UA();
                refreshStatusTask();
            }

            function refreshStatusConnect() {
                var ivr = Ext.getCmp("IVR.view.Viewport");
                var leds = ivr.items.items[0].items.items[0].items.items;

                for (var key in leds) {
                    var id = leds[key].id;

                    if (id == 'webSocket') {
                        var updateStatus = leds[key].updateStatus;
                        updateStatus();
                        return;
                    }
                }
            }

            function refreshStoreDialogs() {
                var store = Ext.data.StoreManager.lookup('Dialogs');

                if (store) {
                    store.reload();
                }
            }

            function refreshSipAccounts(obj) {
                var ivr = Ext.getCmp("IVR.view.Viewport");
                var sipAccounts = ivr.items.items[0].items.items[1];
                if (obj && obj.data) {
                    sipAccounts.store.loadData(obj.data);
                    //console.log(obj.data);
                } else {
                    sipAccounts.onRefresh(sipAccounts);
                }
            }

            function refreshSipClients(obj) {
                var ivr = Ext.getCmp("IVR.view.Viewport");
                var sipClients = ivr.items.items[0].items.items[2];
                if (obj && obj.data) {
                    sipClients.store.loadData(obj.data);
                    //console.log(obj.data);
                } else {
                    sipClients.onRefresh(sipClients);
                }
            }

            function refreshStatusTask() {
                try {
                    var statusConnectBot = Ext.getCmp('statusConnectBot');
                    statusConnectBot.updateStatus();
                } catch(err) {
                    //console.log(err);
                }
            }

            function refreshB24UA(obj) {
                var ivr = Ext.getCmp("IVR.view.Viewport");
                var b24accounts = ivr.items.items[0].items.items[3];
                if (obj && obj.data) {
                    b24accounts.store.loadData(obj.data);
                } else {
                    b24accounts.onRefresh(b24accounts);
                }
            }

        }
    },
    launch: function() {
        var app = IVR.getApplication();
        app.wsLaunch();

        Ext.define('overrides.AbstractView', {
            override: 'Ext.view.AbstractView',
            // Force load mask target to be an inner DOM Element of a owner panel instead of current view
            // in order to fix load mask positioning when scrolling
            onRender: function() {
                var me = this,
                    targetEl, cfg, mask = me.loadMask,
                    owner = me.ownerCt;

                if ((mask) && (owner)) {
                    targetEl = owner.getEl();
                    targetEl.componentLayoutCounter = 1;
                    targetEl.rendered = true;

                    cfg = {
                        target: targetEl
                    };

                    me.loadMask = (Ext.isObject(mask)) ? Ext.applyIf(me.loadMask, cfg) : cfg;
                }

                me.callParent(arguments);
            }
        });
        Ext.create('IVR.lib.form.field.VTypes').init();
        Ext.override(Ext.form.field.Base, {
            showClear: false,
            afterRender: function() {
                if (this.showClear && this.xtype != 'checkbox1' && this.xtype != 'radio') {
                    if (Ext.isEmpty(this.inputCell))
                        this.__clearDiv = this.bodyEl.insertHtml('beforeEnd', '<div class="x-clear"></div>', true);
                    else
                        this.__clearDiv = this.inputCell.insertHtml('beforeEnd', '<div class="x-clear"></div>', true);

                    this.__clearDiv.setVisible(!Ext.isEmpty(this.getValue()));
                    this.__clearDiv.on('click', this.clearField, this);
                }
            },
            onChange: function() {
                this.callParent(arguments);
                if (!Ext.isEmpty(this.__clearDiv))
                    this.__clearDiv.setVisible(!Ext.isEmpty(this.getValue()));
            },
            clearField: function() {
                this.setValue(null);
                this.clearInvalid();
                this.focus();
            }
        });
    },
    autoCreateViewport: true
});