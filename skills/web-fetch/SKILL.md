---
name: web-fetch
description: 万能网页抓取工具，支持多种策略绕过反爬虫检测。触发词：抓取网页、获取网页内容、scrape。
version: 1.0
---

# Web Fetch - 万能网页抓取工具

> **版本**: v1.0
> **创建日期**: 2026-03-15
>
> **核心优势**: 多策略自动切换，从轻量到重量级，智能选择最优方案

---

## 📋 概述

统一网页抓取工具，支持 4 种抓取策略：

| 方法 | 速度 | 适用场景 | 反爬虫绕过 |
|------|------|----------|-----------|
| **curl** | ⚡ 最快 | 静态 HTML | ❌ 无 |
| **agent-browser** | 🚀 快 | 动态 SPA | ✅ 中等 |
| **browser-use** | 🐢 中 | 复杂交互 | ✅ 强 |
| **playwright** | 🐌 慢 | 强反爬虫 | ✅✅ 最强 |

**自动模式**: 从 curl 开始，失败后自动尝试更强的方法

---

## 🚀 快速开始

```bash
# 基础使用（自动模式）
node ~/src/user-scripts/skills/web-fetch/scripts/fetch-page.mjs "https://example.com"

# 指定方法
node ~/src/user-scripts/skills/web-fetch/scripts/fetch-page.mjs "https://example.com" --method browser-use

# 带截图
node ~/src/user-scripts/skills/web-fetch/scripts/fetch-page.mjs "https://example.com" --screenshot out.png

# JSON 输出
node ~/src/user-scripts/skills/web-fetch/scripts/fetch-page.mjs "https://example.com" --json
```

---

## 📤 命令参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--method METHOD` | 抓取方法：auto, curl, playwright, all | auto |
| `--timeout MS` | 超时时间（毫秒） | 30000 |
| `--retry` / `--no-retry` | 是否启用重试 | true |
| `--output FILE` | 保存内容到文件 | - |
| `--screenshot FILE` | 保存截图 | - |
| `--wait N` | 等待 N 秒后获取 | 0 |
| `--ua UA` | 自定义 User-Agent | 随机 |
| `--json` | JSON 输出格式 | false |
| `--stats` | 显示统计报告 | false |

---

## 📚 使用示例

### 1. 快速抓取静态页面

```bash
# 获取 GitHub README
node ~/src/user-scripts/skills/web-fetch/scripts/fetch-page.mjs "https://github.com/anthropics/claude-code"

# 获取新闻文章
node ~/src/user-scripts/skills/web-fetch/scripts/fetch-page.mjs "https://example.com/article/123" --output article.html
```

### 2. 动态 SPA 页面

```bash
# React/Vue 应用，等待 3 秒让 JS 执行
node ~/src/user-scripts/skills/web-fetch/scripts/fetch-page.mjs "https://app.example.com" --wait 3 --method playwright
```

### 3. 带截图

```bash
# 获取页面并截图
node ~/src/user-scripts/skills/web-fetch/scripts/fetch-page.mjs "https://example.com" --screenshot page.png
```

### 4. 绕过反爬虫

```bash
# 强反爬虫网站，使用 Playwright
node ~/src/user-scripts/skills/web-fetch/scripts/fetch-page.mjs "https://protected-site.com" --method playwright

# 或者使用 browser-use（带浏览器指纹）
node ~/src/user-scripts/skills/web-fetch/scripts/fetch-page.mjs "https://cloudflare-protected.com" --method browser-use
```

### 5. JSON 输出（便于程序处理）

```bash
node ~/src/user-scripts/skills/web-fetch/scripts/fetch-page.mjs "https://api.example.com" --json | jq '.content'
```

---

## 🏗️ 架构设计

### 方法选择流程

```
用户请求
    ↓
auto 模式？
    ├─ 是 → 尝试 curl → 失败 → playwright
    └─ 否 → 直接使用指定方法
    ↓
获取成功？
    ├─ 是 → 输出结果
    └─ 否 → 重试（最多 3 次，指数退避）
```

### 方法对比

#### Curl
```bash
# 优点
✅ 最快（~1 秒）
✅ 无需浏览器
✅ 低资源占用

# 缺点
❌ 无法执行 JS
❌ 无法绕过反爬虫
```

