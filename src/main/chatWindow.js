const { BrowserWindow, BrowserView } = require('electron');
const path = require('path');
const { refreshBallWindow } = require('./floatingBall');

const windows = new Map();
const views = new Map();
let nextId = 1;

function openNewChatWindow(savedBounds = null) {
  const defaults = {
    width: 420,
    height: 700,
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
  windows.set(id, win);

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
  view.webContents.loadURL('https://chat.deepseek.com');

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