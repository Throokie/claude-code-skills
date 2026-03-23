# 武器库精简决策

**日期**: 2026-03-18
**问题**: 武器库 skill 太多，导致 Claude 什么都学不精

---

## 问题分析

**原武器库配置**（6 个 skill）:
```
1. product-builder/SKILL.md       - 产品级构建框架
2. long-running-agent/SKILL.md    - 多 agent 协作
3. project-manager/SKILL.md       - 时间盒管理
4. deep-work-tracker/SKILL.md     - 深度工作追踪
5. e2e-optimizer/SKILL.md         - Playwright E2E 测试
6. git-worktree/SKILL.md          - Git Worktree 并行开发
```

**问题**:
- 每个 skill 都有复杂的方法论和流程
- Claude 无法同时内化 6 套不同的工作流
- 实际使用中，可能只调用了 surface-level 的概念，没有深入实践
- 武器库之间可能有重叠或冲突（如 time-boxing vs deep-work）

**ws1 观察**:
- Claude 确实在用 product-builder 的概念（Phase、时间盒、闭环协议）
- 但没有看到主动调用 `long-running-agent` 创建子代理
- 多 agent 协作停留在概念层面，没有实际执行

---

## 精简决策

**新武器库配置**（只保留 2 个核心）:
```
1. product-builder/SKILL.md       - 产品级构建框架（主 skill）
2. long-running-agent/SKILL.md    - 多 agent 协作（必须用）
```

**移除的 skill**:
- `project-manager/SKILL.md` - 时间盒已整合到 product-builder
- `deep-work-tracker/SKILL.md` - 功能被其他覆盖
- `e2e-optimizer/SKILL.md` - 需要时再查阅
- `git-worktree/SKILL.md` - git prompt 已包含基础指导

**设计理念**:
- **少而精**：2 个 core skill，确保Claude真正内化
- **主次分明**：product-builder 是主框架，long-running-agent 是执行工具
- **按需加载**：其他 skill 在特定需求时再通过自定义文件添加

---

## 强制多 Agent 执行

**新增明确要求**:
```markdown
【强制要求：多 Agent 协作】
- **必须使用 2-3 个 agent 并行开发**：
  - 主 Agent：核心逻辑 + 架构设计 + 集成
  - Worker Agent 1:UI/前端/视觉
  - Worker Agent 2: 测试/E2E/文档（可选）
- **必须用 `/long-running-agent` 创建子代理**，不要用 orchestrator（太重）
- 每个 agent 分配独立时间盒（建议 10-15 分钟）
- 主 agent 每轮必须汇报各 agent 进度
```

**为什么明确指定 `/long-running-agent`**:
- orchestrator 是 Lead-Worker 模式，适合探索性任务
- long-running-agent 更适合持久的开发工作流
- 避免 Claude 选择"更简单"的单 agent 模式

---

## 预期效果

**精简前**:
- 6 个 skill，每个都只懂皮毛
- Claude 选择性地调用概念
- 多 agent 停留在口号

**精简后**:
- 2 个 skill，必须深入理解并执行
- 每轮 prompt 都强化同样的方法论
- 多 agent 成为强制要求，不是可选项

---

## 验证方法

```bash
# 观察 ws1 日志，看是否主动创建子代理
tail -f /tmp/claude-drive-ws1.log | grep -i "agent"

# 预期看到:
# - "创建子 agent..."
# - "分配给 Agent 1..."
# - "Agent 2 报告..."
```

---

## 后续调整

如果使用 2 个 skill 运行稳定，可以考虑：
1. 保持现状，让 Claude 彻底内化
2. 按需添加第 3 个 skill（如 e2e-optimizer）
3. 绝不会超过 3 个

**核心原则**: 宁可少用，不可滥用。
