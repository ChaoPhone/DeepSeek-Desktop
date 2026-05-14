const { Menu, app, BrowserWindow } = require('electron');
const path = require('path');
const { get, set } = require('./config');
const { setAutoLaunch } = require('./autoLaunch');
const { AI_SITES } = require('./aiConfig');
const { refreshBallWindow, getBallWindow } = require('./floatingBall');

function showContextMenu(ballWin) {
  const config = get();
  const currentAI = config.currentAI || 'deepseek';

  // AI 切换菜单项（扁平化显示）
  const aiMenuItems = Object.keys(AI_SITES).map(key => ({
    label: AI_SITES[key].name + (currentAI === key ? ' ✓' : ''),
    click: () => {
      if (currentAI === key) return;
      set('currentAI', key);
      const ballWin = getBallWindow();
      if (ballWin && !ballWin.isDestroyed()) {
        ballWin.webContents.send('config:changed', get());
        refreshBallWindow();
      }
    }
  }));

  const template = [
    ...aiMenuItems,
    { type: 'separator' },
    {
      label: '主球置顶',
      type: 'checkbox',
      checked: config.ballAlwaysOnTop !== false,
      click: (menuItem) => {
        set('ballAlwaysOnTop', menuItem.checked);
        // 更新悬浮球置顶状态
        const ballWin = getBallWindow();
        if (ballWin && !ballWin.isDestroyed()) {
          if (menuItem.checked) {
            ballWin.setAlwaysOnTop(true, 'screen-saver', 1);
          } else {
            ballWin.setAlwaysOnTop(false);
          }
        }
      }
    },
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

  // 注意：菜单关闭时不触发刷新，因为点击其他窗口是正常行为
  // 只有菜单操作（如切换AI）才需要刷新，已在各自的click回调中处理
}

let settingsWin = null;

function openSettingsWindow() {
  if (settingsWin && !settingsWin.isDestroyed()) {
    settingsWin.focus();
    return;
  }

  // 获取悬浮球位置，让设置窗口在悬浮球旁边显示，不覆盖它
  const ballWin = getBallWindow();
  let settingsX, settingsY;
  const settingsWidth = 360;
  const settingsHeight = 280;

  if (ballWin && !ballWin.isDestroyed()) {
    const ballBounds = ballWin.getBounds();
    const ballCenterX = ballBounds.x + ballBounds.width / 2;
    const ballCenterY = ballBounds.y + ballBounds.height / 2;

    // 设置窗口在悬浮球右侧（如果右侧空间不够则在左侧）
    const { screen } = require('electron');
    const display = screen.getDisplayNearestPoint({ x: ballCenterX, y: ballCenterY });
    const workArea = display.workArea;

    if (ballCenterX + ballBounds.width / 2 + settingsWidth + 20 < workArea.x + workArea.width) {
      // 右侧有空间
      settingsX = ballCenterX + ballBounds.width / 2 + 20;
    } else {
      // 左侧显示
      settingsX = ballCenterX - ballBounds.width / 2 - settingsWidth - 20;
    }
    // 垂直居中，但确保在可见区域
    settingsY = Math.max(workArea.y + 20, Math.min(ballCenterY - settingsHeight / 2, workArea.y + workArea.height - settingsHeight - 20));
  } else {
    // 默认位置
    settingsX = undefined;
    settingsY = undefined;
  }

  settingsWin = new BrowserWindow({
    width: settingsWidth,
    height: settingsHeight,
    x: Math.round(settingsX) || undefined,
    y: Math.round(settingsY) || undefined,
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
    refreshBallWindow();
  });
}

module.exports = { showContextMenu };
