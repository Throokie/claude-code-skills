---
note: 由 3 个文件合并而成
---

# Mcp Comprehensive Guide.Md

> 本文件由 3 个独立文件合并而成

---
## mcp-auto-trigger-config

# MCP 工具自动触发规则配置

**日期**: 2026-03-15
**主题**: 配置 MCP 工具意图识别和自动调用

---

## 自动触发规则

### 1. Context7 MCP - 文档查询

**触发词**：
- "查文档"
- "API 怎么写"
- "怎么使用" / "怎么用"
- "xxx 库怎么用"

**示例**：
```
用户：查一下 Express 的中间件 API
→ 自动调用 Context7 MCP
```

---

### 2. Sequential Thinking MCP - 结构化推理

**触发词**：
- "逐步分析"
- "一步一步思考"
- "详细推理"
- "多步骤分析"

**示例**：
```
用户：逐步分析这个架构问题
→ 自动调用 Sequential Thinking MCP
```

---

### 3. GitHub MCP - Git/GitHub 操作

**触发词**：
- "GitHub"
- "gh "
- "PR" / "pull request"
- "issue"
- "commit"
- "branch"

**示例**：
```
用户：查看我的 issues
→ 自动调用 GitHub MCP

用户：创建一个新的 PR
→ 自动调用 GitHub MCP
```

---

### 4. Chrome DevTools MCP - 浏览器调试

**触发词**：
- "浏览器"
- "截图网页"
- "分析性能"
- "调试网页"
- "网页性能"

**示例**：
```
用户：截图这个网页：https://example.com
→ 自动调用 Chrome DevTools MCP

用户：分析这个页面的性能
→ 自动调用 Chrome DevTools MCP
```

---

## 触发优先级

```
1. 用户明确指定工具 → 使用指定的
2. 包含 MCP 触发词 → 调用对应 MCP
3. 模糊请求 → 询问澄清或使用默认方案
```

---

## 配置文件

### CLAUDE.md
位置：`~/.claude/CLAUDE.md`

添加了"MCP 工具自动触发规则"章节，包含触发词表格和说明。

### config.json
位置：`~/.claude/config.json`

```json
{
  "_auto_trigger": {
    "context7": ["查文档", "API 怎么写", "怎么使用", "怎么用", "xxx 库怎么用", "xxx 怎么用"],
    "sequential-thinking": ["逐步分析", "一步一步思考", "详细推理", "多步骤分析"],
    "github": ["GitHub", "gh ", "PR", "issue", "commit", "branch", "pull request"],
    "chrome-devtools": ["浏览器", "截图网页", "分析性能", "调试网页", "网页性能"]
  }
}
```

---

## 与现有 Skill 系统的整合

**现有 Skill 系统**（来自 万能初始化语句）：

| 用户输入 | 调用 Skill |
|----------|-----------|
| "搜索 X" | `tavily-search` |
| "找类似的" | `exa-search` |
| "深入研究" | `kimi` |
| "开发 X" | `product-builder` |
| "review 代码" | `code-review` |

**MCP 自动触发**（新增）：

| 用户输入 | 调用 MCP |
|----------|----------|
| "查文档" | Context7 |
| "逐步分析" | Sequential Thinking |
| "GitHub issues" | GitHub MCP |
| "截图网页" | Chrome DevTools |

**优先级**：
1. 先匹配 Skill 触发词
2. 再匹配 MCP 触发词
3. 都未匹配 → 进入普通对话

---

## 测试示例

### Context7 MCP 测试
```
用户：查一下 React hooks 怎么用
→ 自动调用 Context7 MCP
→ 返回最新文档和代码示例
```

### Sequential Thinking MCP 测试
```
用户：逐步分析：如何设计一个高并发的登录系统
→ 自动调用 Sequential Thinking MCP
→ 结构化多步骤分析
```

### GitHub MCP 测试
```
用户：查看我最近的 commit
→ 自动调用 GitHub MCP
→ 返回 commit 列表
```

