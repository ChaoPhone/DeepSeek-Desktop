const pinBtn = document.getElementById('pin-btn');
const pinIconUnpinned = document.getElementById('pin-icon-unpinned');
const pinIconPinned = document.getElementById('pin-icon-pinned');
const minimizeBtn = document.getElementById('minimize-btn');
const maximizeBtn = document.getElementById('maximize-btn');
const closeBtn = document.getElementById('close-btn');
const titleEl = document.getElementById('title');
const dragZone = document.getElementById('drag-zone');

// 监听网页title更新
window.chatAPI.onTitleUpdate((title) => {
  if (titleEl && title) {
    // 截断过长的title
    titleEl.textContent = title.length > 30 ? title.slice(0, 30) + '...' : title;
  }
});

// 监听品牌色更新（刘海区域）
window.chatAPI.onBrandColorUpdate((color) => {
  if (dragZone && color) {
    // 使用品牌色作为刘海渐变背景
    dragZone.style.background = `linear-gradient(180deg, ${color}E6 0%, ${color}4D 100%)`;
  }
});

// 更新置顶图标状态
function updatePinIcon(isPinned) {
  pinIconUnpinned.style.display = isPinned ? 'none' : 'block';
  pinIconPinned.style.display = isPinned ? 'block' : 'none';
  pinBtn.classList.toggle('pinned', isPinned);
  pinBtn.title = isPinned ? '取消置顶' : '置顶窗口';
}

// 置顶按钮
pinBtn.addEventListener('click', async () => {
  const isPinned = await window.chatAPI.togglePin();
  updatePinIcon(isPinned);
});

// 初始化置顶状态
window.chatAPI.isPinned().then(pinned => {
  updatePinIcon(pinned);
});

// 最小化按钮
minimizeBtn.addEventListener('click', () => {
  window.chatAPI.minimize();
});

// 最大化按钮
maximizeBtn.addEventListener('click', async () => {
  const isMaximized = await window.chatAPI.toggleMaximize();
  maximizeBtn.title = isMaximized ? '还原' : '最大化';
});

// 关闭按钮
closeBtn.addEventListener('click', () => {
  window.close();
});

// Ctrl+W 关闭
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'w') {
    window.close();
  }
});