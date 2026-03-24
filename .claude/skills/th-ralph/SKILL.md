# throokie-ralph - 文档驱动的 worktree 管理工具

> 版本：v3.1 (SCNet 中国超算模型优先) | 位置：`~/src/projects/tools/throokie-ralph/`

## 概述

基于 Git Worktree 的文档驱动并行开发管理工具。

**核心理念**：
- 在文档中定义 worktree 任务
- 程序自动创建 worktree
- 多 Claude 窗口并行开发
- 统一合并

**模型使用策略**（优先使用中国超算）：
| 优先级 | 供应商 | 模型组 |
|--------|--------|--------|
| ⭐⭐⭐⭐⭐ | 国家超算中心 (SCNet) | deepseek-r1-0528-scnet, qwen3-235b-a22b-scnet |
| ⭐⭐⭐⭐ | 阿里云 (Aliyun) | qwen3.5-plus-aliyun, glm-5-aliyun |
| ⭐⭐⭐ | 天翼云 (CTYUN) / NVIDIA | deepseek-v3.2-ctyun, glm-4.7-nvidia |
| ⭐⭐ | 硅基流动 (SiliconFlow) | qwen3.5-397b-siliconflow, deepseek-v3-siliconflow |

**SCNet 完整模型列表（18 个）**：
- **Qwen3 对话系列** (4 个): qwen3-235b-a22b-scnet, qwen3-30b-a3b-scnet, qwen3-30b-a3b-instruct-2507-scnet, qwen3-235b-a22b-thinking-2507-scnet
- **DeepSeek R1 推理系列** (4 个): deepseek-r1-0528-scnet, deepseek-r1-distill-qwen-32b-scnet, deepseek-r1-distill-qwen-7b-scnet, deepseek-r1-distill-llama-70b-scnet
- **代码专用系列** (1 个): qwen3-coder-480b-a35b-scnet (480B 旗舰)
- **推理增强系列** (2 个): deepseek-v3.2-scnet, qwq-32b-scnet
- **MiniMax 系列** (5 个): minimax-m2-scnet, minimax-m2.5-scnet, minimax-m2.5-tencent-scnet, minimax-m2.5-zd-scnet, minimax-m2.5-vip-scnet
- **工具模型** (2 个): ocr-scnet, qwen3-embedding-8b-scnet

**与 GitHub Ralph/gralph 对比**：
| 特性 | gralph | throokie-ralph |
|------|--------|----------------|
| 任务定义 | PRD.md + tasks.yaml | WORKTREES.md (Markdown) |
| 执行方式 | DAG 调度器自动执行 | 多 Claude 窗口手动执行 |
| 配置文件 | YAML | Markdown |
| 复杂度 | 高（自动调度） | 低（手动控制） |
| 适用场景 | 全自动 AI 编码 | 半人工 AI 协作 |

## 安装

```bash
# 创建软链接
ln -s ~/src/projects/tools/throokie-ralph/bin/throokie-ralph ~/.local/bin/throokie-ralph

# 验证安装
which throokie-ralph
throokie-ralph help
```

## 快速开始

### 1. 初始化配置文件

**Claude 可以直接运行**：
```bash
throokie-ralph init
```

这会创建 `WORKTREES.md` 配置文件。

### 2. 编辑配置文件

**Claude 可以创建/编辑文件**：

使用 `Write` 或 `Edit` 工具编辑 `WORKTREES.md`：

```markdown
## Worktree 1: auth

**任务描述**:
实现用户认证功能

**要求**:
- [ ] JWT Token 认证
- [ ] 登录/登出 API
- [ ] WebSocket 认证中间件

---

## Worktree 2: payment

**任务描述**:
实现支付功能

**要求**:
- [ ] 支付接口集成
- [ ] 订单管理
- [ ] 支付回调处理
```

### 3. 创建 worktree

**Claude 可以直接运行**：
```bash
throokie-ralph create
```

这会：
- 读取 `WORKTREES.md`
- 为每个 worktree 创建 git worktree
- 在每个 worktree 中生成 `TASK.md`

### 4. 多窗口并行开发

**给用户的建议**：
```bash
# 打开多个 Claude Code 窗口

# 窗口 1
cd /home/throokie/.worktrees/auth

# 窗口 2
cd /home/throokie/.worktrees/payment
```

