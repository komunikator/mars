Ext.define('IVR.model.EventList', {
    extend: 'Ext.data.Model',
    proxy: {
        type: 'rest',
        url: _webPath + '/eventsListData',
        reader: {
            type: 'json',
            root: 'data'
        }
    },
    fields: ['id','text'],
    autoLoad: true
});
