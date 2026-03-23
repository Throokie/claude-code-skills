# CLAUDE.md - 主入口配置文件

> 本文件采用 Memory Bank 系统，加载多个记忆文件形成完整上下文
>
> **位置**: `~/.claude/CLAUDE.md`
> **版本**: v7.1 (Knowledge Hub 迁移版) | **最后更新**: 2026-03-23
> **变更**: 删除软链接管理，所有文件直接管理

---

## 🐍 Python 环境管理（强制）

**用户系统使用 `uv` 管理 Python，禁止直接使用 pip/venv！**

| ❌ 禁止 | ✅ 正确 |
|--------|--------|
| `pip install` | `uv pip install` |
| `python -m venv` | `uv venv` |
| `pip freeze` | `uv pip freeze` |
| `pip list` | `uv pip list` |
| `pip uninstall` | `uv pip uninstall` |
| `python -m pip` | `uv pip` |
| `virtualenv` | `uv venv` |
| `poetry` / `pipenv` | `uv` |

**安装项目依赖**:
```bash
# 从 requirements.txt
uv pip install -r requirements.txt

# 创建虚拟环境
uv venv
source .venv/bin/activate.fish
```

**⚠️ 违反此规则会导致每次会话需要纠正！**

---

## 📚 Rules 系统（新增）

**位置**: `~/.claude/rules/`

### 规则分层结构

```
rules/
├── common/          # 语言无关原则（始终加载）
│   ├── coding-style.md    # 编码风格、不可变性、错误处理
│   ├── git-workflow.md    # Git 工作流、提交规范
│   ├── testing.md         # 测试要求、80% 覆盖率
│   ├── performance.md     # 性能优化、模型选择
│   ├── patterns.md        # 通用设计模式
│   ├── hooks.md           # Hooks 系统配置
│   ├── agents.md          # Agent 编排
│   └── security.md        # 安全指南
├── typescript/      # TypeScript/JavaScript 专用
├── python/          # Python 专用
├── golang/          # Go 专用
├── java/            # Java/Spring Boot 专用
├── kotlin/          # Kotlin/Android 专用
├── rust/            # Rust 专用
├── cpp/             # C++ 专用
├── csharp/          # C# 专用
├── swift/           # Swift 专用
├── php/             # PHP 专用
└── perl/            # Perl 专用
```

### 规则优先级

- **language-specific > common**（具体覆盖一般）
- 例如：`rules/golang/coding-style.md` 可以覆盖 `rules/common/coding-style.md` 的不可变性原则

### 使用方式

Rules 会自动加载，无需手动触发。AI 会根据项目语言自动应用对应规则。

---

## 🤖 Agents 系统（新增）

**位置**: `~/.claude/agents/`

### 可用 Agents（28 个）

| Agent | 用途 | 何时使用 |
|-------|------|----------|
| **planner** | 实现计划 | 复杂功能、重构 |
| **architect** | 系统设计 | 架构决策 |
| **tdd-guide** | 测试驱动开发 | 新功能、Bug 修复 |
| **code-reviewer** | 代码审查 | 写完代码后立即使用 |
| **security-reviewer** | 安全分析 | 提交前 |
| **build-error-resolver** | 修复构建错误 | 构建失败时 |
| **e2e-runner** | E2E 测试 | 关键用户流程 |
| **refactor-cleaner** | 死代码清理 | 代码维护 |
| **doc-updater** | 文档更新 | 更新文档 |
| **rust-reviewer** | Rust 代码审查 | Rust 项目 |
| **python-reviewer** | Python 代码审查 | Python 项目 |
| **kotlin-reviewer** | Kotlin 代码审查 | Kotlin 项目 |
| **java-reviewer** | Java 代码审查 | Java/Spring 项目 |
| **go-reviewer** | Go 代码审查 | Go 项目 |
| **typescript-reviewer** | TS 代码审查 | TS 项目 |
| **cpp-reviewer** | C++ 代码审查 | C++ 项目 |
| **database-reviewer** | PostgreSQL 专家 | SQL、schema 设计 |
| **flutter-reviewer** | Flutter 代码审查 | Flutter 项目 |
| **chief-of-staff** | 通信分类 | 邮件、Slack、LINE |

### 使用方式

在对话中直接描述需求，系统会自动调用相应 Agent：
- "这个功能怎么实现" → **planner**
- "review 一下代码" → **code-reviewer**
- "写个测试" → **tdd-guide**
- "架构怎么设计" → **architect**

