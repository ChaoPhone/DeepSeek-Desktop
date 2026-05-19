const { autoUpdater } = require('electron-updater');
const { dialog, app, session } = require('electron');
const { getBallWindow, refreshBallWindow } = require('./floatingBall');
const { get } = require('./config');
const { log } = require('./logger');

let updateCheckTimer = null;

// GitHub 镜像列表（国内可用）
const MIRRORS = [
  'https://mirror.ghproxy.com',
  'https://ghproxy.com',
  'https://hub.gitmirror.com'
];

// 原始 GitHub URL
const GITHUB_REPO = 'ChaoPhone/DeepSeek-Desktop';

// 构建镜像 URL
function buildMirrorUrl(baseUrl, path) {
  return `${baseUrl}/https://github.com/${GITHUB_REPO}/releases/download/${path}`;
}

function setupAutoUpdater() {
  log('INFO', 'AutoUpdater setup', { isPackaged: app.isPackaged });

  // 不自动下载，用户确认后才下载
  autoUpdater.autoDownload = false;
  // 不自动安装，用户确认后才安装
  autoUpdater.autoInstallOnAppQuit = true;

  // 应用代理设置到 autoUpdater 的 session
  applyProxyForUpdater();

  // 检查更新失败
  autoUpdater.on('error', (err) => {
    log('ERROR', 'AutoUpdater error', { message: err.message || err });
  });

  // 发现新版本
  autoUpdater.on('update-available', (info) => {
    log('INFO', 'AutoUpdater 发现新版本', { version: info.version });
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
      // 弹窗关闭后刷新悬浮球，解决白条问题
      setTimeout(() => refreshBallWindow(), 50);

      if (result.response === 0) {
        log('INFO', 'AutoUpdater 用户选择下载');
        autoUpdater.downloadUpdate();
      }
    });
  });

  // 没有新版本
  autoUpdater.on('update-not-available', (info) => {
    log('INFO', 'AutoUpdater 当前已是最新版本', { version: info?.version || 'unknown' });
  });

  // 下载进度
  autoUpdater.on('download-progress', (progress) => {
    log('DEBUG', 'AutoUpdater 下载进度', { percent: progress.percent.toFixed(1) });
  });

  // 更新已下载完成
  autoUpdater.on('update-downloaded', (info) => {
    log('INFO', 'AutoUpdater 更新已下载', { version: info.version });
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
      // 弹窗关闭后刷新悬浮球，解决白条问题
      setTimeout(() => refreshBallWindow(), 50);

      if (result.response === 0) {
        log('INFO', 'AutoUpdater 用户选择安装');
        autoUpdater.quitAndInstall();
      }
    });
  });

  // 启动时检查更新（延迟 3 秒）
  setTimeout(() => {
    checkForUpdates();
  }, 3000);

  // 每小时检查一次更新
  updateCheckTimer = setInterval(() => {
    checkForUpdates();
  }, 60 * 60 * 1000);
}

// 使用镜像检查更新
function checkForUpdates() {
  if (!app.isPackaged) {
    log('DEBUG', 'AutoUpdater 开发环境跳过更新检查');
    return;
  }

  log('INFO', 'AutoUpdater 正在通过镜像检查更新');

  // 获取当前版本
  const currentVersion = app.getVersion();

  // 尝试各个镜像
  tryMirrorCheck(currentVersion, 0);
}

// 依次尝试镜像
async function tryMirrorCheck(currentVersion, mirrorIndex) {
  if (mirrorIndex >= MIRRORS.length) {
    log('WARN', 'AutoUpdater 所有镜像失败尝试 GitHub 直连');
    // 最后尝试 GitHub 直连
    autoUpdater.checkForUpdates().catch(err => {
      log('ERROR', 'AutoUpdater 检查更新失败', { message: err.message || err });
    });
    return;
  }

  const mirror = MIRRORS[mirrorIndex];
  const latestFeedUrl = buildMirrorUrl(mirror, 'latest/download/latest.yml');

  log('DEBUG', 'AutoUpdater 尝试镜像', { mirror });

  try {
    // 设置自定义 feed URL 使用镜像
    autoUpdater.setFeedURL({
      provider: 'generic',
      url: latestFeedUrl,
      channel: 'latest'
    });

    await autoUpdater.checkForUpdates();
    log('INFO', 'AutoUpdater 镜像检查成功', { mirror });
  } catch (err) {
    log('WARN', 'AutoUpdater 镜像失败', { mirror, error: err.message });
    // 尝试下一个镜像
    tryMirrorCheck(currentVersion, mirrorIndex + 1);
  }
}

function cleanupAutoUpdater() {
  if (updateCheckTimer) {
    clearInterval(updateCheckTimer);
    updateCheckTimer = null;
  }
}

// 应用代理设置到 autoUpdater 的 session
function applyProxyForUpdater() {
  const proxyEnabled = get('proxyEnabled');
  const proxyUrl = get('proxyUrl');

  if (proxyEnabled && proxyUrl) {
    let proxyRules = proxyUrl;
    if (!proxyUrl.includes('://')) {
      proxyRules = `http://${proxyUrl}`;
    }

    // electron-updater 使用 defaultSession
    session.defaultSession.setProxy({ proxyRules })
      .then(() => {
        log('INFO', 'AutoUpdater 代理已应用', { proxyRules });
      })
      .catch(err => {
        log('ERROR', 'AutoUpdater 代理应用失败', { message: err.message });
      });
  } else {
    // 清除代理
    session.defaultSession.setProxy({ proxyRules: '' })
      .then(() => {
        log('DEBUG', 'AutoUpdater 代理已清除');
      });
  }
}

module.exports = {
  setupAutoUpdater,
  checkForUpdates,
  cleanupAutoUpdater,
  applyProxyForUpdater
};