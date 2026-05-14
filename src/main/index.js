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

    // 自动更新（仅在生产环境启用）
    if (app.isPackaged) {
      const { setupAutoUpdater } = require('./autoUpdater');
      setupAutoUpdater();
      logger.log('AutoUpdater enabled');
    }

    // Restore last session chat windows
    const lastWindows = get('lastWindows');
    if (lastWindows && lastWindows.length > 0) {
      const { openNewChatWindow } = require('./chatWindow');
      for (const savedWin of lastWindows) {
        try {
          // 恢复时传递 aiKey，确保 GLM 使用正确的默认宽度
          const bounds = { x: savedWin.x, y: savedWin.y, width: savedWin.width, height: savedWin.height };
          openNewChatWindow(bounds, savedWin.aiKey);
        } catch (e) {}
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

    // 清理自动更新定时器
    if (app.isPackaged) {
      const { cleanupAutoUpdater } = require('./autoUpdater');
      cleanupAutoUpdater();
    }
  });
}
