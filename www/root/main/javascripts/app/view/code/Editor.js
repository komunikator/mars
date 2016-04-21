Ext.define('IVR.view.code.Editor', {
    extend: 'Ext.container.Container',
    requires: [
        'Ext.ux.form.field.CodeMirror',
        'IVR.view.resource.Editor'
    ],
    xtype: 'codeEditor',
    layout: 'border',
    //defaults: {style: 'margin: 2px;'},
    items: [
        {
            xtype: 'resourceEditor',
            itemId: 'list',
            region: 'west'
        },
        {
            xtype: 'form',
            itemId: 'form',
            titleAlign: 'center',
	    title:'',
            region: 'center',
            bodyPadding: 10,
            items: {
                xtype: 'codemirror',
                pathModes: _webPath + '/main/javascripts/lib/codemirror/mode',
                pathExtensions: _webPath + '/main/javascripts/lib/codemirror/lib/util',
                name: 'f',
                fieldLabel: 'Code',
                anchor: '100% -20',
                hideLabel: true,
                labelAlign: 'top',
                showModes: false,
                mode: 'text/javascript',
                listeners: {
                    afterrender: function(c) {
                        c.toolbar.add(['-',
                            {
                                xtype: 'button',
                                text: lang.refresh,
                                itemId: 'refresh',
			        hidden: true,
                                iconCls: 'button-refresh',
                                stretch: false,
                                align: 'left',
                                handler: function(me) {
                                    me.ownerCt.ownerCt.ownerCt.ownerCt.getComponent('list').store.load();
                                }
                            },
                            {
                                iconCls: 'dtmfData',
                                text: lang['save'],
                                handler: function() {
                                    var editor = this.ownerCt.ownerCt.ownerCt.ownerCt;
                                    if (!editor.getComponent('list').selectedRow)
                                        return;
                                    var name = editor.getComponent('list').selectedRow.data.text;
                                    var codeMirror = this.ownerCt.ownerCt.ownerCt.getForm().findField('f');
                                    var value = codeMirror.getValue();
                                    var saveFn = function() {
                                        editor.getComponent('list').updateAction({
                                            name: name,
                                            value: value,
                                            cb: function() {
                                                editor.getComponent('list').store.load();
                                                Ext.showInfo(lang["dataSaved"]);
                                            }
                                        });
                                    };
                                    if (codeMirror.mode == 'application/json')
                                        try {
                                            JSON.parse(value);
                                            saveFn();
                                        }
                                        catch (e) {
                                            Ext.showError(e.message);
                                        }
                                    else
                                        try {
                                            eval('(' + value + ')');
                                            saveFn();
                                        }
                                        catch (e) {
                                            Ext.showError(e.message);
                                        }
                                }
                            }
                        ]);
                        if (c.menu)
                            c.getEl().on('contextmenu', function(e) {
                                e.stopEvent();
                                var pos = e.getXY();
                                pos = [pos[0], pos[1] + 12];
                                c.menu.showAt(pos);
                            });
                    }
                },
                buttonTips: {
                    justifycenter: {
                        title: lang['justifycenterTitle'],
                        text: lang['justifycenterText']
                    },
                    insertorderedlist: {
                        title: lang['insertorderedlistTitle'],
                        text: lang['insertorderedlistText']
                    }
                }
            }
        }
    ],
    constructor: function(config) {
        this.items[0].title = this.listTitle;
        this.items[0].store = this.listStore;
        this.callParent([config]);
        this.getComponent('list').on('selectionchange', function(view, selections, options) {
            if (selections && selections[0])
            {
                this.ownerCt.getComponent('form').setTitle(this.title + " '" + selections[0].data.text + "' ");
                this.selectedRow = selections[0];
                this.ownerCt.getComponent('form') && this.ownerCt.getComponent('form').getForm().findField('f').setValue(selections[0].data.value);
            }
            else
                {
		   this.ownerCt.getComponent('form').setTitle('');
		   this.ownerCt.getComponent('form') && this.ownerCt.getComponent('form').getForm().findField('f').setValue('');
		}
        }
        );
    }
});