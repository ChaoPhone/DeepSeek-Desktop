<div align="center">

  <img src="assets/icon.png" alt="DeepSeek Desktop" width="128" height="180">

  <h1>DeepSeek Desktop</h1>

  <p><strong>优雅的桌面悬浮球 · 一键直达 DeepSeek Chat</strong></p>

  <p>
    <img src="https://img.shields.io/badge/Electron-35.0-blue?logo=electron" alt="Electron">
    <img src="https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey" alt="Platform">
    <img src="https://img.shields.io/badge/License-MIT-green" alt="License">
  </p>

  <p>
    <a href="#功能特性">功能特性</a> •
    <a href="#安装使用">安装使用</a> •
    <a href="#构建打包">构建打包</a> •
    <a href="#技术栈">技术栈</a>
  </p>

</div>

---

## 功能特性

<table>
<tr>
<td width="50%">

### 🎯 悬浮球交互

- **圆形悬浮球** - 优雅地停留在屏幕边缘
- **拖拽移动** - 自由放置在任意位置
- **边缘吸附** - 自动吸附到屏幕边缘
- **可调大小** - 16px ~ 60px 自定义尺寸
- **自定义颜色** - 选择你喜欢的颜色

</td>
<td width="50%">

### 🖥️ 网页窗口

- **灵动岛设计** - 现代化顶部控制栏
- **动态标题** - 实时显示网页标题
- **窗口置顶** - 一键保持在最上层
- **Ctrl+W 关闭** - 快捷键支持
- **缩放支持** - Ctrl+滚轮调整缩放

</td>
</tr>
</table>

### ⚙️ 其他功能

- **开机自启** - 可配置自动启动
- **位置记忆** - 自动保存窗口位置
- **系统托盘** - 右键菜单快速操作
- **多窗口支持** - 同时打开多个对话窗口

---

## 安装使用

### 方式一：直接运行

```bash
# 克隆仓库
git clone https://github.com/ChaoPhone/DeepSeek-Desktop.git

# 进入目录
cd DeepSeek-Desktop

# 安装依赖
npm install

# 运行应用
npm start
```

### 方式二：打包安装

```bash
# 构建 Windows 安装包
npm run build

# 构建 Windows 便携版
npm run build:portable
```

---

## 构建打包

| 命令 | 说明 |
|------|------|
| `npm run start` | 开发模式运行 |
| `npm run build` | 构建 Windows 安装包 (NSIS) |
| `npm run build:portable` | 构建 Windows 便携版 |

构建产物位于 `dist/` 目录。

---

## 技术栈

| 技术 | 用途 |
|------|------|
| **Electron 35** | 跨平台桌面应用框架 |
| **Electron Store** | 本地配置持久化 |
| **BrowserView** | 网页内容渲染隔离 |
| **Mica Material** | Windows 11 现代化背景 |

---

## 目录结构

```
DeepSeek-Desktop/
├── assets/              # 应用图标资源
├── src/
│   ├── main/            # 主进程代码
│   │   ├── index.js     # 应用入口
│   │   ├── floatingBall.js  # 悬浮球窗口
│   │   ├── chatWindow.js    # 网页窗口
│   │   ├── config.js    # 配置管理
│   │   └ ipcHandlers.js # IPC处理
│   │   └ autoLaunch.js  # 开机自启
│   │   └ contextMenu.js # 右键菜单
│   ├── preload/         # 预加载脚本
│   └── renderer/        # 渲染进程
│       ├── floating-ball/   # 悬浮球界面
│       ├── chat-control/    # 网页窗口控制栏
│       └── settings/        # 设置界面
├── electron-builder.yml # 构建配置
└── package.json
```

---

## 许可证

本项目采用 **MIT License** 开源协议。

---

<div align="center">

  <p>如果这个项目对你有帮助，请给一个 ⭐ Star 支持一下！</p>

  <p>Made with ❤️ by <a href="https://github.com/ChaoPhone">ChaoPhone</a></p>

</div>