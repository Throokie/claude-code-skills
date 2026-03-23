---
name: playwright-cli
description: |
  浏览器自动化 CLI 工具，使用 Playwright 控制浏览器进行网页操作。
  支持 Chrome、Firefox、Safari 多浏览器，支持导航、截图、点击、填写表单、执行 JavaScript 等操作。
  当用户需要：网页截图、打开网页、浏览器自动化、网页操作、点击元素、填写表单、测试网页、抓取网页数据时，**必须**使用此 Skill。
  相比 Puppeteer，Playwright 支持更多浏览器（Chrome/Firefox/Safari），更好的跨浏览器测试能力。
  特别适用于：跨浏览器测试、网页截图分析、表单自动填写、网页数据提取、网页测试。
triggers:
  - playwright
  - 浏览器自动化
  - 网页截图
  - 打开网页
  - 网页测试
  - 点击网页
  - 填写表单
---

# Playwright CLI Skill

浏览器自动化 CLI 工具，封装 Playwright 功能，支持多浏览器（Chrome/Firefox/Safari），支持导航、截图、点击、填写表单等操作。

## 为什么选择 Playwright？

| 特性 | Playwright | Puppeteer |
|------|-----------|-----------|
| **浏览器支持** | Chrome, Firefox, Safari | Chrome only |
| **跨浏览器测试** | ✅ 原生支持 | ❌ 需额外配置 |
| **自动等待** | ✅ 内置智能等待 | ❌ 需手动处理 |
| **移动端模拟** | ✅ 完善的设备库 | ⚠️ 基础支持 |
| **稳定性** | ✅ 更稳定的API | ⚠️ 偶有不稳定 |

## 安装依赖

```bash
npm install -g playwright
# 安装浏览器
npx playwright install chromium firefox webkit
```

或者本地安装：
```bash
npm install playwright
npx playwright install
```

## 使用方法

### 选项

| 选项 | 说明 |
|------|------|
| `--headed` | 使用有界面模式 |
| `--headless` | 使用无头模式（默认） |
| `--browser <name>` | 选择浏览器: chromium/firefox/webkit (默认: chromium) |
| `--viewport <w>x<h>` | 设置视口大小，如 1280x720 |
| `--mobile <device>` | 模拟移动设备，如 "iPhone 14" |
| `--slowmo <ms>` | 慢动作执行，毫秒 |

### 导航到网页

```bash
# 默认 Chromium 无头模式
node ~/.claude/skills/playwright-cli/scripts/playwright-cli.mjs navigate https://example.com

# 有界面模式
node ~/.claude/skills/playwright-cli/scripts/playwright-cli.mjs navigate https://github.com --headed

# 使用 Firefox
node ~/.claude/skills/playwright-cli/scripts/playwright-cli.mjs navigate https://example.com --browser firefox

# 使用 Safari (WebKit)
node ~/.claude/skills/playwright-cli/scripts/playwright-cli.mjs navigate https://example.com --browser webkit
```

### 截取屏幕截图

```bash
# 基本截图
node ~/.claude/skills/playwright-cli/scripts/playwright-cli.mjs screenshot myshot

# 全页面截图
node ~/.claude/skills/playwright-cli/scripts/playwright-cli.mjs screenshot myshot --fullpage

# 有界面模式（推荐用于复杂网站）
node ~/.claude/skills/playwright-cli/scripts/playwright-cli.mjs screenshot myshot --headed

# 自定义尺寸
node ~/.claude/skills/playwright-cli/scripts/playwright-cli.mjs screenshot myshot --viewport 1920x1080

# 移动端截图
node ~/.claude/skills/playwright-cli/scripts/playwright-cli.mjs screenshot mobile --mobile "iPhone 14"

# 跨浏览器截图（生成3张）
node ~/.claude/skills/playwright-cli/scripts/playwright-cli.mjs screenshot cross-browser --cross-browser
```

### 点击元素

```bash
node ~/.claude/skills/playwright-cli/scripts/playwright-cli.mjs click "button#submit"
node ~/.claude/skills/playwright-cli/scripts/playwright-cli.mjs click "text=Login"
```

### 填写表单

```bash
node ~/.claude/skills/playwright-cli/scripts/playwright-cli.mjs fill "input[name=email]" "test@example.com"
node ~/.claude/skills/playwright-cli/scripts/playwright-cli.mjs fill "#password" "secret123"
```

### 选择下拉菜单

```bash
node ~/.claude/skills/playwright-cli/scripts/playwright-cli.mjs select "select#country" "CN"
```

### 悬停元素

```bash
node ~/.claude/skills/playwright-cli/scripts/playwright-cli.mjs hover "div.menu-item"
```

### 执行 JavaScript

```bash
node ~/.claude/skills/playwright-cli/scripts/playwright-cli.mjs evaluate "document.title"
node ~/.claude/skills/playwright-cli/scripts/playwright-cli.mjs evaluate "() => { return document.querySelectorAll('h1').length; }"
```

