const { autoUpdater } = require('electron-updater');
const { dialog, app, session } = require('electron');
const { getBallWindow, refreshBallWindow } = require('./floatingBall');
const { get } = require('./config');

let updateCheckTimer = null;
let logger = null;

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

function setupAutoUpdater(log) {
  logger = log;
  logger.log('[AutoUpdater] setupAutoUpdater called, isPackaged:', app.isPackaged);

  // 不自动下载，用户确认后才下载
  autoUpdater.autoDownload = false;
  // 不自动安装，用户确认后才安装
  autoUpdater.autoInstallOnAppQuit = true;

  // 应用代理设置到 autoUpdater 的 session
  applyProxyForUpdater();

  // 检查更新失败
  autoUpdater.on('error', (err) => {
    logger.log('[AutoUpdater] 错误:', err.message || err);
  });

  // 发现新版本
  autoUpdater.on('update-available', (info) => {
    logger.log('[AutoUpdater] 发现新版本:', info.version);
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
        logger.log('[AutoUpdater] 用户选择下载');
        autoUpdater.downloadUpdate();
      }
    });
  });

  // 没有新版本
  autoUpdater.on('update-not-available', (info) => {
    logger.log('[AutoUpdater] 当前已是最新版本:', info?.version || 'unknown');
  });

  // 下载进度
  autoUpdater.on('download-progress', (progress) => {
    logger.log(`[AutoUpdater] 下载进度: ${progress.percent.toFixed(1)}%`);
  });

  // 更新已下载完成
  autoUpdater.on('update-downloaded', (info) => {
    logger.log('[AutoUpdater] 更新已下载:', info.version);
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
        logger.log('[AutoUpdater] 用户选择安装');
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
    logger.log('[AutoUpdater] 开发环境，跳过更新检查');
    return;
  }

  logger.log('[AutoUpdater] 正在通过镜像检查更新...');

  // 获取当前版本
  const currentVersion = app.getVersion();

  // 尝试各个镜像
  tryMirrorCheck(currentVersion, 0);
}

// 依次尝试镜像
async function tryMirrorCheck(currentVersion, mirrorIndex) {
  if (mirrorIndex >= MIRRORS.length) {
    logger.log('[AutoUpdater] 所有镜像都失败，尝试 GitHub 直连');
    // 最后尝试 GitHub 直连
    autoUpdater.checkForUpdates().catch(err => {
      logger.log('[AutoUpdater] 检查更新失败:', err.message || err);
    });
    return;
  }

  const mirror = MIRRORS[mirrorIndex];
  const feedUrl = buildMirrorUrl(mirror, `v${currentVersion}/latest.yml`);

  // 实际上 latest.yml 是 latest/download/latest.yml
  const latestFeedUrl = buildMirrorUrl(mirror, 'latest/download/latest.yml');

  logger.log('[AutoUpdater] 尝试镜像:', mirror);

  try {
    // 设置自定义 feed URL 使用镜像
    autoUpdater.setFeedURL({
      provider: 'generic',
      url: latestFeedUrl,
      channel: 'latest'
    });

    await autoUpdater.checkForUpdates();
    logger.log('[AutoUpdater] 镜像检查成功:', mirror);
  } catch (err) {
    logger.log('[AutoUpdater] 镜像失败:', mirror, err.message);
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
        if (logger) logger.log('[AutoUpdater] 代理已应用到更新检查', { proxyRules });
      })
      .catch(err => {
        if (logger) logger.log('[AutoUpdater] 代理应用失败:', err.message);
      });
  } else {
    // 清除代理
    session.defaultSession.setProxy({ proxyRules: '' })
      .then(() => {
        if (logger) logger.log('[AutoUpdater] 代理已清除');
      });
  }
}

module.exports = {
  setupAutoUpdater,
  checkForUpdates,
  cleanupAutoUpdater,
  applyProxyForUpdater
};