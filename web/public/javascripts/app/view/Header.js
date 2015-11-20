Ext.define('IVR.view.Header', {
    extend: 'Ext.Panel',
	id: 'IVR.view.Header',
    title: lang.mainTitle,
    height: 64,
    region: 'north',
    title: lang.user + ': <b>' + window['_username'] + '</b><p>Выход</p>'
});