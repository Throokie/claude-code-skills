---
name: prd-to-code
description: 根据 PRD 文档生成高质量代码实现。使用多代理协作模式，自动创建团队并行开发各层代码，Worktree 隔离上下文，语言专用模型编写。触发词：PRD 转代码、根据 PRD 开发、实现 PRD、PRD 开发、按需求文档编码。
triggers:
  - PRD 转代码
  - 根据 PRD 开发
  - 实现 PRD
  - PRD 开发
  - 按需求文档编码
  - 根据文档实现
---

# PRD to Code - PRD 转代码实现器 (多代理协作版)

> **角色**：代码实现架构师
>
> **核心价值**：通过多代理团队协作，分层并行实现 PRD 规范，确保代码质量、上下文隔离和语言专业性

---

## 🎯 工作流程

```
读取 PRD 文档
    ↓
解析技术栈 → 确定语言专用 Agent
    ↓
创建 Team + Worktree（每层独立上下文）
    ↓
并行开发（数据层 | 逻辑层 | UI层 | 测试层）
    ↓
代码审查（安全 + 性能 + 语言规范）
    ↓
合并到主分支
    ↓
更新 PRD 状态
```

---

## 🏗️ 多代理团队架构

### 主控代理 (Lead)
- **职责**：PRD 解析、团队创建、任务分配、结果合并
- **工具**：orchestrator、git-worktree

### 工作代理 (Workers)

| 代理 | 职责 | 专用模型 | 上下文 |
|------|------|----------|--------|
| `data-agent` | 数据模型、数据库操作、API 接口定义 | 语言专用* | `worktree/data-layer` |
| `logic-agent` | 业务逻辑、服务层、工具函数 | 语言专用* | `worktree/logic-layer` |
| `ui-agent` | 组件实现、页面布局、样式 | 语言专用* | `worktree/ui-layer` |
| `test-agent` | 单元测试、集成测试、TDD | 语言专用* | `worktree/test-layer` |
| `review-agent` | 代码审查、安全检查、性能优化 | code-reviewer | 跨 worktree |

**语言专用模型映射**:
- TypeScript/React → `typescript-reviewer`
- Python → `python-reviewer`
- Go → `go-reviewer`
- Rust → `rust-reviewer`
- Java/Spring → `java-reviewer`
- Kotlin → `kotlin-reviewer`

---

## 📋 输入格式

```
根据 PRD prd-20260323-143022-a3f7 实现代码
实现 PRD prd-20260323-143022-a3f7 中的"任务创建"功能
```

---

## 🔧 实现流程

### Phase 1: PRD 解析与技术栈识别

**必须提取的信息**:
1. **技术栈** - 确定语言专用 Agent
2. **功能需求** - 提取所有功能点和验收标准
3. **数据模型** - 了解实体关系
4. **UI/UX 设计** - 获取组件规格
5. **实现规划** - 查看里程碑和任务分解

**输出**：技术栈识别 + 分层任务清单

### Phase 2: 创建团队与 Worktree

```bash
# 1. 为每个层创建独立 worktree
git worktree add .claude/worktrees/prd-<id>/data-layer
.git worktree add .claude/worktrees/prd-<id>/logic-layer
.git worktree add .claude/worktrees/prd-<id>/ui-layer
.git worktree add .claude/worktrees/prd-<id>/test-layer

# 2. 创建 Team
claude team create prd-implement-<id>
```

### Phase 3: 并行分层开发

**各层任务分配**:

```yaml
data-agent:
  worktree: .claude/worktrees/prd-<id>/data-layer
  inputs: [PRD 数据模型章节, PRD API 设计]
  outputs: [数据库 Schema, 模型定义, API 接口]
  model: <language>-reviewer

logic-agent:
  worktree: .claude/worktrees/prd-<id>/logic-layer
  inputs: [PRD 功能需求, data-agent 输出]
  outputs: [业务逻辑, 服务层, 工具函数]
  model: <language>-reviewer

ui-agent:
  worktree: .claude/worktrees/prd-<id>/ui-layer
  inputs: [PRD UI/UX 设计, PRD Design Token]
  outputs: [组件实现, 页面布局, 样式]
  model: <language>-reviewer

test-agent:
  worktree: .claude/worktrees/prd-<id>/test-layer
  inputs: [PRD 验收标准, 所有层输出]
  outputs: [单元测试, 集成测试, E2E 测试]
  model: tdd-guide
```

