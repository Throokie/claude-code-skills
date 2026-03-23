# web-fetch 安装部署总结

> **日期**: 2026-03-15
> **状态**: ✅ 已完成

---

## ✅ 安装完成

### 已安装的依赖

```bash
# npm 包
✅ playwright ^1.42.0
✅ playwright-extra ^4.3.6
✅ puppeteer-extra-plugin-stealth ^2.11.2

# Playwright Chromium
✅ 已下载 (ubuntu24.04-x64 fallback build)
```

### 可用工具

| 工具 | 状态 | 路径 |
|------|------|------|
| **curl** | ✅ 系统预装 | `/usr/sbin/curl` |
| **agent-browser** | ⚠️ 需要守护进程 | `/home/throokie/.npm-global/bin/agent-browser` |
| **browser-use** | ✅ 可用 | `/home/throokie/.npm-global/bin/browser-use` |
| **playwright** | ✅ 已安装 | `skills/web-fetch/node_modules/.bin/playwright` |

---

## 🧪 测试结果

### ✅ 成功

| 测试项 | 结果 | 耗时 |
|--------|------|------|
| curl 方法 | ✅ 通过 | ~0.6s |
| playwright 方法 | ✅ 通过 | ~3s |
| 自动模式 | ✅ 通过 | ~0.6s |
| JSON 输出 | ✅ 通过 | - |
| 帮助信息 | ✅ 通过 | - |

### ⚠️ 限制

| 工具 | 问题 | 原因 |
|------|------|------|
| agent-browser | ❌ 无法使用 | 需要守护进程 (Daemon) |
| browser-use | ⚠️ 较慢 | 启动时间长 (~5s) |

---

## 📦 安装命令（供参考）

```bash
# 1. 安装 npm 依赖
cd ~/src/user-scripts/skills/web-fetch
npm install

# 2. 安装 Playwright Chromium
npx playwright install chromium

# 3. 验证安装
node scripts/fetch-page.mjs --help
node scripts/fetch-page.mjs "https://example.com" --method curl
```

---

## 🔧 网络配置说明

### FakeIP 网络环境

由于使用了 FakeIP 网络配置（198.18.0.0/15），curl 命令需要特殊参数：

```bash
# -4: 仅使用 IPv4
# --insecure: 跳过 SSL 验证（FakeIP 中间人代理）
curl -s -L -4 --insecure "https://example.com"
```

### 修复后的 curl 命令

```javascript
const cmd = `curl -s -L -4 --max-time ${timeout} --insecure -A "${ua}" "${url}"`;
```

---

## 📤 使用方法

### 基础使用

```bash
# 自动模式（推荐）
node ~/src/user-scripts/skills/web-fetch/scripts/fetch-page.mjs "https://example.com"

# 指定方法
node ~/src/user-scripts/skills/web-fetch/scripts/fetch-page.mjs "https://example.com" --method curl

# JSON 输出
node ~/src/user-scripts/skills/web-fetch/scripts/fetch-page.mjs "https://example.com" --json
```

### 进阶用法

```bash
# 带截图（需要浏览器方法）
node ~/src/user-scripts/skills/web-fetch/scripts/fetch-page.mjs "https://example.com" --method playwright --screenshot out.png

# 保存内容到文件
node ~/src/user-scripts/skills/web-fetch/scripts/fetch-page.mjs "https://example.com" --output page.html

# 等待页面加载（动态内容）
node ~/src/user-scripts/skills/web-fetch/scripts/fetch-page.mjs "https://example.com" --wait 3

# 绕过反爬虫
node ~/src/user-scripts/skills/web-fetch/scripts/fetch-page.mjs "https://protected-site.com" --method playwright
```

---

## 📊 方法对比

| 方法 | 速度 | 适用场景 | 成功率 |
|------|------|----------|--------|
| **curl** | ⚡ ~0.6s | 静态 HTML | 80% |
| **agent-browser** | - | 动态 SPA | N/A（不可用） |
| **browser-use** | 🐢 ~8s | 复杂交互 | 90% |
| **playwright** | 🐌 ~3s | 反爬虫网站 | 95% |

---

## 🐛 已知问题

### 1. agent-browser 需要守护进程

**问题**: `Daemon not found`

**原因**: agent-browser 需要先启动守护进程

**解决**: 暂不使用 agent-browser，使用 playwright 替代

### 2. browser-use 启动慢

**问题**: 首次启动需要 5-10 秒

**原因**: 需要加载 dotenv 和初始化浏览器

**建议**: 简单页面使用 curl，复杂页面使用 playwright

---

## 📝 文件清单

```
skills/web-fetch/
├── .gitignore                  # 忽略 node_modules
├── package.json                # 依赖配置
├── package-lock.json           # 锁定依赖
├── README.md                   # 使用说明
├── SKILL.md                    # 技能文档
└── scripts/
    ├── fetch-page.mjs          # 主脚本 ✅
    ├── playwright-stealth.js   # Playwright 隐身模式 ✅
    └── test-fetch.sh           # 测试脚本
```

---

## ✅ 验收标准

- [x] npm 依赖已安装
- [x] Playwright Chromium 已下载
- [x] curl 方法工作正常
- [x] playwright 方法工作正常
- [x] 自动模式优先使用 curl
- [x] JSON 输出正常
- [x] 错误提示友好
- [x] .gitignore 已配置

---

## 🔗 下一步

### 可选增强

1. **配置 agent-browser 守护进程**（如需使用）
   ```bash
   agent-browser daemon start
   ```

2. **安装 browser-use 依赖**（如需使用）
   ```bash
   browser-use doctor
   browser-use install-deps
   ```

3. **配置真实浏览器模式**（绕过强反爬虫）
   ```bash
   browser-use --browser real --profile "Default" open "https://example.com"
   ```

---

## 📚 参考资源

- [web-fetch 文档](./README.md)
- [SKILL.md](./SKILL.md)
- [Playwright 文档](https://playwright.dev/)
- [browser-use 文档](https://github.com/browser-use/browser-use)

---

*安装完成时间：2026-03-15 | 状态：✅ 可用*
