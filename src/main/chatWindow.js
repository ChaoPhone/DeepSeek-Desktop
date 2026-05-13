const { BrowserWindow, BrowserView, app } = require('electron');
const path = require('path');
const { refreshBallWindow } = require('./floatingBall');
const { AI_SITES, getAIConfig } = require('./aiConfig');
const { get } = require('./config');

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

  // 主窗口使用Mica背景，避免白色边框问题
  const win = new BrowserWindow({
    width: savedBounds?.width || defaults.width,
    height: savedBounds?.height || defaults.height,
    x: savedBounds?.x,
    y: savedBounds?.y,
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
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  win.setBrowserView(view);
  views.set(id, view);

  // BrowserView位于拖动区域下方
  const [width, height] = win.getSize();
  view.setBounds({ x: 0, y: 36, width: width, height: height - 36 });
  view.setAutoResize({ width: true, height: true });
  view.webContents.loadURL(aiConfig.url);

  // 监听网页title变化，同步到控制栏
  view.webContents.on('page-title-updated', (event, title) => {
    if (win && !win.isDestroyed()) {
      win.webContents.send('title:update', title);
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
  });

  win.on('closed', () => {
    views.delete(win.chatWindowId);
    windows.delete(win.chatWindowId);
    // 刷新悬浮球窗口，防止白色条
    setTimeout(refreshBallWindow, 100);
  });

  // 窗口失去焦点时刷新悬浮球
  win.on('blur', () => {
    setTimeout(refreshBallWindow, 50);
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
        zoomFactor: view ? view.webContents.getZoomFactor() : 1.0
      });
    }
  });
  return bounds;
}

module.exports = {
  openNewChatWindow,
  getAllChatWindows,
  getChatWindowById,
  getViewById,
  closeAllChatWindows,
  saveAllBounds
};