---

## 📚 Skills 系统

**位置**: `~/.claude/skills/`

### 当前技能（23个）

```
~/.claude/skills/
├── arch-linux
├── article-writing
├── browser-use
├── code-review
├── decision-record
├── github
├── knowledge-hub
├── long-doc-generator
├── long-running-agent
├── model-compare-search
├── orchestrator
├── prd-evolution
├── prd-to-code
├── prompt-expert
├── prompt-optimizer
├── puppeteer-cli
├── site-analyzer
├── skill-creator
├── skill-stocktake
├── src-link
├── th-ralph
├── unified-search
└── web-fetch
```

### 添加新 Skill

```bash
# 从 src 备份库复制
mkdir -p ~/.claude/skills/my-skill
cp ~/src/projects/tools/user-scripts/skills/XX-分类/my-skill/SKILL.md ~/.claude/skills/my-skill/

# 提交到 git
cd ~/.claude
git add skills/my-skill
git commit -m "添加 my-skill"
```

---

### 使用方式

**自动触发** - Skills 会根据你的请求自动触发：

| 类别 | 触发词示例 | 调用的 Skill |
|------|-----------|-------------|
| **代码审查** | "review 代码"、"代码审查" | `code-review` |
| **安全审计** | "安全审查"、"漏洞检测" | `security-review` |
| **TDD** | "写测试"、"TDD" | `tdd-workflow` |
| **E2E 测试** | "E2E 测试"、"Playwright" | `e2e-optimizer` |
| **Agent** | "创建 Agent"、"多代理协作" | `agent-factory`、`orchestrator` |
| **架构** | "架构设计"、"系统设计" | `architect` |
| **规划** | "怎么实现"、"实现计划" | `planner` |
| **深度研究** | "深度研究"、"调研" | `deep-research` |
| **框架** | "Django 项目"、"Spring Boot" | `django-patterns`、`springboot-patterns` |

**配置文件**:
- `~/.claude/skills-auto-trigger.json` - 触发词映射
- `~/.claude/skills/skills-category.json` - 分类元数据
- `~/.claude/skills/README.md` - 技能库使用说明

---

## 🚫 禁止重启 kitty 终端

**规则**：**禁止执行 `pkill kitty` 或任何重启 kitty 终端的操作**

**原因**：非 tmux 窗口中的任务会因终端关闭而终止，导致工作丢失

**正确做法**：
- 使用 `kitty @ load-config` 重新加载配置（如果支持）
- 告知用户手动重启终端
- 优先使用 `hyprctl reload` 重载 Hyprland 配置

---

## 🔧 工具使用规范

### 🚫 禁止使用 `fetch` / `WebFetch` 工具

**规则**：任何情况下都**禁止使用**内置的 `fetch` 或 `WebFetch` 工具访问网页

**替代方案**：

| 需求 | 推荐工具 |
|------|----------|
| 获取网页内容 | `curl -s <URL>` |
| 带 Header 请求 | `curl -s -H "Header: value" <URL>` |
| POST 请求 | `curl -s -X POST -d "data" <URL>` |
| 下载文件 | `curl -sLO <URL>` |
| 需要会话/cookies | 使用 `agent-browser` 或 `browser-use` |
| 搜索网络信息 | 直接用 `curl` 调用 API（Tavily/Exa） |

**原因**：`curl` 更灵活、易调试、Token 效率低

---

## 🤖 Skill 自动触发

### 多代理协作

**位置**: `~/src/projects/tools/user-scripts/skills/agents/`

| 用户输入 | 调用 Skill | 说明 |
|----------|-----------|------|
| "长任务"、"复杂项目"、"多会话协作" | `th/long-running-agent` | 长周期任务管理框架 |
| "创建团队"、"多代理协作"、"并行搜索" | `th/orchestrator` | Lead-Worker 模式编排器 |

**详情**: 详见 `~/src/projects/tools/user-scripts/skills/agents/` 下各 Skill 的 SKILL.md

### 网页抓取

**位置**: `~/src/projects/tools/user-scripts/skills/web-fetch/`

| 用户输入 | 调用命令 |
|----------|----------|
| "抓取网页"、"scrape" | `fetch-page.mjs "URL"` |
| "截图网页" | `fetch-page.mjs "URL" --screenshot` |

