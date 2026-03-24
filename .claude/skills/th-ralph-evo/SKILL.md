---
name: th-ralph-evo
triggers:
  - 启动自动化开发
  - 创建智能开发团队
  - 启动ralph闭环
  - 自动化开发流程
  - 智能开发系统
  - 闭环开发
  - ralph evo
  - ralph-evolution
---

# Ralph Evolution - 自动化闭环开发系统

> **版本**: v1.0 | **命令行工具** | 类似 Ralph 的纯 CLI 风格

---

## 快速开始

```bash
# 1. 初始化项目配置
ralph-evo init

# 2. 启动监控（监听决策文件变更）
ralph-evo watch

# 3. 启动驱动模式（循环运行7阶段工作流）
ralph-evo drive

# 4. 查看状态面板
ralph-evo status

# 5. 手动触发工作流
ralph-evo run --decision user-auth-optimization
```

---

## 命令参考

| 命令 | 说明 | 示例 |
|------|------|------|
| `init` | 初始化项目配置 | `ralph-evo init` |
| `watch` | 启动文件监控 | `ralph-evo watch --project user-auth` |
| `drive` | 启动驱动模式（循环运行7阶段） | `ralph-evo drive --project user-auth` |
| `status` | 显示状态面板 | `ralph-evo status` |
| `run` | 手动触发工作流 | `ralph-evo run --decision <id>` |
| `sync` | 同步决策到 PRD | `ralph-evo sync` |
| `analyze` | 分析 Bug 影响 | `ralph-evo analyze --test-failed` |
| `dashboard` | 启动实时监控 | `ralph-evo dashboard` |

---

## 工作流程

```
用户输入决策/需求
      │
      ▼
┌─────────────────┐
│ decision-record │ ← 记录到 decisions/ 或项目目录
└────────┬────────┘
         │ 文件变更事件
         ▼
┌─────────────────┐     ┌─────────────────┐
│ ralph-evo watch │────▶│ 消息总线        │
└────────┬────────┘     └────────┬────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│ th-deep-coder2  │     │ 状态更新        │
│ (深度调研)      │     │                 │
└────────┬────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐
│ prd-evolution   │ ← 生成/更新 PRD
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ prd-to-code     │ ← 多代理实现
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ ralpha          │ ← worktree 管理
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 自动化测试       │
└────────┬────────┘
         │ 测试失败
         ▼
┌─────────────────┐     ┌─────────────────┐
│ th-bug-analyzer │────▶│ 决策记录 (闭环) │
└─────────────────┘     └─────────────────┘
```

---

## 配置文件

`.ralph-evo.yaml` (项目根目录):

```yaml
project:
  name: user-auth
  path: ~/src/production/user-auth

decisions:
  # 决策文件位置（相对项目根目录）
  path: ./decisions
  # 或者使用全局决策目录
  # global: ~/src/docs/decisions

# 消息同步配置
messaging:
  # 使用文件作为消息总线
  bus_file: ~/.ralph-evo/messages.jsonl
  # 或使用 socket
  # socket_port: 9876

# 自动触发配置
triggers:
  decision_confirmed:
    auto_investigate: true
    auto_create_prd: true

  test_failure:
    auto_analyze: true
    auto_fix_low_risk: true

# 技能集成
skills:
  decision_record: true
  prd_evolution: true
  prd_to_code: true
  ralpha: true
  bug_analyzer: true
  deep_coder2: true
```

---

## 消息总线机制

Ralph Evolution 使用文件-based 消息总线同步各个组件：

```bash
# 消息文件位置
~/.ralph-evo/messages.jsonl
```

消息格式:
```json
{"timestamp":"2026-03-23T14:30:00Z","type":"decision_confirmed","project":"user-auth","payload":{"decision_id":"auth-optimization","file":"./decisions/auth-optimization.md"}}
{"timestamp":"2026-03-23T14:31:00Z","type":"investigation_completed","project":"user-auth","payload":{"decision_id":"auth-optimization","findings":["..."]}}
{"timestamp":"2026-03-23T14:32:00Z","type":"prd_created","project":"user-auth","payload":{"prd_id":"prd-auth-v1","file":"./docs/prd/prd-auth-v1.md"}}
```

组件间通过写入和读取消息文件进行通信。

---

## 决策文件位置

支持多种决策文件位置：

### 1. 项目本地决策
```
~/src/production/user-auth/
├── decisions/
│   ├── auth-optimization.md
│   └── password-reset.md
└── .ralph-evo.yaml
```

### 2. 全局决策目录
```
~/src/docs/decisions/
├── user-auth.md          # 项目级决策
├── global-features.md    # 跨项目决策
└── INDEX.md
```

### 3. 混合模式
配置文件中可以指定多个来源:
```yaml
decisions:
  sources:
    - ./decisions           # 本地
    - ~/src/docs/decisions  # 全局
```

---

## 使用示例

### 示例 1: 完整自动化流程

```bash
# 1. 用户创建决策文件
cat > ~/src/production/user-auth/decisions/optimization.md << 'EOF'
## 功能主题: 登录性能优化

**状态**: `confirmed`

**最终方案**:
- 使用 Redis 缓存会话
- 实现连接池
- 添加性能监控
EOF

# 2. Ralph Evo 自动检测到决策确认
ralph-evo watch
# [输出] 📄 Decision confirmed: optimization
# [输出] 🔬 Starting deep investigation...
# [输出] 📝 Creating PRD...
# [输出] 🏗️ Starting implementation...

# 3. 查看状态
ralph-evo status
```

