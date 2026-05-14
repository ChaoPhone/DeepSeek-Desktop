const { ipcMain, BrowserWindow, screen } = require('electron');
const { get, set } = require('./config');
const { openNewChatWindow, getViewById } = require('./chatWindow');
const { showContextMenu } = require('./contextMenu');
const { setAutoLaunch } = require('./autoLaunch');
const { getBallWindow, updateBallSize, refreshBallWindow } = require('./floatingBall');
const { getOtherAIs } = require('./aiConfig');

function registerIpcHandlers() {
  ipcMain.handle('ball:click', () => {
    const id = openNewChatWindow();
    return { windowId: id };
  });

  ipcMain.handle('ball:get-expand-direction', () => {
    const ballWin = getBallWindow();
    if (!ballWin || ballWin.isDestroyed()) return 'top-left';

    const bounds = ballWin.getBounds();
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;

    const display = screen.getDisplayNearestPoint({ x: centerX, y: centerY });
    const wa = display.workArea;

    // 判断悬浮球在屏幕的哪个区域
    const midX = wa.x + wa.width / 2;
    const midY = wa.y + wa.height / 2;

    // 副球应弹出方向：选择空间最大的方向
    const spaceLeft = centerX - wa.x;
    const spaceRight = wa.x + wa.width - centerX;
    const spaceTop = centerY - wa.y;
    const spaceBottom = wa.y + wa.height - centerY;

    // 找出最小空间方向，副球弹出应避开该方向
    // 返回四个方向之一：top-left, top-right, bottom-left, bottom-right
    const preferLeft = spaceLeft > spaceRight;
    const preferTop = spaceTop > spaceBottom;

    if (preferTop && preferLeft) return 'top-left';
    if (preferTop && !preferLeft) return 'top-right';
    if (!preferTop && preferLeft) return 'bottom-left';
    return 'bottom-right';
  });

  ipcMain.handle('ball:click-ai', (event, aiKey) => {
    const id = openNewChatWindow(null, aiKey);
    return { windowId: id };
  });

  ipcMain.on('ball:move-window', (event, { dx, dy }) => {
    const ballWin = getBallWindow();
    if (ballWin && !ballWin.isDestroyed()) {
      const [x, y] = ballWin.getPosition();
      ballWin.setPosition(x + dx, y + dy);
    }
  });

  ipcMain.on('ball:drag-end', (event, { x, y }) => {
    // x, y 是窗口左上角位置，需要转换为主球中心位置
    const ballWin = getBallWindow();
    if (ballWin && !ballWin.isDestroyed()) {
      const bounds = ballWin.getBounds();
      // 计算主球中心位置（窗口中心）
      const centerX = x + bounds.width / 2;
      const centerY = y + bounds.height / 2;

      const display = screen.getDisplayNearestPoint({ x: centerX, y: centerY });
      const wa = display.workArea;
      // 使用实际悬浮球大小计算半径，确保球边缘不超出屏幕
      const ballSize = get('ballSize') || 40;
      const ballRadius = ballSize / 2;

      let sx = centerX, sy = centerY;
      // 主球左边缘超出工作区域左侧 → 回弹到左边缘 + 半径位置
      if (centerX - ballRadius < wa.x) sx = wa.x + ballRadius;
      // 主球右边缘超出工作区域右侧 → 回弹到右边缘 - 半径位置
      else if (centerX + ballRadius > wa.x + wa.width) sx = wa.x + wa.width - ballRadius;
      // 主球上边缘超出工作区域顶部 → 回弹到顶部 + 半径位置
      if (centerY - ballRadius < wa.y) sy = wa.y + ballRadius;
      // 主球下边缘超出工作区域底部 → 回弹到底部 - 半径位置
      else if (centerY + ballRadius > wa.y + wa.height) sy = wa.y + wa.height - ballRadius;

      // 保存主球中心位置
      set('ballPosition', { x: sx, y: sy });

      // 如果有边缘回弹，调整窗口位置
      if (sx !== centerX || sy !== centerY) {
        const newWindowX = sx - bounds.width / 2;
        const newWindowY = sy - bounds.height / 2;
        ballWin.setPosition(Math.round(newWindowX), Math.round(newWindowY));
      }
    } else {
      // 没有窗口时，假设传入的是中心位置
      set('ballPosition', { x, y });
    }
  });

  ipcMain.on('ball:set-ignore-mouse-events', (event, ignore) => {
    const ballWin = getBallWindow();
    if (ballWin && !ballWin.isDestroyed()) {
      ballWin.setIgnoreMouseEvents(ignore, { forward: true });
    }
  });

  ipcMain.handle('config:get', (event, key) => {
    return get(key);
  });

  ipcMain.handle('config:set', (event, { key, value }) => {
    set(key, value);
    const ballWin = getBallWindow();
    if (ballWin && !ballWin.isDestroyed()) {
      const fullConfig = get();
      ballWin.webContents.send('config:changed', fullConfig);
      if (key === 'ballSize') {
        refreshBallWindow();
      }
    }
    return true;
  });

  // 静默设置配置：只更新渲染器，不触发刷新动画
  ipcMain.handle('config:set-silent', (event, { key, value }) => {
    set(key, value);
    const ballWin = getBallWindow();
    if (ballWin && !ballWin.isDestroyed()) {
      ballWin.webContents.send('config:changed', get());
    }
    return true;
  });

  ipcMain.handle('auto-start:set', (event, enabled) => {
    setAutoLaunch(enabled);
    return true;
  });

  ipcMain.handle('ai:get-other', (event, currentAI) => {
    return getOtherAIs(currentAI);
  });

  ipcMain.on('context-menu:open', () => {
    const ballWin = getBallWindow();
    if (ballWin && !ballWin.isDestroyed()) {
      showContextMenu(ballWin);
    }
  });

  ipcMain.on('window:zoom-request', (event, direction) => {
    // Zoom操作在BrowserView上进行
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    const view = getViewById(win.chatWindowId);
    if (!view) return;
    const currentFactor = view.webContents.getZoomFactor();
    const step = 0.1;
    const newFactor = direction === 'in'
      ? Math.min(3.0, currentFactor + step)
      : Math.max(0.5, currentFactor - step);
    view.webContents.setZoomFactor(newFactor);
    set('zoomLevel', newFactor);
  });

  ipcMain.handle('window:get-zoom', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return 1.0;
    const view = getViewById(win.chatWindowId);
    return view ? view.webContents.getZoomFactor() : 1.0;
  });

  ipcMain.handle('window:set-zoom', (event, factor) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return false;
    const view = getViewById(win.chatWindowId);
    if (view) {
      view.webContents.setZoomFactor(factor);
    }
    return true;
  });

  ipcMain.handle('window:toggle-pin', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return false;
    const isPinned = win.isAlwaysOnTop();
    win.setAlwaysOnTop(!isPinned, 'screen-saver');
    return !isPinned;
  });

  ipcMain.handle('window:is-pinned', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return win ? win.isAlwaysOnTop() : false;
  });

  ipcMain.handle('window:minimize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      win.minimize();
    }
    return true;
  });

  ipcMain.handle('window:toggle-maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return toggleMaximize(win);
  });

  ipcMain.handle('window:is-maximized', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return isMaximized(win);
  });

  ipcMain.handle('window:reload', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return false;
    const view = getViewById(win.chatWindowId);
    if (view) {
      view.webContents.reload();
    }
    return true;
  });
}

