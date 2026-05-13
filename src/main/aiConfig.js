// AI 网站配置（每个 AI 的品牌主题色用于刘海区域）
const AI_SITES = {
  deepseek: {
    name: 'DeepSeek',
    url: 'https://chat.deepseek.com',
    icon: 'ds.png',
    brandColor: '#4D6BFE' // DeepSeek 蓝
  },
  gpt: {
    name: 'ChatGPT',
    url: 'https://chat.openai.com',
    icon: 'gpt.png',
    brandColor: '#74AA9C' // ChatGPT 灰绿
  },
  gemini: {
    name: 'Gemini',
    url: 'https://gemini.google.com',
    icon: 'gemini.png',
    brandColor: '#8E75FF' // Gemini 紫
  },
  glm: {
    name: '智谱 GLM',
    url: 'https://chatglm.cn/',
    icon: 'glm.png',
    brandColor: '#6B7280' // GLM 灰
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