// AI 网站配置
const AI_SITES = {
  deepseek: {
    name: 'DeepSeek',
    url: 'https://chat.deepseek.com',
    icon: 'ds.png'
  },
  gpt: {
    name: 'ChatGPT',
    url: 'https://chat.openai.com',
    icon: 'gpt.png'
  },
  gemini: {
    name: 'Gemini',
    url: 'https://gemini.google.com',
    icon: 'gemini.png'
  },
  glm: {
    name: '智谱 GLM',
    url: 'https://chatglm.cn/',
    icon: 'glm.png'
  }
};

// 获取当前非主球的其他 AI 列表
function getOtherAIs(currentAI) {
  return Object.keys(AI_SITES).filter(key => key !== currentAI);
}

// 获取 AI 配置
function getAIConfig(key) {
  return AI_SITES[key];
}

module.exports = { AI_SITES, getOtherAIs, getAIConfig };