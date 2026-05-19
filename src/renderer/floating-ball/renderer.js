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
let startWinX = 0;
let startWinY = 0;
let startTime = 0;
let hasMoved = false;
let expandTimer = null;
let collapseTimer = null;
let isExpanded = false;

// 监听主进程返回的窗口初始位置
window.deepseekAPI.onWindowStartPosition((pos) => {
  if (dragging) {
    startWinX = pos.x;
    startWinY = pos.y;
  }
});

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

  // 动态计算副球展开位置：间距比例 1.1（44px/40px）
  const spacing = size * 1.1;
  const pos1 = Math.round(spacing * 1.14);  // 垂直/水平方向
  const pos2 = Math.round(spacing * 0.8);   // 斜向
  // 设置 CSS 变量供 styles.css 使用
  ballContainer.style.setProperty('--mini-pos-1', pos1 + 'px');
  ballContainer.style.setProperty('--mini-pos-2', pos2 + 'px');

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
    // 触发跳动动画
    miniBall.classList.add('mini-hover');
    setTimeout(() => miniBall.classList.remove('mini-hover'), 200);
  });

  miniBall.addEventListener('mouseleave', () => {
    collapseBalls();
    miniBall.classList.remove('mini-hover');
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

  // 使用 screenX/Y 获取屏幕绝对坐标
  startScreenX = e.screenX;
  startScreenY = e.screenY;

  startTime = Date.now();

  // 向主进程请求窗口初始位置
  window.deepseekAPI.dragStart();

  // 拖拽时收缩小球
  ballContainer.classList.remove('expanded');
  isExpanded = false;
  clearTimeout(expandTimer);
  clearTimeout(collapseTimer);
});

document.addEventListener('mousemove', (e) => {
  if (!dragging) return;

  // 计算鼠标偏移量
  const deltaX = e.screenX - startScreenX;
  const deltaY = e.screenY - startScreenY;

  if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
    hasMoved = true;

    // 计算新窗口位置
    const newX = startWinX + deltaX;
    const newY = startWinY + deltaY;

    // 使用 requestAnimationFrame 同步视觉更新
    requestAnimationFrame(() => {
      window.deepseekAPI.moveWindow(newX, newY);
    });
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
    // 通知主进程拖动结束
    window.deepseekAPI.dragEnd();
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