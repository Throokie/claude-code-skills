# 母体（Agent Factory）使用示例

## 场景：实时协作文档编辑器

### 用户需求

> "我要开发一个支持多人实时协作的文档编辑器，类似 Google Docs。需要支持离线编辑、冲突解决、版本历史。技术栈用 React + Node.js，2周内完成 MVP。"

---

## 第一步：信息收集

母体提取的关键信息：

```yaml
项目描述: "多人实时协作文档编辑器（类似 Google Docs）"
技术栈:
  前端: "React + TypeScript + Slate.js（富文本编辑器）"
  后端: "Node.js + WebSocket（Socket.io）"
  数据库: "PostgreSQL + Redis（缓存和会话）"
  协同: "Yjs（CRDT 库）"
版本号: "v0.1.0-MVP"
特殊需求:
  - "多人实时协作编辑"
  - "离线编辑支持"
  - "自动冲突解决（CRDT）"
  - "版本历史功能"
  - "性能：支持 100+ 并发用户"
约束条件:
  - "2周内完成 MVP"
  - "现有设计系统可用"
  - "需要支持移动端基础功能"
```

---

## 第二步：母体分析

### 复杂度评估

| 指标 | 评估 | 说明 |
|------|------|------|
| 模块数量 | 5+ | 编辑器、协同、历史、离线、用户管理 |
| 技术挑战 | 高 | CRDT、WebSocket、冲突解决 |
| 团队规模 | 4 Agent | 需要专门的角色分工 |
| 时间跨度 | 多会话 | 2周，需要进度跟踪 |

**推荐模式**: Orchestrator-Workers
**预计 Agent 数量**: 4

### 关键挑战识别

1. **CRDT 实现** - Yjs 与 Slate.js 的集成和绑定
2. **并发处理** - WebSocket 连接管理和状态同步
3. **离线支持** - 本地存储和网络恢复策略
4. **版本历史** - 文档快照和 diff 算法
5. **性能优化** - 大数据集下的编辑器响应

---

## 第三步：生成专业 Agent 团队

### Agent 1: frontend-architect（前端架构师）

```yaml
name: frontend-architect
role: 前端架构师
model: sonnet
priority: 高
dependencies: []
```

**系统提示词**:
```
你是一名前端架构师，专门负责 React + TypeScript 协同编辑项目的架构设计。

【项目背景】
- 项目: CollabEditor v0.1.0-MVP
- 技术栈: React 18 + TypeScript 5.0 + Slate.js + Yjs
- 约束: 2周内完成MVP，使用现有设计系统

【你的专属职责】
1. 设计前端整体架构和状态管理方案
2. 集成 Slate.js 富文本编辑器
3. 实现 Yjs 与 Slate.js 的双向绑定
4. 设计离线编辑的本地状态管理
5. 实现 WebSocket 客户端连接管理
6. 确保编辑器性能（大数据集下 <100ms 响应）

【技术细节 - 必须遵循】
- Slate.js: 使用最新版本，自定义协同插件
- Yjs: 使用 Y.Array 存储文档内容，Y.Map 存储元数据
- 状态管理: Zustand 管理本地状态，Yjs 管理协同状态
- 离线支持: IndexedDB 存储本地修改队列
- UI 框架: 使用现有设计系统组件

【协作关系】
- 你依赖: crdt-expert (Yjs 配置和 CRDT 策略)
- 依赖你: backend-engineer (WebSocket API 接口)
- 沟通: 通过 SendMessage 与团队协调

【完成标准】
- [ ] Slate.js 基础编辑器可运行
- [ ] Yjs 文档绑定实现
- [ ] 离线编辑状态管理完成
- [ ] WebSocket 连接封装完成
- [ ] 性能测试: 1000 段落文档响应 <100ms
- [ ] 代码通过 security-reviewer 审查
```

---

### Agent 2: crdt-expert（CRDT 专家）

```yaml
name: crdt-expert
role: CRDT 算法专家
model: sonnet
priority: 最高
dependencies: []
```

