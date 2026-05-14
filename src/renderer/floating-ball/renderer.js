const ballContainer = document.getElementById('ball-container');
const ball = document.getElementById('ball');
const ballIcon = document.getElementById('ball-icon');
const miniBalls = document.querySelectorAll('.mini-ball');

// 加载所有 AI 图标
const allAIIcons = window.deepseekAPI.getAllAIIcons();

// 根据当前 AI 更新主球和副球图标
async function updateBallIcons() {
  const currentAI = await window.deepseekAPI.getConfig('currentAI') || 'deepseek';
  const otherAIs = await window.deepseekAPI.getOtherAIs(currentAI);

  // 更新主球图标
  ballIcon.src = allAIIcons[currentAI];

  // 更新副球图标（排除当前默认模型）
  miniBalls.forEach((miniBall, index) => {
    const aiKey = otherAIs[index];
    const iconEl = miniBall.querySelector('.mini-icon');
    const labelEl = miniBall.querySelector('.mini-label');

    if (iconEl && allAIIcons[aiKey]) {
      iconEl.src = allAIIcons[aiKey];
      miniBall.dataset.ai = aiKey;

      if (labelEl) {
        const labels = { deepseek: 'DS', gpt: 'GPT', gemini: 'GE', glm: 'GLM' };
        labelEl.textContent = labels[aiKey] || aiKey.toUpperCase().slice(0, 2);
      }
    }
  });
}

// 初始化图标
updateBallIcons();

let dragging = false;
let startScreenX = 0;
let startScreenY = 0;
let startTime = 0;
let hasMoved = false;
let expandTimer = null;
let collapseTimer = null;
let isExpanded = false;

async function applyConfig(config) {
  const size = config?.ballSize ?? (await window.deepseekAPI.getConfig('ballSize'));
  const opacity = config?.ballOpacity ?? (await window.deepseekAPI.getConfig('ballOpacity'));
  const color = config?.ballColor ?? (await window.deepseekAPI.getConfig('ballColor'));
  const currentAI = config?.currentAI ?? (await window.deepseekAPI.getConfig('currentAI'));

  // 设置球的实际大小（用户配置值）
  ball.style.width = size + 'px';
  ball.style.height = size + 'px';
  ball.style.borderColor = color;
  ball.style.opacity = opacity;

  // 设置小球大小（主球的 65%）
  const miniSize = Math.round(size * 0.65);
  miniBalls.forEach(miniBall => {
    miniBall.style.width = miniSize + 'px';
    miniBall.style.height = miniSize + 'px';
  });

  // 配置变化时更新图标
  if (currentAI) {
    updateBallIcons();
  }
}

// 展开小球（根据屏幕位置智能选择方向）
async function expandBalls() {
  clearTimeout(collapseTimer);
  if (!isExpanded) {
    // 获取展开方向
    const direction = await window.deepseekAPI.getExpandDirection();
    // 移除旧方向类，添加新方向类
    ballContainer.classList.remove('expand-top-left', 'expand-top-right', 'expand-bottom-left', 'expand-bottom-right');
    ballContainer.classList.add('expanded', `expand-${direction}`);
    isExpanded = true;
  }
}

// 收缩小球（纯 CSS 控制）
function collapseBalls() {
  collapseTimer = setTimeout(() => {
    if (!isMouseOnAnyBall()) {
      ballContainer.classList.remove('expanded');
      isExpanded = false;
    }
  }, 300);
}

// 检查鼠标是否在主球或小球上
function isMouseOnAnyBall() {
  const hoveredBall = ball.matches(':hover');
  const hoveredMini = Array.from(miniBalls).some(mb => mb.matches(':hover'));
  return hoveredBall || hoveredMini;
}

// hover 展开逻辑：主球
ball.addEventListener('mouseenter', () => {
  if (dragging) return;
  clearTimeout(expandTimer);
  expandTimer = setTimeout(expandBalls, 200);
});

ball.addEventListener('mouseleave', () => {
  clearTimeout(expandTimer);
  collapseBalls();
});

// 小球鼠标事件
miniBalls.forEach(miniBall => {
  miniBall.addEventListener('mouseenter', () => {
    clearTimeout(expandTimer);
    clearTimeout(collapseTimer);
    expandBalls();
  });

  miniBall.addEventListener('mouseleave', () => {
    collapseBalls();
  });

  // 小球点击：直接打开对应 AI
  miniBall.addEventListener('click', (e) => {
    e.stopPropagation();
    const aiKey = miniBall.dataset.ai;
    window.deepseekAPI.openChatWindowForAI(aiKey);
    ballContainer.classList.remove('expanded');
    isExpanded = false;
  });
});

ball.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  dragging = true;
  hasMoved = false;
  startScreenX = e.screenX;
  startScreenY = e.screenY;
  startTime = Date.now();
  // 拖拽时收缩小球
  ballContainer.classList.remove('expanded');
  isExpanded = false;
  clearTimeout(expandTimer);
  clearTimeout(collapseTimer);
});

document.addEventListener('mousemove', (e) => {
  if (!dragging) return;

  const dx = e.screenX - startScreenX;
  const dy = e.screenY - startScreenY;

  if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
    hasMoved = true;
    window.deepseekAPI.moveWindow(dx, dy);
    startScreenX = e.screenX;
    startScreenY = e.screenY;
  }
});

document.addEventListener('mouseup', () => {
  if (!dragging) return;

  const elapsed = Date.now() - startTime;

  if (!hasMoved && elapsed < 400) {
    // 点击主球：打开默认 AI
    window.deepseekAPI.openChatWindow();
  }

  if (hasMoved) {
    // 保存主球中心位置（窗口中心）
    // 注意：此时窗口应该处于收缩状态，所以窗口中心就是主球中心
    window.deepseekAPI.savePosition(window.screenX, window.screenY);
  }

  dragging = false;
  hasMoved = false;
});

ball.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  ballContainer.classList.remove('expanded');
  isExpanded = false;
  clearTimeout(expandTimer);
  clearTimeout(collapseTimer);
  window.deepseekAPI.showContextMenu();
});

window.deepseekAPI.onConfigChanged((newConfig) => {
  applyConfig(newConfig);
});

// 监听刷新动画事件：触发缩放动画
window.deepseekAPI.onRefreshAnimation(() => {
  ball.classList.add('refresh-pulse');
  setTimeout(() => {
    ball.classList.remove('refresh-pulse');
  }, 200);
});

applyConfig();