**每个窗口的提示**：
```
窗口 1: "我在开发 auth 功能，请在 .worktrees/auth 目录工作，任务见 TASK.md"
窗口 2: "我在开发 payment 功能，请在 .worktrees/payment 目录工作，任务见 TASK.md"
```

### 5. 合并与清理

**Claude 可以直接运行**：
```bash
throokie-ralph merge   # 合并所有 worktree 到 main
throokie-ralph clean   # 清理已合并的 worktree
```

## 命令参考

| 命令 | Claude 运行方式 | 说明 |
|------|----------------|------|
| `init` | `throokie-ralph init` | 创建 `WORKTREES.md` 配置文件 |
| `create` | `throokie-ralph create` | 根据配置文件创建所有 worktree |
| `status` | `throokie-ralph status` | 显示配置和 worktree 状态 |
| `merge` | `throokie-ralph merge` | 合并所有 worktree 到 main |
| `clean` | `throokie-ralph clean` | 清理已合并的 worktree |
| `help` | `throokie-ralph help` | 显示帮助 |

## 配置文件格式

`WORKTREES.md` 标准格式：

```markdown
# Worktree 开发计划

## Worktree 之前 (pre-worktree)

在主仓库开发核心功能。

**任务**:
- [ ] 实现核心功能

---

## Worktree 1: auth

**任务描述**:
实现用户认证功能

**要求**:
- [ ] JWT Token 认证
- [ ] 登录/登出 API

**预计完成**: 2026-03-23

---

## Worktree 2: payment

**任务描述**:
实现支付功能

**要求**:
- [ ] 支付接口集成
- [ ] 订单管理

---

## Worktree 合并后 (post-worktree)

收尾工作。

**任务**:
- [ ] 集成测试
```

### 解析规则

- `## Worktree N: <name>` 定义 worktree（N=1,2,3...）
- `<name>` 是 worktree 名称，分支名为 `feature/<name>`
- 标题下的所有内容会被提取到对应 worktree 的 `TASK.md`

## 文件创建说明

**Claude 可以创建以下文件**：

1. **WORKTREES.md**（项目根目录）
   - 使用 `Write` 工具创建
   - 定义所有 worktree 任务

2. **TASK.md**（每个 worktree 中）
   - 由 `throokie-ralph create` 自动生成
   - 也可以手动编辑添加详情

3. **run.sh**（可选，每个 worktree 中）
   - 自定义执行脚本
   - 如果存在，`throokie-ralph run` 会执行它

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `RALPH_CONFIG` | 配置文件路径 | `./WORKTREES.md` |

## 典型使用场景

### 场景一：先开发核心功能，再并行

```bash
# 1. 主仓库开发核心功能
cd /home/throokie
# 编写登录功能代码
git commit -m "feat: 登录功能"

# 2. 初始化并行开发
throokie-ralph init
# 编辑 WORKTREES.md 定义 auth, payment 等任务
throokie-ralph create

# 3. 多窗口并行
# 窗口 1: cd .worktrees/auth
# 窗口 2: cd .worktrees/payment

# 4. 合并
throokie-ralph merge
throokie-ralph clean
```

### 场景二：直接并行开发

```bash
# 1. 初始化
throokie-ralph init

# 2. 编辑 WORKTREES.md 定义 3 个任务
throokie-ralph create

# 3. 打开 3 个窗口分别开发
# cd .worktrees/task1
# cd .worktrees/task2
# cd .worktrees/task3

# 4. 合并
throokie-ralph merge
```

## 常见问题

**Q: 如何定义更多 worktree？**
A: 在 `WORKTREES.md` 中添加 `## Worktree 3: <name>`、`## Worktree 4: <name>` 等

**Q: 如何修改 worktree 任务？**
A: 编辑 `WORKTREES.md` 或 `.worktrees/<name>/TASK.md`，然后重新 `create`

**Q: 如何添加新 worktree 到现有项目？**
A: 在 `WORKTREES.md` 中添加新定义，运行 `throokie-ralph create`

**Q: 配置文件必须是 WORKTREES.md 吗？**
A: 可以设置 `RALPH_CONFIG` 环境变量指定其他路径

## 文件位置

| 文件 | 用途 |
|------|------|
| `bin/throokie-ralph` | 主脚本 |
| `README.md` | 使用说明 |
| `docs/CHANGELOG.md` | 变更日志 |

## 直接运行语句