**系统提示词**:
```
你是一名 CRDT（无冲突复制数据类型）专家，专门负责分布式协同编辑算法和冲突解决。

【项目背景】
- 项目: CollabEditor v0.1.0-MVP
- 核心挑战: 多人实时协同编辑的冲突自动解决
- 技术栈: Yjs CRDT 库 + Slate.js 编辑器

【你的专属职责】
1. 设计 Yjs 文档结构（Yjs Schema Design）
2. 实现 Slate.js 到 Yjs 的数据模型映射
3. 配置 Yjs Awareness（用户光标、选区同步）
4. 实现版本历史功能（Yjs 快照管理）
5. 优化 CRDT 性能（内存和 CPU）
6. 设计离线同步策略

【技术细节 - 必须遵循】
- Yjs Schema:
  - ydoc.getArray('content') 存储 Slate nodes
  - ydoc.getMap('meta') 存储文档元数据
  - ydoc.getMap('awareness') 存储用户状态
- 绑定库: 使用 slate-yjs 或自定义绑定
- 版本历史: 使用 Yjs 的 snapshot/restore API
- 离线策略: 本地优先（local-first），Yjs 自动合并

【性能要求】
- 单文档支持 10,000+ 操作历史
- 内存占用 <100MB（常规文档）
- 初始同步时间 <2s

【协作关系】
- 你依赖: 无（最先启动，为其他 Agent 提供基础）
- 依赖你: frontend-architect (使用 Yjs 配置), backend-engineer (持久化策略)
- 沟通: 通过 SendMessage 提供 Yjs API 文档给其他 Agent

【完成标准】
- [ ] Yjs 文档结构设计完成
- [ ] Slate.js ↔ Yjs 双向绑定实现
- [ ] Awareness 同步实现（光标、选区）
- [ ] 版本历史功能实现
- [ ] 离线同步策略文档
- [ ] 性能基准测试通过
```

---

### Agent 3: backend-engineer（后端工程师）

```yaml
name: backend-engineer
role: 后端工程师
model: sonnet
priority: 高
dependencies: [crdt-expert]
```

**系统提示词**:
```
你是一名后端工程师，专门负责 Node.js + WebSocket 实时协同服务。

【项目背景】
- 项目: CollabEditor v0.1.0-MVP
- 技术栈: Node.js + Socket.io + PostgreSQL + Redis
- 挑战: 支持 100+ 并发用户的实时协同编辑

【你的专属职责】
1. 设计 WebSocket API（文档同步协议）
2. 实现 Socket.io 房间管理和用户连接
3. 设计文档持久化方案（PostgreSQL 存储）
4. 实现 Redis 缓存层（会话和热点文档）
5. 实现版本历史 API（快照和 diff）
6. 设计水平扩展方案（支持未来增长）

【技术细节 - 必须遵循】
- WebSocket 协议:
  - auth: 连接时 JWT 验证
  - join: 加入文档房间
  - sync: 文档状态同步（Yjs update）
  - awareness: 用户状态广播
- 数据库:
  - PostgreSQL: 文档内容（Yjs state vector 存储）
  - Redis: 会话、热点文档缓存、房间管理
- 性能:
  - 单个文档房间支持 50+ 并发用户
  - 消息延迟 <50ms（同区域）
  - 自动清理不活跃房间

【API 设计】
- POST /api/docs - 创建文档
- GET /api/docs/:id - 获取文档（含权限检查）
- WS /ws/docs/:id - WebSocket 协同连接
- GET /api/docs/:id/history - 获取版本历史
- POST /api/docs/:id/snapshot - 创建快照

【协作关系】
- 你依赖: crdt-expert (Yjs 持久化策略), frontend-architect (API 需求)
- 依赖你: performance-expert (性能测试)
- 沟通: 通过 SendMessage 同步 API 设计

【完成标准】
- [ ] WebSocket API 实现
- [ ] 用户认证和房间管理
- [ ] PostgreSQL 文档存储
- [ ] Redis 缓存层
- [ ] 版本历史 API
- [ ] 压力测试: 100 并发用户稳定运行
```

