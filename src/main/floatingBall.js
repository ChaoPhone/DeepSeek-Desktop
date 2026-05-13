const { BrowserWindow, screen } = require('electron');
const path = require('path');
const { get, set } = require('./config');

let ballWin = null;
let moveTimer = null;
let mouseCheckTimer = null;

// 强制重绘悬浮球窗口，解决白色条问题
function refreshBallWindow() {
  if (ballWin && !ballWin.isDestroyed()) {
    ballWin.setBackgroundColor('#00000000');
    // 通过隐藏+显示触发GPU重绘
    ballWin.hide();
    ballWin.show();
  }
}

function createFloatingBall() {
  const size = get('ballSize');
  const pos = get('ballPosition');
  const hoverPadding = 8; // 为 hover 放大预留的空间

  const display = screen.getDisplayNearestPoint(pos);
  const wa = display.workArea;
  const windowSize = size + hoverPadding * 2;
  const px = Math.max(wa.x, Math.min(wa.x + wa.width - windowSize, pos.x));
  const py = Math.max(wa.y, Math.min(wa.y + wa.height - windowSize, pos.y));

  ballWin = new BrowserWindow({
    width: windowSize,
    height: windowSize,
    x: px,
    y: py,
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

  ballWin.on('move', () => {
    clearTimeout(moveTimer);
    moveTimer = setTimeout(() => {
      if (ballWin && !ballWin.isDestroyed()) {
        const [nx, ny] = ballWin.getPosition();
        set('ballPosition', { x: nx, y: ny });
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

  // 定期检查鼠标是否在圆形区域内，动态切换鼠标事件穿透
  // Windows 上 setIgnoreMouseEvents 的 forward 选项不生效，需要手动检测
  mouseCheckTimer = setInterval(() => {
    if (!ballWin || ballWin.isDestroyed()) return;

    const cursorPos = screen.getCursorScreenPoint();
    const bounds = ballWin.getBounds();
    const size = bounds.width;

    // 计算鼠标相对于窗口中心的距离
    const centerX = bounds.x + size / 2;
    const centerY = bounds.y + size / 2;
    const dx = cursorPos.x - centerX;
    const dy = cursorPos.y - centerY;

    // 判断是否在圆形区域内（考虑边框）
    const radius = size / 2;
    const isInCircle = dx * dx + dy * dy <= radius * radius;

    // 动态切换 ignoreMouseEvents
    ballWin.setIgnoreMouseEvents(!isInCircle, { forward: true });
  }, 50);  // 50ms 检测间隔

  return ballWin;
}

function getBallWindow() {
  return ballWin;
}

function updateBallSize(size) {
  if (ballWin && !ballWin.isDestroyed()) {
    const hoverPadding = 8;
    ballWin.setSize(size + hoverPadding * 2, size + hoverPadding * 2);
  }
}

module.exports = { createFloatingBall, getBallWindow, updateBallSize, refreshBallWindow };
