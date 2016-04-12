Ext.define('IVR.view.master.List', {
    extend: 'Ext.container.Container',
    xtype: 'settingsMaster',
    id: 'settingsMaster',
    title: lang['sett_master'],
    html: '<iframe id="setMasterFrame" src="/wizard" width="100%" style="min-height: 100%" onselectstart="this.src = this.src"></iframe>'
});

// var hidden, state, visibilityChange; 
// if (typeof document.hidden !== undefined) {
//   hidden = "hidden";
//   visibilityChange = "visibilitychange";
//   state = "visibilityState";
// } else if (typeof document.mozHidden !== undefined) {
//   hidden = "mozHidden";
//   visibilityChange = "mozvisibilitychange";
//   state = "mozVisibilityState";
// } else if (typeof document.msHidden !== undefined) {
//   hidden = "msHidden";
//   visibilityChange = "msvisibilitychange";
//   state = "msVisibilityState";
// } else if (typeof document.webkitHidden !== undefined) {
//   hidden = "webkitHidden";
//   visibilityChange = "webkitvisibilitychange";
//   state = "webkitVisibilityState";
// }

// // Add a listener that constantly changes the title
// document.getElementById('setMasterFrame').addEventListener(visibilityChange, function() {
//   console.log('state = ' + document[state], 'hidden = ' + document[hidden]);
// }, false);