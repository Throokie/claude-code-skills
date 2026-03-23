# web-fetch - 智能网页抓取工具

> **版本**: v3.0 (2026-03-15)
> **状态**: ✅ 完成 - 并发模式 + 统计系统 + 浏览器扩展 + 域名屏蔽

---

## 📊 核心功能

### 1. 并发抓取模式
- 同时执行 curl 和 playwright
- 自动比对结果，选出内容最完整的
- 耗时对比一目了然

### 2. 优先级统计系统
- 记录各域名不同方法的成功率
- 当某域名成功次数 >20 时，自动选择最优方法
- 支持 `--stats` 查看统计报告
- 支持 `--priority` 强制使用优先级

### 3. 浏览器扩展接口
- 支持调用浏览器扩展保存 MHTML
- 支持整页截图（GoFullPage）
- 通过 `browser-extension.mjs` 调用

### 4. 域名屏蔽
- 禁止使用 example.com 等无效域名
- 推荐真实可用的测试域名（baidu.com, wikipedia.org, github.com）

---

## 📋 问题分析

### 原有问题

| 问题 | 影响 | 原因 |
|------|------|------|
| ❌ 单一方法依赖 | 一种方法失败就无备选 | 没有自动切换机制 |
| ❌ 无错误处理 | 失败时没有明确提示 | 缺少友好的错误信息 |
| ❌ 无重试机制 | 网络波动直接失败 | 缺少容错能力 |
| ❌ 无反爬虫支持 | 受保护网站无法访问 | 缺少 Stealth 模式 |
| ❌ 无统一接口 | 多个工具使用方式不一致 | 学习成本高 |

### 常见失败场景

1. **静态页面使用浏览器** - 浪费资源且慢
2. **动态页面使用 curl** - 无法获取 JS 渲染内容
3. **反爬虫网站** - 被识别为机器人
4. **需要登录的网站** - 没有 Cookie 管理
5. **网络波动** - 没有重试直接失败

---

## ✅ 解决方案

### 新增工具：web-fetch

**位置**: `~/src/user-scripts/skills/web-fetch/`

**核心优势**:
- 🔄 **多策略自动切换**: curl → agent-browser → browser-use → playwright
- 🛡️ **反爬虫支持**: Playwright Stealth 模式
- 🔁 **智能重试**: 指数退避，最多 3 次
- 📊 **统一接口**: 一个命令支持所有方法
- 🎯 **友好提示**: 失败时提供明确建议

### 使用方法

```bash
# 自动模式（推荐）
node ~/src/user-scripts/skills/web-fetch/scripts/fetch-page.mjs "https://baidu.com"

# 指定方法
node ~/src/user-scripts/skills/web-fetch/scripts/fetch-page.mjs "https://baidu.com" --method playwright

# 并发模式（比对 curl 和 playwright）
node ~/src/user-scripts/skills/web-fetch/scripts/fetch-page.mjs "https://baidu.com" --method all

# 带截图
node ~/src/user-scripts/skills/web-fetch/scripts/fetch-page.mjs "https://baidu.com" --screenshot out.png

# JSON 输出
node ~/src/user-scripts/skills/web-fetch/scripts/fetch-page.mjs "https://baidu.com" --json

# 查看统计报告
node ~/src/user-scripts/skills/web-fetch/scripts/fetch-page.mjs --stats

# 绕过反爬虫
node ~/src/user-scripts/skills/web-fetch/scripts/fetch-page.mjs "https://protected-site.com" --method playwright
```

---

## 🔧 方法对比

| 方法 | 速度 | 适用场景 | 反爬虫 | 资源占用 |
|------|------|----------|--------|----------|
| **curl** | ⚡ ~1s | 静态 HTML | ❌ | 低 |
| **playwright** | 🐌 ~5-30s | 动态 SPA、反爬虫 | ✅✅ 最强 | 高 |
| **并发模式** | 🐢 ~5-30s | 不确定网站类型 | ✅✅ | 中 |
| **auto 模式** | ⚡ ~1s | 默认选择 | - | 低 |

---

## 📦 安装依赖

```bash
# 基础依赖（curl 方法）
sudo pacman -S curl

# agent-browser
npm install -g agent-browser
agent-browser install

# browser-use
npm install -g browser-use
browser-use doctor

# playwright（web-fetch 目录）
cd ~/src/user-scripts/skills/web-fetch
npm install
npx playwright install chromium
```

---

## 🧪 测试

