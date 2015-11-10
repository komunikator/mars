Ext.define('IVR.view.targets.Editor', {
    extend: 'IVR.view.code.Editor',
    xtype: 'targetsEditor',
    layout: 'border',
    //id: 'targets-editor',
    listTitle: lang['targets'],
    listStore: Ext.data.StoreManager.lookup('TargetsList') ? Ext.data.StoreManager.lookup('TargetsList') : Ext.create('IVR.store.TargetsList'),
    constructor: function(config) {
        this.items[0].iconCls = 'list';
        this.callParent([config]);
        var list = this.getComponent('list');
        list.basePath = 'targets/';
        list.savePrefix = '';
        list.elementName = lang.targetList_;
        list.on('selectionchange', function(view, selections, options) {
            var target = this.ownerCt.getComponent('target');
            if (selections && selections[0])
            {
                this.selectedRow = selections[0];
                //target.mask();
                Ext.Ajax.request({
                    url: '/tableData/target',
                    method: 'get',
                    params: {
                        name: selections[0].data.text
                    },
                    success: function(response, o) {
                        //target.unmask();
                        var resObj = Ext.decode(response.responseText);
                        if (resObj && resObj.success) {
                            target.store.loadData(resObj.data);
                            target.setTitle(lang['target'] + " '" + selections[0].data.text + "' " + lang['total_records'] + " [" + target.store.getCount() + "]");
                        }
                        else
                            Ext.showError(resObj.message || lang.error);

                    },
                    failure: function(response, o) {
                        //target.unmask();
                        Ext.showError(response.responseText);
                    }
                });
            }
            else
            {
                target.store.loadData([], false);
                target.setTitle(lang['target']);
            }
        });

        var form = this.getComponent('form');
        form.hide();
        form.ownerCt.doLayout();
        this.add({
            region: 'west',
            itemId: 'target',
            xtype: 'targetsGrid',
            padding: 5,
            width: 400
        });
    }
});