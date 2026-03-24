# Ralph Evolution - 架构设计文档

> **版本**: v1.0
> **日期**: 2026-03-23
> **作者**: Claude Code + throokie

---

## 1. 系统概述

Ralph Evolution 是一个**自动化闭环开发系统**，整合现有的 decision-record、bug-analyzer、prd-to-code、prd-evolution 和 ralpha 技能，形成一个从需求到代码、从测试到优化的自驱动工作流。

### 1.1 核心概念

```
决策(Decision) → 调研(Investigation) → PRD → 实现(Implementation) → 测试(Testing) → Bug分析 → 优化(Optimization)
     ↑                                                                                              │
     └────────────────────────────────────── 闭环反馈 ──────────────────────────────────────────────┘
```

### 1.2 设计目标

1. **自动化**: 减少人工干预，系统自动推进
2. **闭环**: Bug 和测试失败自动反馈到决策层
3. **可视化**: 实时监控面板显示关键影响信息
4. **可扩展**: 支持多种技术栈和项目类型

---

## 2. 系统架构

### 2.1 分层架构

```
┌─────────────────────────────────────────────────────────────┐
│                      用户交互层                              │
├─────────────────────────────────────────────────────────────┤
│  Dashboard (CLI/Web)  │  Decision Monitor  │  CLI Commands  │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                      编排控制层                              │
├─────────────────────────────────────────────────────────────┤
│                    Orchestrator (中央编排器)                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ State Manager│  │ Workflow    │  │ Event Dispatcher    │ │
│  │ (状态管理)   │  │ Engine      │  │ (事件分发)          │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                      技能集成层                              │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ decision     │  │ prd-         │  │ ralpha           │  │
│  │ -record      │  │ evolution    │  │ (worktree)       │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ prd-to-code  │  │ th-bug       │  │ th-deep-coder2   │  │
│  │              │  │ -analyzer    │  │                  │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                      执行层                                  │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Multi-Agent  │  │ Git          │  │ Test Runner      │  │
│  │ Team         │  │ Worktree     │  │                  │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 组件职责

| 组件 | 职责 | 输入 | 输出 |
|------|------|------|------|
| Orchestrator | 中央协调、状态管理 | 事件、触发器 | 任务分配、状态更新 |
| Decision Monitor | 监控决策文件变更 | 文件系统事件 | 决策变更事件 |
| Dashboard | 实时监控展示 | 状态数据 | 可视化界面 |
| Bug Analyzer Bridge | Bug 分析和修复协调 | 测试失败 | 修复任务/决策记录 |
| PRD Sync | PRD 状态同步 | PRD tree | 实现触发 |

---

## 3. 数据流

### 3.1 决策驱动流

```
1. 用户在 decision-record 中记录决策
          │
          ▼
2. Decision Monitor 检测到状态变更
   (draft → confirmed)
          │
          ▼
3. Orchestrator 接收事件
   ├── 如果 auto_investigate: 触发 th-deep-coder2
   └── 如果 auto_create_prd: 创建 PRD
          │
          ▼
4. PRD 状态变为 confirmed
          │
          ▼
5. 触发 prd-to-code 多代理实现
          │
          ▼
6. 创建 ralpha worktree 并行开发
          │
          ▼
7. 代码审查和测试
          │
          ▼
8. [成功] 合并代码，更新 PRD 状态
   [失败] 触发 Bug Analyzer → 创建决策/自动修复
          │
          ▼
9. 闭环反馈到决策层
```

### 3.2 Bug 处理流

```
测试失败
    │
    ▼
Bug Analyzer Bridge
    │
    ├── 风险等级评估 (LOW/MEDIUM/HIGH/CRITICAL)
    │
    ▼
分支处理:
    │
    ├── LOW/MEDIUM + auto_fix
    │   └── 自动修复 → 回归测试
    │
    └── HIGH/CRITICAL
        └── 创建决策记录 → 等待用户决策

修复完成 ───────┐
    │           │
    ▼           ▼
回归测试 → 更新决策状态
    │
    ▼
知识记录 (避免重复问题)
```

---

## 4. 状态机

### 4.1 决策状态机

```
                    ┌──────────────────────────────────┐
                    │                                  │
                    ▼                                  │
[新建] → [analyzing] → [investigating] → [confirmed]  │
                                          │            │
                                          ▼            │
                                    [implementing] ────┤
                                          │            │
                                          ▼            │
                                    [completed] ───────┘
                                          │
                                          ▼
                                    [archived]

异常路径:
[any] → [paused] (用户暂停)
[any] → [abandoned] (废弃)
```

### 4.2 PRD 状态机

```
[draft] → [confirmed] → [implementing] → [testing] → [merged]
   │                                        │
   ▼                                        ▼