**详情**: 详见 `~/src/projects/tools/user-scripts/skills/web-fetch/SKILL.md`

### 用户纠正/鞭策

| 用户输入 | AI 必须执行 |
|----------|-------------|
| "你违反了 XXX"、"纠正" | 1. 承认错误 2. 读规范 3. 当场重做 |
| "操作手册"、"鞭策" | 显示 `~/src/projects/tools/user-scripts/skills/efficiency-workflow/prompts/correct-me.md` |
| "内化进去" | 1. `th/knowledge-hub` 记录学习 2. 更新 memory/index.md |

### 循环开发系统

**位置**: `~/.claude/scripts/loop-dev/`

| 用户输入 | 调用命令 |
|----------|----------|
| "启动循环开发"、"启动 AI 开发" | `openclaw loop start` |
| "停止循环"、"停止开发" | `openclaw loop stop` |
| "循环状态"、"开发状态" | `openclaw loop status` |
| "查看日志" | `tail -f /tmp/openclaw-agent3.log` |

**详情**: 详见 `~/.claude/knowledge/notes/openclaw-loop-dev-system.md`

---

## 🛠️ Skill 库

以下是已配置的 21 个技能，按触发词自动调用：

### Agent 与自动化

| 用户输入 | 调用 Skill | 说明 |
|----------|-----------|------|
| "长任务"、"复杂项目"、"多会话协作" | `th/long-running-agent` | 长周期任务管理框架 |
| "创建团队"、"多代理协作" | `th/orchestrator` | Lead-Worker 模式编排器 |

### AI/ML

| 用户输入 | 调用 Skill | 说明 |
|----------|-----------|------|
| "搜索一下"、"帮我查"、"找一下" | `th/model-compare-search` | 模型对比搜索聚合器 |
| "推荐 XXX"、"最佳 XXX" | `th/model-compare-search` | 推荐排名 |
| "对比 XXX 和 YYY" | `th/model-compare-search` | 对比分析 |

### 生产力

| 用户输入 | 调用 Skill | 说明 |
|----------|-----------|------|
| "内化进去" | `th/knowledge-hub` | 知识记录与学习 |
| "生产力"、"th-ralph" | `th/th-ralph` | 个人生产力助手 |

### 网页与浏览器

| 用户输入 | 调用 Skill | 说明 |
|----------|-----------|------|
| "抓取网页"、"scrape" | `th/web-fetch` | 网页抓取工具 |
| "分析网站" | `web/site-analyzer` | 网站深度分析工具 |
| "browser-use" | `web/browser-use` | 浏览器自动化 |

### 开发工具

| 用户输入 | 调用 Skill | 说明 |
|----------|-----------|------|
| "代码审查"、"review 代码" | `dev/code-review` | 代码审查 |
| "生成文档"、"写方案" | `docs/long-doc-generator` | 超长文档生成 |
| "决策记录" | `th/decision-record` | 决策记录模板 |
| "文章写作" | `content/article-writing` | 文章写作辅助 |

### 系统集成

| 用户输入 | 调用 Skill | 说明 |
|----------|-----------|------|
| "Arch Linux"、"AUR" | `th/arch-linux` | Arch Linux 系统特性 |
| "GitHub"、"gh" | `integrations/github` | GitHub CLI 集成 |
| "统一搜索" | `th/unified-search` | 跨平台搜索聚合 |
| "puppeteer" | `th/puppeteer-cli` | Puppeteer CLI 工具 |

### Meta/工具

| 用户输入 | 调用 Skill | 说明 |
|----------|-----------|------|
| "链接 Skill" | `src-link` | Skill 管理工具 |
| "skill 盘点" | `meta/skill-stocktake` | Skill 清单盘点 |
| "创建 skill" | `meta/skill-creator` | Skill 创建模板 |
| "prompt 专家" | `th/prompt-expert` | Prompt 优化专家 |
| "prompt 优化" | `ai/prompt-optimizer` | AI Prompt 优化器 |

---

## 🖥️ 硬件配置 (ROG M16)

**设备**: ROG Zephyrus M16 GU603ZM (2022) | **完整文档**: `~/src/docs/hardware/rog-m16-gu603zm.md`

### 配置仪表板

```bash
rog-config    # 交互式配置入口
```

