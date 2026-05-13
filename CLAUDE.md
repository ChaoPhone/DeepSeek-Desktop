# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start              # 开发运行
npm run build:setup    # 构建 Setup 安装包
npm run build:portable # 构建便携版 exe
```

## Architecture

Electron 桌面应用，悬浮球快速访问 AI 网站。

### 核心模块

| 文件 | 职责 |
|------|------|
| `src/main/index.js` | 主入口：初始化配置、悬浮球、IPC、恢复上次会话 |
| `src/main/floatingBall.js` | 悬浮球窗口：创建、动态展开/收缩、鼠标穿透检测 |
| `src/main/chatWindow.js` | 聊天窗口：BrowserWindow + BrowserView 加载网页 |
| `src/main/ipcHandlers.js` | IPC 处理器：窗口操作、配置读写、AI 切换 |
| `src/main/config.js` | 配置存储：electron-store，ballSize/opacity/color/position/currentAI |
| `src/main/aiConfig.js` | AI 网站配置：DeepSeek、ChatGPT、Gemini、GLM 的 URL 和图标 |
| `src/main/contextMenu.js` | 右键菜单：切换 AI、外观设置、退出 |

### 渲染器

| 目录 | 职责 |
|------|------|
| `src/renderer/floating-ball/` | 悬浮球 UI：主球 + hover 展开的副球 |
| `src/renderer/chat-control/` | 聊天窗口控制栏：拖拽区、置顶/最小化/最大化/关闭按钮 |
| `src/renderer/settings/` | 外观设置页面：大小、透明度、主题色 |

### Preload

| 文件 | 职责 |
|------|------|
| `src/preload/ballPreload.js` | 悬浮球 API：图标加载、窗口操作、配置读写、展开/收缩窗口 |
| `src/preload/chatPreload.js` | 聊天窗口 API：缩放、置顶、最小化、最大化 |

### 关键技术点

**悬浮球动态窗口：**
- 默认窗口小（只含主球），hover 时窗口向四周扩展容纳副球
- 展开/收缩时使用当前窗口实际位置计算，确保主球不跳走
- 鼠标穿透：只检测主球和副球的圆形范围，透明区域穿透到下层应用

**聊天窗口：**
- BrowserWindow（无边框、Mica 背景）+ BrowserView（加载网页内容）
- 不同 AI 使用不同图标和窗口标题
- 置顶使用 `setAlwaysOnTop(true, 'screen-saver')`

**配置 schema（config.js）：**
- ballSize（16-60）、ballOpacity（0.3-1.0）、ballColor、ballPosition、currentAI（deepseek/gpt/gemini/glm）

## AI 图标

位于 `assets/ai_figure/`：ds.png、gpt.png、gemini.png、glm.png（均已缩放为 512x512）