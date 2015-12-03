Ext.define('Ext.ux.protoMenu', {
    extend: 'Ext.menu.Menu',
    alias: 'widget.protoMenu',

    afterRender: function() {
        this.superclass.afterRender.apply(this, arguments);

        var menu = this;
        this.tip = new Ext.ToolTip({
            target: this.getEl().getAttribute('id'),
            renderTo: document.body,
            trackMouse: true,
            delegate: '.x-menu-item',
            title: '',
            listeners: {
                beforeshow: function(tip) {
                    var c = menu && menu.activeItem.initialConfig; 
                    if ( c  && c.tooltip)
                        tip.update(c.tooltip);
                    else
                        return false ;
                }
                
            }
        });
    }
});  