### 音频配置
| 组件 | 设置 |
|------|------|
| 内置扬声器 | 四声道 (Speaker+Bass) 80% 音量 |
| 内置麦克风 | 70% 增益，关闭 Boost |
| 蓝牙编码 | 优先 AAC |
| 音频质量 | 48kHz/32bit |

### 性能/显卡
| 模式 | 命令 |
|------|------|
| Performance | `asusctl profile --set Performance` |
| Balanced | `asusctl profile --set Balanced` |
| Quiet | `asusctl profile --set Quiet` |
| 显卡 Hybrid | `sudo supergfxctl --mode Hybrid` |
| 显卡 dGPU | `sudo supergfxctl --mode dGPU` |

---

## 📜 规范优先原则

**新会话必读**（按顺序）：
```bash
cat ~/.claude/knowledge/notes/patterns/ARCHITECTURE-PRINCIPLES.md  # 系统架构原则 ⭐⭐⭐⭐⭐
cat ~/.claude/knowledge/notes/patterns/directory-structure.md          # 目录结构规范 ⭐⭐⭐⭐⭐
cat ~/.claude/knowledge/memory/MEMORY.md  # 持久记忆 ⭐⭐⭐⭐⭐
cat ~/.claude/TASKS-INDEX.md                       # 任务索引
cat ~/src/projects/tools/user-scripts/CONVENTIONS.md              # 统一规范（MUST/SHOULD/MAY/FREE）
```

**规范详情**: 详见 `~/src/projects/tools/user-scripts/CONVENTIONS.md`

---

## 🚨 调试故障强制检查清单

**当遇到功能异常时，必须按顺序检查，禁止跳过！**

### Step 1: 权限检查（最高优先级）
```bash
# 第一条命令 - 检查日志中的权限错误
sudo journalctl -u <service> | grep -iE "(EACCES|permission denied)" | tail -5
```

**如果看到 EACCES → 立即跳转到权限修复，不要分析别的！**

### Step 2: 服务状态
```bash
systemctl status <service>
ps aux | grep <service>
```

### Step 3: 配置验证
```bash
# 检查配置文件语法和权限
cat <config> | jq .  # JSON 配置
ls -la <config>      # 检查权限
```

### Step 4: 网络/连接
```bash
ss -tlnp | grep <port>
curl -v <endpoint>
```

### Step 5: 业务逻辑
**只有以上都正常，才开始分析业务逻辑！**

**详细清单**: 详见 `~/.claude/knowledge/notes/DEBUG-CHECKLIST.md`

---

## 🐛 错误模式库（MEMORY.md）

**位置**: `~/.claude/knowledge/memory/MEMORY.md`

| ID | 错误 | 解决方案 |
|----|------|----------|
| EP-005 | EACCES 权限错误 | 先修复权限，不要分析别的 |
| EP-001 | root 服务无用户环境变量 | 显式设置环境变量 |
| EP-002 | Hyprland 路径大小写 | 用 `bindl` 代替 `bindd` |
| EP-006 | OpenSnitch UI 与 daemon 状态不同步 | 同时重启 opensnitch-ui 和 opensnitchd |
| EP-007 | Git 历史泄露敏感信息 | Public 仓库前必须重写历史（`rm -rf .git && git init` 最彻底） |

**每次调试前必须查阅错误模式库！**

---

## 📚 知识库与记忆

### 知识索引（按软件名/功能搜索）

**主索引**: [`~/.claude/knowledge/memory/index.md`](~/.claude/knowledge/memory/index.md)

| 主题 | 主文档 | 内容 |
|------|--------|------|
| 🔐 OpenSnitch | `opensnitch-firewall.md` | 防火墙配置、Waybar 集成、开发模式 |
| 🎨 Hyprland | `~/.claude/knowledge/memory/hyprland-bind-debugging.md` | 快捷键绑定、ALT 主键、终端拦截 |
| 🧠 AI 模型 | `~/src/docs/ai-models/smart-models-list.md` | 模型推荐、路由配置、fallback 链 |
| 🤖 AI Drive | `learnings/ai-drive-fusion-complete.md` | 自动化驱动、tmux 集成、空闲检测 |
| 🛠️ Skill 开发 | `skill-development-lessons.md` + `pitfalls.md` | 结构规范、错误模式 |
| 🎯 tmux | `learnings/tmux-fixes-comprehensive.md` | paste-buffer、UTF-8 编码、按键冲突 |
| 🔒 hypridle | `learnings/hypridle-inhibit-conflict.md` | D-Bus 抑制、熄屏配置 |
| 📡 MCP 工具 | `learnings/mcp-comprehensive-guide.md` | MCP 使用原则、服务器列表 |
| 📺 视频上传 | `learnings/video-upload-methods-exploration.md` | B站/抖音 API、AI 分析 |
| 🔧 systemd | `learnings/systemd-permission-pitfall.md` | root 服务环境变量配置 |

