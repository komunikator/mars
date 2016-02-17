/**
 * provide a split button with a trigger in order to do task such as auto refresh
 * @class Ext.ux.button.AutoRefresher
 * @extends Ext.button.Split
 * @author tz
 * @email atian25@qq.com
 * @date 2011-05-21
 * @version 1.0
 * @forum http://www.sencha.com/forum/showthread.php?134350-Ext.ux.button.AutoRefresher
 */
Ext.define('Ext.ux.button.AutoRefresher', {
    alias: 'widget.autorefresher',
    extend: 'Ext.button.Split',
    iconCls: 'x-tbar-loading',
    btnText: 'Refresh',
    minuteText: 'm',
    secondText: 's',
    /**     
     * whether to show next refresh count down
     */
    showCountDown: true,
    /**    
     * current refresh interval,(second), set to 0 mean not auto refresh
     */
    refreshInterval: 0,
    //@private
    lastInterval: null,
    menu: {
        items: [
            {text: 'Manually Refresh', value: 0},
            {text: 'Every 15 Second', value: 15},
            {text: 'Every 30 Second', value: 30},
            {text: 'Every 1 minute', value: 60},
            {text: 'Every 3 minute', value: 180},
            {text: 'Every 5 minute', value: 300}
        ]
    },
    initComponent: function() {
        this.addEvents(
                /**
                 * @event refresh 
                 * @param {Ext.ux.button.AutoRefresher} btn
                 */
                'refresh'
                );
        this.callParent(arguments);

        this.buildTask();

        this.on({
            scope: this,
            'afterrender': function(c) {
                this.menu.on('click', function(m, item, e) {
                    this.reconfigure(item.value);
                }, this);
                this.reconfigure(this.refreshInterval);
            },
            'click': function() {
                this.fireEvent('refresh', this);
                this.reconfigure(this.refreshInterval);
            }
        });
    },
    /**     * 
     * @private
     */
    buildTask: function() {
        this.runner = new Ext.util.TaskRunner();
        this.clockTask = {
            countDown: 0,
            interval: 1000,
            scope: this,
            run: function() {
                this.clockTask.countDown--;
                if (this.clockTask.countDown < 0) {
                    this.clockTask.countDown = this.refreshInterval;
                    this.fireEvent('refresh', this);
                }
                this.refreshCountDown(this.clockTask.countDown);
            }
        };
        /*
         this.autoRefreshTask = {
         interval: this.refreshInterval * 1000,
         scope: this,
         run: function(count) {
         if (count > 1) {
         this.fireEvent('refresh', this);
         }
         }
         };
         */
    },
    /**     * 
     * refresh count down text
     * @param {Number} countDown 
     */
    refreshCountDown: function(countDown) {
        var minutes = Math.floor(countDown / 60);
        var seconds = Math.floor(countDown % 60);
        this.setText(this.btnText + '(' + (minutes > 0 ? minutes + this.minuteText : '') + seconds + this.secondText + ')');
    },
    /**     * 
     * reconfigure the trigger
     */
    reconfigure: function(value) {
        this.runner.stopAll();
        this.setText(this.btnText);
        if (value > 0) {
            //
            if (this.showCountDown) {
                this.refreshInterval = value;
                this.clockTask.countDown = value;
                this.runner.start(this.clockTask);
            }
            //this.autoRefreshTask.interval = value * 1000;
            //this.runner.start(this.autoRefreshTask);
        }
    },
    /**  
     * stop/start trigger
     * @param {Boolean} stop 
     */
    toggleTrigger: function(stop) {
        if (stop) {
            this.lastInterval = this.refreshInterval;
            this.reconfigure(0);
        } else {
            if (this.lastInterval > 0) {
                this.reconfigure(this.lastInterval);
            }
        }
    },
    /**
     */
    onDestroy: function() {
        this.runner.stopAll();
        this.clockTask = null;
        //this.autoRefreshTask = null;
        this.runner = null;
        this.callParent(arguments);
    },
    author: 'tz'
});