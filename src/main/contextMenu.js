const { Menu, app } = require('electron');
const { get, set } = require('./config');
const { setAutoLaunch } = require('./autoLaunch');

function showContextMenu(ballWin) {
  const config = get();

  const template = [
    {
      label: '开机自启',
      type: 'checkbox',
      checked: config.autoStart,
      click: (menuItem) => {
        setAutoLaunch(menuItem.checked);
      }
    },
    { type: 'separator' },
    {
      label: '自定义外观...',
      click: () => {
        openSettingsWindow();
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.quit();
      }
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  menu.popup({ window: ballWin });
}

let settingsWin = null;

function openSettingsWindow() {
  if (settingsWin && !settingsWin.isDestroyed()) {
    settingsWin.focus();
    return;
  }

  settingsWin = new (require('electron').BrowserWindow)({
    width: 360,
    height: 420,
    resizable: false,
    title: '自定义外观',
    parent: require('./floatingBall').getBallWindow(),
    modal: false,
    webPreferences: {
      preload: require('path').join(__dirname, '../preload/ballPreload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  settingsWin.loadFile(require('path').join(__dirname, '../renderer/settings/index.html'));
  settingsWin.setMenuBarVisibility(false);

  settingsWin.on('closed', () => {
    settingsWin = null;
  });
}

module.exports = { showContextMenu };
