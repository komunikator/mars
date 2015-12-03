/**
 * IVR App
 * @DIGT Telecom
 */

Ext.application({
    name: 'IVR',
    appFolder: '/javascripts/app',
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
        'settings.Tree',
        'tasks.Editor',
        'settings.Editor',
        'targets.Editor',
        'targets.Grid',
        'media.Tree'
    ],
    controllers: [
    ],
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
    wsLaunch: function() {
		if (!window.WebSocket) {
			console.log('WebSocket: is not available');
		}

		if (IVR.getApplication().wsConnect === 'disable') {
			IVR.getApplication().wsConnect = 'expect';

			var socket = new WebSocket("ws://" + window.location.hostname + ":" + window.location.port);

			socket.onmessage = function(event) {
				//var incomingMessage = event.data;
				//console.log(incomingMessage);
				var obj = Ext.JSON.decode(event.data).data;
				if (obj.source) {
					var store = Ext.data.StoreManager.lookup(obj.source) || (Ext.getCmp(obj.source + 'Grid') && Ext.getCmp(obj.source + 'Grid').store);
					//if (store && store.store)
					//    store = store.store;
					//console.log(obj.source, store);
					if (store) {
						if (obj.data) {
							store.loadRawData(obj.data, false);
						} else {
							store.removeAll();
						}
					} else {
						if (obj.source == 'statusUA') {
							refreshSipAccounts(obj);
						}
					}
				}
			};

			socket.onopen = function() {
				console.log("WebSocket: Open");
				IVR.getApplication().wsConnect = 'online';
				refreshAllData();
			};

			socket.onclose = function(event) {
				if (event.wasClean) {
					console.log('WebSocket: Соединение закрыто чисто');
				} else {
					console.log('WebSocket: Обрыв соединения'); // Например, "убит" процесс сервера
				}
				console.log('WebSocket: Код: ' + event.code + ' причина: ' + event.reason);
				IVR.getApplication().wsConnect = 'disable';
				refreshStatusConnect();
			};

			socket.onerror = function(error) {
				console.log("WebSocket: Error " + error.message);
				IVR.getApplication().wsConnect = 'disable';
				refreshStatusConnect();
			};

			var onsubmit = function() {
				var outgoingMessage = this.message.value;
				socket.send(outgoingMessage);
				return false;
			};

			function refreshAllData() {
				refreshStatusConnect();
				refreshStoreDialogs();
				refreshSipAccounts();
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
                var me = this, targetEl, cfg, mask = me.loadMask, owner = me.ownerCt;

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