var currentNameTask;
var isActiveCurrentTask;
function isB24Connect(data) {
    return data.indexOf('b24@') + 1;
}
function updateStateB24Fields(data) {
    var self = data;
    // console.log(data);
    var onEventValue = self.getRawValue();

    function changeVisibleB24fields(action) {
        for (var i = 1; i < self.ownerCt.items.items.length; i++) {
            self.ownerCt.items.items[i][action]();
        }
    };

    if (isB24Connect(onEventValue)) {
        changeVisibleB24fields('show');
    } else {
        changeVisibleB24fields('hide');
    }
}
Ext.apply(Ext.form.field.VTypes, {
//  vtype validation function
    cron: function (val, field) {
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
            this._parse = function () {

                var aliases = this.aliases, cur, split, len = 5, error = '';
                this.source = this.source.replace(/[a-z]+/i, function (alias) {
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
            this._parseField = function (field, type, constraints) {

                var rangePattern = /(\d+?)(?:-(\d+?))?(?:\/(\d+?))?(?:,|$)/g,
                        typeObj = this[type],
                        diff,
                        error = '',
                        low = constraints[0],
                        high = constraints[1];
                // * is a shortcut to [lower-upper] range
                field = field.replace(/\*/g, low + '-' + high);
                if (field.match(rangePattern)) {

                    field.replace(rangePattern, function ($0, lower, upper, step) {
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
Ext.requiredLabel = '<span style="color:red;font-weight:bold" data-qtip="Required">*</span>';
Ext.define('IVR.view.tasks.Editor', {
    id: 'IVR.view.tasks.Editor',
    extend: 'Ext.container.Container',
    xtype: 'tasksEditor',
    requires: ['IVR.view.scripts.Tree', 'IVR.view.resource.Editor'],
    layout: 'border',
    oldDataForm: "",
    form: {},
    setStateButtonSave: function () {
        var tasks = Ext.getCmp("IVR.view.tasks.Editor");
        if ( !tasks.form || !tasks.form.getValues ) {
            return false;
        }
        var btnSave = Ext.getCmp("IVR.view.tasks.Editor.save");
        if ( tasks.oldDataForm != JSON.stringify( tasks.form.getValues() ) ) {
            btnSave.setDisabled(false);
        } else {
            btnSave.setDisabled(true);
        }
    },
    items: [
        {
            title: lang['tasks'],
            iconCls: 'file',
            xtype: 'resourceEditor',
            itemId: 'list',
            region: 'west',
            basePath: 'tasks/',
            selectOnLoad: {index: 0},
            elementName: lang.task_,
            store: Ext.data.StoreManager.lookup('TasksList') ? Ext.data.StoreManager.lookup('TasksList') : Ext.create('IVR.store.TasksList')
        },
        {
            region: 'center',
            frame: true,
            title: lang.settings,
            itemId: 'settings',
            layout: {type: 'hbox', align: 'stretch'},
            items: [
                {
                    xtype: 'form',
                    title: lang.params,
                    titleAlign: 'center',
                    itemId: 'settingsForm',
                    iconCls: 'icon_wrench',
                    width: 350,
                    frame: true,
                    tools: [{
                            xtype: 'button',
                            hidden: true,
                            iconCls: 'button-refresh',
                            tooltip: lang['refresh'],
                            handler: function () {
                                this.ownerCt.ownerCt.ownerCt.ownerCt.getComponent('list').store.load();
                            }
                        }],
                    buttons: [
                        /*
                         {
                         iconCls: 'button-refresh',
                         text: lang['refresh'],
                         handler: function() {
                         this.ownerCt.ownerCt.ownerCt.ownerCt.getComponent('list').store.load();
                         }
                         },*/
                        {
                            iconCls: 'dtmfData',
                            text: lang['save'],
                            id: "IVR.view.tasks.Editor.save",
                            handler: function () {
                                var form = this.ownerCt.ownerCt.getForm();
                                form.formValid = function () {
                                    var isValid = true;
                                    for (var k in this.getValues())
                                        if (!this.findField(k).isValid())
                                            isValid = false;
                                    return isValid;
                                };
                                if (!form.formValid() || (!form.getValues().onEvent && !form.getValues().target)) {
                                    Ext.showError(lang["fill_required_field"]);
                                    return;
                                }
                                var tasks = Ext.getCmp("IVR.view.tasks.Editor");
                                tasks.oldDataForm = JSON.stringify( form.getValues() );
                                tasks.form = form;

                                var list = this.ownerCt.ownerCt.ownerCt.ownerCt.getComponent('list');
                                if (!list.selectedRow)
                                    return;
                                list.updateAction({
                                    name: list.selectedRow.data.text,
                                    value: JSON.stringify(form.getValues()),
                                    cb: function () {
                                        list.store.load();
                                        //Ext.showInfo(lang["dataSaved"]);
                                    }
                                });
                                tasks.setStateButtonSave();
                            }
                        }
                    ],
                    buttonAlign: 'center',
                    items: [
                        {
                            xtype: 'fieldset',
                            items: [
                                {
                                    xtype: 'container',
                                    layout: 'hbox',
                                    style: {
                                        'margin-bottom': '3px'
                                    },
                                    items: [
                                        {
                                            xtype: 'checkboxfield',
                                            fieldLabel: lang.active,
                                            name: 'active',
                                            inputValue: 'true',
                                            uncheckedValue: 'false',
                                            handler: function () {
                                                var onEvent = Ext.getCmp('onEvent').getRawValue();

                                                if ( !this.checked && isB24Connect(onEvent) ) {
                                                    Ext.showInfo(lang.warningRemovingChatBot);
                                                }
                                                Ext.getCmp("IVR.view.tasks.Editor").setStateButtonSave();
                                            }
                                        },
                                        {
                                            xtype: 'splitter',
                                            style: {
                                                'margin-left': '35px'
                                            }
                                        },
                                        {
                                            xtype: 'tbtext', 
                                            id: 'labalStatusB24Connect',
                                            text: lang.status + ':',
                                            style: {
                                                margin: '5px 10px 0 0'
                                            }
                                        },
                                        {
                                            xtype: 'form',
                                            frame: true,
                                            style: 'border:none !important;margin:-4px',
                                            items: [
                                                {
                                                    id: 'statusConnectBot',
                                                    xtype: 'button',
                                                    statusConnect: 'disable',
                                                    style: {
                                                        height: '22px',
                                                        width: '20px',
                                                        float: 'right',
                                                        margin: '1px 7px 0 0',
                                                        border: 'none',
                                                        // 'background-color': 'url(../images/ivr/mini_circle.png)  no-repeat center center !important'
                                                    },
                                                    register: function() {
                                                        var onEvent = Ext.getCmp('onEvent').getRawValue();

                                                        if (isB24Connect(onEvent)) {
                                                            onEvent = onEvent.split('@')[1];

                                                            if (currentNameTask && onEvent) {
                                                                Ext.Ajax.request({
                                                                    url: _webPath + '/registerB24tasks/' + currentNameTask + '.js',
                                                                    method: 'get',
                                                                    success: (response) => {
                                                                        this.updateStatus();
                                                                    },
                                                                    failure: function(response) {
                                                                        Ext.showError(response.responseText);
                                                                    }
                                                                });
                                                            }
                                                        }
                                                    },
                                                    updateStatus: function() {
                                                        this.removeCls('ws-online');
                                                        this.removeCls('ws-expect');
                                                        this.removeCls('ws-disable');
                                                        this.removeCls('ua-disable');

                                                        var onEvent = Ext.getCmp('onEvent').getRawValue();

                                                        this.setTooltip('');

                                                        if (isB24Connect(onEvent)) {
                                                            if ( (isActiveCurrentTask == 'false') || (!isActiveCurrentTask) ) {
                                                                this.setTooltip('');
                                                                return this.addClass('ua-disable');;
                                                            }
                                                            this.addClass('ws-expect');
                                                            this.show();
                                                            Ext.getCmp('labalStatusB24Connect').show();

                                                            onEvent = onEvent.split('@')[1];

                                                            if (currentNameTask && onEvent) {
                                                                Ext.Ajax.request({
                                                                    url: _webPath + '/statusB24tasks/' + currentNameTask + '.js' + '/' + onEvent,
                                                                    method: 'get',
                                                                    success: (response) => {
                                                                        this.removeCls('ws-online');
                                                                        this.removeCls('ws-expect');
                                                                        this.removeCls('ws-disable');
                                                                        this.removeCls('ua-disable');

                                                                        var resObj = Ext.decode(response.responseText);

                                                                        if (resObj && resObj.success && resObj.data) {
                                                                            if (resObj.data.error) {
                                                                                this.setTooltip(lang.unregistered + ': ' + resObj.data.error);
                                                                                delete this.botId;
                                                                                this.addClass('ws-disable');
                                                                            } else if (resObj.data.botId) {
                                                                                this.botId = resObj.data.botId;
                                                                                this.setTooltip(lang.registered + ': ' + resObj.data.botId);
                                                                                this.addClass('ws-online');
                                                                            }
                                                                        } else {
                                                                            this.setTooltip(lang.unregistered);
                                                                            delete this.botId;
                                                                            this.addClass('ws-disable');
                                                                        }
                                                                    },
                                                                    failure: function(response) {
                                                                        Ext.showError(response.responseText);
                                                                    }
                                                                });
                                                            } else {
                                                                
                                                            }
                                                        } else {
                                                            this.addClass('ua-disable');
                                                            this.hide();
                                                            Ext.getCmp('labalStatusB24Connect').hide();
                                                        }
                                                    },
                                                    listeners: {
                                                        click: function() {
                                                            if (!this.botId && (isActiveCurrentTask == 'true') ) {
                                                                this.register();
                                                            } else if ( isActiveCurrentTask == 'false' || (!isActiveCurrentTask) ) {
                                                                Ext.showInfo(lang['taskNotActive']);
                                                            } else {

                                                            }
                                                        }
                                                    }
                                                }
                                            ]
                                        }
                                    ]
                                },
                                {
                                    xtype: 'combobox',
                                    afterLabelTextTpl: Ext.requiredLabel,
                                    fieldLabel: lang.script,
                                    name: 'script',
                                    itemId: 'script',
                                    //triggerAction: 'all',
                                    editable: false,
                                    allowBlank: false,
                                    valueField: 'text',
                                    displayField: 'text',
                                    store: Ext.data.StoreManager.lookup('ScriptsList') ? Ext.data.StoreManager.lookup('ScriptsList') : Ext.create('IVR.store.ScriptsList'),
                                    handler: function () {
                                        Ext.getCmp("IVR.view.tasks.Editor").setStateButtonSave();
                                    },
                                    listeners: {
                                        beforequery: function (qe) {
                                            delete qe.combo.lastQuery;
                                            Ext.getCmp("IVR.view.tasks.Editor").setStateButtonSave();
                                        },
                                        select:  function () {
                                            Ext.getCmp("IVR.view.tasks.Editor").setStateButtonSave();
                                        }
                                    }
                                }
                            ]
                        },
                        {
                            xtype: 'tabpanel',
                            itemId: 'tabpanel',
                            title: lang.start,
                            titleAlign: 'center',
                            border: false,
                            activeTab: 1,
                            frame: true,
                            listeners: {
                                tabchange: function (t, c, p) {
                                    if (c.title == lang.byEvent) {
                                        this.ownerCt.getForm().reset();
                                        this.ownerCt.getForm().findField('startTime_time').setValue('10:00');
                                    }
                                    if (c.title == lang.scheduled)
                                        this.ownerCt.getForm().findField('onEvent').clearValue();
                                    Ext.getCmp("IVR.view.tasks.Editor").setStateButtonSave();
                                }
                            },
                            defaults: {
                                bodyPadding: 10,
                                layout: 'anchor',
                                frame: true
                            },
                            items: [{
                                    title: lang.byEvent,
                                    defaults: {
                                        anchor: '100%'
                                    },
                                    items: [
                                        {
                                            xtype: 'combobox',
                                            fieldLabel: lang.event,
                                            name: 'onEvent',
                                            id: 'onEvent',
                                            itemId: 'onEvent',
                                            //triggerAction: 'all',
                                            afterLabelTextTpl: Ext.requiredLabel,
                                            editable: false,
                                            valueField: 'id',
                                            displayField: 'text',
                                            listConfig: {
                                                itemTpl: Ext.create('Ext.XTemplate', '{text}')
                                            },
                                            store: Ext.data.StoreManager.lookup('EventsList') ? Ext.data.StoreManager.lookup('EventsList') : Ext.create('IVR.store.EventsList'),
                                            listeners: {
                                                change: function() {
                                                    var self = this;
                                                    setTimeout(function() {
                                                        updateStateB24Fields(self);
                                                    }.bind(self), 50);
                                                },
                                                afterrender: function(e) {
                                                    var self = e;
                                                    setTimeout(function() {
                                                        updateStateB24Fields(self);
                                                    }.bind(self), 50);
                                                },
                                                beforequery: function (qe) {
                                                    delete qe.combo.lastQuery;
                                                    Ext.getCmp("IVR.view.tasks.Editor").setStateButtonSave();
                                                },
                                                select:  function () {
                                                    updateStateB24Fields(this);
                                                    Ext.getCmp("IVR.view.tasks.Editor").setStateButtonSave();
                                                }
                                            }
                                        },
                                        {
                                            xtype: 'textfield',
                                            fieldLabel: lang.CODE,
                                            hidden: true,
                                            afterLabelTextTpl: Ext.requiredLabel,
                                            name: 'CODE',
                                            itemId: 'CODE',
                                            value: '',
                                            listeners: {
                                                change: function() {
                                                    Ext.getCmp("IVR.view.tasks.Editor").setStateButtonSave();
                                                }
                                            }
                                        },
                                        {
                                            xtype: 'textfield',
                                            fieldLabel: lang.TYPE,
                                            hidden: true,
                                            afterLabelTextTpl: Ext.requiredLabel,
                                            name: 'TYPE',
                                            itemId: 'TYPE',
                                            value: '',
                                            listeners: {
                                                change: function() {
                                                    Ext.getCmp("IVR.view.tasks.Editor").setStateButtonSave();
                                                }
                                            }
                                        },
                                        {
                                            xtype: 'textfield',
                                            fieldLabel: lang.EVENT_MESSAGE_ADD,
                                            hidden: true,
                                            afterLabelTextTpl: Ext.requiredLabel,
                                            name: 'EVENT_MESSAGE_ADD',
                                            itemId: 'EVENT_MESSAGE_ADD',
                                            value: '',
                                            listeners: {
                                                change: function() {
                                                    Ext.getCmp("IVR.view.tasks.Editor").setStateButtonSave();
                                                }
                                            }
                                        },
                                        {
                                            xtype: 'textfield',
                                            fieldLabel: lang.EVENT_WELCOME_MESSAGE,
                                            hidden: true,
                                            afterLabelTextTpl: Ext.requiredLabel,
                                            name: 'EVENT_WELCOME_MESSAGE',
                                            itemId: 'EVENT_WELCOME_MESSAGE',
                                            value: '',
                                            listeners: {
                                                change: function() {
                                                    Ext.getCmp("IVR.view.tasks.Editor").setStateButtonSave();
                                                }
                                            }
                                        },
                                        {
                                            xtype: 'textfield',
                                            fieldLabel: lang.EVENT_BOT_DELETE,
                                            hidden: true,
                                            afterLabelTextTpl: Ext.requiredLabel,
                                            name: 'EVENT_BOT_DELETE',
                                            itemId: 'EVENT_BOT_DELETE',
                                            value: '',
                                            listeners: {
                                                change: function() {
                                                    Ext.getCmp("IVR.view.tasks.Editor").setStateButtonSave();
                                                }
                                            }
                                        },
                                        {
                                            xtype: 'textfield',
                                            fieldLabel: lang.NAME,
                                            hidden: true,
                                            afterLabelTextTpl: Ext.requiredLabel,
                                            name: 'NAME',
                                            itemId: 'NAME',
                                            value: '',
                                            listeners: {
                                                change: function() {
                                                    Ext.getCmp("IVR.view.tasks.Editor").setStateButtonSave();
                                                }
                                            }
                                        },
                                        {
                                            xtype: 'textfield',
                                            fieldLabel: lang.LAST_NAME,
                                            hidden: true,
                                            afterLabelTextTpl: Ext.requiredLabel,
                                            name: 'LAST_NAME',
                                            itemId: 'LAST_NAME',
                                            value: '',
                                            listeners: {
                                                change: function() {
                                                    Ext.getCmp("IVR.view.tasks.Editor").setStateButtonSave();
                                                }
                                            }
                                        },
                                        {
                                            xtype: 'textfield',
                                            fieldLabel: lang.COLOR,
                                            hidden: true,
                                            afterLabelTextTpl: Ext.requiredLabel,
                                            name: 'COLOR',
                                            itemId: 'COLOR',
                                            value: '',
                                            listeners: {
                                                change: function() {
                                                    Ext.getCmp("IVR.view.tasks.Editor").setStateButtonSave();
                                                }
                                            }
                                        },
                                        {
                                            xtype: 'textfield',
                                            fieldLabel: lang.EMAIL,
                                            hidden: true,
                                            afterLabelTextTpl: Ext.requiredLabel,
                                            name: 'EMAIL',
                                            itemId: 'EMAIL',
                                            value: '',
                                            listeners: {
                                                change: function() {
                                                    Ext.getCmp("IVR.view.tasks.Editor").setStateButtonSave();
                                                }
                                            }
                                        },
                                        {
                                            xtype: 'textfield',
                                            fieldLabel: lang.PERSONAL_BIRTHDAY,
                                            hidden: true,
                                            afterLabelTextTpl: Ext.requiredLabel,
                                            name: 'PERSONAL_BIRTHDAY',
                                            itemId: 'PERSONAL_BIRTHDAY',
                                            value: '',
                                            listeners: {
                                                change: function() {
                                                    Ext.getCmp("IVR.view.tasks.Editor").setStateButtonSave();
                                                }
                                            }
                                        },
                                        {
                                            xtype: 'textfield',
                                            fieldLabel: lang.WORK_POSITION,
                                            hidden: true,
                                            afterLabelTextTpl: Ext.requiredLabel,
                                            name: 'WORK_POSITION',
                                            itemId: 'WORK_POSITION',
                                            value: '',
                                            listeners: {
                                                change: function() {
                                                    Ext.getCmp("IVR.view.tasks.Editor").setStateButtonSave();
                                                }
                                            }
                                        },
                                        {
                                            xtype: 'textfield',
                                            fieldLabel: lang.PERSONAL_WWW,
                                            hidden: true,
                                            afterLabelTextTpl: Ext.requiredLabel,
                                            name: 'PERSONAL_WWW',
                                            itemId: 'PERSONAL_WWW',
                                            value: '',
                                            listeners: {
                                                change: function() {
                                                    Ext.getCmp("IVR.view.tasks.Editor").setStateButtonSave();
                                                }
                                            }
                                        },
                                        {
                                            xtype: 'textfield',
                                            fieldLabel: lang.PERSONAL_GENDER,
                                            hidden: true,
                                            afterLabelTextTpl: Ext.requiredLabel,
                                            name: 'PERSONAL_GENDER',
                                            itemId: 'PERSONAL_GENDER',
                                            value: '',
                                            listeners: {
                                                change: function() {
                                                    Ext.getCmp("IVR.view.tasks.Editor").setStateButtonSave();
                                                }
                                            }
                                        },
                                        {
                                            xtype: 'textfield',
                                            fieldLabel: lang.PERSONAL_PHOTO_URL,
                                            hidden: true,
                                            afterLabelTextTpl: Ext.requiredLabel,
                                            name: 'PERSONAL_PHOTO',
                                            itemId: 'PERSONAL_PHOTO',
                                            value: '',
                                            listeners: {
                                                change: function() {
                                                    Ext.getCmp("IVR.view.tasks.Editor").setStateButtonSave();
                                                }
                                            }
                                        }
                                    ]
                                }, {
                                    title: lang.scheduled,
                                    items: [
                                        {
                                            fieldLabel: lang.time,
                                            width: 170,
                                            name: 'startTime_time',
                                            xtype: 'timefield',
                                            format: 'H:i',
                                            altFormats: 'H:i',
                                            increment: 30,
                                            listeners: {
                                                change: function () {
                                                    if (!this.isValid())
                                                        return;
                                                    var startTime = this.ownerCt.getComponent('startTime');
                                                    var time = this.getRawValue();
                                                    if (time) {
                                                        time = time.replace(/^(\d{2})\:(\d{2})$/, '$2 $1');
                                                        startTime.setValue(
                                                                startTime.getValue().replace(/^\s*\S+\s+\S+(\s+\S+\s+\S+\s+\S+\s*)$/, time + '$1')
                                                                );
                                                    }
                                                    Ext.getCmp("IVR.view.tasks.Editor").setStateButtonSave();
                                                }
                                            }
                                        },
                                        {
                                            xtype: 'radiogroup',
                                            vertical: true,
                                            columns: 1,
                                            fieldLabel: lang.date,
                                            //defaultType: 'checkboxfield',
                                            listeners: {
                                                change: function () {
                                                    var style = this.getValue().styleTime;
                                                    var startTime = this.ownerCt.getComponent('startTime');
                                                    if (!startTime.isValid())
                                                        return;
                                                    switch (style) {
                                                        case '0':
                                                            var date = this.getComponent(0).getComponent('date').getRawValue();
                                                            if (date) {
                                                                date = date.split('.');
                                                                date = date[0] + ' ' + (date[1] - 1);
                                                                startTime.setValue(
                                                                        startTime.getValue().replace(/^(\s*\S+\s+\S+)\s+\S+\s+\S+\s+(\S+\s*)$/, '$1 ' + date + ' $2')
                                                                        );
                                                            }
                                                            break;
                                                        case '1':
                                                            startTime.setValue(
                                                                    startTime.getValue().replace(/^(\s*\S+\s+\S+)\s+\S+\s+\S+\s+(\S+\s*)$/, '$1 ' + '* *' + ' $2')
                                                                    );
                                                            break;
                                                        case '2':
                                                            var formData = this.ownerCt.ownerCt.ownerCt.getForm().getValues();
                                                            //if (formData.weekdays/* && formData.weekdays.length*/)
                                                            startTime.setValue(
                                                                    startTime.getValue().replace(/^(\s*\S+\s+\S+\s+\S+\s+\S+\s+)(\S+\s*)$/, '$1' + (formData.weekdays != undefined ? formData.weekdays.toString() : '*'))
                                                                    );
                                                            break;
                                                    }

                                                    ;
                                                    Ext.getCmp("IVR.view.tasks.Editor").setStateButtonSave();
                                                }
                                            },
                                            items: [
                                                {
                                                    xtype: 'container',
                                                    layout: 'hbox',
                                                    itemId: '0',
                                                    items: [
                                                        {
                                                            xtype: 'radio',
                                                            boxLabel: lang.onlyDay,
                                                            name: 'styleTime',
                                                            inputValue: '0'
                                                        },
                                                        {
                                                            xtype: 'splitter'
                                                        },
                                                        {
                                                            width: 80,
                                                            name: 'startTime_date',
                                                            xtype: 'datefield',
                                                            itemId: 'date',
                                                            listeners: {
                                                                change: function () {
                                                                    if (!this.isValid())
                                                                        return;
                                                                    var radiogroup = this.ownerCt.ownerCt;
                                                                    radiogroup.fireEvent('change', radiogroup);
                                                                }
                                                            }
                                                        }]
                                                },
                                                {
                                                    boxLabel: lang.everyDay,
                                                    name: 'styleTime',
                                                    itemId: '1',
                                                    inputValue: '1'
                                                },
                                                {
                                                    boxLabel: lang.everyWeekday,
                                                    name: 'styleTime',
                                                    itemId: '2',
                                                    inputValue: '2'
                                                },
                                                {
                                                    xtype: 'radiogroup', //
                                                    //style: 'float: right !important;',
                                                    defaultType: 'checkboxfield',
                                                    defaults: {
                                                        name: 'weekdays',
                                                        labelAlign: 'top',
                                                        style: 'padding: 5px 2px;',
                                                        listeners: {
                                                            change: function () {
                                                                var radiogroup = this.ownerCt.ownerCt;
                                                                radiogroup.fireEvent('change', radiogroup);
                                                            }
                                                        }
                                                    },
                                                    labelAlign: 'top',
                                                    //layout: 'hbox',
                                                    //vertical: true,
                                                    items: [{
                                                            boxLabel: Ext.Date.getShortDayName(1).replace(/[оеуя]/, ''),
                                                            inputValue: '1'
                                                        }, {
                                                            boxLabel: Ext.Date.getShortDayName(2).replace(/[оеуя]/, ''),
                                                            inputValue: '2',
                                                        }, {
                                                            boxLabel: Ext.Date.getShortDayName(3).replace(/[оеуя]/, ''),
                                                            inputValue: '3'
                                                        }, {
                                                            boxLabel: Ext.Date.getShortDayName(4).replace(/[оеуя]/, ''),
                                                            inputValue: '4'
                                                        }, {
                                                            boxLabel: Ext.Date.getShortDayName(5).replace(/[оеуя]/, ''),
                                                            inputValue: '5'
                                                        }, {
                                                            boxLabel: Ext.Date.getShortDayName(6).replace(/[оеуя]/, ''),
                                                            inputValue: '6'
                                                        }, {
                                                            boxLabel: Ext.Date.getShortDayName(0).replace(/[оеуя]/, ''),
                                                            inputValue: '0'
                                                        }
                                                    ]
                                                }
                                            ]
                                        },
                                        {
                                            xtype: 'textfield',
                                            fieldLabel: lang.cronFormat,
                                            afterLabelTextTpl: Ext.requiredLabel,
                                            name: 'startTime',
                                            itemId: 'startTime',
                                            value: '* * * * *',
                                            vtype: 'cron',
                                            listeners: {
                                                change: function() {
                                                    Ext.getCmp("IVR.view.tasks.Editor").setStateButtonSave();
                                                }
                                            }
                                        },
                                        {
                                            xtype: 'textfield',
                                            fieldLabel: lang.callsCount,
                                            afterLabelTextTpl: Ext.requiredLabel,
                                            name: 'callsCount',
                                            itemId: 'callsCount',
                                            value: '0',
                                            listeners: {
                                                change: function() {
                                                    Ext.getCmp("IVR.view.tasks.Editor").setStateButtonSave();
                                                }
                                            }
                                        },
                                        {
                                            fieldLabel: lang.rejectTime,
                                            afterLabelTextTpl: Ext.requiredLabel,
                                            itemId: 'rejectTime',
                                            width: 170,
                                            name: 'rejectTime',
                                            xtype: 'timefield',
                                            format: 'H:i',
                                            altFormats: 'H:i',
                                            increment: 30,
                                            listeners: {
                                                change: function () {
                                                    // console.log('change');
                                                    // if (!this.isValid())
                                                    //     return;
                                                    // var rejectTime = this.ownerCt.getComponent('rejectTime');
                                                    // var time = this.getRawValue();
                                                    // if (time) {
                                                    //     time = time.replace(/^(\d{2})\:(\d{2})$/, '$2 $1');
                                                    //     rejectTime.setValue(
                                                    //             rejectTime.getValue().replace(/^\s*\S+\s+\S+(\s+\S+\s+\S+\s+\S+\s*)$/, time + '$1')
                                                    //             );
                                                    // }
                                                    Ext.getCmp("IVR.view.tasks.Editor").setStateButtonSave();
                                                }
                                            }
                                        },
                                        {
                                            xtype: 'container',
                                            layout: 'hbox',
                                            items: [
                                                {
                                                    xtype: 'combobox',
                                                    fieldLabel: lang.target,
                                                    afterLabelTextTpl: Ext.requiredLabel,
                                                    name: 'target',
                                                    itemId: 'target',
                                                    //triggerAction: 'all',
                                                    editable: false,
                                                    valueField: 'text',
                                                    displayField: 'text',
                                                    store: Ext.data.StoreManager.lookup('TargetsList') ? Ext.data.StoreManager.lookup('TargetsList') : Ext.create('IVR.store.TargetsList'),
                                                    listeners: {
                                                        beforequery: function (qe) {
                                                            delete qe.combo.lastQuery;
                                                        },
                                                        select:  function () {
                                                            Ext.getCmp("IVR.view.tasks.Editor").setStateButtonSave();
                                                        }
                                                    }
                                                },
                                                {
                                                    xtype: 'splitter'
                                                },
                                                {
                                                    xtype: 'form',
                                                    frame: true,
                                                    style: 'border:none !important;margin:-4px',
                                                    items: [
                                                        {
                                                            xtype: 'fileuploadfield',
                                                            itemId: 'importExcel',
                                                            buttonConfig: {
                                                                iconCls: 'button-add'
                                                            },
                                                            buttonOnly: true,
                                                            buttonText: '', //lang.import,
                                                            //anchor: '100%',
                                                            //emptyText: 'Select File',
                                                            name: 'fileData',
                                                            //fieldLabel: 'Select File',
                                                            allowBlank: false,
                                                            align: 'left',
                                                            forceSelection: true,
                                                            listeners: {
                                                                change: function (f, new_val) {
                                                                    var form = f.ownerCt.getForm();
                                                                    if (form.isValid()) {

                                                                        if (!f.editor)
                                                                            f.editor = Ext.create('IVR.view.resource.Editor', {
                                                                                basePath: 'targets/',
                                                                                savePrefix: '',
                                                                                elementName: lang.targetList_
                                                                            });

                                                                        Ext.MessageBox.prompt(Ext.String.format(lang['createNew'], f.editor.elementName), Ext.String.format(lang['enterName'], f.editor.elementName) + ':', function (btn, text, cfg) {
                                                                            if (btn == 'ok') {
                                                                                if (!f.editor.nameTest(text, cfg))
                                                                                    return;
                                                                                f.editor.updateAction({
                                                                                    name: text,
                                                                                    value: '{}',
                                                                                    isCreate: true,
                                                                                    cb: function () {
                                                                                        form.submit({
                                                                                            url: _webPath + '/upload/' + 'targets/' + text,
                                                                                            headers: {'Content-Type': 'multipart/form-data; charset=UTF-8'},
                                                                                            method: 'POST',
                                                                                            waitMsg: lang['uploading'],
                                                                                            success: function (form, action) {
                                                                                                //Ext.showInfo(lang["dataSaved"]);
                                                                                                f.ownerCt.ownerCt.getComponent('target').setValue(text);
                                                                                            },
                                                                                            failure: function (form, action) {
                                                                                                Ext.Msg.alert(lang['uploading'], action.result.message);
                                                                                            }
                                                                                        });
                                                                                        Ext.Function.defer(Ext.MessageBox.hide, 5000, Ext.MessageBox);

                                                                                    },
                                                                                    cb_f: function () {
                                                                                        Ext.Function.defer(function () {
                                                                                            Ext.Msg.show(Ext.apply({}, {msg: cfg.msg}, cfg));
                                                                                        }, 1000, Ext.MessageBox);
                                                                                    }
                                                                                });
                                                                            }
                                                                        });
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    ]
                                                }
                                            ]
                                        },
                                        {
                                            xtype: 'combobox',
                                            fieldLabel: lang.sipConnection,
                                            name: 'sipAccountID',
                                            itemId: 'sipAccountID',
                                            editable: false,
                                            valueField: 'id',
                                            afterLabelTextTpl: Ext.requiredLabel,
                                            displayField: 'name',
                                            store: Ext.data.StoreManager.lookup('SipConnection') ? Ext.data.StoreManager.lookup('SipConnection') : Ext.create('IVR.store.SipConnection'),
                                            listeners: {
                                                afterrender: function () {
                                                    this.store.load();
                                                },
                                                beforequery: function (qe) {
                                                    delete qe.combo.lastQuery;
                                                    Ext.getCmp("IVR.view.tasks.Editor").setStateButtonSave();
                                                },
                                                select:  function () {
                                                    Ext.getCmp("IVR.view.tasks.Editor").setStateButtonSave();
                                                },
                                                change: function (fld) {
                                                    var type_connect = this.ownerCt.getComponent('type_connect');
                                                    for (var i = 0; i < this.store.getCount(); i++) {
                                                        if(this.store.getAt(i).get('id') == fld.value) {
                                                            type_connect.setValue(this.store.getAt(i).get('type_connect'));
                                                        }
                                                    }

                                                    Ext.getCmp("IVR.view.tasks.Editor").setStateButtonSave();
                                                }
                                            }
                                        },
                                        {
                                            xtype: 'textfield',
                                            fieldLabel: 'type_connect',
                                            name: 'type_connect',
                                            itemId: 'type_connect',
                                            editable: false,
                                            hidden: true,
                                        }
                                    ]

                                }]
                        }]
                }, {
                    xtype: 'scriptsTree',
                    titleAlign: 'center',
                    frame: true,
                    split: true,
                    flex: 1,
                    itemId: 'scriptTree',
                    width: 300,
                    boreder: false,
                    store: Ext.data.StoreManager.lookup('Scripts') ? Ext.data.StoreManager.lookup('Scripts') : Ext.create('IVR.store.Scripts'),
                    root: {
                        id: '',
                        text: '',
                        expanded: false
                    }
                }
            ]
        }
    ],
    constructor: function (config) {
        this.callParent([config]);
        var editor = this;
        var list = this.getComponent('list');
        this.store = list.store;
        //var form = this.getComponent('form');
        var settingsForm = this.getComponent('settings').getComponent('settingsForm');
        var scriptTree = this.getComponent('settings').getComponent('scriptTree');
        settingsForm.getForm().findField('script').on('change', function () {
            scriptTree.loadScript(this.getValue());
        });

        list.on('itemclick', function () {
            list.store.load();
        });
        settingsForm.setDisabled(true);

        list.on('selectionchange', function (view, selections, options) {
            if (selections && selections[0] && selections[0].data && selections[0].data.text) {
                currentNameTask = selections[0].data.text;
            }

            settingsForm.setDisabled(true);
            if (!selections || !selections[0])
                return;

            if (selections[0].data.value == "{}") {
                selections[0].data.value =  '{"active":"false", "onEvent": "on_call[0]"}';
            }

            editor.getComponent('list').selectedRow = selections[0];
            if (selections[0])
                editor.getComponent('settings').setTitle(lang.settings + " '" + selections[0].data.text + "'");
            else
                editor.getComponent('settings').setTitle(lang.settings);
            var obj;
            try {
                settingsForm.setDisabled(false);
                eval('obj = (' + selections[0].data.value + ')');
                if (obj.script)
                    obj.script = obj.script.replace(/(\.js)$/, '');
                if (obj.target)
                    obj.target = obj.target.replace(/(\.js)$/, '');

                if (obj.onEvent)
                    settingsForm.getComponent('tabpanel').setActiveTab(0);
                else
                    settingsForm.getComponent('tabpanel').setActiveTab(1);

                // settingsForm.getForm().reset();
                settingsForm.getForm().setValues(obj);
                isActiveCurrentTask = obj.active;

                var statusConnectBot = Ext.getCmp('statusConnectBot');
                statusConnectBot.updateStatus();

                Ext.getCmp("IVR.view.tasks.Editor").setStateButtonSave();

                var tasks = Ext.getCmp("IVR.view.tasks.Editor");
                tasks.oldDataForm = JSON.stringify( settingsForm.getForm().getValues() );
                tasks.form = settingsForm.getForm();
                tasks.setStateButtonSave();
            }
            catch (e) {
                Ext.showError(e.message);
            }
        }
        );
    }
});