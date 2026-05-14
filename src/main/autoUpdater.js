const { autoUpdater } = require('electron-updater');
const { dialog, BrowserWindow } = require('electron');
const { getBallWindow } = require('./floatingBall');

let updateCheckTimer = null;

function setupAutoUpdater() {
  // 不自动下载，用户确认后才下载
  autoUpdater.autoDownload = false;
  // 不自动安装，用户确认后才安装
  autoUpdater.autoInstallOnAppQuit = true;

  // 检查更新失败
  autoUpdater.on('error', (err) => {
    console.error('自动更新错误:', err);
  });

  // 发现新版本
  autoUpdater.on('update-available', (info) => {
    const ballWin = getBallWindow();
    const parentWin = ballWin && !ballWin.isDestroyed() ? ballWin : null;

    dialog.showMessageBox(parentWin, {
      type: 'info',
      title: '发现新版本',
      message: `发现新版本 ${info.version}`,
      detail: '是否立即下载更新？',
      buttons: ['立即下载', '稍后提醒'],
      defaultId: 0,
      cancelId: 1
    }).then(result => {
      if (result.response === 0) {
        autoUpdater.downloadUpdate();
      }
    });
  });

  // 没有新版本
  autoUpdater.on('update-not-available', () => {
    console.log('当前已是最新版本');
  });

  // 下载进度
  autoUpdater.on('download-progress', (progress) => {
    console.log(`下载进度: ${progress.percent.toFixed(1)}%`);
  });

  // 更新已下载完成
  autoUpdater.on('update-downloaded', (info) => {
    const ballWin = getBallWindow();
    const parentWin = ballWin && !ballWin.isDestroyed() ? ballWin : null;

    dialog.showMessageBox(parentWin, {
      type: 'info',
      title: '更新已下载',
      message: `新版本 ${info.version} 已下载完成`,
      detail: '是否立即安装更新？应用将自动重启。',
      buttons: ['立即安装', '稍后安装'],
      defaultId: 0,
      cancelId: 1
    }).then(result => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
  });

  // 启动时检查更新
  checkForUpdates();

  // 每小时检查一次更新
  updateCheckTimer = setInterval(() => {
    checkForUpdates();
  }, 60 * 60 * 1000);
}

function checkForUpdates() {
  autoUpdater.checkForUpdates().catch(err => {
    console.error('检查更新失败:', err);
  });
}

function cleanupAutoUpdater() {
  if (updateCheckTimer) {
    clearInterval(updateCheckTimer);
    updateCheckTimer = null;
  }
}

module.exports = {
  setupAutoUpdater,
  checkForUpdates,
  cleanupAutoUpdater
};