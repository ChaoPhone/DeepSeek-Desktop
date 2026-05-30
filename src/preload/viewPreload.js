// BrowserView 预加载脚本：拦截 Ctrl+滚轮实现缩放
const { ipcRenderer } = require('electron');

document.addEventListener('wheel', (event) => {
  if (event.ctrlKey) {
    event.preventDefault();
    event.stopPropagation();
    const direction = event.deltaY < 0 ? 'in' : 'out';
    ipcRenderer.send('view:zoom-request', direction);
  }
}, { passive: false, capture: true });
