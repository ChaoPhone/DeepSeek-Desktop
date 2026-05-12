const { app } = require('electron');
const { get, set } = require('./config');

function initAutoLaunch() {
  const enabled = get('autoStart');
  app.setLoginItemSettings({
    openAtLogin: enabled,
    path: process.execPath
  });
}

function setAutoLaunch(enabled) {
  app.setLoginItemSettings({
    openAtLogin: enabled,
    path: process.execPath
  });
  set('autoStart', enabled);
}

module.exports = { initAutoLaunch, setAutoLaunch };