**Claude 可以直接运行以下命令**：

```bash
# 初始化
throokie-ralph init

# 创建 worktree
throokie-ralph create

# 查看状态
throokie-ralph status

# 合并
throokie-ralph merge

# 清理
throokie-ralph clean

# 帮助
throokie-ralph help
```

**编辑文件**：
- 使用 `Write` 工具创建 `WORKTREES.md`
- 使用 `Edit` 工具修改配置

---

## 🤖 使用多智能体团队执行 worktree 任务（推荐）

> **重要**：当前文档描述的是**单 Agent 跑多个 worktree** 的模式。对于复杂项目，**强烈建议**使用多智能体团队模式，让每个 Agent 专注一个 worktree。

### 为什么不使用单 Agent 跑多个 worktree？

**单 Agent 模式的问题**：
- 一个 Agent 需要在多个 worktree 之间切换上下文
- 无法真正实现并行执行
- 容易产生任务混淆和进度管理困难
- 无法进行中间质量检查

### 创建智能体团队的提示词模板

**当你需要执行多 worktree 并行开发任务时，使用以下提示词创建团队：**

```markdown
创建一个智能体团队来完成以下 worktree 开发任务：[你的项目名称]

团队组成：
1. **指挥代理 (Lead Agent)** - 负责 worktree 创建、任务分配和最终合并
2. **开发代理 A (Dev Agent A)** - 负责 worktree 1: [任务 A 名称]
3. **开发代理 B (Dev Agent B)** - 负责 worktree 2: [任务 B 名称]
4. **开发代理 C (Dev Agent C)** - 负责 worktree 3: [任务 C 名称]
5. **整合代理 (Integrator)** - 负责合并所有 worktree 到 main 分支

执行流程：
1. Lead Agent 读取 WORKTREES.md，创建所有 worktree
2. 每个 Dev Agent 被分配到对应的 worktree 目录
3. 所有 Dev Agent 并行执行各自的开发任务
4. 每个 Dev Agent 完成后提交代码到对应分支
5. Lead Agent 等待所有 Dev Agent 完成
6. Integrator 合并所有分支到 main

团队沟通协议：
- 每个 Dev Agent 在 `.worktrees/<name>/AGENT_PROGRESS.md` 中记录进度
- Lead Agent 定期检查各 worktree 进度
- 遇到冲突时由 Lead Agent 协调解决
```

### 示例：创建团队开发电商平台

**用户输入：**
```
创建一个智能体团队来开发电商平台的并行功能

团队组成：
1. **Lead Agent** - 负责 worktree 创建、任务分配和最终合并
2. **Dev Agent A** - 负责 worktree 1: 用户认证系统 (JWT、登录/注册)
3. **Dev Agent B** - 负责 worktree 2: 商品管理模块 (CRUD、分类、搜索)
4. **Dev Agent C** - 负责 worktree 3: 订单系统 (下单、支付、物流)
5. **Dev Agent D** - 负责 worktree 4: 购物车功能 (增删改查、结算)
6. **Integrator** - 负责合并所有 worktree 到 main 分支

执行流程：
1. Lead Agent 读取 WORKTREES.md，创建 4 个 worktree
2. 每个 Dev Agent 在对应 worktree 中开发
3. 所有 Dev Agent 并行执行，各自提交到 feature/<name> 分支
4. 所有任务完成后，Integrator 合并到 main

工作要求：
- 每个 Dev Agent 独立完成分配的子任务
- 所有 Dev Agent 并行执行
- 遵循统一的代码规范和 API 设计风格
- Integrator 负责解决合并冲突
```

### 示例：创建团队进行微服务拆分

**用户输入：**
```
创建一个智能体团队来进行微服务拆分

团队角色：
- **Lead Agent** (Opus 4): 任务分解、worktree 管理、质量把控
- **Dev Agent 1** (Sonnet 4): 用户服务 worktree - 用户管理、认证授权
- **Dev Agent 2** (Sonnet 4): 商品服务 worktree - 商品管理、库存管理
- **Dev Agent 3** (Sonnet 4): 订单服务 worktree - 订单处理、支付集成
- **Dev Agent 4** (Sonnet 4): 网关服务 worktree - API 网关、路由转发
- **Integrator**: 合并所有服务到 main，确保服务间依赖正确

每个 worktree 的任务：
1. 从 monorepo 提取独立服务代码
2. 创建独立的 package.json 和配置文件
3. 实现服务间接口定义
4. 编写单元测试

执行要求：
- 所有 Dev Agent 并行执行
- 每个 worktree 完成后提交到对应分支
- Lead Agent 协调服务间接口对齐
- Integrator 确保合并后系统可运行
```

