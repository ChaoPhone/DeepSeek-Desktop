const ball = document.getElementById('ball');
const ballIcon = document.getElementById('ball-icon');

// 动态设置图标（兼容开发和打包环境）
ballIcon.src = window.deepseekAPI.getIconBase64();

let dragging = false;
let startScreenX = 0;
let startScreenY = 0;
let startTime = 0;
let hasMoved = false;

async function applyConfig(config) {
  const size = config?.ballSize ?? (await window.deepseekAPI.getConfig('ballSize'));
  const opacity = config?.ballOpacity ?? (await window.deepseekAPI.getConfig('ballOpacity'));
  const color = config?.ballColor ?? (await window.deepseekAPI.getConfig('ballColor'));

  document.body.style.width = size + 'px';
  document.body.style.height = size + 'px';
  // 色团作为外边框
  ball.style.borderColor = color;
  ball.style.opacity = opacity;
}

function darken(hex, amount) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.floor(((num >> 16) & 0xff) * (1 - amount)));
  const g = Math.max(0, Math.floor(((num >> 8) & 0xff) * (1 - amount)));
  const b = Math.max(0, Math.floor((num & 0xff) * (1 - amount)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

ball.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  dragging = true;
  hasMoved = false;
  startScreenX = e.screenX;
  startScreenY = e.screenY;
  startTime = Date.now();
});

document.addEventListener('mousemove', (e) => {
  if (!dragging) return;

  const dx = e.screenX - startScreenX;
  const dy = e.screenY - startScreenY;

  if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
    hasMoved = true;
    // Move window relative to where mouse has gone
    window.deepseekAPI.moveWindow(dx, dy);
    startScreenX = e.screenX;
    startScreenY = e.screenY;
  }
});

document.addEventListener('mouseup', () => {
  if (!dragging) return;

  const elapsed = Date.now() - startTime;

  if (!hasMoved && elapsed < 400) {
    // It was a click
    window.deepseekAPI.openChatWindow();
  }

  if (hasMoved) {
    // Save final position after drag
    window.deepseekAPI.savePosition(window.screenX, window.screenY);
  }

  dragging = false;
  hasMoved = false;
});

ball.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  window.deepseekAPI.showContextMenu();
});

window.deepseekAPI.onConfigChanged((newConfig) => {
  applyConfig(newConfig);
});

applyConfig();
