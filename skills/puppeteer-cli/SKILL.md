---
name: puppeteer-cli
description: |
  浏览器自动化 CLI 工具，使用 Puppeteer 控制浏览器进行网页操作。
  支持导航、截图、点击、填写表单、执行 JavaScript 等操作。
  当用户需要：网页截图、打开网页、浏览器自动化、网页操作、点击元素、填写表单、测试网页、抓取网页数据时，**必须**使用此 Skill。
  即使不使用"puppeteer"、"截图"等关键词，只要涉及任何网页浏览、网页交互、自动化操作，都应该触发此 Skill。
  特别适用于：网页截图分析、表单自动填写、网页数据提取、网页测试、点击网页元素。
---

# Puppeteer CLI Skill

浏览器自动化 CLI 工具，封装 Puppeteer 功能，支持导航、截图、点击、填写表单等操作。

## 安装依赖

```bash
npm install -g puppeteer
```

或者本地安装：
```bash
npm install puppeteer
```

## 使用方法

### 选项

| 选项 | 说明 |
|------|------|
| `--headed` | 使用有界面模式（解决某些网站在 headless 模式下黑屏的问题） |
| `--headless` | 使用无头模式（默认） |

### 导航到网页
```bash
# 默认无头模式
node ~/.claude/skills/puppeteer-cli/scripts/puppeteer-cli.mjs navigate https://example.com

# 有界面模式（推荐用于复杂网站如 GitHub）
node ~/.claude/skills/puppeteer-cli/scripts/puppeteer-cli.mjs navigate https://github.com/trending --headed
```

### 截取屏幕截图
```bash
# 默认 1280x720（简单网站可用）
node ~/.claude/skills/puppeteer-cli/scripts/puppeteer-cli.mjs screenshot myshot

# 有界面模式（推荐，确保内容渲染）
node ~/.claude/skills/puppeteer-cli/scripts/puppeteer-cli.mjs screenshot myshot --headed

# 自定义尺寸
node ~/.claude/skills/puppeteer-cli/scripts/puppeteer-cli.mjs screenshot myshot 800 600 --headed
```

### 点击元素
```bash
node ~/.claude/skills/puppeteer-cli/scripts/puppeteer-cli.mjs click "button#submit"
```

### 填写表单
```bash
node ~/.claude/skills/puppeteer-cli/scripts/puppeteer-cli.mjs fill "input[name=email]" "test@example.com"
```

### 选择下拉菜单
```bash
node ~/.claude/skills/puppeteer-cli/scripts/puppeteer-cli.mjs select "select#country" "CN"
```

### 悬停元素
```bash
node ~/.claude/skills/puppeteer-cli/scripts/puppeteer-cli.mjs hover "div.menu-item"
```

### 执行 JavaScript
```bash
node ~/.claude/skills/puppeteer-cli/scripts/puppeteer-cli.mjs evaluate "document.title"
```

### 关闭浏览器
```bash
node ~/.claude/skills/puppeteer-cli/scripts/puppeteer-cli.mjs close
```

## 快捷别名建议

添加到 `~/.config/fish/config.fish` 或 `~/.bashrc`：

```bash
# Fish
alias puppeteer-cli="node ~/.claude/skills/puppeteer-cli/scripts/puppeteer-cli.mjs"
alias web-shot="node ~/.claude/skills/puppeteer-cli/scripts/puppeteer-cli.mjs screenshot"
alias web-nav="node ~/.claude/skills/puppeteer-cli/scripts/puppeteer-cli.mjs navigate"

# Bash/Zsh
alias puppeteer-cli='node ~/.claude/skills/puppeteer-cli/scripts/puppeteer-cli.mjs'
alias web-shot='node ~/.claude/skills/puppeteer-cli/scripts/puppeteer-cli.mjs screenshot'
alias web-nav='node ~/.claude/skills/puppeteer-cli/scripts/puppeteer-cli.mjs navigate'
```

## 环境变量

| 变量 | 说明 |
|------|------|
| `PUPPETEER_EXECUTABLE_PATH` | 指定 Chrome 可执行文件路径 |
| `PUPPETEER_HEADLESS` | 设置默认 headless 模式 |

## 完整命令列表

| 命令 | 别名 | 说明 |
|------|------|------|
| `navigate <url>` | nav, goto | 导航到 URL |
| `screenshot [name] [w] [h]` | shot, ss | 截图 |
| `click <selector>` | - | 点击元素 |
| `fill <selector> <value>` | type, input | 填写输入框 |
| `select <selector> <value>` | - | 选择下拉菜单 |
| `hover <selector>` | - | 悬停元素 |
| `evaluate <code>` | eval, js | 执行 JS |
| `close` | exit, quit | 关闭浏览器 |

## 使用场景示例

### 场景 1：截图并分析网页
```bash
# 导航并截图
node ~/.claude/skills/puppeteer-cli/scripts/puppeteer-cli.mjs navigate https://github.com
node ~/.claude/skills/puppeteer-cli/scripts/puppeteer-cli.mjs screenshot github-home 1200 800
```

### 场景 2：自动化表单填写
```bash
# 导航到登录页
node ~/.claude/skills/puppeteer-cli/scripts/puppeteer-cli.mjs navigate https://example.com/login

# 填写表单
node ~/.claude/skills/puppeteer-cli/scripts/puppeteer-cli.mjs fill "input#username" "myuser"
node ~/.claude/skills/puppeteer-cli/scripts/puppeteer-cli.mjs fill "input#password" "mypass"

# 点击登录
node ~/.claude/skills/puppeteer-cli/scripts/puppeteer-cli.mjs click "button[type=submit]"

# 截图结果
node ~/.claude/skills/puppeteer-cli/scripts/puppeteer-cli.mjs screenshot logged-in
```

### 场景 3：执行 JavaScript 获取数据
```bash
node ~/.claude/skills/puppeteer-cli/scripts/puppeteer-cli.mjs navigate https://example.com
node ~/.claude/skills/puppeteer-cli/scripts/puppeteer-cli.mjs evaluate "document.querySelectorAll('h1').map(h => h.textContent)"
```

## 注意事项

1. 浏览器实例会在命令间保持，直到调用 `close` 或进程退出
2. 截图保存到当前目录的 `screenshots/` 文件夹
3. 支持 CSS 选择器（类 `.class`、ID `#id`、属性 `[name=value]`）
4. 进程退出时会自动关闭浏览器
5. **重要**：某些复杂网站（如 GitHub）在 headless 模式下可能渲染为黑屏，请使用 `--headed` 选项

## 故障排除

### 截图黑屏/空白

如果截图结果是黑色或空白图片：

```bash
# 解决方案：使用 --headed 有界面模式
node ~/.claude/skills/puppeteer-cli/scripts/puppeteer-cli.mjs navigate https://github.com/trending --headed
node ~/.claude/skills/puppeteer-cli/scripts/puppeteer-cli.mjs screenshot github-trending --headed
```

这通常发生在 JavaScript 密集型网站（GitHub、SPA 应用等）。有界面模式可以确保页面正确渲染。

### Chrome 路径检测

如果启动失败，可以手动设置 Chrome 路径：

```bash
export PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
node ~/.claude/skills/puppeteer-cli/scripts/puppeteer-cli.mjs navigate https://example.com
```
