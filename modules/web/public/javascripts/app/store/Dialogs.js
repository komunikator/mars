Ext.define('IVR.store.Dialogs', {
    extend: 'Ext.data.Store',
    model: 'IVR.model.Dialog',
    storeId: 'Dialogs',
    autoLoad: true,
    autoSync: false,
    remoteFilter: true/*,
     loadRawData : function(data, append){
     var me      = this,
     result  = me.proxy.reader.read(data),
     records = result.records;
     if (result.success) {
     me.totalCount = me.getCount()+result.total;
     me.currentPage = 1;
     me.loadRecords(records, { addRecords: append });
     me.fireEvent('load', me, records, true);
     }
     }*/
});