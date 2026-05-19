const fs = require('fs');
const path = require('path');
const { app } = require('electron');

let logDir = null;
let logFile = null;

// 初始化日志目录（必须在 app ready 后调用）
function init() {
  if (logDir) return; // 已初始化
  logDir = path.join(app.getPath('userData'), 'logs');
  logFile = path.join(logDir, 'app.log');
}

// 确保日志目录存在
function ensureLogDir() {
  if (!logDir) return; // 未初始化，跳过日志
  if (!fs.existsSync(logDir)) {
    try {
      fs.mkdirSync(logDir, { recursive: true });
    } catch (e) {
      // 创建目录失败，静默忽略
    }
  }
}

// 格式化时间（北京时间）
function formatTime() {
  const now = new Date();
  const bjTime = new Date(now.getTime() + 8 * 60 * 60 * 1000); // UTC+8
  return bjTime.toISOString().replace('T', ' ').substring(0, 19);
}

// 写入日志
function log(level, message, data = null) {
  if (!logFile) return; // 未初始化，跳过日志

  try {
    ensureLogDir();
    const timestamp = formatTime();
    const dataStr = data ? ` | ${JSON.stringify(data)}` : '';
    const line = `[${timestamp}] [${level}] ${message}${dataStr}\n`;

    // 写入文件
    fs.appendFileSync(logFile, line, 'utf8');

    // 同时输出到控制台（开发时可见）
    console.log(line.trim());
  } catch (e) {
    // 日志写入失败，静默忽略，避免影响应用运行
  }
}

module.exports = {
  init,
  log,
  info: (msg, data) => log('INFO', msg, data),
  warn: (msg, data) => log('WARN', msg, data),
  error: (msg, data) => log('ERROR', msg, data),
  debug: (msg, data) => log('DEBUG', msg, data)
};