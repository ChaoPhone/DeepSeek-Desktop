const fs = require('fs');
const path = require('path');

// 日志文件路径：项目根目录下的 logs 文件夹
const logDir = path.join(__dirname, '../../logs');
const logFile = path.join(logDir, 'app.log');

// 确保日志目录存在
function ensureLogDir() {
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
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
  ensureLogDir();
  const timestamp = formatTime();
  const dataStr = data ? ` | ${JSON.stringify(data)}` : '';
  const line = `[${timestamp}] [${level}] ${message}${dataStr}\n`;

  // 写入文件
  fs.appendFileSync(logFile, line, 'utf8');

  // 同时输出到控制台（开发时可见）
  console.log(line.trim());
}

module.exports = {
  log,
  info: (msg, data) => log('INFO', msg, data),
  warn: (msg, data) => log('WARN', msg, data),
  error: (msg, data) => log('ERROR', msg, data),
  debug: (msg, data) => log('DEBUG', msg, data)
};