### 使用 orchestrator skill 创建团队

**自动触发方式：**

| 用户输入 | 调用 Skill |
|----------|-----------|
| "创建团队开发 worktree" | orchestrator |
| "多代理并行开发" | orchestrator (parallel 模式) |
| "并行开发多个功能" | orchestrator |

**用法：**
```bash
# 使用 orchestrator 创建团队
node ~/src/projects/tools/user-scripts/skills/agents/orchestrator/scripts/route-intent.mjs "开发电商平台多功能模块"

# 并行模式（需要多个 API Key）
node ~/src/projects/tools/user-scripts/skills/agents/orchestrator/scripts/route-intent.mjs "开发电商平台多功能模块" --parallel
```

---

## 🏆 单 Agent vs 多团队对比

| 维度 | 单 Agent 模式 | 多团队模式 |
|------|-----------|-----------|
| **执行方式** | 一个 Agent 切换多个 worktree | 每个 Agent 专注一个 worktree |
| **并行度** | 串行执行 | 完全并行 |
| **上下文切换** | 频繁切换，易混淆 | 无切换，专注开发 |
| **质量把控** | 自我检查 | Lead Agent + Integrator 双重检查 |
| **适用场景** | 简单任务、1-2 个 worktree | 复杂项目、3+ 个 worktree |
| **执行时间** | 较长（串行） | 较短（真并行） |
| **冲突处理** | 自己解决 | Integrator 专门负责 |

---

## 📋 推荐工作流

```
用户请求
    │
    ▼
┌─────────────────────────────────────────┐
│  判断任务复杂度                           │
│  - 简单任务 → 单 Agent 模式               │
│  - 复杂项目 → 多团队模式                  │
└─────────────────────────────────────────┘
    │
    ├──────简单──────▶ 单 Agent 模式
    │                    │
    │                    ▼
    │              throokie-ralph create
    │                    │
    │                    ▼
    │              单 Agent 逐个开发
    │
    └──────复杂──────▶ 多团队模式
                         │
                         ▼
                   orchestrator 创建团队
                         │
                         ▼
                   Lead Agent 创建 worktree
                         │
            ┌────────────┼────────────┐
            ▼            ▼            ▼
       Dev Agent A  Dev Agent B  Dev Agent C
            │            │            │
            └────────────┴────────────┘
                         │
                         ▼
                   Integrator 合并
                         │
                         ▼
                   Lead Agent 输出报告
```

---

## 📝 多团队协作规范

### 1. Worktree 命名规范

```markdown
## Worktree 1: auth        → 分支名：feature/auth
## Worktree 2: payment     → 分支名：feature/payment
## Worktree 3: user        → 分支名：feature/user
```

### 2. 进度追踪文件

每个 worktree 中创建 `AGENT_PROGRESS.md`：

```markdown
# Worktree: auth

## 任务列表
- [ ] JWT Token 认证
- [ ] 登录/登出 API
- [ ] WebSocket 认证中间件

## 执行进度
- 2026-03-20 10:00 - 开始开发
- 2026-03-20 11:30 - 完成 JWT 认证
- 2026-03-20 14:00 - 完成登录 API
- 预计完成：2026-03-20 16:00

## 遇到问题
无

## 提交记录
- abc123 - feat: 实现 JWT 认证
- def456 - feat: 实现登录 API
```

### 3. 合并检查清单

Integrator 在合并前检查：

```markdown
## 合并前检查

- [ ] 所有 worktree 任务完成
- [ ] 所有代码已提交到对应分支
- [ ] 各分支与 main 无冲突
- [ ] 服务间接口一致
- [ ] 通过集成测试
```

---

## 🔗 参考资源

- [Orchestrator Skill](~/src/projects/tools/user-scripts/skills/agents/orchestrator/SKILL.md) - 多代理协作编排器
- [Git Worktree 文档](https://git-scm.com/docs/git-worktree)
- [long-running-agent](~/src/projects/tools/user-scripts/skills/agents/long-running-agent/SKILL.md) - 长周期任务管理
