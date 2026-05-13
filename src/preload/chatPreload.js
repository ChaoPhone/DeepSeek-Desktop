const { contextBridge, ipcRenderer } = require('electron');

document.addEventListener('wheel', (event) => {
  if (event.ctrlKey) {
    event.preventDefault();
    event.stopPropagation();
    const direction = event.deltaY < 0 ? 'in' : 'out';
    ipcRenderer.send('window:zoom-request', direction);
  }
}, { passive: false, capture: true });

contextBridge.exposeInMainWorld('chatAPI', {
  getZoomFactor: () => ipcRenderer.invoke('window:get-zoom'),
  setZoomFactor: (factor) => ipcRenderer.invoke('window:set-zoom', factor),
  togglePin: () => ipcRenderer.invoke('window:toggle-pin'),
  isPinned: () => ipcRenderer.invoke('window:is-pinned'),
  minimize: () => ipcRenderer.invoke('window:minimize'),
  toggleMaximize: () => ipcRenderer.invoke('window:toggle-maximize'),
  isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
  onTitleUpdate: (callback) => {
    ipcRenderer.on('title:update', (event, title) => callback(title));
  },
  onBrandColorUpdate: (callback) => {
    ipcRenderer.on('brand-color:update', (event, color) => callback(color));
  },
  onMaximizeUpdate: (callback) => {
    ipcRenderer.on('maximize:update', (event, isMaximized) => callback(isMaximized));
  }
});
