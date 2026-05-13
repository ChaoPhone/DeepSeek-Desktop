const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');
const fs = require('fs');

// 获取图标 base64（兼容开发和打包环境）
function getIconBase64() {
  const iconPath = path.join(__dirname, '../../assets/icon.png');
  try {
    const data = fs.readFileSync(iconPath);
    return 'data:image/png;base64,' + data.toString('base64');
  } catch (e) {
    // fallback: 空
    return '';
  }
}

const iconBase64 = getIconBase64();

contextBridge.exposeInMainWorld('deepseekAPI', {
  getIconBase64: () => iconBase64,
  openChatWindow: () => ipcRenderer.invoke('ball:click'),

  moveWindow: (dx, dy) => ipcRenderer.send('ball:move-window', { dx, dy }),

  savePosition: (x, y) => ipcRenderer.send('ball:drag-end', { x, y }),

  showContextMenu: () => ipcRenderer.send('context-menu:open'),

  getConfig: (key) => ipcRenderer.invoke('config:get', key),
  setConfig: (key, value) => ipcRenderer.invoke('config:set', { key, value }),

  setAutoStart: (enabled) => ipcRenderer.invoke('auto-start:set', enabled),

  // 切换鼠标事件穿透
  setIgnoreMouseEvents: (ignore) => ipcRenderer.send('ball:set-ignore-mouse-events', ignore),

  onConfigChanged: (callback) => {
    ipcRenderer.on('config:changed', (event, newConfig) => callback(newConfig));
  }
});