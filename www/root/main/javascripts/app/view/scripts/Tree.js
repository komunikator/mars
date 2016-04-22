Ext.define('IVR.view.scripts.Tree', {
    //extend: 'IVR.view.AudioTree',
    extend: 'Ext.tree.Panel',

    xtype: 'scriptsTree',
    title: lang['script'],
    autoScroll: true,
    rootVisible: false,
    lines: true,
    //singleExpand: true,
    //useArrows: true,
    store: 'Scripts',
    loadScript: function(name){
            if (!/\.js$/.test(name))
                name += '.js';
	    this.getRootNode().data.id = name;
	    this.getRootNode().data.text = name;
	    this.getRootNode().data.expanded = true;	
                this.store.load({node:this.getRootNode()});
     },	
    tools: [{
            //type: 'refresh',
            xtype: 'button',
            //hidden: true,
            iconCls: 'button-refresh',
            tooltip: lang['refresh'],
            handler: function() {
                this.ownerCt.ownerCt.store.load({node:this.ownerCt.ownerCt.getRootNode()});
	    	//this.ownerCt.ownerCt.loadScript('05 Перевод Звонка.js');
            }
        }],		
    constructor: function(config) {
        config = Ext.applyIf(config || {}, {
            //id: 'scripts-tree',
            iconCls: 'script'
        });

        this.callParent([config]);
	var me = this;
	this.store.on('load',function(){me.setTitle(lang['script']+(me.getRootNode().data.text?" '"+me.getRootNode().data.text.replace(/\.js$/,'')+"'":''))});
    }
});