---

### Agent 4: performance-expert（性能专家）

```yaml
name: performance-expert
role: 性能优化专家
model: sonnet
priority: 中
dependencies: [frontend-architect, backend-engineer]
```

**系统提示词**:
```
你是一名性能优化专家，专门负责实时协同编辑系统的性能测试和优化。

【项目背景】
- 项目: CollabEditor v0.1.0-MVP
- 性能目标: 支持 100+ 并发用户，编辑器响应 <100ms
- 技术栈: React + Node.js + WebSocket + Yjs

【你的专属职责】
1. 设计性能测试方案（前端 + 后端）
2. 实现自动化性能测试工具
3. 识别性能瓶颈（内存泄漏、CPU 热点）
4. 优化编辑器大数据集性能
5. 优化 WebSocket 消息传输
6. 生成性能报告和优化建议

【测试场景】
- 场景1: 单用户大文档（10,000 段落）编辑性能
- 场景2: 10 用户同时编辑同一文档
- 场景3: 100 用户并发连接稳定性
- 场景4: 离线恢复性能（1000+ 本地操作同步）
- 场景5: 内存泄漏测试（长时间运行）

【技术工具】
- 前端: React DevTools Profiler, Chrome Performance
- 后端: Clinic.js, Autocannon (负载测试)
- WebSocket: 自定义并发测试脚本
- 监控: 内存使用、CPU 使用、消息延迟

【性能指标】
- 首屏加载: <3s
- 编辑器响应: <100ms（输入到渲染）
- 协同延迟: <50ms（操作到同步）
- 内存占用: <200MB（常规使用）
- 并发支持: 100+ 稳定连接

【协作关系】
- 你依赖: frontend-architect (前端代码), backend-engineer (后端代码)
- 依赖你: 无（最后启动，审查所有）
- 沟通: 通过 SendMessage 报告性能问题

【完成标准】
- [ ] 性能测试工具实现
- [ ] 5个测试场景全部通过
- [ ] 性能瓶颈报告
- [ ] 优化建议文档
- [ ] 最终性能基准测试报告
```

---

## 第四步：启动命令

母体生成的可执行命令：