### 等待元素

```bash
# 等待元素可见
node ~/.claude/skills/playwright-cli/scripts/playwright-cli.mjs wait "#content" --state visible

# 等待元素隐藏
node ~/.claude/skills/playwright-cli/scripts/playwright-cli.mjs wait "#loading" --state hidden

# 等待超时
node ~/.claude/skills/playwright-cli/scripts/playwright-cli.mjs wait "#result" --timeout 10000
```

### 获取元素文本

```bash
node ~/.claude/skills/playwright-cli/scripts/playwright-cli.mjs text "h1"
```

### 获取元素属性

```bash
node ~/.claude/skills/playwright-cli/scripts/playwright-cli.mjs attr "img#logo" src
```

### 键盘操作

```bash
# 按下按键
node ~/.claude/skills/playwright-cli/scripts/playwright-cli.mjs press Enter
node ~/.claude/skills/playwright-cli/scripts/playwright-cli.mjs press "Control+a"
```

### 滚动页面

```bash
# 滚动到底部
node ~/.claude/skills/playwright-cli/scripts/playwright-cli.mjs scroll-to-bottom

# 滚动到元素
node ~/.claude/skills/playwright-cli/scripts/playwright-cli.mjs scroll-to "#footer"
```

### 跨浏览器测试

```bash
# 在3个浏览器上运行同一测试
node ~/.claude/skills/playwright-cli/scripts/playwright-cli.mjs cross-browser-test https://example.com \
  --actions 'navigate,screenshot,click "#btn",screenshot'
```

### 关闭浏览器

```bash
node ~/.claude/skills/playwright-cli/scripts/playwright-cli.mjs close
```

## 快捷别名建议

添加到 `~/.config/fish/config.fish` 或 `~/.bashrc`：

```bash
# Fish
alias playwright-cli="node ~/.claude/skills/playwright-cli/scripts/playwright-cli.mjs"
alias pw="node ~/.claude/skills/playwright-cli/scripts/playwright-cli.mjs"
alias pw-shot="node ~/.claude/skills/playwright-cli/scripts/playwright-cli.mjs screenshot"
alias pw-nav="node ~/.claude/skills/playwright-cli/scripts/playwright-cli.mjs navigate"

# Bash/Zsh
alias playwright-cli='node ~/.claude/skills/playwright-cli/scripts/playwright-cli.mjs'
alias pw='node ~/.claude/skills/playwright-cli/scripts/playwright-cli.mjs'
alias pw-shot='node ~/.claude/skills/playwright-cli/scripts/playwright-cli.mjs screenshot'
alias pw-nav='node ~/.claude/skills/playwright-cli/scripts/playwright-cli.mjs navigate'
```

## 环境变量

| 变量 | 说明 |
|------|------|
| `PLAYWRIGHT_BROWSERS_PATH` | 浏览器可执行文件路径 |
| `PLAYWRIGHT_HEADLESS` | 设置默认 headless 模式 |
| `PLAYWRIGHT_SLOWMO` | 慢动作执行毫秒数 |

## 完整命令列表

| 命令 | 别名 | 说明 |
|------|------|------|
| `navigate <url>` | nav, goto | 导航到 URL |
| `screenshot [name]` | shot, ss | 截图 |
| `click <selector>` | - | 点击元素 |
| `fill <selector> <value>` | type, input | 填写输入框 |
| `select <selector> <value>` | - | 选择下拉菜单 |
| `hover <selector>` | - | 悬停元素 |
| `evaluate <code>` | eval, js | 执行 JS |
| `wait <selector>` | - | 等待元素 |
| `text <selector>` | - | 获取文本 |
| `attr <selector> <name>` | - | 获取属性 |
| `press <key>` | - | 按下按键 |
| `scroll-to <selector>` | - | 滚动到元素 |
| `scroll-to-bottom` | - | 滚动到底部 |
| `cross-browser-test <url>` | - | 跨浏览器测试 |
| `close` | exit, quit | 关闭浏览器 |

## 使用场景示例

### 场景 1：跨浏览器截图对比

```bash
# 在 Chrome 中截图
node ~/.claude/skills/playwright-cli/scripts/playwright-cli.mjs navigate https://example.com --browser chromium --headed
node ~/.claude/skills/playwright-cli/scripts/playwright-cli.mjs screenshot chrome --fullpage

# 在 Firefox 中截图
node ~/.claude/skills/playwright-cli/scripts/playwright-cli.mjs navigate https://example.com --browser firefox --headed
node ~/.claude/skills/playwright-cli/scripts/playwright-cli.mjs screenshot firefox --fullpage

# 在 Safari 中截图
node ~/.claude/skills/playwright-cli/scripts/playwright-cli.mjs navigate https://example.com --browser webkit --headed
node ~/.claude/skills/playwright-cli/scripts/playwright-cli.mjs screenshot safari --fullpage
```

