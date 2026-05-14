const sizeSlider = document.getElementById('ball-size');
const sizeVal = document.getElementById('size-val');
const opacitySlider = document.getElementById('ball-opacity');
const opacityVal = document.getElementById('opacity-val');
const resetBtn = document.getElementById('reset-btn');

const DEFAULTS = { ballSize: 40, ballOpacity: 0.9 };

async function init() {
  const size = await window.deepseekAPI.getConfig('ballSize');
  const opacity = await window.deepseekAPI.getConfig('ballOpacity');

  sizeSlider.value = size;
  sizeVal.textContent = size;
  opacitySlider.value = opacity;
  opacityVal.textContent = opacity;
}

// input 事件：实时更新显示数值和悬浮球大小，但不触发缩放动画
sizeSlider.addEventListener('input', () => {
  sizeVal.textContent = sizeSlider.value;
  window.deepseekAPI.setConfigSilent('ballSize', Number(sizeSlider.value));
});

// change 事件：鼠标释放后触发缩放动画
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

resetBtn.addEventListener('click', async () => {
  await window.deepseekAPI.setConfig('ballSize', DEFAULTS.ballSize);
  await window.deepseekAPI.setConfig('ballOpacity', DEFAULTS.ballOpacity);

  sizeSlider.value = DEFAULTS.ballSize;
  sizeVal.textContent = DEFAULTS.ballSize;
  opacitySlider.value = DEFAULTS.ballOpacity;
  opacityVal.textContent = DEFAULTS.ballOpacity;
});

init();