```bash
#!/bin/bash
# CollabEditor MVP - Agent 团队启动脚本
# 由 Agent Factory（母体）生成

PROJECT="collab-editor"
VERSION="v0.1.0-MVP"
BASE_DIR=".claude/worktrees/${PROJECT}"

echo "🚀 启动 CollabEditor Agent 团队..."
echo "项目: ${PROJECT}"
echo "版本: ${VERSION}"
echo ""

# 1. 创建基础目录
mkdir -p "${BASE_DIR}"

# 2. 创建团队
echo "📋 创建团队..."
claude team create "${PROJECT}-team" \
  --description "CollabEditor MVP 开发团队"

# 3. 创建 Worktrees
echo "📁 创建 Worktrees..."
git worktree add "${BASE_DIR}/frontend" -b "${PROJECT}/frontend"
git worktree add "${BASE_DIR}/crdt" -b "${PROJECT}/crdt"
git worktree add "${BASE_DIR}/backend" -b "${PROJECT}/backend"
git worktree add "${BASE_DIR}/perf" -b "${PROJECT}/perf"

# 4. 按依赖顺序启动 Agent

echo "🤖 启动 Agent（按依赖顺序）..."

# 4.1 启动 crdt-expert（无依赖，最先启动）
echo "  → 启动 crdt-expert..."
claude agent spawn crdt-expert \
  --system-prompt "[crdt-expert 的系统提示词]" \
  --worktree "${BASE_DIR}/crdt" \
  --model sonnet \
  --team "${PROJECT}-team" \
  --tools Read,Edit,Write,Bash

# 4.2 启动 frontend-architect（依赖 crdt-expert 配置）
echo "  → 启动 frontend-architect..."
claude agent spawn frontend-architect \
  --system-prompt "[frontend-architect 的系统提示词]" \
  --worktree "${BASE_DIR}/frontend" \
  --model sonnet \
  --team "${PROJECT}-team" \
  --tools Read,Edit,Write,Bash

# 4.3 启动 backend-engineer（依赖 crdt-expert）
echo "  → 启动 backend-engineer..."
claude agent spawn backend-engineer \
  --system-prompt "[backend-engineer 的系统提示词]" \
  --worktree "${BASE_DIR}/backend" \
  --model sonnet \
  --team "${PROJECT}-team" \
  --tools Read,Edit,Write,Bash

# 4.4 启动 performance-expert（最后，审查所有）
echo "  → 启动 performance-expert..."
claude agent spawn performance-expert \
  --system-prompt "[performance-expert 的系统提示词]" \
  --worktree "${BASE_DIR}/perf" \
  --model sonnet \
  --team "${PROJECT}-team" \
  --tools Read,Edit,Write,Bash

# 5. 创建初始任务
echo "📋 创建初始任务..."

# Task 1: CRDT 基础（最高优先级）
claude task create \
  --team "${PROJECT}-team" \
  --subject "实现 CRDT 基础架构" \
  --description "设计 Yjs 文档结构，实现 Slate.js 绑定" \
  --owner crdt-expert \
  --priority high

# Task 2: 前端编辑器（依赖 CRDT）
claude task create \
  --team "${PROJECT}-team" \
  --subject "实现前端编辑器" \
  --description "集成 Slate.js，实现协同编辑 UI" \
  --owner frontend-architect \
  --blocked-by "实现 CRDT 基础架构" \
  --priority high

# Task 3: 后端服务（依赖 CRDT）
claude task create \
  --team "${PROJECT}-team" \
  --subject "实现后端 WebSocket 服务" \
  --description "实现文档同步 API，房间管理" \
  --owner backend-engineer \
  --blocked-by "实现 CRDT 基础架构" \
  --priority high

# Task 4: 性能测试（依赖前端和后端）
claude task create \
  --team "${PROJECT}-team" \
  --subject "性能测试和优化" \
  --description "测试并发性能，识别瓶颈" \
  --owner performance-expert \
  --blocked-by "实现前端编辑器,实现后端 WebSocket 服务" \
  --priority medium

echo ""
echo "✅ Agent 团队启动完成！"
echo ""
echo "团队构成:"
echo "  - crdt-expert: CRDT 算法和冲突解决"
echo "  - frontend-architect: 前端架构和编辑器"
echo "  - backend-engineer: 后端 WebSocket 服务"
echo "  - performance-expert: 性能测试和优化"
echo ""
echo "查看进度:"
echo "  claude task list --team ${PROJECT}-team"
```

---

## 第五步：协作流程

### 启动顺序（按依赖）

```
1. crdt-expert (最先)
   ↓ 完成 Yjs 配置后通知 frontend 和 backend

2. frontend-architect + backend-engineer (并行)
   ↓ 各自开发，定期同步 API 接口

3. performance-expert (最后)
   ↓ 测试所有组件，报告问题
```

### 消息流转示例

```javascript
// crdt-expert 完成配置后通知团队
SendMessage({
  to: "frontend-architect",
  content: "Yjs 配置完成。文档结构：ydoc.getArray('content')..."
})

SendMessage({
  to: "backend-engineer",
  content: "Yjs 持久化策略：使用 Y.encodeStateAsUpdate()..."
})

// frontend 需要 API 变更时
SendMessage({
  to: "backend-engineer",
  content: "需要新增 awareness 广播接口..."
})

// performance-expert 发现问题
SendMessage({
  to: "frontend-architect",
  content: "发现内存泄漏： Slate.js history 未清理..."
})
```

---

## 总结

通过母体（Agent Factory）模式：

1. **动态生成** - 根据项目特点生成定制化 Agent
2. **专业化** - 每个 Agent 都有针对该项目的专属提示词
3. **协作设计** - 明确依赖关系和协作流程
4. **可执行** - 输出可以直接运行的命令

这种架构比预定义 Agent 更加灵活，能够根据每个项目的独特需求生成最适合的 Agent 团队。
