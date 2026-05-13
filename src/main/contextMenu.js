const { Menu, app, BrowserWindow } = require('electron');
const path = require('path');
const { get, set } = require('./config');
const { setAutoLaunch } = require('./autoLaunch');
const { AI_SITES } = require('./aiConfig');
const { refreshBallWindow, getBallWindow } = require('./floatingBall');

function showContextMenu(ballWin) {
  const config = get();
  const currentAI = config.currentAI || 'deepseek';

  const template = [
    {
      label: '切换默认 AI',
      submenu: Object.keys(AI_SITES).map(key => ({
        label: AI_SITES[key].name,
        type: 'radio',
        checked: currentAI === key,
        click: () => {
          set('currentAI', key);
          // 广播配置变化，刷新悬浮球
          const ballWin = getBallWindow();
          if (ballWin && !ballWin.isDestroyed()) {
            ballWin.webContents.send('config:changed', get());
            refreshBallWindow();
          }
        }
      }))
    },
    { type: 'separator' },
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

  settingsWin = new BrowserWindow({
    width: 360,
    height: 420,
    resizable: false,
    title: '自定义外观',
    parent: getBallWindow(),
    modal: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/ballPreload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  settingsWin.loadFile(path.join(__dirname, '../renderer/settings/index.html'));
  settingsWin.setMenuBarVisibility(false);

  settingsWin.on('closed', () => {
    settingsWin = null;
    // 关闭设置窗口后刷新悬浮球，避免白条
    refreshBallWindow();
  });
}

module.exports = { showContextMenu };
