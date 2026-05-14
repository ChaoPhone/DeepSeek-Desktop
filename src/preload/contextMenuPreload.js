const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('contextMenuAPI', {
  onMenuData: (callback) => {
    ipcRenderer.on('context-menu:data', (event, data) => callback(data));
  },
  close: () => ipcRenderer.send('context-menu:close'),
  clickAI: (aiKey) => ipcRenderer.send('context-menu:click-ai', aiKey),
  clickCheckbox: (key, checked) => ipcRenderer.send('context-menu:click-checkbox', key, checked),
  clickAction: (action) => ipcRenderer.send('context-menu:click-action', action)
});