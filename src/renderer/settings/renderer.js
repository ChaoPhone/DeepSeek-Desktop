const sizeSlider = document.getElementById('ball-size');
const sizeVal = document.getElementById('size-val');
const opacitySlider = document.getElementById('ball-opacity');
const opacityVal = document.getElementById('opacity-val');
const colorPresets = document.getElementById('color-presets');
const customColor = document.getElementById('custom-color');
const resetBtn = document.getElementById('reset-btn');

const DEFAULTS = { ballSize: 22, ballOpacity: 0.9, ballColor: '#4A90D9' };

async function init() {
  const size = await window.deepseekAPI.getConfig('ballSize');
  const opacity = await window.deepseekAPI.getConfig('ballOpacity');
  const color = await window.deepseekAPI.getConfig('ballColor');

  sizeSlider.value = size;
  sizeVal.textContent = size;
  opacitySlider.value = opacity;
  opacityVal.textContent = opacity;
  customColor.value = color;
  updateActivePreset(color);
}

function updateActivePreset(color) {
  document.querySelectorAll('.color-dot').forEach((dot) => {
    dot.classList.toggle('active', dot.dataset.color.toUpperCase() === color.toUpperCase());
  });
}

sizeSlider.addEventListener('input', () => {
  const val = sizeSlider.value;
  sizeVal.textContent = val;
  window.deepseekAPI.setConfig('ballSize', Number(val));
});

opacitySlider.addEventListener('input', () => {
  const val = parseFloat(opacitySlider.value);
  opacityVal.textContent = val;
  window.deepseekAPI.setConfig('ballOpacity', val);
});

colorPresets.addEventListener('click', (e) => {
  const dot = e.target.closest('.color-dot');
  if (!dot) return;
  const color = dot.dataset.color;
  customColor.value = color;
  updateActivePreset(color);
  window.deepseekAPI.setConfig('ballColor', color);
});

customColor.addEventListener('input', () => {
  const color = customColor.value;
  updateActivePreset(color);
  window.deepseekAPI.setConfig('ballColor', color);
});

resetBtn.addEventListener('click', async () => {
  await window.deepseekAPI.setConfig('ballSize', DEFAULTS.ballSize);
  await window.deepseekAPI.setConfig('ballOpacity', DEFAULTS.ballOpacity);
  await window.deepseekAPI.setConfig('ballColor', DEFAULTS.ballColor);

  sizeSlider.value = DEFAULTS.ballSize;
  sizeVal.textContent = DEFAULTS.ballSize;
  opacitySlider.value = DEFAULTS.ballOpacity;
  opacityVal.textContent = DEFAULTS.ballOpacity;
  customColor.value = DEFAULTS.ballColor;
  updateActivePreset(DEFAULTS.ballColor);
});

init();
