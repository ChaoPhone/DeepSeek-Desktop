const { app } = require('electron');

// Prevent transparent window rendering artifacts on Windows
app.commandLine.appendSwitch('disable-software-rasterizer');
// Disable Windows 11 Snap Layouts to prevent white strip on frameless windows
app.commandLine.appendSwitch('disable-features', 'Windows11SnapLayouts');

const path = require('path');
const fs = require('fs');

// 使用统一的日志模块
const { init: initLogger, log } = require('./logger');

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
    // 初始化日志模块
    initLogger();
    log('INFO', '=== App started ===');

    const { initConfig, get } = require('./config');
    initConfig();
    log('INFO', 'Config OK', { ballSize: get('ballSize') });

    const { initAutoLaunch } = require('./autoLaunch');
    initAutoLaunch();

    const { createFloatingBall, getBallWindow } = require('./floatingBall');
    createFloatingBall();
    log('INFO', 'Ball window created');

    const { registerIpcHandlers } = require('./ipcHandlers');
    registerIpcHandlers();
    log('INFO', 'IPC registered');

    // 任何新窗口创建后，立即重新断言悬浮球置顶状态
    // 解决新窗口抢占悬浮球置顶层级的问题
    app.on('browser-window-created', (_event, newWin) => {
      const ballWin = getBallWindow();
      if (!ballWin || ballWin.isDestroyed()) return;
      // 跳过悬浮球自身
      if (newWin === ballWin) return;
      const configOnTop = get('ballAlwaysOnTop') !== false;
      if (configOnTop && ballWin && !ballWin.isDestroyed()) {
        ballWin.setAlwaysOnTop(true, 'screen-saver', 1);
      }
    });

    // 自动更新（仅在生产环境启用）
    if (app.isPackaged) {
      const { setupAutoUpdater } = require('./autoUpdater');
      setupAutoUpdater();
      log('INFO', 'AutoUpdater enabled');
    }

    // Restore last session chat windows
    const lastWindows = get('lastWindows');
    if (lastWindows && lastWindows.length > 0) {
      const { openNewChatWindow } = require('./chatWindow');
      for (const savedWin of lastWindows) {
        try {
          // 恢复时传递 aiKey，确保 GLM 使用正确的默认宽度
          const bounds = { x: savedWin.x, y: savedWin.y, width: savedWin.width, height: savedWin.height, zoomFactor: savedWin.zoomFactor };
          openNewChatWindow(bounds, savedWin.aiKey);
        } catch (e) {}
      }
    }

    log('INFO', '=== Ready ===');
  });

  app.on('window-all-closed', () => {});

  app.on('before-quit', () => {
    const { saveAllBounds, closeAllChatWindows } = require('./chatWindow');
    const { set } = require('./config');
    const bounds = saveAllBounds();
    if (bounds.length > 0) set('lastWindows', bounds);
    closeAllChatWindows();

    // 清理系统托盘图标，防止退出后残留
    const { destroyTray } = require('./contextMenu');
    destroyTray();

    // 清理自动更新定时器
    if (app.isPackaged) {
      const { cleanupAutoUpdater } = require('./autoUpdater');
      cleanupAutoUpdater();
    }
  });
}