### Chrome DevTools 测试
```
用户：截图这个网页：https://example.com
→ 自动调用 Chrome DevTools MCP
→ 返回网页截图
```

---

## 注意事项

1. **Token 安全**：GitHub Token 已配置在 `config.json` 的 `env` 中，不要泄露

2. **隐私保护**：Chrome DevTools 已配置 `--no-usage-statistics` `--no-performance-crux` 拦截 Google 请求

3. **MCP 不是万能**：
   - Context7 只支持 npm 包文档
   - GitHub MCP 需要网络可达
   - Chrome DevTools 需要 Chrome 浏览器已安装

4. **关闭自动触发**：如果不想用自动触发，可以直接说"不要用 MCP"

---

## 重启 Claude Code 后生效

配置保存在 `CLAUDE.md` 和 `config.json`，重启会话后自动加载。


---

## mcp-server-deployment-guide

# MCP 工具扩展部署记录

**日期**: 2026-03-15
**主题**: MCP 服务器扩展部署（5 个 → 13 个）

---

## 部署概述

本次部署将 MCP 服务器从原有的 5 个扩展到 13 个，涵盖文件操作、版本控制、网络搜索、浏览器自动化、数据库、容器管理、记忆存储和通知推送等功能。

---

## MCP 服务器列表

### 现有 MCP（5 个，保留）

| # | 名称 | 包名 | 用途 |
|---|------|------|------|
| 1 | weixin_search_mcp | `weixin_search_mcp` (uvx) | 微信搜索 |
| 2 | chrome-devtools | `chrome-devtools-mcp` | 浏览器调试 |
| 3 | context7 | `@upstash/context7-mcp` | npm 文档查询 |
| 4 | sequential-thinking | `@modelcontextprotocol/server-sequential-thinking` | 结构化推理 |
| 5 | github | `github-mcp-server` | GitHub 操作 |

### 新增 MCP（8 个）

#### 第一梯队：强烈推荐（3 个）

| # | 名称 | 包名 | 用途 |
|---|------|------|------|
| 6 | filesystem | `@modelcontextprotocol/server-filesystem` | 文件读写、目录管理 |
| 7 | git | `@cyanheads/git-mcp-server` | Git 操作 |
| 8 | tavily-search | `tavily-mcp` | AI 网络搜索 |

#### 第二梯队：建议考虑（5 个）

| # | 名称 | 包名 | 用途 |
|---|------|------|------|
| 9 | puppeteer | `@hisma/server-puppeteer` | 浏览器自动化 |
| 10 | sqlite | `mcp-server-sqlite-npx` | SQLite 数据库 |
| 11 | docker | `@thelord/mcp-server-docker-npx` | Docker 容器管理 |
| 12 | memory | `@modelcontextprotocol/server-memory` | 知识图谱记忆 |
| 13 | discord | `@taeraekim/discord-mcp` | Discord 通知 |

---

## 详细配置

### Filesystem MCP

```json
{
  "filesystem": {
    "command": "npx",
    "args": [
      "-y",
      "@modelcontextprotocol/server-filesystem",
      "/home/throokie",
      "/tmp"
    ]
  }
}
```

**安全配置**: 已限制访问目录为 `/home/throokie` 和 `/tmp`

### Git MCP

```json
{
  "git": {
    "command": "npx",
    "args": ["-y", "@cyanheads/git-mcp-server"]
  }
}
```

**注意**: 原计划使用 `@modelcontextprotocol/server-git`，但该包不存在，改用社区维护版本

### Tavily Search MCP

```json
{
  "tavily-search": {
    "command": "npx",
    "args": ["-y", "tavily-mcp"],
    "env": {
      "TAVILY_API_KEY": "${TAVILY_API_KEY}"
    }
  }
}
```

**注意**: 需要设置 `TAVILY_API_KEY` 环境变量

### Puppeteer MCP

