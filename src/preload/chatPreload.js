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
  close: () => ipcRenderer.invoke('window:close'),
  toggleDevTools: () => ipcRenderer.invoke('window:toggle-devtools'),
  showWebSettings: () => ipcRenderer.send('window:show-web-settings'),
  reload: () => ipcRenderer.invoke('window:reload'),
  goBack: () => ipcRenderer.invoke('window:go-back'),
  goForward: () => ipcRenderer.invoke('window:go-forward'),
  showNavMenu: () => ipcRenderer.send('window:show-nav-menu'),
  onTitleUpdate: (callback) => {
    ipcRenderer.on('title:update', (event, title) => callback(title));
  },
  onBrandColorUpdate: (callback) => {
    ipcRenderer.on('brand-color:update', (event, color) => callback(color));
  },
  onMaximizeUpdate: (callback) => {
    ipcRenderer.on('maximize:update', (event, isMaximized) => callback(isMaximized));
  },
  onLoadFailed: (callback) => {
    ipcRenderer.on('load:failed', (event, info) => callback(info));
  },
  onLoadingStart: (callback) => {
    ipcRenderer.on('loading:start', () => callback());
  },
  onLoadingEnd: (callback) => {
    ipcRenderer.on('loading:end', () => callback());
  }
});
