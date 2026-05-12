const pinBtn = document.getElementById('pin-btn');
const closeBtn = document.getElementById('close-btn');
const titleEl = document.getElementById('title');

// 监听网页title更新
window.chatAPI.onTitleUpdate((title) => {
  if (titleEl && title) {
    // 截断过长的title
    titleEl.textContent = title.length > 30 ? title.slice(0, 30) + '...' : title;
  }
});

// 置顶按钮
pinBtn.addEventListener('click', async () => {
  const isPinned = await window.chatAPI.togglePin();
  pinBtn.classList.toggle('pinned', isPinned);
  pinBtn.title = isPinned ? 'Unpin' : 'Pin';
});

// 初始化置顶状态
window.chatAPI.isPinned().then(pinned => {
  if (pinned) {
    pinBtn.classList.add('pinned');
    pinBtn.title = 'Unpin';
  }
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