```json
{
  "puppeteer": {
    "command": "npx",
    "args": ["-y", "@hisma/server-puppeteer"]
  }
}
```

**注意**: 原官方包已废弃，改用 `@hisma` 维护版本

### SQLite MCP

```json
{
  "sqlite": {
    "command": "npx",
    "args": ["-y", "mcp-server-sqlite-npx"]
  }
}
```

### Docker MCP

```json
{
  "docker": {
    "command": "npx",
    "args": ["-y", "@thelord/mcp-server-docker-npx"]
  }
}
```

**注意**: 原计划使用 `@modelcontextprotocol/server-docker`，但该包不存在

### Memory MCP

```json
{
  "memory": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-memory"]
  }
}
```

### Discord MCP

```json
{
  "discord": {
    "command": "npx",
    "args": ["-y", "@taeraekim/discord-mcp"],
    "env": {
      "DISCORD_BOT_TOKEN": "${DISCORD_BOT_TOKEN}",
      "DISCORD_CLIENT_ID": "${DISCORD_CLIENT_ID}",
      "DISCORD_GUILD_ID": "${DISCORD_GUILD_ID}"
    }
  }
}
```

**注意**: 需要 Discord Bot Token

---

## 包名修正总结

| 原计划包名 | 实际使用包名 | 原因 |
|-----------|-------------|------|
| `@modelcontextprotocol/server-git` | `@cyanheads/git-mcp-server` | 官方包不存在 |
| `@modelcontextprotocol/server-puppeteer` | `@hisma/server-puppeteer` | 官方包已废弃 |
| `@modelcontextprotocol/server-docker` | `@thelord/mcp-server-docker-npx` | 官方包不存在 |
| `@modelcontextprotocol/server-sqlite` | `mcp-server-sqlite-npx` | 官方包不存在 |
| `@upstash/memory` | `@modelcontextprotocol/server-memory` | 使用官方版本 |

**教训**: MCP 生态系统仍在发展中，许多官方包尚未发布或已转由社区维护。在部署前应先用 `npm search` 验证包名。

---

## 测试验证

| 工具 | 测试结果 |
|------|----------|
| filesystem | ✅ 正常启动 |
| git | ✅ 正常启动 |
| tavily-search | ✅ 正常启动（需 API Key） |
| puppeteer | ✅ 正常启动 |
| sqlite | ✅ 正常启动 |
| docker | ✅ 正常启动 |
| memory | ✅ 正常启动 |
| discord | ⚠️ SIGTERM（需 Token，正常） |

---

## 自动触发规则

已在 `_auto_trigger` 中配置以下触发词：

| MCP | 触发词 |
|-----|--------|
| filesystem | 读取文件、写入文件、创建目录、列出文件、文件管理、查看目录 |
| git | git 操作、查看 diff、git status、git log、切换分支 |
| tavily-search | tavily 搜索、快速搜索、网络搜索 |
| puppeteer | 浏览器自动化、网页抓取、puppeteer |
| docker | docker 容器、docker 镜像、容器管理 |
| discord | discord 通知、发送 discord |

---

## MCP 优先策略（2026-03-15 更新）

**核心原则**：MCP 优先，Skill 后备。

### 决策流程

```
用户请求 → 识别意图 → 优先 MCP → MCP 无法满足 → 降级 Skill
```

### 触发词优先级

| 优先级 | 触发词 | 调用目标 |
|--------|--------|----------|
| 高 | "tavily 搜索"、"git 操作"、"filesystem" | MCP |
| 中 | "搜索 X"、"查一下 X" | 先 MCP，后 Skill |
| 低 | "深入研究"、"全面分析" | Kimi / Skill |

### 配置文件修改

**文件**: `~/.config/claude-code/prompts/hyprland-safe.md`

修改内容：
1. 将"自动 Skill 调用"改为"自动工具调用"
2. 添加 MCP 优先原则章节
3. 意图识别规则改为优先 MCP
4. 决策优先级改为 MCP 优先

