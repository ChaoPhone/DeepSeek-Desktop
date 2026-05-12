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
  isPinned: () => ipcRenderer.invoke('window:is-pinned')
});
