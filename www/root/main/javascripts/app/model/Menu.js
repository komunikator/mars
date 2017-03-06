Ext.define('IVR.model.Menu', {
    extend: 'Ext.data.Model',
    fields: ['id', 'text', 'cls', 'expanded'],
    fields2: [
        { name: 'id', type: 'int', mapping: 'Id' },
        { name: 'text', type: 'string', mapping: 'Text' },
        { name: 'leaf', type: 'boolean', mapping: 'Leaf' },
        { name: 'loaded', type: 'boolean', mapping: 'Loaded', defaultValue: false },
        { name: 'Properties' },
        { name: 'expanded', defaultValue: true }
    ],
    autoLoad: true,
    proxy: {
        type: 'ajax',
        url: getMenuPath()
    }
});

function inIframe() {
    try {
        return window.self !== window.top;
    } catch (e) {
        return true;
    }
}

function getMenuPath() {
    if (inIframe()) {
        return _webPath + '/frame_menu.json'
    } else {
        return _webPath + '/menu.json';
    }
}