### 场景 2：移动端测试

```bash
# iPhone 14
node ~/.claude/skills/playwright-cli/scripts/playwright-cli.mjs navigate https://example.com --mobile "iPhone 14" --headed
node ~/.claude/skills/playwright-cli/scripts/playwright-cli.mjs screenshot iphone

# iPad
node ~/.claude/skills/playwright-cli/scripts/playwright-cli.mjs navigate https://example.com --mobile "iPad Pro 11" --headed
node ~/.claude/skills/playwright-cli/scripts/playwright-cli.mjs screenshot ipad

# Pixel 5
node ~/.claude/skills/playwright-cli/scripts/playwright-cli.mjs navigate https://example.com --mobile "Pixel 5" --headed
node ~/.claude/skills/playwright-cli/scripts/playwright-cli.mjs screenshot pixel
```

### 场景 3：自动化表单填写

```bash
# 导航到登录页
node ~/.claude/skills/playwright-cli/scripts/playwright-cli.mjs navigate https://example.com/login --headed

# 填写表单
node ~/.claude/skills/playwright-cli/scripts/playwright-cli.mjs fill "input#username" "myuser"
node ~/.claude/skills/playwright-cli/scripts/playwright-cli.mjs fill "#password" "mypass"

# 点击登录
node ~/.claude/skills/playwright-cli/scripts/playwright-cli.mjs click "button[type=submit]"

# 等待加载
node ~/.claude/skills/playwright-cli/scripts/playwright-cli.mjs wait "#dashboard" --state visible

# 截图结果
node ~/.claude/skills/playwright-cli/scripts/playwright-cli.mjs screenshot logged-in --fullpage
```

### 场景 4：执行 JavaScript 获取数据

```bash
node ~/.claude/skills/playwright-cli/scripts/playwright-cli.mjs navigate https://example.com
node ~/.claude/skills/playwright-cli/scripts/playwright-cli.mjs evaluate "() => {
  const links = Array.from(document.querySelectorAll('a'));
  return links.map(a => ({ text: a.textContent, href: a.href }));
}"
```

### 场景 5：完整 E2E 测试流程

```bash
node ~/.claude/skills/playwright-cli/scripts/playwright-cli.mjs navigate https://example.com --headed
node ~/.claude/skills/playwright-cli/scripts/playwright-cli.mjs screenshot 01-homepage
node ~/.claude/skills/playwright-cli/scripts/playwright-cli.mjs click "a[href='/products']"
node ~/.claude/skills/playwright-cli/scripts/playwright-cli.mjs wait ".product-list"
node ~/.claude/skills/playwright-cli/scripts/playwright-cli.mjs screenshot 02-products
node ~/.claude/skills/playwright-cli/scripts/playwright-cli.mjs click ".product-item:first-child"
node ~/.claude/skills/playwright-cli/scripts/playwright-cli.mjs wait "#product-detail"
node ~/.claude/skills/playwright-cli/scripts/playwright-cli.mjs screenshot 03-product-detail
```

## 支持的移动设备

常见设备名称：
- `"iPhone 14"`, `"iPhone 14 Pro"`, `"iPhone 14 Pro Max"`
- `"iPhone 13"`, `"iPhone 13 Pro"`
- `"iPhone SE"`
- `"iPad Pro 11"`, `"iPad Pro 12.9"`, `"iPad Mini"`
- `"Pixel 5"`, `"Pixel 7"`, `"Pixel 7 Pro"`
- `"Galaxy S21"`, `"Galaxy S22"`

查看完整列表：
```bash
npx playwright devices
```

## 故障排除

### 浏览器未安装

```bash
# 安装所有浏览器
npx playwright install

# 或只安装特定浏览器
npx playwright install chromium
npx playwright install firefox
npx playwright install webkit
```

### 依赖缺失 (Linux)

```bash
# Ubuntu/Debian
sudo apt-get install libnss3 libatk-bridge2.0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2

# Arch Linux
sudo pacman -S nss at-spi2-atk libxcomposite libxdamage libxfixes libxrandr mesa alsa-lib
```

### 权限问题

```bash
# 给浏览器目录添加执行权限
chmod +x ~/.cache/ms-playwright/*/chrome-linux/chrome
```

### 内存不足

```bash
# 使用更轻量的配置
node ~/.claude/skills/playwright-cli/scripts/playwright-cli.mjs navigate https://example.com --headless
```

## 与 Puppeteer 对比

| 场景 | 推荐工具 |
|------|---------|
| 只需要 Chrome 支持 | Puppeteer |
| 需要跨浏览器测试 | **Playwright** |
| 复杂 SPA 应用 | **Playwright**（自动等待更好） |
| 简单截图/抓取 | 两者皆可 |
| 移动端测试 | **Playwright**（设备库更丰富） |
| CI/CD 集成 | **Playwright**（更稳定） |
