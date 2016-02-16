Ext.define('IVR.view.scripts.View', {
    extend: 'Ext.Panel',

    xtype: 'scriptsView',
    title: 'Scripts',
    layout: 'column',
        items: [{
            columnWidth: 0.5,
	    split: true,
	    style: 'padding: 5px',	
            margins: '0 0 4 4',
            //width: 190,
	    height:200, 	
            minSize: 100,
            maxSize: 500,
            xtype: 'dialogsList',
            text: 'item 1'//,
            //style: 'text-align: right;'
        }, {
            columnWidth: 0.5,
            xtype: 'menuTree',
            text: 'item 2'
        }],
    constructor:  function (config) {
        config = Ext.applyIf(config || {}, {
            //id: 'scripts-view',
            iconCls: 'icon_menu_diag_monitor'
        });

        this.callParent([config]);
    }
});