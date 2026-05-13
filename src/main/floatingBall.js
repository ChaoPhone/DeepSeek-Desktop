const { BrowserWindow, screen } = require('electron');
const path = require('path');
const { get, set } = require('./config');

let ballWin = null;
let moveTimer = null;
let mouseCheckTimer = null;

// 常量：窗口始终使用展开后的大小（固定不变，避免位移）
const HOVER_PADDING = 8;
const EXPAND_RADIUS = 60;

// 获取窗口大小（固定为展开后的大小）
function getWindowSize() {
  const size = get('ballSize');
  return size + HOVER_PADDING * 2 + EXPAND_RADIUS * 2;
}

// 强制重绘悬浮球窗口，解决白色条问题
function refreshBallWindow() {
  if (ballWin && !ballWin.isDestroyed()) {
    ballWin.setBackgroundColor('#00000000');
    ballWin.hide();
    ballWin.show();
  }
}

// 获取主球中心位置（从 ballPosition 获取的是主球中心位置）
function getBallCenterPosition() {
  const pos = get('ballPosition');
  if (!pos || typeof pos.x !== 'number' || typeof pos.y !== 'number') {
    return { x: 1200, y: 300 };
  }
  return { x: Math.round(pos.x), y: Math.round(pos.y) };
}

function createFloatingBall() {
  const centerPos = getBallCenterPosition();
  const windowSize = getWindowSize();

  // 窗口位置：让主球在窗口中心
  const windowX = Math.round(centerPos.x - windowSize / 2);
  const windowY = Math.round(centerPos.y - windowSize / 2);

  ballWin = new BrowserWindow({
    width: Math.round(windowSize),
    height: Math.round(windowSize),
    x: windowX,
    y: windowY,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    focusable: false,
    title: '',
    webPreferences: {
      preload: path.join(__dirname, '../preload/ballPreload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false
    }
  });

  ballWin.setBackgroundColor('#00000000');
  ballWin.setAlwaysOnTop(true, 'screen-saver', 1);
  ballWin.setTitle('');

  const htmlPath = path.join(__dirname, '../renderer/floating-ball/index.html');
  ballWin.loadFile(htmlPath);

  // 清除标题防止Windows渲染器显示
  const clearTitle = () => {
    if (ballWin && !ballWin.isDestroyed()) ballWin.setTitle('');
  };

  clearTitle();
  setTimeout(clearTitle, 50);
  setTimeout(clearTitle, 150);
  setTimeout(clearTitle, 300);
  setTimeout(clearTitle, 600);

  ballWin.on('show', clearTitle);
  ballWin.on('focus', clearTitle);

  // 焦点变化时强制重绘，防止白色条
  ballWin.on('blur', () => {
    setTimeout(refreshBallWindow, 50);
  });

  ballWin.show();

  // 拖拽时保存主球中心位置
  ballWin.on('move', () => {
    clearTimeout(moveTimer);
    moveTimer = setTimeout(() => {
      if (ballWin && !ballWin.isDestroyed()) {
        const bounds = ballWin.getBounds();
        const centerX = bounds.x + bounds.width / 2;
        const centerY = bounds.y + bounds.height / 2;
        set('ballPosition', { x: centerX, y: centerY });
      }
    }, 300);
  });

  ballWin.on('closed', () => {
    ballWin = null;
    if (mouseCheckTimer) {
      clearInterval(mouseCheckTimer);
      mouseCheckTimer = null;
    }
  });

  // 鼠标穿透检测：检测主球和小球圆形范围
  mouseCheckTimer = setInterval(() => {
    if (!ballWin || ballWin.isDestroyed()) return;

    const cursorPos = screen.getCursorScreenPoint();
    const bounds = ballWin.getBounds();
    const ballSize = get('ballSize');

    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;

    const dx = cursorPos.x - centerX;
    const dy = cursorPos.y - centerY;

    // 主球半径
    const mainRadius = (ballSize + HOVER_PADDING) / 2;
    let shouldCapture = dx * dx + dy * dy <= mainRadius * mainRadius;

    // 小球半径和位置（始终检测，因为 CSS 控制可见性）
    const miniRadius = ballSize * 0.65 / 2;
    const miniPositions = [
      { x: 0, y: -50 },
      { x: -35, y: -35 },
      { x: -50, y: 0 }
    ];
    miniPositions.forEach(pos => {
      const miniDx = dx - pos.x;
      const miniDy = dy - pos.y;
      if (miniDx * miniDx + miniDy * miniDy <= miniRadius * miniRadius) {
        shouldCapture = true;
      }
    });

    ballWin.setIgnoreMouseEvents(!shouldCapture, { forward: true });
  }, 50);

  return ballWin;
}

function getBallWindow() {
  return ballWin;
}

function updateBallSize(size) {
  if (ballWin && !ballWin.isDestroyed()) {
    const centerPos = getBallCenterPosition();
    const windowSize = getWindowSize();

    ballWin.setSize(Math.round(windowSize), Math.round(windowSize));
    ballWin.setPosition(
      Math.round(centerPos.x - windowSize / 2),
      Math.round(centerPos.y - windowSize / 2)
    );
  }
}

module.exports = {
  createFloatingBall,
  getBallWindow,
  updateBallSize,
  refreshBallWindow
};