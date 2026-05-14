const Store = require('electron-store').default;

const schema = {
  ballSize: {
    type: 'number',
    default: 40,
    minimum: 20,
    maximum: 80
  },
  ballOpacity: {
    type: 'number',
    default: 0.9,
    minimum: 0.3,
    maximum: 1.0
  },
  ballColor: {
    type: 'string',
    default: '#3A6AD4'
  },
  ballPosition: {
    type: 'object',
    default: { x: 1200, y: 300 }
  },
  ballAlwaysOnTop: {
    type: 'boolean',
    default: true
  },
  autoStart: {
    type: 'boolean',
    default: false
  },
  zoomLevel: {
    type: 'number',
    default: 1.0,
    minimum: 0.5,
    maximum: 3.0
  },
  lastWindows: {
    type: 'array',
    default: []
  },
  currentAI: {
    type: 'string',
    default: 'deepseek',
    enum: ['deepseek', 'gpt', 'gemini', 'glm']
  }
};

let store;

function initConfig() {
  store = new Store({ schema });
}

function get(key) {
  if (key === undefined) return store.store;
  return store.get(key);
}

function set(key, value) {
  store.set(key, value);
  return true;
}

module.exports = { initConfig, get, set };