**快速查找命令**:
```bash
# 查看知识索引
cat ~/.claude/knowledge/memory/index.md

# 按主题搜索
grep -r "OpenSnitch" ~/.claude/knowledge/notes/*.md ~/.claude/knowledge/memory/*.md

# 查看最新学习
ls -t ~/.claude/knowledge/notes/*.md | head -1 | xargs cat
```

---

### 核心规范文档

| 文件 | 用途 | 优先级 |
|------|------|--------|
| `ARCHITECTURE-PRINCIPLES.md` | 系统架构原则 | ⭐⭐⭐⭐⭐ |
| `directory-structure.md` | 目录结构规范 | ⭐⭐⭐⭐⭐ |
| `DEBUG-CHECKLIST.md` | 调试检查清单 | ⭐⭐⭐⭐⭐ |
| `pitfalls.md` | 防踩坑笔记 (EP-001~EP-025) | ⭐⭐⭐⭐ |
| `KNOWLEDGE-INDEX.md` | 本知识索引 | ⭐⭐⭐⭐ |

---

### 记忆文件体系

| 类型 | 位置 | 内容 |
|------|------|------|
| **持久记忆** | `~/.claude/knowledge/memory/` | 用户偏好、项目决策、参考数据 (~12 篇) |
| **学习笔记** | `~/.claude/knowledge/notes/` | 技术经验、踩坑记录 (~32 篇) |
| **修复记录** | `~/.claude/knowledge/notes/traps/` | 问题修复方案 (~8 篇) |
| **工作日志** | `~/.claude/knowledge/notes/projects/` | 项目进展记录 (~1 篇) |
| **Obsidian 笔记** | `~/src/电子笔记本/` | 个人知识库、AI 模型配置、技术文档 |

---

## 🔄 会话恢复

### 新会话开始

```bash
# 1. 读取任务索引
cat ~/.claude/TASKS-INDEX.md

# 2. 初始化会话隔离
~/.claude/scripts/session-isolation.sh init

# 3. 切换项目/任务
~/.claude/scripts/session-isolation.sh switch project <id>
# 或
~/.claude/scripts/session-isolation.sh switch task <name>

# 4. 加载上下文
cat ~/.claude/projects/<id>/wiki.md
```

**详情**: 详见 `~/.claude/scripts/session-isolation-README.md`

---

## 🔗 外部文档索引

### 系统组件文档

| 组件 | 文档位置 |
|------|----------|
| OpenSnitch 防火墙 | `~/.claude/knowledge/notes/opensnitch-firewall.md` |
| OpenClaw 网络安全 | `~/.claude/knowledge/notes/openclaw-network-security-config.md` |
| Hyprland 配置 | `~/.claude/knowledge/memory/hyprland-bind-debugging.md` |
| AI 模型路由 | `~/src/docs/ai-models/smart-models-list.md` |

### OpenClaw 配置保护

> ⚠️ **重要**：OpenClaw 配置文件受保护，AI 禁止直接修改！
>
> - 配置规范：`/home/openclaw/.openclaw/CONFIG-STANDARD.md`
> - 保护说明：`/home/openclaw/.openclaw/CONFIG-PROTECTION-SUMMARY.md`

**正确做法**：告知用户需求，等待用户执行

---

## 🛠️ 常用命令速查

```bash
# 查看知识索引
cat ~/.claude/knowledge/memory/index.md

# 查看防踩坑笔记
cat ~/.claude/knowledge/notes/traps/pitfalls.md

# 查看最新学习
ls -t ~/.claude/knowledge/notes/*.md | head -1 | xargs cat

# 同步 OpenClaw
~/.openclaw/scripts/sync-memory.sh

# 查看进度
cat ~/.claude/progress.json

# 会话隔离
~/.claude/scripts/session-isolation.sh list
```

---

*最后更新：2026-03-23 | 版本：v7.1 (Knowledge Hub 迁移版)*