## 驱动模式 (Drive Mode)

驱动模式循环运行 `th-prd-driven-dev-workflow` 的7个阶段：

```bash
# 基本用法
ralph-evo drive --project ~/src/production/user-auth

# 限制循环次数
ralph-evo drive --max-loops 5

# 错误时继续
ralph-evo drive --continue-on-error
```

### Claude CLI 配置

如果提示 `Claude CLI not found`，需要设置 Claude 命令路径：

```bash
# 方法1: 设置环境变量
export CLAUDE_PATH=/path/to/claude
ralph-evo drive --project ~/my-project

# 方法2: 查找 claude 位置
which claude
# 或使用 find
find ~ -name "claude" -type f 2>/dev/null

# 常见安装位置:
# - ~/.local/bin/claude
# - ~/.npm-global/bin/claude
# - /usr/local/bin/claude
```

### 驱动模式调用原理

驱动模式使用 Claude CLI 的 `-p` (print) 模式非交互式调用：

```bash
claude -p \
  --permission-mode acceptEdits \
  --allowed-tools Skill,Bash,Read,Write,Edit,Glob,Grep,Agent \
  "/th-prd-driven-dev-workflow --phase <phase> --project <path>"
```

参数说明：
- `-p`: 非交互式模式（print 模式）
- `--permission-mode acceptEdits`: 自动接受编辑操作
- `--allowed-tools`: 允许的 tools 列表
- 提示词: 使用 `/skill-name` 格式触发 skill

### 驱动模式实时面板

```
┌─ Ralph Evo Drive Mode ─────────────────────────────────┐
│ Project: user-auth                                       │
│ Workflow: th-prd-driven-dev-workflow (7 phases)          │
│ Loop: 1/∞                                                │
├─ Phase Progress ─────────────────────────────────────────┤
│ ✅ [P1] 项目分析     completed                           │
│ 🏃 [P2] 多模型需求分析 running  ████████░░ 75%           │
│ ⏳ [P3] Kimi深度整合 pending                             │
│ ⏳ [P4] PRD更新      pending                             │
│ ⏳ [P5] 代码审查准备  pending                             │
│ ⏳ [P6] 代码开发     pending                             │
│ ⏳ [P7] 自动化测试   pending                             │
└──────────────────────────────────────────────────────────┘
```

### 示例 3: Bug 分析闭环

```bash
# 测试失败时
ralph-evo analyze --test auth.test.ts --error "timeout"
# [输出] 🔍 Analyzing impact...
# [输出]    Risk level: MEDIUM
# [输出]    Affected: d=1(3), d=2(8)
# [输出] 📝 Creating decision record for fix...
```

### 示例 4: 手动触发

```bash
# 从决策直接触发
ralph-evo run --decision auth-optimization

# 从 PRD 触发实现
ralph-evo run --prd prd-auth-v1

# 仅运行 bug 分析
ralph-evo analyze --bug bug-123
```

---

## 状态面板

```bash
$ ralph-evo status

🚀 Ralph Evolution v1.0
Project: user-auth
Status: 🟢 Running

┌─ Decisions ───────────────┐  ┌─ PRDs ────────────────────┐
│ 🔵 auth-optimization      │  │ 🔵 prd-auth-v1 (已实现)   │
│ 🟡 password-reset         │  │ 🟡 prd-auth-v2 (草稿)     │
└───────────────────────────┘  └───────────────────────────┘

┌─ Worktrees ───────────────┐  ┌─ Agents ──────────────────┐
│ ✅ auth/data-layer        │  │ 🟢 data-agent (active)    │
│ ✅ auth/logic-layer       │  │ 🟢 logic-agent (active)   │
│ 🏃 auth/ui-layer          │  │ 🟡 ui-agent (idle)        │
└───────────────────────────┘  └───────────────────────────┘

┌─ Tests ───────────────────┐  ┌─ Bugs ────────────────────┐
│ Unit: 95% ✅              │  │ 🟡 2 pending analysis     │
│ Integration: 88% ⚠️       │  │ 🔵 1 fixing               │
│ E2E: 12/15 ✅             │  │ ✅ 5 fixed                │
└───────────────────────────┘  └───────────────────────────┘

Recent Messages:
14:30:15 [decision_confirmed] auth-optimization
14:31:02 [investigation_completed] auth-optimization
14:32:44 [prd_created] prd-auth-v1
14:35:20 [implementation_started] prd-auth-v1
```

---

## 与其他技能协作

```
th-ralph-evo (本技能 - 编排器)
    │
    ├── decision-record (需求输入)
    │   └── 写入 decisions/*.md
    │
    ├── th-deep-coder2 (深度调研)
    │   └── 触发: decision_confirmed
    │
    ├── prd-evolution (PRD 管理)
    │   └── 更新 tree.md
    │
    ├── prd-to-code (代码实现)
    │   └── 多代理并行开发
    │
    ├── ralpha (worktree 管理)
    │   └── 创建/管理 worktrees
    │
    └── th-bug-analyzer (Bug 分析)
        └── 触发: test_failed
            └── 闭环反馈到决策层
```

---

## 安装

```bash
# 链接到 PATH
chmod +x ~/.claude/skills/th-ralph-evo/scripts/ralph-evo
ln -s ~/.claude/skills/th-ralph-evo/scripts/ralph-evo ~/.local/bin/ralph-evo

# 验证
ralph-evo --version
```

---

*版本: v1.0 | 命令行风格 | 消息总线同步*