### Phase 4: 代码审查

**并行审查**:
- `security-reviewer`: OWASP Top 10 检查
- `code-reviewer`: 代码质量、性能
- `<language>-reviewer`: 语言规范

### Phase 5: 合并与验证

```
各层 worktree → 主分支
    ↓
集成测试
    ↓
更新 PRD 状态为 "已实现"
```

---

## 🛠️ 执行指令

### Step 1: 解析 PRD 并识别技术栈

```
读取 PRD 文档 ~/src/docs/prd/prd-<id>.md
提取：
- 技术栈（语言/框架）
- 数据模型
- 功能列表
- UI 组件规格
- 验收标准
```

### Step 2: 创建 Worktree 结构

```bash
PRD_ID="prd-20260323-143022-a3f7"
BASE_DIR=".claude/worktrees/${PRD_ID}"

# 创建 worktrees
git worktree add "${BASE_DIR}/data-layer" -b "${PRD_ID}/data"
git worktree add "${BASE_DIR}/logic-layer" -b "${PRD_ID}/logic"
git worktree add "${BASE_DIR}/ui-layer" -b "${PRD_ID}/ui"
git worktree add "${BASE_DIR}/test-layer" -b "${PRD_ID}/test"
```

### Step 3: 创建并启动团队

```
TeamCreate({
  team_name: "prd-implement-${PRD_ID}",
  description: "PRD ${PRD_ID} 多代理实现团队"
})

# 创建各层代理
Agent({
  name: "data-agent",
  subagent_type: "<language>-reviewer",
  team_name: "prd-implement-${PRD_ID}",
  prompt: "在 worktree ${BASE_DIR}/data-layer 中实现数据层..."
})

Agent({
  name: "logic-agent",
  subagent_type: "<language>-reviewer",
  team_name: "prd-implement-${PRD_ID}",
  prompt: "在 worktree ${BASE_DIR}/logic-layer 中实现逻辑层..."
})

Agent({
  name: "ui-agent",
  subagent_type: "<language>-reviewer",
  team_name: "prd-implement-${PRD_ID}",
  prompt: "在 worktree ${BASE_DIR}/ui-layer 中实现 UI 层..."
})

Agent({
  name: "test-agent",
  subagent_type: "tdd-guide",
  team_name: "prd-implement-${PRD_ID}",
  prompt: "在 worktree ${BASE_DIR}/test-layer 中编写测试..."
})
```

### Step 4: 任务分配与执行

```
TaskCreate({
  subject: "实现数据层",
  description: "根据 PRD 数据模型实现数据库 Schema 和 API 接口",
  owner: "data-agent"
})

TaskCreate({
  subject: "实现逻辑层",
  description: "实现业务逻辑和服务层，依赖 data-agent 输出",
  owner: "logic-agent",
  addBlockedBy: ["data-layer-task-id"]
})

TaskCreate({
  subject: "实现 UI 层",
  description: "根据 PRD UI/UX 实现组件和页面",
  owner: "ui-agent"
})

TaskCreate({
  subject: "编写测试",
  description: "为所有层编写测试，验证验收标准",
  owner: "test-agent",
  addBlockedBy: ["data-layer-task-id", "logic-layer-task-id", "ui-layer-task-id"]
})
```

### Step 5: 代码审查

```
Agent({
  name: "security-reviewer",
  subagent_type: "security-reviewer",
  team_name: "prd-implement-${PRD_ID}",
  prompt: "审查所有 worktree 的代码安全性"
})

Agent({
  name: "code-reviewer",
  subagent_type: "code-reviewer",
  team_name: "prd-implement-${PRD_ID}",
  prompt: "审查代码质量和性能"
})
```

### Step 6: 合并与清理

```bash
# 合并各层到主分支
git checkout main
git merge "${PRD_ID}/data"
git merge "${PRD_ID}/logic"
git merge "${PRD_ID}/ui"
git merge "${PRD_ID}/test"

# 清理 worktrees
git worktree remove "${BASE_DIR}/data-layer"
git worktree remove "${BASE_DIR}/logic-layer"
git worktree remove "${BASE_DIR}/ui-layer"
git worktree remove "${BASE_DIR}/test-layer"
```