#### Playwright
```bash
# 优点
✅ 最强反爬虫绕过
✅ 完整浏览器功能
✅ Stealth 模式隐藏特征

# 缺点
❌ 最慢（~10-20 秒）
❌ 需要安装 playwright
```

---

## ⚙️ 配置选项

### 环境变量

```bash
# 设置默认 User-Agent
export WEB_FETCH_UA="Mozilla/5.0 ..."

# 设置默认超时
export WEB_FETCH_TIMEOUT=60000

# 设置默认方法
export WEB_FETCH_METHOD=browser-use
```

### Cookies 管理

```bash
# Cookies 自动保存在 cookies.txt
# 多次请求会自动复用登录状态
```

---

## 🧪 测试

```bash
# 测试 curl 方法
node ~/src/user-scripts/skills/web-fetch/scripts/fetch-page.mjs "https://example.com" --method curl

# 测试 agent-browser
node ~/src/user-scripts/skills/web-fetch/scripts/fetch-page.mjs "https://example.com" --method agent-browser

# 测试 browser-use
node ~/src/user-scripts/skills/web-fetch/scripts/fetch-page.mjs "https://example.com" --method browser-use

# 测试 playwright
node ~/src/user-scripts/skills/web-fetch/scripts/fetch-page.mjs "https://example.com" --method playwright
```

---

## 🐛 故障排查

### 问题 1：所有方法都失败

```bash
# 检查网络连接
curl -I https://example.com

# 检查是否被防火墙阻挡
ping example.com

# 尝试更换 User-Agent
node fetch-page.mjs "url" --ua "Mozilla/5.0 ..."
```

### 问题 2：内容为空

```bash
# 可能是动态内容，增加等待时间
node fetch-page.mjs "url" --wait 5

# 或者使用浏览器方法
node fetch-page.mjs "url" --method browser-use
```

### 问题 3：反爬虫检测

```bash
# 使用最强方法
node fetch-page.mjs "url" --method playwright

# 或者使用 browser-use 的 real 浏览器模式
browser-use --browser real open "url"
```

### 问题 4：需要登录

```bash
# 方法 1：先手动登录，保存 cookies
browser-use --browser real open "https://example.com/login"
# ... 手动登录 ...
browser-use cookies export cookies.json

# 方法 2：使用 browser-use 的 profile
browser-use --browser real --profile "Default" open "https://example.com"
```

---

## 📊 输出格式

### 标准输出

```markdown
## 网页内容

**URL**: https://example.com
**标题**: Example Domain
**方法**: curl
**耗时**: 1.23s

---

[网页 HTML 内容]
```

### JSON 输出

```json
{
  "success": true,
  "url": "https://example.com",
  "title": "Example Domain",
  "method": "curl",
  "content": "<html>...",
  "elapsed": 1234
}
```

---

## 🔧 依赖安装

```bash
# 基础依赖（curl 方法）
sudo pacman -S curl

# playwright 方法
cd ~/src/user-scripts/skills/web-fetch
npm install playwright puppeteer-extra puppeteer-extra-plugin-stealth
npx playwright install chromium
```

---

## 📈 性能对比

| 方法 | 平均耗时 | 成功率 | 资源占用 |
|------|----------|--------|----------|
| curl | ~1s | 60% | 低 |
| playwright | ~5-30s | 95% | 高 |

---

## 📝 完成标准

触发此 skill 时，任务完成必须满足：
- [ ] 网页内容已成功获取
- [ ] 输出包含 URL、标题、方法、耗时
- [ ] 失败时提供明确的错误信息和建议
- [ ] auto 模式已尝试 curl 和 playwright 至少一种方法

---

## 📚 参考资源

- [agent-browser](https://github.com/vercel-labs/agent-browser)
- [browser-use](https://github.com/browser-use/browser-use)
- [Playwright Stealth](https://github.com/berstend/puppeteer-extra)
- [User-Agent 列表](https://www.whatismybrowser.com/guides/the-latest-user-agent/)

---

*最后更新：2026-03-15 | 维护：~/src/user-scripts/skills/web-fetch/*
