Ext.apply(Ext.form.field.VTypes, {
    //  vtype validation function
    cron: function(val, field) {
        function cronChecker(time) {

            this.source = time;

            this.map = ['minute', 'hour', 'dayOfMonth', 'month', 'dayOfWeek'];
            this.constraints = [[0, 59], [0, 23], [1, 31], [0, 11], [0, 6]];
            this.aliases = {
                jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
                sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6
            };

            this.minute = {};
            this.hour = {};
            this.dayOfMonth = {};
            this.month = {};
            this.dayOfWeek = {};
            this._parse = function() {

                var aliases = this.aliases, cur, split, len = 5, error = '';

                this.source = this.source.replace(/[a-z]+/i, function(alias) {
                    alias = alias.toLowerCase();
                    if (alias in aliases) {
                        return aliases[alias];
                    }
                    error = ('Unknown alias: ' + alias);
                });

                if (error)
                    return error;

                split = this.source.replace(/^\s\s*|\s\s*$/g, '').split(/\s+/);

                while (len--) {
                    cur = split[len] || '*';
                    error = this._parseField(cur, this.map[len], this.constraints[len]);
                    if (error)
                        return error;
                }
                return '';

            };
            this._parseField = function(field, type, constraints) {

                var rangePattern = /(\d+?)(?:-(\d+?))?(?:\/(\d+?))?(?:,|$)/g,
                        typeObj = this[type],
                        diff,
                        error = '',
                        low = constraints[0],
                        high = constraints[1];

                // * is a shortcut to [lower-upper] range
                field = field.replace(/\*/g, low + '-' + high);
                if (field.match(rangePattern)) {

                    field.replace(rangePattern, function($0, lower, upper, step) {
                        if (lower < low || lower > high || (upper !== undefined && upper > high))
                            error = ('Field (' + field + ') cannot be parsed. Invalid range [' + low + ',' + high + ']');

                        step = step || 1;
                        // Positive integer higher than constraints[0]
                        lower = Math.max(low, ~~Math.abs(lower));

                        // Positive integer lower than constraints[1]
                        upper = upper ? Math.min(high, ~~Math.abs(upper)) : lower;

                        diff = step + upper - lower;
                        while ((diff -= step) > -1) {
                            if ((diff + lower) > high || (diff + lower) < low)
                                typeObj[diff + lower] = true;
                        }

                    });
                    if (error)
                        return error;

                } else {

                    return ('Field (' + field + ') cannot be parsed');

                }
                return '';
            };

            return this._parse();
        }
        ;
        return cronChecker(val) === '';
    },
    // vtype Text property: The error text to display when the validation function returns false
    cronText: lang.cronText,
    // vtype Mask property: The keystroke filter mask
    cronMask: /[\d\s\/,-/*]/i
});

Ext.define('IVR.view.editor.Tasks.root', {
    extend: 'Ext.panel.Panel',
    layout: 'card',
    itemId: 'root',
    //xtype:'editorTasks_root',
    //height: 200,
    border: false,
    style: 'border: none;',
    //labelStyle: 'padding: 2px 5px;',
    bodyStyle: 'background-color: transparent !important;',
    defaults: {
        bodyStyle: "background: transparent none !important;border: none;"
    },
    items: [
        {
            itemId: 'start',
            defaults: {
                anchor: '100%',
                //labelStyle: 'padding: 6px 5px;',
                margin: '5 0 0 0',
                width: '100%'
            },
            items: [
                {
                    xtype: 'fieldset',
                    itemId: 'date',
                    title: lang.start,
                    items: [
                        {
                            xtype: 'radiogroup',
                            defaults: {margin: '2 0 0 0', xtype: 'radio'},
                            columns: 2,
                            items: [
                                {
                                    boxLabel: lang.byEvent,
                                    id: Ext.id(),
                                    checked: true,
                                    name: 'type',
                                    inputValue: 'event'
                                },
                                {
                                    boxLabel: lang.scheduled,
                                    id: Ext.id(),
                                    name: 'type',
                                    inputValue: 'time'
                                }
                            ],
                            listeners: {
                                change1: function(field, newValue, oldValue) {
                                    this.ownerCt.getComponent('time').setVisible(newValue.type == 'time');
                                    this.ownerCt.ownerCt.getDockedComponent('time').setVisible(newValue.type == 'time');
                                    {
                                        this.ownerCt.getComponent('event').setVisible(newValue.type == 'event');
                                        this.ownerCt.ownerCt.getDockedComponent('event').setVisible(newValue.type == 'event');
                                        if (newValue.type == 'event')
                                            this.ownerCt.getComponent('event').getStore().load();
                                    }
                                },
                                afterrender1: function() {
                                    var self = this.ownerCt.getComponent('event');
                                    var store = self.getStore();
                                    store.load({callback:
                                                function() {
                                                    if (store.getCount() != 0) {
                                                        var recordSelected = store.getAt(0);
                                                        //if (self.rendered) {
                                                        self.setValue(recordSelected.get('id'));
                                                        self.fireEvent('select', self, [recordSelected]);
                                                        //}
                                                    }
                                                    else
                                                        self.clearValue();
                                                }
                                    });
                                }
                            }

                        },
                        {
                            xtype: 'combobox',
                            fieldLabel: lang.event,
                            name: 'event',
                            itemId: 'event',
                            //triggerAction: 'all',
                            editable: false,
                            valueField: 'id',
                            displayField: 'text',
                            store: Ext.data.StoreManager.lookup('EventsList') ? Ext.data.StoreManager.lookup('EventsList') : Ext.create('IVR.store.EventsList'),
                            listeners: {
                                beforequery: function(qe) {
                                    delete qe.combo.lastQuery;
                                }
                            }
                        },
                        {
                            xtype: 'textfield',
                            hidden: true,
                            name: 'time',
                            itemId: 'time',
                            value: '* * * * *',
                            fieldLabel: lang.schedule,
                            vtype: 'cron'
                        }
                    ]
                }
            ],
            dockedItems: [
                {
                    dock: 'bottom',
                    xtype: 'textarea',
                    itemId: 'event',
                    margin: '5 0 0 0',
                    fieldStyle: "background: transparent none !important;",
                    value: lang.incomingCall_info, //Ext.form.field.VTypes.cronText,
                    readOnly: true,
                    anchor: '100%'
                },
                {
                    dock: 'bottom',
                    xtype: 'panel',
                    html: Ext.form.field.VTypes.cronText,
                    itemId: 'time',
                    margin: '5 0 0 0',
                    hidden: true,
                    fieldStyle: "background: transparent none !important;",
                    anchor: '100%'
                }]
        },
        {
            itemId: 'target',
            items: Ext.create('IVR.view.targets.List', {}),
            dockedItems: [
                {
                    dock: 'bottom',
                    xtype: 'textarea',
                    fieldStyle: "background: transparent none !important;",
                    value: '',
                    readOnly: true,
                    anchor: '100%'
                }]
        },
        {
            itemId: 'scriptID',
            listeners: {
                activate: function() {
                    var self = this.getComponent('main');
                    var store = self.getStore();
                    store.load({callback:
                                function() {
                                    if (store.getCount() != 0) {
                                        var recordSelected = store.getAt(0);
                                        self.setValue(recordSelected.get('id'));
                                        self.fireEvent('select', self, [recordSelected]);
                                    }
                                    else
                                        self.clearValue();
                                }});
                }
            },
            items: {
                labelStyle: 'padding: 6px 5px;',
                width: '100%',
                xtype: 'combobox',
                id: Ext.id(),
                itemId: 'main',
                fieldLabel: lang.script,
                name: 'scriptID',
                editable: false,
                valueField: 'id',
                displayField: 'text',
		store: Ext.data.StoreManager.lookup('ScriptsList') ? Ext.data.StoreManager.lookup('ScriptsList') : Ext.create('IVR.store.ScriptsList')
                listeners: {
                    beforequery: function(qe) {
                        delete qe.combo.lastQuery;
                    }
                }

            },
            dockedItems: [
                {
                    dock: 'bottom',
                    xtype: 'textarea',
                    fieldStyle: "background: transparent none !important;",
                    value: '',
                    readOnly: true,
                    anchor: '100%'
                }]
        }
        /*,
         {
         itemId: 'emptyItem'
         }*/
    ]
});