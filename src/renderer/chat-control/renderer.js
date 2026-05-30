const pinBtn = document.getElementById('pin-btn');
const pinIconUnpinned = document.getElementById('pin-icon-unpinned');
const pinIconPinned = document.getElementById('pin-icon-pinned');
const navGroup = document.getElementById('nav-group');
const menuBtn = document.getElementById('menu-btn');
const navBack = document.getElementById('nav-back');
const navForward = document.getElementById('nav-forward');
const navRefresh = document.getElementById('nav-refresh');
const minimizeBtn = document.getElementById('minimize-btn');
const maximizeBtn = document.getElementById('maximize-btn');
const maximizeIcon = document.getElementById('maximize-icon');
const restoreIcon = document.getElementById('restore-icon');
const closeBtn = document.getElementById('close-btn');
const titleEl = document.getElementById('title');
const dragZone = document.getElementById('drag-zone');
const loadingBar = document.getElementById('loading-bar');
const errorOverlay = document.getElementById('error-overlay');
const errorText = document.getElementById('error-text');
const retryBtn = document.getElementById('retry-btn');

// === 标题 ===
window.chatAPI.onTitleUpdate((title) => {
  if (titleEl && title) {
    titleEl.textContent = title;
  }
});

// === 品牌色 ===
window.chatAPI.onBrandColorUpdate((color) => {
  if (dragZone && color) {
    dragZone.style.background = `linear-gradient(180deg, ${color}E6 0%, ${color}4D 100%)`;
  }
});

// === Pin ===
function updatePinIcon(pinned) {
  pinIconUnpinned.style.display = pinned ? 'none' : 'block';
  pinIconPinned.style.display = pinned ? 'block' : 'none';
  pinBtn.classList.toggle('pinned', pinned);
  pinBtn.title = pinned ? '取消置顶' : '置顶窗口';
}

pinBtn.addEventListener('click', async () => {
  updatePinIcon(await window.chatAPI.togglePin());
});
window.chatAPI.isPinned().then(updatePinIcon);

// === 最大化 ===
function updateMaximizeIcon(maximized) {
  maximizeIcon.style.display = maximized ? 'none' : 'block';
  restoreIcon.style.display = maximized ? 'block' : 'none';
  maximizeBtn.title = maximized ? '还原' : '最大化';
}

window.chatAPI.onMaximizeUpdate(updateMaximizeIcon);
window.chatAPI.isMaximized().then(updateMaximizeIcon);

maximizeBtn.addEventListener('click', async () => {
  updateMaximizeIcon(await window.chatAPI.toggleMaximize());
});

// === 导航小球：hover 展开/收起（仅全屏时） ===
let expandTimer = null;
let collapseTimer = null;

function expandNav() {
  clearTimeout(collapseTimer);
  clearTimeout(expandTimer);
  expandTimer = setTimeout(() => {
    navGroup.classList.add('expanded');
  }, 80);
}

function collapseNav() {
  clearTimeout(expandTimer);
  collapseTimer = setTimeout(() => {
    navGroup.classList.remove('expanded');
  }, 150);
}

// 整个导航区域统一管理展开/收起
navGroup.addEventListener('mouseenter', expandNav);
navGroup.addEventListener('mouseleave', collapseNav);

// 小球点击事件
navBack.addEventListener('click', () => window.chatAPI.goBack());
navForward.addEventListener('click', () => window.chatAPI.goForward());
navRefresh.addEventListener('click', () => {
  errorOverlay.style.display = 'none';
  window.chatAPI.reload();
});

// === 加载状态 ===
window.chatAPI.onLoadingStart(() => {
  errorOverlay.style.display = 'none';
  loadingBar.classList.remove('done');
  loadingBar.classList.add('active');
});

window.chatAPI.onLoadingEnd(() => {
  loadingBar.classList.remove('active');
  loadingBar.classList.add('done');
  setTimeout(() => loadingBar.classList.remove('done'), 500);
});

window.chatAPI.onLoadFailed((info) => {
  loadingBar.classList.remove('active', 'done');
  errorOverlay.style.display = 'flex';
  const msg = info.errorDescription || '页面加载失败';
  errorText.textContent = msg.length > 24 ? msg.slice(0, 24) + '...' : msg;
});

retryBtn.addEventListener('click', () => {
  errorOverlay.style.display = 'none';
  window.chatAPI.reload();
});

// === 最小化 / 关闭 ===
minimizeBtn.addEventListener('click', () => window.chatAPI.minimize());
closeBtn.addEventListener('click', () => window.close());

document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'w') window.close();
});