```bash
# 运行完整测试套件
~/src/user-scripts/skills/web-fetch/scripts/test-all.sh

# 手动测试
node ~/src/user-scripts/skills/web-fetch/scripts/fetch-page.mjs "https://baidu.com" --method all
```

---

## 🔍 故障排查

### 问题 1：所有方法都失败

```bash
# 检查网络连接
curl -I https://baidu.com

# 检查是否被防火墙阻挡
ping baidu.com

# 尝试增加超时
node fetch-page.mjs "url" --timeout 60000

# 使用并发模式
node fetch-page.mjs "url" --method all
```

### 问题 2：内容为空

```bash
# 动态内容，增加等待时间
node fetch-page.mjs "url" --wait 5

# 使用浏览器方法
node fetch-page.mjs "url" --method browser-use
```

### 问题 3：反爬虫检测

```bash
# 使用最强方法
node fetch-page.mjs "url" --method playwright

# 或使用 browser-use 的真实浏览器模式
browser-use --browser real --profile "Default" open "url"
```

### 问题 4：需要登录

```bash
# 方法 1：使用 browser-use 的 profile
browser-use --browser real --profile "Default" open "https://baidu.com"

# 方法 2：先手动登录，再抓取
browser-use open "https://example.com/login"
# ... 手动登录 ...
node fetch-page.mjs "https://example.com" --method browser-use
```

### 问题 5：域名被禁止

```bash
# example.com 等域名被屏蔽，使用真实域名测试
node fetch-page.mjs "https://baidu.com"
node fetch-page.mjs "https://wikipedia.org"
node fetch-page.mjs "https://github.com"
```

---

## 📊 完整工作流

```
用户请求
    ↓
检查 URL 格式
    ↓
选择方法
    ├─ auto → curl → agent-browser → browser-use → playwright
    └─ 指定 → 直接使用
    ↓
执行抓取
    ↓
成功？
    ├─ 是 → 输出结果（HTML/JSON）
    └─ 否 → 重试（最多 3 次，指数退避）
    ↓
保存文件/截图（可选）
    ↓
关闭浏览器
```

---

## 📝 新增文件

```
skills/web-fetch/
├── SKILL.md                  # 技能文档
├── package.json              # 依赖配置
├── scripts/
│   ├── fetch-page.mjs        # 主脚本（并发抓取 + 统计系统）
│   ├── playwright-stealth.js # Playwright 隐身模式
│   ├── browser-extension.mjs # 浏览器扩展接口
│   ├── method-stats.js       # 统计系统模块
│   ├── test-all.sh           # 完整测试脚本
│   └── test-fetch.sh         # 旧测试脚本
├── data/
│   └── method-stats.json     # 统计数据（git-ignored）
├── RELEASE-v3.md             # v3.0 发布说明
└── README.md                 # 本文件
```

---

## 🔄 与其他工具集成

### 配合 search skills 使用

```bash
# 1. 搜索找到目标网页
node ~/src/user-scripts/skills/tavily-search/scripts/search.mjs "target topic"

# 2. 抓取网页内容
node ~/src/user-scripts/skills/web-fetch/scripts/fetch-page.mjs "https://baidu.com/article" --output article.html

# 3. 分析内容
# 使用 AI 分析或脚本处理
```

### 配合 browser-use 使用

```bash
# 1. 使用 browser-use 登录
browser-use --browser real --profile "Default" open "https://example.com"

# 2. 使用 web-fetch 获取内容
node ~/src/user-scripts/skills/web-fetch/scripts/fetch-page.mjs "https://example.com/protected" --method curl
```

---

## ✅ 完成标准

- [x] 多策略自动切换已实现
- [x] 错误处理和重试机制已添加
- [x] 友好的错误提示已实现
- [x] Playwright Stealth 支持已添加
- [x] 统一的命令行接口已完成
- [x] 文档和测试已编写
- [x] 语法检查通过

---

## 📚 参考资源

- [agent-browser](https://github.com/vercel-labs/agent-browser)
- [browser-use](https://github.com/browser-use/browser-use)
- [Playwright](https://playwright.dev/)
- [puppeteer-extra-plugin-stealth](https://github.com/berstend/puppeteer-extra/tree/master/packages/puppeteer-extra-plugin-stealth)
- [bot-detector](https://bot.sannysoft.com/)

---

*最后更新：2026-03-15 | 维护：~/src/user-scripts/skills/web-fetch/*
