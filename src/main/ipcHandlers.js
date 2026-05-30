const { ipcMain, BrowserWindow, screen, Menu, MenuItem } = require('electron');
const { get, set } = require('./config');
const { openNewChatWindow, getViewById, updateAllProxySettings } = require('./chatWindow');
const { showContextMenu } = require('./contextMenu');
const { setAutoLaunch } = require('./autoLaunch');
const { getBallWindow, updateBallSize, refreshBallWindow } = require('./floatingBall');
const { getOtherAIs } = require('./aiConfig');
const { log } = require('./logger');
const { applyProxyForUpdater } = require('./autoUpdater');

// 拖动状态
let dragWin = null;
let dragWinSize = { width: 0, height: 0 };
let isDragging = false;

function registerIpcHandlers() {
  ipcMain.handle('ball:click', () => {
    const id = openNewChatWindow();
    return { windowId: id };
  });

  ipcMain.handle('ball:get-expand-direction', () => {
    const ballWin = getBallWindow();
    if (!ballWin || ballWin.isDestroyed()) return 'top-left';

    const bounds = ballWin.getBounds();
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;

    const display = screen.getDisplayNearestPoint({ x: centerX, y: centerY });
    const wa = display.workArea;

    // 判断悬浮球在屏幕的哪个区域
    const midX = wa.x + wa.width / 2;
    const midY = wa.y + wa.height / 2;

    // 副球应弹出方向：选择空间最大的方向
    const spaceLeft = centerX - wa.x;
    const spaceRight = wa.x + wa.width - centerX;
    const spaceTop = centerY - wa.y;
    const spaceBottom = wa.y + wa.height - centerY;

    // 找出最小空间方向，副球弹出应避开该方向
    // 返回四个方向之一：top-left, top-right, bottom-left, bottom-right
    const preferLeft = spaceLeft > spaceRight;
    const preferTop = spaceTop > spaceBottom;

    if (preferTop && preferLeft) return 'top-left';
    if (preferTop && !preferLeft) return 'top-right';
    if (!preferTop && preferLeft) return 'bottom-left';
    return 'bottom-right';
  });

  ipcMain.handle('ball:click-ai', (event, aiKey) => {
    const id = openNewChatWindow(null, aiKey);
    return { windowId: id };
  });

  // 拖动开始：主进程获取窗口位置并返回给渲染进程
  ipcMain.on('ball:drag-start', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win || win.isDestroyed()) return;

    const [x, y] = win.getPosition();
    const [width, height] = win.getSize();

    dragWin = win;
    dragWinSize = { width, height };
    isDragging = true;

    // 将窗口初始位置和尺寸发送回渲染进程
    event.sender.send('window-start-position', { x, y, width, height });
  });

  // 拖动移动：使用 setBounds 锁定窗口尺寸（防止 DPI 缩放导致窗口放大）
  ipcMain.on('ball:move-window', (event, { x, y }) => {
    if (!isDragging || !dragWin || dragWin.isDestroyed()) return;

    // 使用 setBounds 同时设置位置和尺寸，锁定窗口大小
    dragWin.setBounds({
      x: Math.round(x),
      y: Math.round(y),
      width: dragWinSize.width,
      height: dragWinSize.height
    });
  });

  // 拖动结束：清理状态，检查边界回弹
  ipcMain.on('ball:drag-end', (event) => {
    isDragging = false;

    // 边界回弹检查
    if (dragWin && !dragWin.isDestroyed()) {
      const bounds = dragWin.getBounds();
      const centerX = bounds.x + bounds.width / 2;
      const centerY = bounds.y + bounds.height / 2;

      const display = screen.getDisplayNearestPoint({ x: centerX, y: centerY });
      const wa = display.workArea;
      const ballSize = get('ballSize') || 40;
      const ballRadius = ballSize / 2;

      let sx = centerX, sy = centerY;

      if (centerX - ballRadius < wa.x) sx = wa.x + ballRadius;
      else if (centerX + ballRadius > wa.x + wa.width) sx = wa.x + wa.width - ballRadius;

      if (centerY - ballRadius < wa.y) sy = wa.y + ballRadius;
      else if (centerY + ballRadius > wa.y + wa.height) sy = wa.y + wa.height - ballRadius;

      set('ballPosition', { x: sx, y: sy });

      if (sx !== centerX || sy !== centerY) {
        dragWin.setBounds({
          x: Math.round(sx - bounds.width / 2),
          y: Math.round(sy - bounds.height / 2),
          width: dragWinSize.width,
          height: dragWinSize.height
        });
      }
    }

    dragWin = null;
  });

  ipcMain.on('ball:set-ignore-mouse-events', (event, ignore) => {
    const ballWin = getBallWindow();
    if (ballWin && !ballWin.isDestroyed()) {
      ballWin.setIgnoreMouseEvents(ignore, { forward: true });
    }
  });

  ipcMain.handle('config:get', (event, key) => {
    return get(key);
  });

  ipcMain.handle('config:set', (event, { key, value }) => {
    set(key, value);
    const ballWin = getBallWindow();
    if (ballWin && !ballWin.isDestroyed()) {
      const fullConfig = get();
      ballWin.webContents.send('config:changed', fullConfig);
      if (key === 'ballSize') {
        refreshBallWindow();
      }
    }
    return true;
  });

  // 静默设置配置：只更新渲染器，不触发刷新动画
  ipcMain.handle('config:set-silent', (event, { key, value }) => {
    set(key, value);
    const ballWin = getBallWindow();
    if (ballWin && !ballWin.isDestroyed()) {
      ballWin.webContents.send('config:changed', get());
    }
    return true;
  });

  ipcMain.handle('auto-start:set', (event, enabled) => {
    setAutoLaunch(enabled);
    return true;
  });

  ipcMain.handle('ai:get-other', (event, currentAI) => {
    return getOtherAIs(currentAI);
  });

  ipcMain.on('context-menu:open', () => {
    const ballWin = getBallWindow();
    if (ballWin && !ballWin.isDestroyed()) {
      showContextMenu(ballWin);
    }
  });

  ipcMain.on('window:zoom-request', (event, direction) => {
    // Zoom操作在BrowserView上进行（来自控制栏 preload）
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    const view = getViewById(win.chatWindowId);
    if (!view) return;
    const currentFactor = view.webContents.getZoomFactor();
    const step = 0.1;
    const newFactor = direction === 'in'
      ? Math.min(3.0, currentFactor + step)
      : Math.max(0.5, currentFactor - step);
    view.webContents.setZoomFactor(newFactor);
    set('zoomLevel', newFactor);
  });

  // BrowserView 内部的 Ctrl+滚轮缩放（来自 viewPreload.js）
  ipcMain.on('view:zoom-request', (event, direction) => {
    // event.sender 就是 BrowserView 的 webContents
    const wc = event.sender;
    const currentFactor = wc.getZoomFactor();
    const step = 0.1;
    const newFactor = direction === 'in'
      ? Math.min(3.0, currentFactor + step)
      : Math.max(0.5, currentFactor - step);
    wc.setZoomFactor(newFactor);
    set('zoomLevel', newFactor);
  });

  ipcMain.handle('window:get-zoom', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return 1.0;
    const view = getViewById(win.chatWindowId);
    return view ? view.webContents.getZoomFactor() : 1.0;
  });

  ipcMain.handle('window:set-zoom', (event, factor) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return false;
    const view = getViewById(win.chatWindowId);
    if (view) {
      view.webContents.setZoomFactor(factor);
    }
    return true;
  });

  ipcMain.handle('window:toggle-pin', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return false;
    const isPinned = win.isAlwaysOnTop();
    win.setAlwaysOnTop(!isPinned, 'screen-saver');
    return !isPinned;
  });

  ipcMain.handle('window:is-pinned', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return win ? win.isAlwaysOnTop() : false;
  });

  ipcMain.handle('window:minimize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      win.minimize();
    }
    return true;
  });

  ipcMain.handle('window:toggle-maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return toggleMaximize(win);
  });

  ipcMain.handle('window:is-maximized', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return isMaximized(win);
  });

  ipcMain.handle('window:reload', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return false;
    const view = getViewById(win.chatWindowId);
    if (view) {
      view.webContents.reload();
    }
    return true;
  });

  // 后退
  ipcMain.handle('window:go-back', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return false;
    const view = getViewById(win.chatWindowId);
    if (view && view.webContents.canGoBack()) {
      view.webContents.goBack();
      return true;
    }
    return false;
  });

  // 前进
  ipcMain.handle('window:go-forward', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return false;
    const view = getViewById(win.chatWindowId);
    if (view && view.webContents.canGoForward()) {
      view.webContents.goForward();
      return true;
    }
    return false;
  });

  // 查询导航状态
  ipcMain.handle('window:nav-state', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return { canGoBack: false, canGoForward: false };
    const view = getViewById(win.chatWindowId);
    if (!view) return { canGoBack: false, canGoForward: false };
    return {
      canGoBack: view.webContents.canGoBack(),
      canGoForward: view.webContents.canGoForward()
    };
  });

  // 显示原生导航菜单（后退/前进/刷新）
  ipcMain.on('window:show-nav-menu', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win || win.isDestroyed()) return;
    const view = getViewById(win.chatWindowId);

    const menu = new Menu();
    menu.append(new MenuItem({
      label: '后退',
      enabled: view && view.webContents.canGoBack(),
      click: () => { if (view && !view.webContents.isDestroyed()) view.webContents.goBack(); }
    }));
    menu.append(new MenuItem({
      label: '前进',
      enabled: view && view.webContents.canGoForward(),
      click: () => { if (view && !view.webContents.isDestroyed()) view.webContents.goForward(); }
    }));
    menu.append(new MenuItem({ type: 'separator' }));
    menu.append(new MenuItem({
      label: '刷新',
      click: () => { if (view && !view.webContents.isDestroyed()) view.webContents.reload(); }
    }));

    menu.popup({ window: win });
  });

  // Proxy 设置相关
  ipcMain.handle('proxy:get', () => {
    return {
      enabled: get('proxyEnabled'),
      url: get('proxyUrl')
    };
  });

  ipcMain.handle('proxy:set', (event, { enabled, url }) => {
    set('proxyEnabled', enabled);
    set('proxyUrl', url || '');
    log('INFO', 'Proxy 配置已更新', { enabled, url });
    // 更新所有已打开的聊天窗口
    updateAllProxySettings();
    // 更新 autoUpdater 的代理设置（确保更新检查也能走代理）
    applyProxyForUpdater();
    return true;
  });
}

