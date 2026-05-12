const { ipcMain, BrowserWindow, screen } = require('electron');
const { get, set } = require('./config');
const { openNewChatWindow } = require('./chatWindow');
const { showContextMenu } = require('./contextMenu');
const { setAutoLaunch } = require('./autoLaunch');
const { getBallWindow, updateBallSize } = require('./floatingBall');

function registerIpcHandlers() {
  ipcMain.handle('ball:click', () => {
    const id = openNewChatWindow();
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
    // Edge snapping: snap to nearest screen edge if within 30px
    const ballWin = getBallWindow();
    if (ballWin && !ballWin.isDestroyed()) {
      const display = screen.getDisplayNearestPoint({ x, y });
      const wa = display.workArea;
      const size = get('ballSize');
      const threshold = 30;

      let sx = x, sy = y;
      if (x - wa.x < threshold) sx = wa.x;
      else if (wa.x + wa.width - (x + size) < threshold) sx = wa.x + wa.width - size;
      if (y - wa.y < threshold) sy = wa.y;
      else if (wa.y + wa.height - (y + size) < threshold) sy = wa.y + wa.height - size;

      if (sx !== x || sy !== y) {
        ballWin.setPosition(sx, sy);
      }
      set('ballPosition', { x: sx, y: sy });
    } else {
      set('ballPosition', { x, y });
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
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    const currentFactor = win.webContents.getZoomFactor();
    const step = 0.1;
    const newFactor = direction === 'in'
      ? Math.min(3.0, currentFactor + step)
      : Math.max(0.5, currentFactor - step);
    win.webContents.setZoomFactor(newFactor);
    set('zoomLevel', newFactor);
  });

  ipcMain.handle('window:get-zoom', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return win ? win.webContents.getZoomFactor() : 1.0;
  });

  ipcMain.handle('window:set-zoom', (event, factor) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      win.webContents.setZoomFactor(factor);
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
}

module.exports = { registerIpcHandlers };
