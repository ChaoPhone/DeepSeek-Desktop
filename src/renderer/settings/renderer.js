const sizeSlider = document.getElementById('ball-size');
const sizeVal = document.getElementById('size-val');
const opacitySlider = document.getElementById('ball-opacity');
const opacityVal = document.getElementById('opacity-val');
const resetBtn = document.getElementById('reset-btn');

const DEFAULTS = { ballSize: 22, ballOpacity: 0.9 };

async function init() {
  const size = await window.deepseekAPI.getConfig('ballSize');
  const opacity = await window.deepseekAPI.getConfig('ballOpacity');

  sizeSlider.value = size;
  sizeVal.textContent = size;
  opacitySlider.value = opacity;
  opacityVal.textContent = opacity;
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

resetBtn.addEventListener('click', async () => {
  await window.deepseekAPI.setConfig('ballSize', DEFAULTS.ballSize);
  await window.deepseekAPI.setConfig('ballOpacity', DEFAULTS.ballOpacity);

  sizeSlider.value = DEFAULTS.ballSize;
  sizeVal.textContent = DEFAULTS.ballSize;
  opacitySlider.value = DEFAULTS.ballOpacity;
  opacityVal.textContent = DEFAULTS.ballOpacity;
});

init();
