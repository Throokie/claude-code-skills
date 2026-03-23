# web-fetch v3.0 发布说明

> **日期**: 2026-03-15
> **版本**: v3.0 - 并发模式 + 统计系统 + 浏览器扩展支持

---

## 🎉 新增功能

### 1. 并发抓取模式

**之前**: 串行执行，先 curl 失败再 playwright
**现在**: 并发执行 curl 和 playwright，比对结果选出最佳

```bash
# 并发模式（自动比对）
node ~/src/user-scripts/skills/web-fetch/scripts/fetch-page.mjs "https://stackoverflow.com" --method all

# 输出示例:
# | 方法       | 状态 | 耗时  | 内容长度   |
# |-----------|------|-------|-----------|
# | curl      | ❌   | 0.61s | 0 bytes   |
# | playwright| ✅   | 28.28s| 380078 bytes |
# ✅ 选择 playwright 方法的结果（内容最完整）
```

### 2. 工具优先级统计系统

**功能**:
- 自动记录每次请求的结果（域名、方法、成功/失败、内容大小、网页类型）
- 当某域名成功次数 >20 时，自动选择历史最优方法
- 支持 `--stats` 查看统计报告
- 支持 `--priority` 强制使用优先级（忽略 20 次限制）

```bash
# 查看统计报告
node ~/src/user-scripts/skills/web-fetch/scripts/fetch-page.mjs --stats

# 输出示例:
# # 工具请求成功统计
# | 域名 | 方法 | 成功 | 失败 | 成功率 | 平均大小 | 主要网页类型 |
# |------|------|------|------|--------|----------|-------------|
# | example.com | curl | 6 | 0 | 100.0% | 528B | general |
# | archlinux.org | curl | 3 | 0 | 100.0% | 24.4KB | general |
```

**数据存储**: `skills/web-fetch/data/method-stats.json`

### 3. 浏览器扩展调用接口

**新增脚本**: `browser-extension.mjs`

**支持命令**:
```bash
# 打开网页
node ~/src/user-scripts/skills/web-fetch/scripts/browser-extension.mjs open "https://example.com"

# 保存为 MHTML（使用 curl 方案）
node ~/src/user-scripts/skills/web-fetch/scripts/browser-extension.mjs save-mhtml "https://example.com" -o page.mhtml

# 截图保存
node ~/src/user-scripts/skills/web-fetch/scripts/browser-extension.mjs screenshot "https://example.com" -o page.png

# 获取 HTML
node ~/src/user-scripts/skills/web-fetch/scripts/browser-extension.mjs html "https://example.com"

# 关闭浏览器
node ~/src/user-scripts/skills/web-fetch/scripts/browser-extension.mjs close
```

**推荐扩展**:
| 扩展 | 用途 | 链接 |
|------|------|------|
| Save as MHTML | 保存网页为 MHTML 格式 | [Chrome Web Store](https://chromewebstore.google.com/detail/save-as-mhtml/ahgakckdonjmnpnegjcamhagackmjpei) |
| GoFullPage | 整页截图 | [Chrome Web Store](https://chromewebstore.google.com/detail/gofullpage-full-page-scre/fdpohaocaechififmbbbbbknoalclacl) |
| FireShot | 截图 + 编辑 | [Chrome Web Store](https://chromewebstore.google.com/detail/take-webpage-screenshots/mcbpblocgmgfnpjjppndjkmgjaogfceg) |

---

## 🔧 使用示例

### 快速开始

```bash
# 最简单用法
node ~/src/user-scripts/skills/web-fetch/scripts/fetch-page.mjs "https://example.com"

# 查看统计报告
node ~/src/user-scripts/skills/web-fetch/scripts/fetch-page.mjs --stats

# 并发模式（推荐）
node ~/src/user-scripts/skills/web-fetch/scripts/fetch-page.mjs "https://example.com" --method all

# 强制使用优先级（测试用）
node ~/src/user-scripts/skills/web-fetch/scripts/fetch-page.mjs "https://example.com" --priority
```

### 优先级选择工作原理

1. 每次请求后自动记录结果到 `method-stats.json`
2. 当访问相同域名时，检查历史数据
3. 如果某方法成功次数 >= 20，自动优先使用该方法
4. 否则使用并发模式或默认顺序

```bash
# 示例流程：
# 1. 前 20 次访问 example.com 都使用 curl（并发执行）
# 2. 第 21 次访问时，自动选择 curl（因为历史成功率 100%）
# 3. 如果某天 curl 开始失败，记录会降低成功率，自动切换
```

---

## 📊 统计数据结构

```json
{
  "example.com": {
    "curl": {
      "success": 25,
      "failed": 2,
      "totalBytes": 13200,
      "pageTypes": {
        "general": 25
      },
      "lastUpdated": "2026-03-15T10:00:00.000Z",
      "avgBytes": 528
    },
    "playwright": {
      "success": 5,
      "failed": 1,
      "totalBytes": 3000,
      "pageTypes": {
        "general": 5
      },
      "lastUpdated": "2026-03-15T09:00:00.000Z",
      "avgBytes": 600
    }
  }
}
```

---

## 🚀 性能对比

| 模式 | 耗时 | 适用场景 |
|------|------|----------|
| curl | ~0.5-2s | 静态 HTML，成功率 80% |
| playwright | ~3-30s | 反爬虫网站，成功率 95% |
| 并发模式 | ~3-30s | 不确定网站类型时（推荐） |
| 优先级模式 | ~0.5-2s | 有 20+ 次成功数据后 |

---

## 📝 完整命令参考

### fetch-page.mjs

```
用法：fetch-page.mjs <url> [选项]

选项:
  --method METHOD     抓取方法：curl, playwright, all, auto (默认：auto)
  --timeout MS        超时时间 (毫秒，默认：30000)
  --retry             启用重试 (默认：true)
  --no-retry          禁用重试
  --output FILE       输出到文件
  --screenshot FILE   保存截图
  --wait N            等待 N 秒后获取内容
  --ua UA             自定义 User-Agent
  --json              JSON 输出格式
  --compare           启用多方法比对模式
  --stats             显示统计报告
  --priority          强制使用优先级模式（忽略 20 次限制）
  -h, --help          显示帮助
```

### browser-extension.mjs

```
用法：browser-extension.mjs <命令> [参数]

命令:
  open <url>                    打开网页
  close                         关闭浏览器
  save-mhtml <url> -o <文件>     保存为 MHTML
  screenshot <url> -o <文件>     截图保存
  html <url>                    获取 HTML
  status                        检查浏览器状态

选项:
  -o, --output <文件>           输出文件路径
  -t, --timeout <秒>            超时时间
  -h, --help                    显示帮助
```

---

## ⚠️ 注意事项

1. **浏览器扩展限制**: 由于 browser-use 的限制，直接调用浏览器扩展（如 Save as MHTML）可能不可靠。目前 `save-mhtml` 命令使用 curl 作为后备方案。

2. **统计数据持久化**: 统计数据保存在 `skills/web-fetch/data/method-stats.json`，不会被 git 跟踪（已添加到.gitignore）。

3. **优先级阈值**: 默认 20 次成功经验才启用优先级选择，可通过 `--priority` 参数强制使用。

---

## 🔗 相关文档

- [INSTALL.md](./INSTALL.md) - 安装部署指南
- [SKILL.md](./SKILL.md) - Skill 使用说明
- [README.md](./README.md) - 问题修复总结

---

*最后更新：2026-03-15 | 维护者：~/src/user-scripts/skills/web-fetch/*
