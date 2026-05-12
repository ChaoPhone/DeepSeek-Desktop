const { BrowserWindow, session } = require('electron');
const path = require('path');

const windows = new Map();
let nextId = 1;

function openNewChatWindow(savedBounds = null) {
  const defaults = {
    width: 420,
    height: 700,
    minWidth: 320,
    minHeight: 400
  };

  const win = new BrowserWindow({
    width: savedBounds?.width || defaults.width,
    height: savedBounds?.height || defaults.height,
    x: savedBounds?.x,
    y: savedBounds?.y,
    minWidth: defaults.minWidth,
    minHeight: defaults.minHeight,
    frame: false,
    show: false,
    transparent: true,
    backgroundColor: '#00000000',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/chatPreload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  win.removeMenu();

  win.loadURL('https://chat.deepseek.com');

  const id = nextId++;
  win.chatWindowId = id;
  windows.set(id, win);

  win.webContents.on('did-finish-load', () => {
    win.webContents.insertCSS(`
      /* 顶部灵动岛拖动区域 */
      #ds-drag-zone {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        height: 36px;
        z-index: 99998;
        -webkit-app-region: drag;
        background: linear-gradient(180deg, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0) 100%);
        border-radius: 0 0 12px 12px;
        pointer-events: auto;
      }
      /* 灵动岛内部指示条 */
      #ds-drag-zone::after {
        content: '';
        position: absolute;
        top: 6px;
        left: 50%;
        transform: translateX(-50%);
        width: 40px;
        height: 4px;
        background: rgba(0,0,0,0.25);
        border-radius: 2px;
      }
      /* 关闭按钮 */
      #ds-close-btn {
        position: fixed;
        top: 8px;
        right: 8px;
        z-index: 99999;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: rgba(0,0,0,0.35);
        color: #fff;
        border: none;
        font-size: 14px;
        line-height: 24px;
        text-align: center;
        cursor: pointer;
        font-family: sans-serif;
        transition: background 0.15s;
        -webkit-app-region: no-drag;  /* 确保按钮可点击 */
      }
      #ds-close-btn:hover {
        background: rgba(220,50,50,0.85);
      }
      /* 确保页面内容不被拖动区域遮挡 */
      body { padding-top: 36px !important; background: transparent !important; }
      html { background: transparent !important; }
    `);
    win.webContents.executeJavaScript(`
      if (!document.getElementById('ds-drag-zone')) {
        const dragZone = document.createElement('div');
        dragZone.id = 'ds-drag-zone';
        document.body.appendChild(dragZone);
      }
      if (!document.getElementById('ds-close-btn')) {
        const btn = document.createElement('button');
        btn.id = 'ds-close-btn';
        btn.innerHTML = '&#x2715;';
        btn.title = 'Close (Ctrl+W)';
        btn.onclick = () => window.close();
        document.body.appendChild(btn);
      }
    `).catch(() => {});
  });

  win.once('ready-to-show', () => {
    win.show();
    win.focus();
  });

  win.on('closed', () => {
    windows.delete(win.chatWindowId);
  });

  return id;
}

function getAllChatWindows() {
  return [...windows.values()];
}

function getChatWindowById(id) {
  return windows.get(id);
}

function closeAllChatWindows() {
  windows.forEach((win) => {
    if (!win.isDestroyed()) win.close();
  });
  windows.clear();
}

function saveAllBounds() {
  const bounds = [];
  windows.forEach((win) => {
    if (!win.isDestroyed()) {
      bounds.push({
        x: win.getBounds().x,
        y: win.getBounds().y,
        width: win.getBounds().width,
        height: win.getBounds().height,
        zoomFactor: win.webContents.getZoomFactor()
      });
    }
  });
  return bounds;
}

module.exports = {
  openNewChatWindow,
  getAllChatWindows,
  getChatWindowById,
  closeAllChatWindows,
  saveAllBounds
};