---

## 📐 实现规范

### 代码质量标准

**必须满足**:
- [ ] 所有 PRD 验收标准通过
- [ ] 代码覆盖率 ≥ 80%
- [ ] 无安全漏洞（security-reviewer 通过）
- [ ] 符合语言编码规范（<language>-reviewer 通过）
- [ ] 性能指标达标

---

## 🚀 项目启动规范

### 启动前检查清单

在启动开发前，必须确认以下信息已在 PRD 中定义：

```markdown
### 项目启动规范 (PRD 必需章节)

#### 1. 环境要求
- **运行环境**: [Node.js 18+ / Python 3.11+ / Go 1.21+ 等]
- **包管理器**: [npm / yarn / uv / go mod 等]
- **数据库**: [PostgreSQL / MySQL / SQLite / 无]
- **缓存**: [Redis / Memcached / 无]
- **外部服务**: [第三方API / 消息队列 / 存储服务]

#### 2. 启动命令
```bash
# 开发环境启动
dev: npm run dev

# 生产构建
build: npm run build

# 生产启动
start: npm start

# 数据库迁移
migrate: npm run migrate

# 种子数据
seed: npm run seed
```

#### 3. 环境变量配置
| 变量名 | 必填 | 说明 | 示例值 |
|--------|------|------|--------|
| DATABASE_URL | 是 | 数据库连接字符串 | postgresql://... |
| PORT | 否 | 服务端口 | 3000 |
| LOG_LEVEL | 否 | 日志级别 | info |
```

### 启动流程 (AI 必须执行)

```
Phase 1: 环境检查
├── 读取 PRD 启动规范章节
├── 检查本地环境版本是否满足要求
├── 检查必需的环境变量
└── 检查端口占用情况

Phase 2: 依赖安装
├── 根据技术栈选择正确的包管理器
├── 安装生产依赖
├── 安装开发依赖
└── 验证关键依赖版本

Phase 3: 数据库准备 (如需要)
├── 检查数据库连接
├── 执行迁移命令
├── 执行种子数据 (开发环境)
└── 验证表结构

Phase 4: 服务启动
├── 按 PRD 定义的命令启动服务
├── 验证服务健康状态
└── 记录启动日志
```

### 启动失败处理

| 错误类型 | 检测方式 | 解决方案 |
|---------|---------|---------|
| 端口占用 | `EADDRINUSE` | 自动寻找可用端口或提示用户 |
| 数据库连接失败 | 连接超时 | 检查环境变量，启动本地数据库 |
| 依赖缺失 | `MODULE_NOT_FOUND` | 重新安装依赖 |
| 环境变量缺失 | 启动报错 | 检查 `.env.example`，提示用户配置 |
| 权限不足 | `EACCES` | 检查文件权限，建议使用用户目录 |

---

## 📋 Git 规范

### 分支策略

```
main (受保护)
├── feature/prd-{id}-{name}    # 功能分支
├── bugfix/prd-{id}-{name}     # Bug 修复分支
└── hotfix/{description}       # 紧急修复
```

### 提交规范 (Conventional Commits)

```
<type>(<scope>): <subject>

<body>

<footer>
```

**类型 (type)**:
| 类型 | 用途 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat(auth): 实现 JWT 登录` |
| `fix` | Bug 修复 | `fix(api): 修复空指针异常` |
| `refactor` | 重构 | `refactor(db): 优化查询性能` |
| `test` | 测试相关 | `test(unit): 添加用户服务测试` |
| `docs` | 文档 | `docs(api): 更新接口文档` |
| `chore` | 构建/工具 | `chore(deps): 升级依赖` |
| `style` | 代码格式 | `style(lint): 修复 ESLint 警告` |

**PRD 相关提交前缀**:
```
feat(prd-{id}): 实现用户登录功能
fix(prd-{id}): 修复任务创建验证错误
test(prd-{id}): 添加订单流程 E2E 测试
```

### 提交前检查清单

- [ ] 代码已通过 `code-reviewer` 审查
- [ ] 测试覆盖率 ≥ 80%
- [ ] 无 `console.log` / `print` 等调试语句
- [ ] 无硬编码敏感信息
- [ ] 提交信息符合规范

### PR 规范

**PR 标题**: `[PRD-{id}] 功能简述`

**PR 描述模板**:
```markdown
## 关联 PRD
- PRD: prd-{id}

