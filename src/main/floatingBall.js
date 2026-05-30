const { BrowserWindow, screen } = require('electron');
const path = require('path');
const { get, set } = require('./config');
const { log } = require('./logger');

let ballWin = null;
let moveTimer = null;
let mouseCheckTimer = null;
let topCheckTimer = null; // 置顶状态检测定时器

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
    // 首次启动：智能定位到主显示器右侧居中
    const primaryDisplay = screen.getPrimaryDisplay();
    const wa = primaryDisplay.workArea;
    return {
      x: Math.round(wa.x + wa.width * 0.85),
      y: Math.round(wa.y + wa.height / 2)
    };
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
    alwaysOnTop: false, // 初始不置顶，根据配置动态设置
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
    log('INFO', '悬浮球创建，置顶已启用', { level: 'screen-saver', relativeLevel: 1 });
  } else {
    ballWin.setAlwaysOnTop(false);
    log('INFO', '悬浮球创建，置顶已禁用');
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
    log('DEBUG', '悬浮球失去焦点', { isAlwaysOnTop: ballWin.isAlwaysOnTop() });
    setTimeout(() => refreshBallWindow(), 50);
    // 失焦后强制重新设置置顶（解决某些窗口抢占置顶的问题）
    const configOnTop = get('ballAlwaysOnTop') !== false;
    if (configOnTop && ballWin && !ballWin.isDestroyed()) {
      ballWin.setAlwaysOnTop(true, 'screen-saver', 1);
    }
  });

  ballWin.on('focus', () => {
    log('DEBUG', '悬浮球获得焦点', { isAlwaysOnTop: ballWin.isAlwaysOnTop() });
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
    if (topCheckTimer) {
      clearInterval(topCheckTimer);
      topCheckTimer = null;
    }
  });

  // 定时检测置顶状态（每3秒），确保悬浮球始终在最上层
  topCheckTimer = setInterval(() => {
    if (!ballWin || ballWin.isDestroyed()) return;

    const configOnTop = get('ballAlwaysOnTop') !== false;
    const actualOnTop = ballWin.isAlwaysOnTop();

    // 如果配置要求置顶但实际未置顶，强制重新设置
    if (configOnTop && !actualOnTop) {
      log('WARN', '置顶状态丢失，正在修复', { expected: configOnTop, actual: actualOnTop });
      ballWin.setAlwaysOnTop(true, 'screen-saver', 1);
    }
  }, 3000);

  // 鼠标穿透检测：检测主球和小球圆形范围
  // 智能轮询：远离时 200ms，靠近时 50ms，降低 CPU 占用
  let mouseNearBall = false;
  const NEAR_DISTANCE = 200; // 靠近判定距离（px）

  function checkMousePosition() {
    if (!ballWin || ballWin.isDestroyed()) return;

    const cursorPos = screen.getCursorScreenPoint();
    const bounds = ballWin.getBounds();
    const ballSize = get('ballSize');

    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;

    const dx = cursorPos.x - centerX;
    const dy = cursorPos.y - centerY;
    const distSq = dx * dx + dy * dy;

    // 切换轮询频率
    const nowNear = distSq < NEAR_DISTANCE * NEAR_DISTANCE;
    if (nowNear !== mouseNearBall) {
      mouseNearBall = nowNear;
      clearInterval(mouseCheckTimer);
      mouseCheckTimer = setInterval(checkMousePosition, nowNear ? 50 : 200);
    }

    // 远离时只确保穿透，不做详细碰撞检测
    if (!nowNear) {
      ballWin.setIgnoreMouseEvents(true, { forward: true });
      return;
    }

    // 主球半径
    const mainRadius = (ballSize + HOVER_PADDING) / 2;
    let shouldCapture = distSq <= mainRadius * mainRadius;

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
  }

  mouseCheckTimer = setInterval(checkMousePosition, 200);

  return ballWin;
}

function getBallWindow() {
  return ballWin;
}

function updateBallSize(size) {
  // 窗口大小固定不变，ballSize 只影响 CSS 渲染
  // 此函数不再触发刷新，避免不必要的动画和白条
}

// 更新悬浮球置顶状态
function updateAlwaysOnTop(enabled) {
  if (!ballWin || ballWin.isDestroyed()) return;

  if (enabled) {
    ballWin.setAlwaysOnTop(true, 'screen-saver', 1);
    log('INFO', '悬浮球置顶已启用');
  } else {
    ballWin.setAlwaysOnTop(false, 'normal');
    log('INFO', '悬浮球置顶已禁用');
    // 取消置顶后，让窗口降到普通层级，可能被其他窗口覆盖
    ballWin.moveTop(); // 先移到同级最上，然后自然被其他窗口覆盖
  }
}

module.exports = {
  createFloatingBall,
  getBallWindow,
  updateBallSize,
  refreshBallWindow,
  updateAlwaysOnTop
};