---

## Token 配置（已完成）

## Token 配置（已完成）

以下 Token 已从现有 Skill 配置中获取并配置到 `config.json`：

| Token | 值 | 来源 |
|-------|-----|------|
| `TAVILY_API_KEY` | `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` | 环境变量 |
| `DISCORD_BOT_TOKEN` | `MTQ4...W7Js4` (已脱敏) | `discord-channel-creator/config.json` |
| `DISCORD_GUILD_ID` | `1481308907849646182` | `discord-channel-creator/config.json` |

**无需额外配置**，重启 Claude Code 后即可使用。

---

## 配置文件位置

`~/.claude/config.json`
`~/.config/claude-code/prompts/hyprland-safe.md`

---

*部署完成时间：2026-03-15*
*MCP 优先策略配置完成时间：2026-03-15*


---

## mcp-tool-usage-standards

# MCP 工具调用规范 - 2026-03-15 教训

> **日期**: 2026-03-15
> **类型**: 工具使用规范
> **重要程度**: ⭐⭐⭐⭐⭐

---

## 🚨 问题触发

用户要求："逐步分析这个项目问题"

**错误行为**：
1. 没有调用 `sequential-thinking` MCP，而是直接用 bash 命令分析
2. 尝试 `WebFetch` 失败后，当作没发生继续输出
3. 给用户虚假印象，假装工具调用成功了

---

## ❌ 错误做法

```
❌ 有 MCP 不用，直接用 bash 绕过
❌ WebFetch 失败 → 沉默跳过 → 继续输出假装正常
❌ 失败后不告知用户，让用户无法信任输出
```

---

## ✅ 正确做法

```
✅ 有 MCP 必须优先使用
✅ 工具失败 → 明确告知 → 询问替代方案
✅ 透明化：哪些是知道的，哪些是假设的
```

---

## 📋 MCP 服务清单

位置：`~/.claude/mcp.json`

| 服务 | 用途 | 触发关键词 |
|------|------|------------|
| `context7` | 查 npm 包文档 | "API 怎么写"、"xxx 库怎么用" |
| `sequential-thinking` | 结构化推理 | "逐步分析"、"一步一步思考"、"详细推理" |
| `github` | GitHub 操作 | "GitHub"、"PR"、"issue"、"commit" |
| `chrome-devtools` | 浏览器调试 | "浏览器"、"截图网页"、"分析性能" |
| `weixin_search_mcp` | 微信搜索 | 微信相关内容 |

---

## 🔧 错误处理流程

```markdown
1. 工具调用失败
   ↓
2. 明确告知用户："XXX 工具调用失败，原因是..."
   ↓
3. 说明失败原因：网络问题？配置问题？权限问题？
   ↓
4. 询问替代方案："是否用 curl 代替？" "是否手动执行？"
```

---

## 📝 内化规则

**写入 MEMORY.md**：
- 工具使用规范章节已更新
- 添加 MCP 调用规范和错误处理流程

**写入防踩坑笔记**：
- 位置：`~/.claude/.learnings/`
- 标题："MCP 服务调用和错误透明化"

**新会话检查**：
- 新会话启动时必须读取本教训
- 检查 MCP 配置是否正常加载

---

## 🎯 行为改变

| 场景 | 之前 | 现在 |
|------|------|------|
| 有 MCP 可用 | 可能用 bash 绕过 | 必须优先使用 MCP |
| 工具失败 | 沉默跳过 | 明确告知 + 问替代方案 |
| 不确定 | 假装知道 | 直接承认 + 问用户 |

---

## 🔗 相关文档

- `~/.claude/mcp.json` - MCP 服务配置
- `~/.claude/projects/-home-throokie/memory/MEMORY.md` - 工具使用规范
- `~/src/user-scripts/CONVENTIONS.md` - 统一规范文档

---

*此教训已存入长久记忆，未来会话必须遵守*


---

