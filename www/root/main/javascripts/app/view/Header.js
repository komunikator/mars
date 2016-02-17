Ext.define('IVR.view.Header', {
    extend: 'Ext.Panel',
	id: 'IVR.view.Header',
    title: lang.mainTitle,
    height: 64,
    region: 'north',
    title: '<div style="float: left; background:url(' + _webPath + '/main/images/apple-touch-icon-152x152.png) no-repeat center center; height: 54px; width: 152px"></div><div style="float: right">' + lang.user + ': <b>' + window['_username'] + '</b><p><a href="/logOut">Выход</a></p></div>'
});