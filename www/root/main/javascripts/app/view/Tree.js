Ext.define('IVR.view.Tree', {
    extend: 'Ext.tree.Panel',
    xtype: 'ivrTree',
    dockedItems: [{
            dock: 'top',
            xtype: 'toolbar',
            //layout: 'fit',//  work?      
            itemId: 'player',
            items: [{
                    xtype: 'component',
                    itemId: 'audio',
                    style: "margin: '0 0 0 10'; padding: 0px 3px;",
                    html: '<audio type="audio/wav" controls="true" preload="auto">Your browser does not support the audio element.</audio>'
                },
                {
                    xtype: 'label',
                    itemId: 'label',
                    flex: 1,
                    style: "margins: '0 0 0 10';font-weight: bold; font-size: 12px",
                    text: ""
                }
            ]
        }],
    autoScroll: true,
    rootVisible: false,
    //lines: true,
    //singleExpand: true,
    //useArrows: true,
    refreshNode: function(node) {
        //var node = this.store.getNodeById(id);
        //console.log(node);
        if (node) {
            this.store.load({node: node});
        }
    },
    viewConfig: {
        listeners: {
            itemdblclick: function(view, record, node, index, e, options) {
                var source = record.data.src;
                if (/\.wav$/.test(source))
                    view.ownerCt.getDockedComponent('player').getComponent('audio').getEl().dom.firstChild.play();
            },
            itemclick: function(view, record) {
                var audio = view.ownerCt.getDockedComponent('player');
                if (audio)
                {
                    audio = view.ownerCt.getDockedComponent('player').getComponent('audio').getEl().dom.firstChild;
                    var engineLabel = view.ownerCt.getDockedComponent('player').getComponent('label');

                    var source = record.data.src;
                    if (/\.wav$/.test(source)) {
                        engineLabel.setText(source.split("/").pop());
                        audio.src = _webPath + source;
                        audio.load(); //call this to just preload the audio without playing
                        //audio.play(); //call this to play the song right away
                    }
                }
                if (record.data.children) {
                    view.toggle(record);
                }
            }
        }
    },
    initComponent: function() {
        //parent
        this.callParent(arguments);
    }
});