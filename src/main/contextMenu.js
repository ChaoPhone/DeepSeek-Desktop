const { BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');
const { get, set } = require('./config');
const { setAutoLaunch } = require('./autoLaunch');
const { AI_SITES } = require('./aiConfig');
const { refreshBallWindow, getBallWindow } = require('./floatingBall');

let menuWin = null;

function showContextMenu(ballWin) {
  // 如果已有菜单窗口，关闭它
  if (menuWin && !menuWin.isDestroyed()) {
    menuWin.close();
    menuWin = null;
    return;
  }

  const config = get();
  const currentAI = config.currentAI || 'deepseek';

  // 获取悬浮球位置
  const ballBounds = ballWin.getBounds();
  const ballCenterX = ballBounds.x + ballBounds.width / 2;
  const ballCenterY = ballBounds.y + ballBounds.height / 2;

  // 获取显示器信息
  const display = screen.getDisplayNearestPoint({ x: ballCenterX, y: ballCenterY });
  const workArea = display.workArea;

  // 菜单宽度
  const menuWidth = 180;
  const menuHeight = 280;

  // 确定菜单位置：在悬浮球附近，不超出屏幕
  let menuX, menuY;

  // 判断悬浮球在屏幕的位置，菜单应该在有空间的方向显示
  const spaceRight = workArea.x + workArea.width - ballCenterX;
  const spaceLeft = ballCenterX - workArea.x;
  const spaceBottom = workArea.y + workArea.height - ballCenterY;
  const spaceTop = ballCenterY - workArea.y;

  // 选择空间最大的方向
  if (spaceRight > menuWidth + 20) {
    menuX = ballCenterX + 30;
  } else if (spaceLeft > menuWidth + 20) {
    menuX = ballCenterX - 30 - menuWidth;
  } else {
    menuX = Math.max(workArea.x + 10, Math.min(ballCenterX - menuWidth / 2, workArea.x + workArea.width - menuWidth - 10));
  }

  if (spaceBottom > menuHeight + 20) {
    menuY = ballCenterY;
  } else if (spaceTop > menuHeight + 20) {
    menuY = ballCenterY - menuHeight;
  } else {
    menuY = Math.max(workArea.y + 10, Math.min(ballCenterY - menuHeight / 2, workArea.y + workArea.height - menuHeight - 10));
  }

  // 创建菜单窗口
  menuWin = new BrowserWindow({
    width: menuWidth,
    height: menuHeight,
    x: Math.round(menuX),
    y: Math.round(menuY),
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    focusable: true,
    title: '',
    webPreferences: {
      preload: path.join(__dirname, '../preload/contextMenuPreload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  menuWin.loadFile(path.join(__dirname, '../renderer/context-menu/index.html'));

  // 等待页面加载完成后设置 shape
  menuWin.webContents.on('did-finish-load', () => {
    // 获取菜单实际尺寸并设置 shape（只让菜单区域响应鼠标）
    const [width, height] = menuWin.getSize();
    menuWin.setShape([{ x: 0, y: 0, width: width, height: height }]);
  });

  menuWin.show();

  // 构建菜单数据并发送给渲染器
  const menuItems = buildMenuItems(config, currentAI);
  menuWin.webContents.send('context-menu:data', { items: menuItems });

  // 窗口关闭时清理
  menuWin.on('closed', () => {
    menuWin = null;
  });

  // 窗口失去焦点时关闭（如果用户点击其他窗口）
  menuWin.on('blur', () => {
    if (menuWin && !menuWin.isDestroyed()) {
      menuWin.close();
    }
  });
}

// 构建菜单项
function buildMenuItems(config, currentAI) {
  const items = [];

  // AI 切换菜单项
  Object.keys(AI_SITES).forEach(key => {
    items.push({
      label: AI_SITES[key].name,
      isAI: true,
      current: currentAI === key,
      click: () => handleAIClick(key, currentAI)
    });
  });

  items.push({ type: 'separator' });

  // 主球置顶
  items.push({
    label: '主球置顶',
    type: 'checkbox',
    checked: config.ballAlwaysOnTop !== false,
    click: (checked) => handleCheckboxClick('ballAlwaysOnTop', checked)
  });

  // 开机自启
  items.push({
    label: '开机自启',
    type: 'checkbox',
    checked: config.autoStart,
    click: (checked) => handleCheckboxClick('autoStart', checked)
  });

  items.push({ type: 'separator' });

  // 自定义外观
  items.push({
    label: '自定义外观...',
    click: () => handleActionClick('settings')
  });

  items.push({ type: 'separator' });

  // 退出
  items.push({
    label: '退出',
    click: () => handleActionClick('quit')
  });

  return items;
}

// 处理 AI 切换点击
function handleAIClick(aiKey, currentAI) {
  if (aiKey === currentAI) return;

  set('currentAI', aiKey);
  const ballWin = getBallWindow();
  if (ballWin && !ballWin.isDestroyed()) {
    ballWin.webContents.send('config:changed', get());
    refreshBallWindow();
  }
}

// 处理 checkbox 点击
function handleCheckboxClick(key, checked) {
  set(key, checked);

  if (key === 'ballAlwaysOnTop') {
    const ballWin = getBallWindow();
    if (ballWin && !ballWin.isDestroyed()) {
      if (checked) {
        ballWin.setAlwaysOnTop(true, 'screen-saver', 1);
      } else {
        ballWin.setAlwaysOnTop(false);
      }
    }
  } else if (key === 'autoStart') {
    setAutoLaunch(checked);
  }
}

// 处理操作点击
function handleActionClick(action) {
  if (action === 'settings') {
    openSettingsWindow();
  } else if (action === 'quit') {
    require('electron').app.quit();
  }
}

// 关闭菜单窗口
function closeContextMenu() {
  if (menuWin && !menuWin.isDestroyed()) {
    menuWin.close();
    menuWin = null;
  }
}

// 注册 IPC 处理器
function registerContextMenuIPC() {
  ipcMain.on('context-menu:close', () => {
    closeContextMenu();
  });

  ipcMain.on('context-menu:click-ai', (event, aiKey) => {
    const currentAI = get('currentAI');
    handleAIClick(aiKey, currentAI);
    closeContextMenu();
  });

  ipcMain.on('context-menu:click-checkbox', (event, key, checked) => {
    handleCheckboxClick(key, checked);
    // 不关闭菜单，让用户可以继续调整其他选项
    // 更新菜单显示
    if (menuWin && !menuWin.isDestroyed()) {
      const config = get();
      const currentAI = config.currentAI || 'deepseek';
      menuWin.webContents.send('context-menu:data', { items: buildMenuItems(config, currentAI) });
    }
  });

  ipcMain.on('context-menu:click-action', (event, action) => {
    handleActionClick(action);
    closeContextMenu();
  });
}

let settingsWin = null;

function openSettingsWindow() {
  if (settingsWin && !settingsWin.isDestroyed()) {
    settingsWin.focus();
    return;
  }

  const ballWin = getBallWindow();
  let settingsX, settingsY;
  const settingsWidth = 360;
  const settingsHeight = 280;

  if (ballWin && !ballWin.isDestroyed()) {
    const ballBounds = ballWin.getBounds();
    const ballCenterX = ballBounds.x + ballBounds.width / 2;
    const ballCenterY = ballBounds.y + ballBounds.height / 2;

    const display = screen.getDisplayNearestPoint({ x: ballCenterX, y: ballCenterY });
    const workArea = display.workArea;

    if (ballCenterX + ballBounds.width / 2 + settingsWidth + 20 < workArea.x + workArea.width) {
      settingsX = ballCenterX + ballBounds.width / 2 + 20;
    } else {
      settingsX = ballCenterX - ballBounds.width / 2 - settingsWidth - 20;
    }
    settingsY = Math.max(workArea.y + 20, Math.min(ballCenterY - settingsHeight / 2, workArea.y + workArea.height - settingsHeight - 20));
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

module.exports = { showContextMenu, registerContextMenuIPC, closeContextMenu };