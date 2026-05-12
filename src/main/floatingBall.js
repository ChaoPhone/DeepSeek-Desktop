const { BrowserWindow, screen } = require('electron');
const path = require('path');
const { get, set } = require('./config');

let ballWin = null;
let moveTimer = null;

function createFloatingBall() {
  const size = get('ballSize');
  const pos = get('ballPosition');

  const display = screen.getDisplayNearestPoint(pos);
  const wa = display.workArea;
  const px = Math.max(wa.x, Math.min(wa.x + wa.width - size, pos.x));
  const py = Math.max(wa.y, Math.min(wa.y + wa.height - size, pos.y));

  ballWin = new BrowserWindow({
    width: size,
    height: size,
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

  // Aggressively clear title to prevent Windows compositor from rendering it
  const clearTitle = () => {
    if (ballWin && !ballWin.isDestroyed()) ballWin.setTitle('');
  };

  // Fire multiple times during initial render to catch all compositor frames
  clearTitle();
  setTimeout(clearTitle, 50);
  setTimeout(clearTitle, 150);
  setTimeout(clearTitle, 300);
  setTimeout(clearTitle, 600);

  ballWin.on('show', clearTitle);
  ballWin.on('focus', clearTitle);

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
  });

  return ballWin;
}

function getBallWindow() {
  return ballWin;
}

function updateBallSize(size) {
  if (ballWin && !ballWin.isDestroyed()) {
    ballWin.setSize(size, size);
  }
}

module.exports = { createFloatingBall, getBallWindow, updateBallSize };
