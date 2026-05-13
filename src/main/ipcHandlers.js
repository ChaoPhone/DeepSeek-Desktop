const { ipcMain, BrowserWindow, screen } = require('electron');
const { get, set } = require('./config');
const { openNewChatWindow, getViewById } = require('./chatWindow');
const { showContextMenu } = require('./contextMenu');
const { setAutoLaunch } = require('./autoLaunch');
const { getBallWindow, updateBallSize, refreshBallWindow } = require('./floatingBall');

function registerIpcHandlers() {
  ipcMain.handle('ball:click', () => {
    const id = openNewChatWindow();
    return { windowId: id };
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
      const threshold = 30;

      let sx = centerX, sy = centerY;
      if (centerX - wa.x < threshold) sx = wa.x + threshold;
      else if (wa.x + wa.width - centerX < threshold) sx = wa.x + wa.width - threshold;
      if (centerY - wa.y < threshold) sy = wa.y + threshold;
      else if (wa.y + wa.height - centerY < threshold) sy = wa.y + wa.height - threshold;

      // 保存主球中心位置
      set('ballPosition', { x: sx, y: sy });

      // 如果有边缘吸附，调整窗口位置
      if (sx !== centerX || sy !== centerY) {
        const newWindowX = sx - bounds.width / 2;
        const newWindowY = sy - bounds.height / 2;
        ballWin.setPosition(newWindowX, newWindowY);
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
    // Broadcast config change to ball renderer so it updates live
    const ballWin = getBallWindow();
    if (ballWin && !ballWin.isDestroyed()) {
      const fullConfig = get();
      ballWin.webContents.send('config:changed', fullConfig);
    }
    // Update ball size if it changed
    if (key === 'ballSize') {
      updateBallSize(value);
    }
    return true;
  });

  ipcMain.handle('auto-start:set', (event, enabled) => {
    setAutoLaunch(enabled);
    return true;
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
    if (!win) return false;
    if (win.isMaximized()) {
      win.unmaximize();
      return false;
    } else {
      win.maximize();
      return true;
    }
  });
}

module.exports = { registerIpcHandlers };
