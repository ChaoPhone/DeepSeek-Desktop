const { BrowserWindow, BrowserView, app, screen, session } = require('electron');
const path = require('path');
const { refreshBallWindow, getBallWindow } = require('./floatingBall');
const { AI_SITES, getAIConfig } = require('./aiConfig');
const { get } = require('./config');
const { log } = require('./logger');

const windows = new Map();
const views = new Map();
let nextId = 1;

// 为不同 AI 设置不同的 App User Model ID（让任务栏分开显示）
const APP_MODEL_IDS = {
  deepseek: 'DeepSeek.Desktop.Chat',
  gpt: 'DeepSeek.Desktop.ChatGPT',
  gemini: 'DeepSeek.Desktop.Gemini',
  glm: 'DeepSeek.Desktop.GLM'
};

function openNewChatWindow(savedBounds = null, aiKey = null) {
  // 获取当前默认 AI 或指定 AI
  const currentAI = aiKey || get('currentAI') || 'deepseek';
  const aiConfig = getAIConfig(currentAI);

  // 设置特定的 App User Model ID（让任务栏识别为不同应用）
  const appModelId = APP_MODEL_IDS[currentAI] || APP_MODEL_IDS.deepseek;
  app.setAppUserModelId(appModelId);

  // 基础默认尺寸
  const baseWidth = 420;
  const baseHeight = 700;

  // 智谱 GLM 宽度增加 1/5
  const defaults = {
    width: currentAI === 'glm' ? Math.round(baseWidth * 1.2) : baseWidth,
    height: baseHeight,
    minWidth: 320,
    minHeight: 400
  };

  // 获取悬浮球所在显示器（多屏适配）
  const ballWin = getBallWindow();
  let targetDisplay = screen.getPrimaryDisplay();
  if (ballWin && !ballWin.isDestroyed()) {
    const ballBounds = ballWin.getBounds();
    const ballCenterX = ballBounds.x + ballBounds.width / 2;
    const ballCenterY = ballBounds.y + ballBounds.height / 2;
    targetDisplay = screen.getDisplayNearestPoint({ x: ballCenterX, y: ballCenterY });
  }
  const workArea = targetDisplay.workArea;

  // 计算窗口位置：在悬浮球所在显示器上，靠近悬浮球位置
  let winX, winY;
  if (savedBounds) {
    // 有保存的位置，检查是否在有效显示器范围内
    winX = savedBounds.x;
    winY = savedBounds.y;
  } else {
    // 无保存位置，在悬浮球所在显示器上居中偏右
    const ballPos = get('ballPosition') || { x: workArea.x + workArea.width / 2, y: workArea.y + workArea.height / 2 };
    // 窗口在悬浮球右侧或左侧（根据悬浮球位置）
    const winWidth = defaults.width;
    const winHeight = defaults.height;

    // 悬浮球在屏幕左半边 → 窗口在右侧，反之在左侧
    if (ballPos.x < workArea.x + workArea.width / 2) {
      winX = Math.min(ballPos.x + 80, workArea.x + workArea.width - winWidth - 20);
    } else {
      winX = Math.max(ballPos.x - winWidth - 80, workArea.x + 20);
    }
    // 窗口垂直居中，但确保在可见区域
    winY = Math.max(workArea.y + 20, Math.min(ballPos.y - winHeight / 2, workArea.y + workArea.height - winHeight - 20));
  }

  // 主窗口使用Mica背景，避免白色边框问题
  // GLM 窗口：如果 savedBounds.width 与 GLM 默认宽度差距较大，使用 GLM 默认宽度
  let winWidth = savedBounds?.width;
  if (currentAI === 'glm') {
    const glmDefaultWidth = Math.round(baseWidth * 1.2);
    // 如果保存的宽度与 GLM 默认宽度差距超过 20px，强制使用默认宽度
    if (!winWidth || Math.abs(winWidth - glmDefaultWidth) > 20) {
      winWidth = glmDefaultWidth;
    }
  }

  const win = new BrowserWindow({
    width: winWidth || defaults.width,
    height: savedBounds?.height || defaults.height,
    x: winX,
    y: winY,
    minWidth: defaults.minWidth,
    minHeight: defaults.minHeight,
    frame: false,
    transparent: false,
    backgroundMaterial: 'mica',
    hasShadow: true,
    thickFrame: true,
    resizable: true,
    show: false,
    title: aiConfig.name,
    icon: path.join(__dirname, '../../assets/ai_figure', aiConfig.icon),
    skipTaskbar: false, // 确保显示在任务栏
    webPreferences: {
      preload: path.join(__dirname, '../preload/chatPreload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  // 记录窗口所在的显示器 ID，用于最大化适配
  win.displayId = targetDisplay.id;

  // 加载控制栏HTML（包含拖动区域和按钮）
  const controlHtmlPath = path.join(__dirname, '../renderer/chat-control/index.html');
  win.loadFile(controlHtmlPath);

  const id = nextId++;
  win.chatWindowId = id;
  win.aiKey = currentAI;
  windows.set(id, win);

  // 设置窗口标题和任务栏信息
  win.setTitle(aiConfig.name);

  // 创建BrowserView加载实际网页内容
  const view = new BrowserView({
    webPreferences: {
      preload: path.join(__dirname, '../preload/viewPreload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  win.setBrowserView(view);
  views.set(id, view);

  // 应用代理设置（如果已配置，国内服务默认跳过）
  applyProxySettings(view, currentAI);

  // BrowserView位于拖动区域下方
  const [width, height] = win.getSize();
  view.setBounds({ x: 0, y: 36, width: width, height: height - 36 });
  view.setAutoResize({ width: true, height: true });
  view.webContents.loadURL(aiConfig.url);

  // 恢复会话时还原缩放比例
  if (savedBounds?.zoomFactor && savedBounds.zoomFactor !== 1.0) {
    view.webContents.setZoomFactor(savedBounds.zoomFactor);
  }

  // 监听网页title变化，同步到控制栏
  view.webContents.on('page-title-updated', (event, title) => {
    if (win && !win.isDestroyed()) {
      win.webContents.send('title:update', title);
    }
  });

  // 加载状态通知（用于控制栏显示加载动画）
  view.webContents.on('did-start-loading', () => {
    if (win && !win.isDestroyed()) {
      win.webContents.send('loading:start');
    }
  });
  view.webContents.on('did-stop-loading', () => {
    if (win && !win.isDestroyed()) {
      win.webContents.send('loading:end');
    }
  });

  // 监听导航状态变化，同步到控制栏（前进/后退按钮可用性）
  view.webContents.on('did-navigate', () => {
    if (win && !win.isDestroyed()) {
      win.webContents.send('nav-state:update', {
        canGoBack: view.webContents.canGoBack(),
        canGoForward: view.webContents.canGoForward()
      });
    }
  });
  view.webContents.on('did-navigate-in-page', () => {
    if (win && !win.isDestroyed()) {
      win.webContents.send('nav-state:update', {
        canGoBack: view.webContents.canGoBack(),
        canGoForward: view.webContents.canGoForward()
      });
    }
  });

  // 监听加载失败，通知控制栏显示错误提示
  view.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (!isMainFrame) return; // 只处理主框架加载失败
    // -3 是用户主动中断，不需要提示
    if (errorCode === -3) return;
    log('WARN', '页面加载失败', { errorCode, errorDescription, validatedURL });
    if (win && !win.isDestroyed()) {
      win.webContents.send('load:failed', {
        errorCode,
        errorDescription,
        url: validatedURL
      });
    }
  });

  // 窗口大小变化时更新BrowserView
  win.on('resize', () => {
    const [w, h] = win.getSize();
    if (view && !view.webContents.isDestroyed()) {
      view.setBounds({ x: 0, y: 36, width: w, height: h - 36 });
    }
  });

  win.once('ready-to-show', () => {
    win.show();
    // 发送品牌色给控制栏渲染器
    if (aiConfig.brandColor) {
      win.webContents.send('brand-color:update', aiConfig.brandColor);
    }
    // 聊天窗口显示后，立即重新断言悬浮球置顶状态
    const { getBallWindow } = require('./floatingBall');
    const ballWin = getBallWindow();
    if (ballWin && !ballWin.isDestroyed() && get('ballAlwaysOnTop') !== false) {
      ballWin.setAlwaysOnTop(true, 'screen-saver', 1);
    }
  });

  win.on('closed', () => {
    views.delete(win.chatWindowId);
    windows.delete(win.chatWindowId);
    refreshBallWindow();
  });

  // 聊天窗口失去焦点时，刷新悬浮球（解决覆盖区域的白条问题）
  win.on('blur', () => {
    refreshBallWindow();
  });

  // 窗口最大化状态变化时通知控制栏更新图标（双击标题栏等触发）
  win.on('maximize', () => {
    win.webContents.send('maximize:update', true);
  });

  win.on('unmaximize', () => {
    win.webContents.send('maximize:update', false);
  });

  return id;
}

function getAllChatWindows() {
  return [...windows.values()];
}

function getChatWindowById(id) {
  return windows.get(id);
}

function getViewById(id) {
  return views.get(id);
}

function closeAllChatWindows() {
  windows.forEach((win) => {
    if (!win.isDestroyed()) win.close();
  });
  windows.clear();
  views.clear();
}

function saveAllBounds() {
  const bounds = [];
  windows.forEach((win) => {
    if (!win.isDestroyed()) {
      const view = views.get(win.chatWindowId);
      bounds.push({
        x: win.getBounds().x,
        y: win.getBounds().y,
        width: win.getBounds().width,
        height: win.getBounds().height,
        zoomFactor: view ? view.webContents.getZoomFactor() : 1.0,
        aiKey: win.aiKey // 保存 AI 类型，恢复时使用正确的默认宽度
      });
    }
  });
  return bounds;
}

// 不需要代理的国内 AI 服务
const NO_PROXY_AI = ['deepseek', 'glm'];

// 应用代理设置到 BrowserView
// aiKey: 当前窗口对应的 AI 类型，国内服务默认跳过代理
function applyProxySettings(view, aiKey) {
  if (!view) return;

  const proxyEnabled = get('proxyEnabled');
  const proxyUrl = get('proxyUrl');

  // 国内服务（DeepSeek、GLM）默认不走代理
  if (aiKey && NO_PROXY_AI.includes(aiKey)) {
    view.webContents.session.setProxy({ proxyRules: '' })
      .then(() => {
        log('INFO', '国内服务跳过代理', { aiKey });
      });
    return;
  }

  if (proxyEnabled && proxyUrl) {
    // 解析代理 URL（支持 http/https/socks5）
    // 格式: protocol://host:port 或 host:port
    let proxyRules = proxyUrl;
    if (!proxyUrl.includes('://')) {
      proxyRules = `http://${proxyUrl}`; // 默认 HTTP 代理
    }

    view.webContents.session.setProxy({ proxyRules })
      .then(() => {
        log('INFO', '代理已应用', { proxyRules });
      })
      .catch(err => {
        log('ERROR', '代理设置失败', { error: err.message });
      });
  } else {
    // 清除代理设置
    view.webContents.session.setProxy({ proxyRules: '' })
      .then(() => {
        log('INFO', '代理已清除');
      });
  }
}

// 更新所有聊天窗口的代理设置
function updateAllProxySettings() {
  windows.forEach((win) => {
    const view = views.get(win.chatWindowId);
    if (view && !view.webContents.isDestroyed()) {
      applyProxySettings(view, win.aiKey);
    }
  });
}

module.exports = {
  openNewChatWindow,
  getAllChatWindows,
  getChatWindowById,
  getViewById,
  closeAllChatWindows,
  saveAllBounds,
  applyProxySettings,
  updateAllProxySettings
};