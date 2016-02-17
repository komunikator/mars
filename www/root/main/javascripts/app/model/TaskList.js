Ext.define('IVR.model.TaskList', {
    extend: 'Ext.data.Model',
    proxy: {
        type: 'rest',
        url: _webPath + '/resourceData/tasks',
        reader: {
            type: 'json',
            root: 'data'
        }
    },
    fields: ['id', 'text', 'value'],
    autoLoad: true
});