// 存储窗口最大化前的 bounds（放在模块级别，不在函数内）
const savedWindowBounds = new Map();

function toggleMaximize(win) {
  if (!win) return false;

  const winId = win.id;

  if (savedWindowBounds.has(winId)) {
    // 还原窗口
    const bounds = savedWindowBounds.get(winId);
    win.setSize(bounds.width, bounds.height);
    win.setPosition(bounds.x, bounds.y);
    savedWindowBounds.delete(winId);
    win.webContents.send('maximize:update', false);
    return false;
  } else {
    // 最大化窗口：使用窗口所在的显示器（多屏适配）
    savedWindowBounds.set(winId, win.getBounds());
    // 获取窗口当前所在显示器，而非主显示器
    const winBounds = win.getBounds();
    const display = screen.getDisplayNearestPoint({ x: winBounds.x + winBounds.width / 2, y: winBounds.y + winBounds.height / 2 });
    const workArea = display.workArea;
    win.setSize(workArea.width, workArea.height);
    win.setPosition(workArea.x, workArea.y);
    win.webContents.send('maximize:update', true);
    return true;
  }
}

function isMaximized(win) {
  if (!win) return false;
  return savedWindowBounds.has(win.id);
}

module.exports = { registerIpcHandlers, toggleMaximize, isMaximized };