[updated]                             [bug_found]
                                          │
                                          ▼
                                    [fixing] → [testing]
```

---

## 5. 触发器系统

### 5.1 触发器类型

| 触发器 | 事件源 | 条件 | 动作 |
|--------|--------|------|------|
| decision_confirmed | decision-record | 状态 = confirmed | 启动调研/创建 PRD |
| prd_ready | prd-evolution | 状态 = confirmed | 启动多代理实现 |
| test_failed | 测试运行器 | 测试失败 | 触发 Bug 分析 |
| coverage_low | 覆盖率检查 | 覆盖率 < 阈值 | 创建改进决策 |
| manual_trigger | CLI | 用户命令 | 执行指定操作 |

### 5.2 事件队列

```javascript
// 事件结构
{
  id: "evt-uuid",
  type: "decision_confirmed",
  timestamp: "2026-03-23T14:30:00Z",
  source: "decision-monitor",
  payload: {
    decisionId: "user-auth-optimization",
    project: "user-auth",
    // ...
  },
  priority: "high",
  status: "pending"
}
```

---

## 6. Dashboard 设计

### 6.1 面板布局

```
┌─────────────────────────────────────────────────────────────────────┐
│  Header (系统状态、项目名称)                                          │
├──────────────┬──────────────┬──────────────┬────────────────────────┤
│  决策状态     │  PRD 版本树   │  代理状态     │  Worktree 状态        │
├──────────────┼──────────────┼──────────────┼────────────────────────┤
│  测试状态     │  Bug 分析     │  影响分析     │  [扩展面板]           │
├──────────────┴──────────────┴──────────────┴────────────────────────┤
│  系统日志                                                           │
├─────────────────────────────────────────────────────────────────────┤
│  Footer (控制命令)                                                   │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.2 实时更新机制

- **WebSocket 模式**: Dashboard 与 Orchestrator 通过 WebSocket 通信
- **文件轮询模式**: Dashboard 定期读取状态文件
- **事件驱动模式**: Orchestrator 主动推送状态变更

---

## 7. 配置系统

### 7.1 配置层级

```
~/.claude/ralph-evo/
├── config.default.yaml    # 默认配置
├── config.yaml            # 用户配置 (覆盖默认)
└── projects/
    └── {project}/
        └── config.yaml    # 项目配置 (覆盖用户配置)
```

### 7.2 配置项

```yaml
# 示例配置
triggers:
  decision_record:
    enabled: true
    auto_investigate: true
    auto_create_prd: true

team:
  max_parallel_agents: 5
  workers:
    - name: "data-agent"
      model: "typescript-reviewer"

quality_gates:
  test_coverage:
    threshold: 90

dashboard:
  port: 3456
  refresh_interval: 2000
```

---

## 8. 扩展点

### 8.1 添加新的触发器

```javascript
// 在 orchestrator.mjs 中注册
orchestrator.registerTrigger({
  name: 'my_trigger',
  condition: (event) => event.type === 'my_event',
  action: async (event) => {
    // 自定义逻辑
  }
});
```

### 8.2 添加新的 Agent 类型

```yaml
# 在 workflow-config.yaml 中配置
team:
  workers:
    - name: "my-agent"
      layer: "custom"
      model: "custom-reviewer"
      description: "自定义代理"
```

---

## 9. 安全考虑

1. **权限控制**: 限制对决策文件和 PRD 的写入权限
2. **自动修复限制**: 高风险变更必须经过用户确认
3. **审计日志**: 记录所有自动化操作
4. **回滚机制**: 支持快速回滚到之前状态

---

## 10. 部署指南

### 10.1 安装

```bash
# 1. 链接到 skills 目录
ln -s ~/src/projects/tools/user-scripts/skills/th-ralph-evo \
  ~/.claude/skills/th-ralph-evo

# 2. 安装依赖 (如果有)
cd ~/.claude/skills/th-ralph-evo
# npm install (如果需要)

# 3. 创建可执行链接
chmod +x scripts/*.mjs
ln -s ~/.claude/skills/th-ralph-evo/scripts/ralph-evo.mjs \
  ~/.local/bin/ralph-evo
```

### 10.2 启动

```bash
# 启动完整系统
ralph-evo start --project user-auth

# 仅启动监控
ralph-evo monitor-decisions

# 启动面板
ralph-evo dashboard
```

---

## 11. 未来扩展

1. **AI 学习**: 从历史 Bug 中学习，预测潜在问题
2. **智能推荐**: 根据项目历史推荐最佳实践
3. **多项目协调**: 支持跨项目的依赖管理
4. **CI/CD 集成**: 与 GitHub Actions、GitLab CI 集成

---

*文档版本: v1.0 | 最后更新: 2026-03-23*