## 实现内容
- [ ] 功能点 1
- [ ] 功能点 2

## 测试覆盖
- 单元测试: [覆盖率]
- 集成测试: [是否通过]
- E2E 测试: [是否通过]

## 审查记录
- code-reviewer: [通过/问题列表]
- security-reviewer: [通过/问题列表]
```

---

## ✅ 完成规范 (强制性)

### 禁止行为

**AI 严禁以下操作**:
- ❌ 自己测试后自己勾选 "已完成"
- ❌ 未经用户确认标记任务为 "已完成"
- ❌ 假设测试通过而不验证
- ❌ 跳过测试直接标记完成

### 完成确认流程

```
开发完成
    ↓
[AI] 运行自动化测试
    ↓
测试通过？
    ├── 否 → 修复问题，重新测试
    ↓ 是
[AI] 准备测试报告
    ↓
[用户] 人工验证 / [自动化] E2E 测试通过
    ↓
[用户] 确认 "验收通过"
    ↓
[AI] 标记任务完成
```

### 验收方式 (二选一)

#### 方式一：用户人工验收 (推荐)

```markdown
## 验收请求

功能已实现，请进行验收：

### 测试环境
- 启动命令: `npm run dev`
- 访问地址: http://localhost:3000
- 测试账号: test@example.com / password

### 验收清单
请在测试后回复此消息确认：

- [ ] 1. 功能 A 工作正常
- [ ] 2. 功能 B 工作正常
- [ ] 3. 边界情况处理正确
- [ ] 4. 无明显 bug

### 已知问题
- [问题描述，如有]

请测试后回复："验收通过" 或列出问题
```

#### 方式二：自动化 E2E 测试验收

```markdown
## 自动化验收标准

**必须通过以下测试方可标记完成**：

1. **单元测试**: 覆盖率 ≥ 80%
2. **集成测试**: 所有 API 测试通过
3. **E2E 测试**: 关键用户流程自动化测试通过

### E2E 测试要求

每个 PRD 必须定义 E2E 测试场景：

```yaml
e2e_tests:
  - name: "用户登录流程"
    steps:
      - visit: "/login"
      - fill: {selector: "#email", value: "test@example.com"}
      - fill: {selector: "#password", value: "password"}
      - click: "#submit"
      - assert: {url: "/dashboard"}

  - name: "任务创建流程"
    steps:
      - visit: "/tasks"
      - click: "#new-task"
      - fill: {selector: "#title", value: "测试任务"}
      - click: "#save"
      - assert: {text: "任务创建成功"}
```

**AI 只能在 E2E 测试全部通过后标记完成**
```

### 完成状态标记规则

| 状态 | 定义 | 谁可以标记 |
|------|------|-----------|
| `开发中` | 正在编码 | AI |
| `待验收` | 代码完成，等待测试 | AI |
| `验收通过` | 用户确认或 E2E 通过 | 用户 / 自动化测试 |
| `已完成` | 正式完成 | AI (仅在前一状态后) |
| `有缺陷` | 验收发现问题 | 用户 |

### 完成报告模板

```markdown
## 完成报告

### 基本信息
- PRD ID: prd-{id}
- 功能名称: [名称]
- 开发分支: feature/prd-{id}-{name}

### 实现统计
- 新增文件: [数量]
- 修改文件: [数量]
- 代码行数: [行数]
- 测试用例: [数量]

### 测试报告
- 单元测试: [X/X 通过, 覆盖率 XX%]
- 集成测试: [通过/失败]
- E2E 测试: [通过/失败] (或人工验收结果)

### 审查记录
- code-reviewer: ✅ 通过
- security-reviewer: ✅ 通过

### 验收确认
- [ ] 用户人工验收通过 (请勾选)
- [ ] 自动化 E2E 测试通过

### 部署说明
```bash
# 合并到主分支
git checkout main
git merge feature/prd-{id}-{name}

# 部署命令
[部署命令]
```

