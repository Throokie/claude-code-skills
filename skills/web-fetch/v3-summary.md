# web-fetch v3.0 完成总结

> **日期**: 2026-03-15
> **版本**: v3.0 - 并发模式 + 统计系统 + 浏览器扩展 + 域名屏蔽

---

## ✅ 完成功能

### 1. 并发抓取模式

**改动文件**: `scripts/fetch-page.mjs`

**新增功能**:
- `fetchConcurrent()` 函数，使用 `Promise.allSettled()` 并发执行 curl 和 playwright
- 自动比对结果，选择内容最完整的（按 contentLength 排序）
- 输出方法对比表格，显示各方法耗时和内容大小

**触发方式**:
```bash
--method all
--compare
```

**输出示例**:
```
| 方法       | 状态 | 耗时  | 内容长度   |
|-----------|------|-------|-----------|
| curl      | ✅   | 1.22s | 633986 bytes |
| playwright| ✅   | 6.20s | 726257 bytes |
✅ 选择 playwright 方法的结果（内容最完整）
```

---

### 2. 工具优先级统计系统

**新增文件**: `scripts/method-stats.js`, `data/method-stats.json`

**功能**:
- 记录每次请求的结果（域名、方法、成功/失败、内容大小、网页类型）
- 检测网页类型（blog, ecommerce, auth, cloudflare, news, wiki, code, social, docs 等）
- 当某域名某方法成功次数 >20 时，自动优先使用该方法
- 支持 `--stats` 查看统计报告
- 支持 `--priority` 强制使用优先级（忽略 20 次限制）

**数据结构**:
```json
{
  "baidu.com": {
    "playwright": {
      "success": 1,
      "failed": 0,
      "totalBytes": 726257,
      "pageTypes": { "general": 1 },
      "lastUpdated": "2026-03-15T02:09:27.665Z",
      "avgBytes": 726257
    }
  }
}
```

**统计报告示例**:
```
| 域名 | 方法 | 成功 | 失败 | 成功率 | 平均大小 | 主要网页类型 |
|------|------|------|------|--------|----------|-------------|
| wikipedia.org | playwright | 1 | 0 | 100.0% | 125.3KB | wiki |
```

---

### 3. 浏览器扩展接口

**新增文件**: `scripts/browser-extension.mjs`

**支持命令**:
```bash
# 打开网页
node browser-extension.mjs open "https://example.com"

# 保存为 MHTML（使用 curl 方案）
node browser-extension.mjs save-mhtml "https://example.com" -o page.mhtml

# 截图保存
node browser-extension.mjs screenshot "https://example.com" -o page.png

# 获取 HTML
node browser-extension.mjs html "https://example.com"

# 关闭浏览器
node browser-extension.mjs close
```

**推荐扩展**:
| 扩展 | 用途 | 链接 |
|------|------|------|
| Save as MHTML | 保存网页为 MHTML 格式 | Chrome Web Store |
| GoFullPage | 整页截图 | Chrome Web Store |
| FireShot | 截图 + 编辑 | Chrome Web Store |

---

### 4. 域名屏蔽

**改动文件**: `scripts/fetch-page.mjs`

**功能**:
- 禁止使用 example.com, example.org, example.net 等无效域名
- 推荐真实可用的测试域名：baidu.com, wikipedia.org, github.com
- 访问被禁域名时显示错误提示并退出

**代码实现**:
```javascript
const CONFIG = {
  BLOCKED_DOMAINS: [
    "example.com",
    "example.org",
    "example.net",
  ],
  TEST_DOMAINS: [
    "baidu.com",
    "wikipedia.org",
    "github.com",
  ],
};

// URL 验证时检查黑名单
for (const blocked of CONFIG.BLOCKED_DOMAINS) {
  if (hostname === blocked || hostname.endsWith(`.${blocked}`)) {
    log(`禁止访问的域名：${blocked}`, "error");
    log(`推荐使用：${CONFIG.TEST_DOMAINS.join(", ")}`, "info");
    process.exit(2);
  }
}
```