// 存储窗口最大化前的 bounds（放在模块级别，不在函数内）
const savedWindowBounds = new Map();

function toggleMaximize(win) {
  if (!win) return false;

  const winId = win.id;

  if (savedWindowBounds.has(winId)) {
    // 还原窗口
    const bounds = savedWindowBounds.get(winId);
    win.setSize(bounds.width, bounds.height);
    win.setPosition(bounds.x, bounds.y);
    savedWindowBounds.delete(winId);
    win.webContents.send('maximize:update', false);
    return false;
  } else {
    // 最大化窗口：使用窗口所在的显示器（多屏适配）
    savedWindowBounds.set(winId, win.getBounds());
    // 获取窗口当前所在显示器，而非主显示器
    const winBounds = win.getBounds();
    const display = screen.getDisplayNearestPoint({ x: winBounds.x + winBounds.width / 2, y: winBounds.y + winBounds.height / 2 });
    const workArea = display.workArea;
    win.setSize(workArea.width, workArea.height);
    win.setPosition(workArea.x, workArea.y);
    win.webContents.send('maximize:update', true);
    return true;
  }
}

function isMaximized(win) {
  if (!win) return false;
  return savedWindowBounds.has(win.id);
}

module.exports = { registerIpcHandlers, toggleMaximize, isMaximized };
