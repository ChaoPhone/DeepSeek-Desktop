const { app } = require('electron');

// Prevent transparent window rendering artifacts on Windows
app.commandLine.appendSwitch('disable-software-rasterizer');
// Disable Windows 11 Snap Layouts to prevent white strip on frameless windows
app.commandLine.appendSwitch('disable-features', 'Windows11SnapLayouts');

const path = require('path');
const fs = require('fs');

// Debug log to file
function makeLogger() {
  let logPath;
  return {
    init: (dir) => { logPath = path.join(dir, 'app.log'); },
    log: (...args) => {
      const line = `[${new Date().toISOString()}] ${args.join(' ')}\n`;
      try { fs.appendFileSync(logPath, line); } catch (e) {}
      console.log(...args);
    }
  };
}
const logger = makeLogger();

const gotSingleLock = app.requestSingleInstanceLock();
if (!gotSingleLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const { getBallWindow } = require('./floatingBall');
    const w = getBallWindow();
    if (w && !w.isDestroyed()) w.focus();
  });

  app.whenReady().then(() => {
    logger.init(app.getPath('userData'));
    logger.log('=== App started ===');

    const { initConfig, get } = require('./config');
    initConfig();
    logger.log('Config OK, ballSize=', get('ballSize'));

    const { initAutoLaunch } = require('./autoLaunch');
    initAutoLaunch();

    const { createFloatingBall } = require('./floatingBall');
    createFloatingBall();
    logger.log('Ball window created');

    const { registerIpcHandlers } = require('./ipcHandlers');
    registerIpcHandlers();
    logger.log('IPC registered');

    // Restore last session chat windows
    const lastWindows = get('lastWindows');
    if (lastWindows && lastWindows.length > 0) {
      const { openNewChatWindow } = require('./chatWindow');
      for (const bounds of lastWindows) {
        try { openNewChatWindow(bounds); } catch (e) {}
      }
    }

    logger.log('=== Ready ===');
  });

  app.on('window-all-closed', () => {});

  app.on('before-quit', () => {
    const { saveAllBounds, closeAllChatWindows } = require('./chatWindow');
    const { set } = require('./config');
    const bounds = saveAllBounds();
    if (bounds.length > 0) set('lastWindows', bounds);
    closeAllChatWindows();
  });
}