**等待用户确认 "验收通过" 后方可标记为已完成**
```

### Worktree 规范

```
.claude/worktrees/prd-<id>/
├── data-layer/          # data-agent 工作目录
│   └── src/
│       ├── models/
│       ├── repositories/
│       └── api/
├── logic-layer/         # logic-agent 工作目录
│   └── src/
│       ├── services/
│       └── utils/
├── ui-layer/            # ui-agent 工作目录
│   └── src/
│       ├── components/
│       └── pages/
└── test-layer/          # test-agent 工作目录
    └── tests/
        ├── unit/
        └── integration/
```

### 文档同步

**每个文件头部必须包含**:
```typescript
/**
 * PRD: prd-20260323-143022-a3f7
 * Layer: data-layer
 * Agent: data-agent
 * 功能：任务数据模型
 * 验收标准：
 *   - [x] 支持标题、描述字段
 *   - [x] 自动创建/更新时间戳
 */
```

---

## 🎨 与 PRD 的精确映射

| PRD 章节 | 负责代理 | 输出位置 |
|----------|----------|----------|
| 2.1 功能清单 | logic-agent | `logic-layer/src/services/` |
| 2.2 用户故事 | test-agent | `test-layer/tests/` |
| 4.2 数据模型 | data-agent | `data-layer/src/models/` |
| 4.3 API 设计 | data-agent | `data-layer/src/api/` |
| 5.2 关键页面 | ui-agent | `ui-layer/src/pages/` |
| 5.3 交互流程 | ui-agent | `ui-layer/src/components/` |

---

## 🔗 与其他技能协作

```
requirement-to-prd (生成 PRD)
    ↓
prd-evolution (管理版本树)
    ↓
prd-to-code (本技能：多代理代码实现)
    ├─ orchestrator (团队编排)
    ├─ git-worktree (上下文隔离)
    ├─ <language>-reviewer (语言专用实现)
    ├─ tdd-guide (测试编写)
    ├─ security-reviewer (安全审查)
    └─ code-reviewer (代码审查)
    ↓
prd-evolution (更新实现状态)
```

---

## 🎬 使用示例

### 示例：完整实现 PRD

**用户输入**:
```
根据 PRD prd-20260323-143022-a3f7 实现任务管理系统的代码
```

**AI 执行**:
1. 读取 PRD，识别技术栈为 TypeScript/React/Node.js
2. 创建 4 个 worktree（data/logic/ui/test）
3. 创建团队，分配专用代理：
   - data-agent → `typescript-reviewer`
   - logic-agent → `typescript-reviewer`
   - ui-agent → `typescript-reviewer`
   - test-agent → `tdd-guide`
4. 并行执行各层开发
5. security-reviewer + code-reviewer 审查
6. 合并到主分支
7. 更新 PRD 状态为 "已实现"
8. 清理 worktrees

---

## ⚠️ 注意事项

1. **Worktree 隔离**：每个代理在自己的 worktree 中工作，避免上下文污染
2. **依赖管理**：logic-agent 依赖 data-agent 输出，使用 Task blockedBy 管理
3. **语言专用**：根据 PRD 技术栈选择对应语言的 reviewer agent
4. **严格遵循 PRD**：不擅自添加 PRD 外功能
5. **偏差记录**：实现时发现问题需记录并更新 PRD
6. **资源清理**：完成后清理 worktrees，避免磁盘占用

---

## 📝 实现后输出

**完成后返回**:
```markdown
✅ PRD 多代理实现完成

- **PRD ID**: prd-20260323-143022-a3f7
- **技术栈**: TypeScript/React/Node.js
- **团队**: prd-implement-prd-20260323-143022-a3f7
- **Worktrees**:
  - data-layer → models/, api/
  - logic-layer → services/
  - ui-layer → components/, pages/
  - test-layer → tests/
- **实现功能**: [功能列表]
- **代码位置**: [主分支文件路径]
- **测试覆盖**: [覆盖率]
- **审查结果**: [security-reviewer + code-reviewer 输出摘要]
- **PRD 状态**: 已更新为 🔵 已实现
```

---

*最后更新：2026-03-23 | 版本：v2.1 (增加启动规范/Git规范/完成规范)*
