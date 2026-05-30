const sizeSlider = document.getElementById('ball-size');
const sizeVal = document.getElementById('size-val');
const opacitySlider = document.getElementById('ball-opacity');
const opacityVal = document.getElementById('opacity-val');
const resetBtn = document.getElementById('reset-btn');
const alwaysOnTopCheckbox = document.getElementById('always-on-top');
const proxyEnabledCheckbox = document.getElementById('proxy-enabled');
const proxyUrlInput = document.getElementById('proxy-url');
const saveProxyBtn = document.getElementById('save-proxy-btn');

const DEFAULTS = {
  ballSize: 40,
  ballOpacity: 0.9,
  ballAlwaysOnTop: true,
  proxyEnabled: true,
  proxyUrl: '127.0.0.1:7897'
};

async function init() {
  // 加载外观设置
  const size = await window.deepseekAPI.getConfig('ballSize');
  const opacity = await window.deepseekAPI.getConfig('ballOpacity');
  const alwaysOnTop = await window.deepseekAPI.getConfig('ballAlwaysOnTop');

  sizeSlider.value = size;
  sizeVal.textContent = size;
  opacitySlider.value = opacity;
  opacityVal.textContent = opacity;
  alwaysOnTopCheckbox.checked = alwaysOnTop !== false;

  // 加载代理设置
  if (window.deepseekAPI.getProxy) {
    const proxy = await window.deepseekAPI.getProxy();
    proxyEnabledCheckbox.checked = proxy.enabled;
    proxyUrlInput.value = proxy.url || '';
  }
}

// 外观设置：实时生效
sizeSlider.addEventListener('input', () => {
  sizeVal.textContent = sizeSlider.value;
  window.deepseekAPI.setConfigSilent('ballSize', Number(sizeSlider.value));
});
sizeSlider.addEventListener('change', () => {
  window.deepseekAPI.setConfig('ballSize', Number(sizeSlider.value));
});

opacitySlider.addEventListener('input', () => {
  opacityVal.textContent = opacitySlider.value;
  window.deepseekAPI.setConfigSilent('ballOpacity', parseFloat(opacitySlider.value));
});
opacitySlider.addEventListener('change', () => {
  window.deepseekAPI.setConfig('ballOpacity', parseFloat(opacitySlider.value));
});

alwaysOnTopCheckbox.addEventListener('change', () => {
  window.deepseekAPI.setConfig('ballAlwaysOnTop', alwaysOnTopCheckbox.checked);
});

// 代理设置：点击"应用代理"后生效
saveProxyBtn.addEventListener('click', async () => {
  if (window.deepseekAPI.setProxy) {
    await window.deepseekAPI.setProxy({
      enabled: proxyEnabledCheckbox.checked,
      url: proxyUrlInput.value.trim()
    });
    saveProxyBtn.textContent = '已应用 ✓';
    setTimeout(() => { saveProxyBtn.textContent = '应用代理'; }, 1500);
  }
});

// 恢复默认：重置所有设置
resetBtn.addEventListener('click', async () => {
  // 外观
  await window.deepseekAPI.setConfig('ballSize', DEFAULTS.ballSize);
  await window.deepseekAPI.setConfig('ballOpacity', DEFAULTS.ballOpacity);
  await window.deepseekAPI.setConfig('ballAlwaysOnTop', DEFAULTS.ballAlwaysOnTop);
  sizeSlider.value = DEFAULTS.ballSize;
  sizeVal.textContent = DEFAULTS.ballSize;
  opacitySlider.value = DEFAULTS.ballOpacity;
  opacityVal.textContent = DEFAULTS.ballOpacity;
  alwaysOnTopCheckbox.checked = DEFAULTS.ballAlwaysOnTop;

  // 代理
  proxyEnabledCheckbox.checked = DEFAULTS.proxyEnabled;
  proxyUrlInput.value = DEFAULTS.proxyUrl;
  if (window.deepseekAPI.setProxy) {
    await window.deepseekAPI.setProxy({
      enabled: DEFAULTS.proxyEnabled,
      url: DEFAULTS.proxyUrl
    });
  }
});

init();