**输出示例**:
```
❌ 禁止访问的域名：example.com
ℹ️ 推荐使用：baidu.com, wikipedia.org, github.com
```

---

## 📝 新增 CLI 参数

| 参数 | 说明 |
|------|------|
| `--method all` | 并发模式，同时执行 curl 和 playwright |
| `--compare` | 比对模式，同 `--method all` |
| `--stats` | 查看统计报告（不需要 URL） |
| `--priority` | 强制使用优先级选择（忽略 20 次限制） |

---

## 📊 测试覆盖

**新增文件**: `scripts/test-all.sh`

**测试项目**:
1. ✅ 域名屏蔽（example.com 应该被禁止）
2. ✅ 统计报告（--stats）
3. ✅ 并发模式（baidu.com）
4. ✅ curl 单独模式（wikipedia.org）
5. ✅ 优先级选择（--priority）
6. ✅ 浏览器扩展接口（--help）
7. ✅ 最终统计报告

**运行测试**:
```bash
~/src/user-scripts/skills/web-fetch/scripts/test-all.sh
```

---

## 📦 新增/修改文件清单

```
skills/web-fetch/
├── scripts/
│   ├── fetch-page.mjs        # 修改：并发模式 + 统计集成 + 域名屏蔽
│   ├── method-stats.js       # 新增：统计系统模块
│   ├── browser-extension.mjs # 新增：浏览器扩展接口
│   └── test-all.sh           # 新增：完整测试脚本
├── data/
│   └── method-stats.json     # 新增：统计数据（git-ignored）
├── .gitignore                # 修改：添加 data/
├── RELEASE-v3.md             # 新增：v3.0 发布说明
└── README.md                 # 修改：更新为 v3.0 文档
```

---

## 🔄 Git 提交历史

```
025928d [docs] 更新 README 为 v3.0
fd1d09e [test] 添加完整测试脚本 test-all.sh
916c6fb [chore] 清理 data/.gitignore（已在根目录添加）
e7c9e00 [chore] 添加 data/ 到 .gitignore
dfc338c [feat] 域名屏蔽：禁止使用 example.com，改用 baidu.com 等真实域名
0a82466 [docs] 添加 v3.0 发布说明
de9f845 [chore] 添加 data 目录的.gitignore
1a5092d [feat] web-fetch v3.0 - 并发模式 + 统计系统 + 浏览器扩展
```

---

## 📈 性能对比

| 模式 | 耗时 | 适用场景 |
|------|------|----------|
| curl | ~1-3s | 静态 HTML |
| playwright | ~5-30s | 动态 SPA、反爬虫 |
| 并发模式 | ~5-30s | 不确定网站类型（推荐） |
| 优先级模式 | ~1-3s | 有 20+ 次成功数据后 |

---

## 🎯 使用建议

### 日常使用
```bash
# 自动模式（默认先 curl，失败再 playwright）
node fetch-page.mjs "https://example.com"

# 并发模式（推荐，自动比对选出最佳）
node fetch-page.mjs "https://example.com" --method all
```

### 调试/分析
```bash
# 查看统计报告
node fetch-page.mjs --stats

# 强制使用历史最优方法
node fetch-page.mjs "https://example.com" --priority
```

### 特定场景
```bash
# 静态内容（追求速度）
node fetch-page.mjs "https://example.com" --method curl

# 反爬虫网站（追求成功率）
node fetch-page.mjs "https://example.com" --method playwright
```

---

## ⚠️ 注意事项

1. **统计数据持久化**: `data/method-stats.json` 不纳入 git 版本控制
2. **优先级阈值**: 默认 20 次成功经验才启用优先级选择
3. **域名屏蔽**: example.com 等域名被禁止，使用真实域名测试
4. **浏览器扩展**: MHTML 保存使用 curl 方案（扩展调用有限制）

---

## 📚 参考文档

- [RELEASE-v3.md](./RELEASE-v3.md) - v3.0 发布说明
- [README.md](./README.md) - 使用指南
- [SKILL.md](./SKILL.md) - Skill 文档

---

*v3.0 完成总结 | 最后更新：2026-03-15*
