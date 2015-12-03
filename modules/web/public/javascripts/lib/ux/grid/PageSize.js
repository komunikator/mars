/**
* Ext.ux.grid.PageSize
* http://www.sencha.com/forum/showthread.php?130787-Ext.ux.toolbar.PagingOptions&p=610981&viewfull=1#post610981
*/
Ext.define('Ext.ux.grid.PageSize', {
    extend      : 'Ext.form.field.ComboBox',
    alias       : 'plugin.pagesize',
    beforeText  : 'Show',
    afterText   : 'per page',
    mode        : 'local',
    displayField: 'text',
    valueField  : 'value',
    allowBlank  : false,
    triggerAction: 'all',
    width       : 50,
    maskRe      : /[0-9]/,
    /**
    * initialize the paging combo after the pagebar is randered
    */
    init: function(paging) {
		this.store = Ext.create('Ext.data.ArrayStore',{
	        fields: ['text', 'value'],
	        data: [['25', 25],['50', 50],['100', 100], ['300', 300], ['500', 500]]
	    });
        if (this.uxPageSize) {
            paging.store.pageSize = this.uxPageSize;
            this.setValue(this.uxPageSize);
        }
        paging.on('afterrender', this.onInitView, this);
    },
    /**
    * passing the select and specialkey events for the combobox
    * after the pagebar is rendered.
    */
    onInitView: function(paging) {
        this.setValue(paging.store.pageSize);
        paging.add('-', this.beforeText, this, this.afterText);
        this.on('select', this.onPageSizeChanged, paging);
        this.on('specialkey', function(combo, e) {
            if (13 === e.getKey()) {
                this.onPageSizeChanged.call(paging, this);
            }
        });
    },
    
    /**
    * refresh the page when the value is changed
    */
    onPageSizeChanged: function(combo) {
        this.store.pageSize = parseInt(combo.getRawValue(), 10);
        this.moveFirst();
    }
});