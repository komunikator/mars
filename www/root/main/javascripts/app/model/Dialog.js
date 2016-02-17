Ext.define('IVR.model.Dialog', {
    extend: 'Ext.data.Model',
    proxy: {
        type: 'rest',
        url: _webPath + '/dialogData',
        reader: {
            type: 'json',
            root: 'data'
        }
    },
    idProperty: '_id',
    fields: [
        {
            name: 'gdate'
        },
        {
            name: '_id',
            defaultValue: null
        },
        {
            name: 'type'
        },
        {
            name: 'msisdn'
        },
        {
            name: 'service_contact'
        }, /*
         {
         name: 'refer'
         },*/
        {
            name: 'status'
        },
        {
            name: 'duration'
        },
        {
            name: 'reason'
        },
        {
            name: 'script'
        },
        {
            name: 'data'
        }/*,
         {
         name: 'rtp_local'
         },
         {
         name: 'rtp_remote'
         }*/
        ,
        {
            name: 'parent_id'
        }
    ]
});
