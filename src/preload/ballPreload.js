const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');
const fs = require('fs');

// 获取图标 base64（兼容开发和打包环境）
function getIconBase64(iconName) {
  const iconPath = iconName
    ? path.join(__dirname, '../../assets/ai_figure', iconName)
    : path.join(__dirname, '../../assets/icon.png');
  try {
    const data = fs.readFileSync(iconPath);
    return 'data:image/png;base64,' + data.toString('base64');
  } catch (e) {
    return '';
  }
}

// 获取所有 AI 图标
function getAllAIIcons() {
  const icons = {
    deepseek: getIconBase64('ds.png'),
    gpt: getIconBase64('gpt.png'),
    gemini: getIconBase64('gemini.png'),
    glm: getIconBase64('glm.png')
  };
  return icons;
}

const iconBase64 = getIconBase64();
const allAIIcons = getAllAIIcons();

contextBridge.exposeInMainWorld('deepseekAPI', {
  getIconBase64: () => iconBase64,
  getAllAIIcons: () => allAIIcons,
  getAIIcon: (aiKey) => allAIIcons[aiKey] || iconBase64,
  getOtherAIs: (currentAI) => ipcRenderer.invoke('ai:get-other', currentAI),
  getExpandDirection: () => ipcRenderer.invoke('ball:get-expand-direction'),
  openChatWindow: () => ipcRenderer.invoke('ball:click'),
  openChatWindowForAI: (aiKey) => ipcRenderer.invoke('ball:click-ai', aiKey),

  moveWindow: (dx, dy) => ipcRenderer.send('ball:move-window', { dx, dy }),
  // 拖动开始：请求窗口初始位置
  dragStart: () => ipcRenderer.send('ball:drag-start'),
  // 拖动移动：传递计算好的新窗口位置
  moveWindow: (x, y) => ipcRenderer.send('ball:move-window', { x, y }),

  // 接收窗口初始位置
  onWindowStartPosition: (callback) => {
    ipcRenderer.on('window-start-position', (event, pos) => callback(pos));
  },

  savePosition: (x, y) => ipcRenderer.send('ball:drag-end', { x, y }),
  dragEnd: () => ipcRenderer.send('ball:drag-end'),

  showContextMenu: () => ipcRenderer.send('context-menu:open'),

  getConfig: (key) => ipcRenderer.invoke('config:get', key),
  setConfig: (key, value) => ipcRenderer.invoke('config:set', { key, value }),
  setConfigSilent: (key, value) => ipcRenderer.invoke('config:set-silent', { key, value }),

  setAutoStart: (enabled) => ipcRenderer.invoke('auto-start:set', enabled),

  // 切换鼠标事件穿透
  setIgnoreMouseEvents: (ignore) => ipcRenderer.send('ball:set-ignore-mouse-events', ignore),

  onConfigChanged: (callback) => {
    ipcRenderer.on('config:changed', (event, newConfig) => callback(newConfig));
  },
  onRefreshAnimation: (callback) => {
    ipcRenderer.on('ball:refresh-animation', () => callback());
  },

  // Proxy 相关 API
  getProxy: () => ipcRenderer.invoke('proxy:get'),
  setProxy: (config) => ipcRenderer.invoke('proxy:set', config)
});