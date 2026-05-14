const { BrowserWindow, screen } = require('electron');
const path = require('path');
const { get, set } = require('./config');

let ballWin = null;
let moveTimer = null;
let mouseCheckTimer = null;

// 常量：窗口始终使用展开后的大小（固定不变，避免位移）
const HOVER_PADDING = 8;
const MAX_BALL_SIZE = 80; // 窗口大小基于最大球尺寸计算
const SPACING_RATIO = 1.1; // 副球间距比例（44px/40px）

// 获取窗口大小（固定为最大展开后的大小）
function getWindowSize() {
  // 最大间距 = MAX_BALL_SIZE * SPACING_RATIO = 88px
  // 最大副球大小 = MAX_BALL_SIZE * 0.65 = 52px
  // 窗口 = MAX_BALL_SIZE + HOVER_PADDING*2 + 最大间距*2 + 副球大小*2
  const maxSpacing = MAX_BALL_SIZE * SPACING_RATIO;
  const maxMiniSize = MAX_BALL_SIZE * 0.65;
  return MAX_BALL_SIZE + HOVER_PADDING * 2 + maxSpacing * 2 + maxMiniSize;
}

// 强制重绘悬浮球窗口，解决白色条问题
function refreshBallWindow() {
  if (!ballWin || ballWin.isDestroyed()) return;

  // 用最稳定的 hide/show 方法解决白条
  ballWin.setBackgroundColor('#00000000');
  ballWin.hide();
  ballWin.show();
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

  // 获取主显示器的工作区域，确保窗口在可见范围内
  const primaryDisplay = screen.getPrimaryDisplay();
  const workArea = primaryDisplay.workArea;

  // 确保中心位置在工作区域内（留出窗口一半的边距）
  const margin = windowSize / 2 + 10;
  let x = Math.max(workArea.x + margin, Math.min(workArea.x + workArea.width - margin, centerPos.x));
  let y = Math.max(workArea.y + margin, Math.min(workArea.y + workArea.height - margin, centerPos.y));

  // 窗口位置：让主球在窗口中心
  const windowX = Math.round(x - windowSize / 2);
  const windowY = Math.round(y - windowSize / 2);

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
  // 根据配置设置置顶状态
  const alwaysOnTop = get('ballAlwaysOnTop') !== false;
  if (alwaysOnTop) {
    ballWin.setAlwaysOnTop(true, 'screen-saver', 1);
  } else {
    ballWin.setAlwaysOnTop(false);
  }
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

  // 焦点变化时刷新，解决其他窗口覆盖后的白条问题
  ballWin.on('blur', () => {
    setTimeout(() => refreshBallWindow(), 50);
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

    // 小球半径和位置（根据屏幕位置动态选择方向）
    const miniRadius = ballSize * 0.65 / 2;
    const display = screen.getDisplayNearestPoint({ x: centerX, y: centerY });
    const wa = display.workArea;

    // 判断展开方向
    const preferLeft = centerX - wa.x > wa.x + wa.width - centerX;
    const preferTop = centerY - wa.y > wa.y + wa.height - centerY;

    // 动态计算副球位置：间距 = ballSize * 1.1
    const spacing = ballSize * SPACING_RATIO;
    const pos1 = spacing * 1.14;  // 垂直/水平方向
    const pos2 = spacing * 0.8;   // 斜向

    // 四个方向的小球位置
    const miniPositionsByDirection = {
      'top-left': [{ x: 0, y: -pos1 }, { x: -pos2, y: -pos2 }, { x: -pos1, y: 0 }],
      'top-right': [{ x: 0, y: -pos1 }, { x: pos2, y: -pos2 }, { x: pos1, y: 0 }],
      'bottom-left': [{ x: 0, y: pos1 }, { x: -pos2, y: pos2 }, { x: -pos1, y: 0 }],
      'bottom-right': [{ x: 0, y: pos1 }, { x: pos2, y: pos2 }, { x: pos1, y: 0 }]
    };

    const direction = (preferTop ? 'top' : 'bottom') + '-' + (preferLeft ? 'left' : 'right');
    const miniPositions = miniPositionsByDirection[direction];

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
  // 窗口大小固定不变，ballSize 只影响 CSS 渲染
  // 此函数不再触发刷新，避免不必要的动画和白条
}

module.exports = {
  createFloatingBall,
  getBallWindow,
  updateBallSize,
  refreshBallWindow
};