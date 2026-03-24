---
name: th-workflow-decision-engine
description: >-
  PRD驱动工作流的决策大脑 - 智能判断何时使用搜索、代码分析、多模型聚合。
  作为子Skill被 th-prd-driven-dev-workflow 调用，负责工具选择和策略决策。
triggers:
  - 工作流决策
  - 智能工具选择
  - 需要搜索吗
  - 需要代码分析吗
---

# Workflow Decision Engine - 工作流决策大脑

> 智能决策何时使用搜索、GitNexus分析、多模型聚合

---

## 决策框架

### 决策输入

```typescript
interface DecisionContext {
  phase: number;              // 当前阶段 1-7
  task: string;               // 任务描述
  context?: {
    code?: string;            // 相关代码片段
    error?: string;           // 错误信息
    prd?: string;             // PRD内容
    files?: string[];         // 相关文件
  };
  history?: string[];         // 历史决策
}
```

### 决策输出

```typescript
interface DecisionResult {
  tools: string[];            // 推荐使用的工具
  priority: 'high' | 'medium' | 'low';
  reasoning: string;          // 决策理由
  searchQuery?: string;       // 搜索建议
  analysisTarget?: string;    // 分析目标
}
```

---

## 决策规则

### 阶段1: 项目分析

| 场景 | 决策 | 工具 |
|------|------|------|
| 新技术/框架 | 搜索 + 多模型聚合 | `unified-search`, `th-model-compare-search` |
| 已有PRD | 直接分析 | `Read` |
| 需求模糊 | 搜索竞品 | `unified-search` |

### 阶段2: 多模型需求分析

**自动触发** `th-model-compare-search` - 无需决策

### 阶段3: Kimi深度整合

**自动触发** `kimi-cli` - 无需决策

### 阶段4: PRD更新

**自动触发** `requirement-to-prd` - 无需决策

### 阶段5: 代码审查准备

```javascript
// 代码审查决策逻辑
function decideCodeReview(context) {
  const tools = ['codebundle'];

  // 如果涉及复杂依赖
  if (context.files?.length > 5 || context.hasSharedCode) {
    tools.push('th-gitnexus-assistant');
  }

  // 如果涉及外部API/库
  if (context.hasExternalDeps) {
    tools.push('unified-search');
  }

  // 必定使用多模型审查
  tools.push('th-model-compare-search');

  return { tools, priority: 'high' };
}
```

### 阶段6: 代码开发

| 场景 | 决策 |
|------|------|
| Bug修复 | `th-gitnexus-assistant` (影响分析) → `prd-to-code` |
| 新功能 | `unified-search` (最佳实践) → `prd-to-code` |
| 复杂算法 | `th-deep-coder2` → `prd-to-code` |

### 阶段7: 自动化测试

```javascript
// 测试失败时的决策
function decideOnTestFailure(error, context) {
  const tools = [];
  const errorMsg = error.toLowerCase();

  // 网络/API 错误
  if (errorMsg.includes('network') || errorMsg.includes('api') || errorMsg.includes('timeout')) {
    tools.push('unified-search');  // 搜索解决方案
  }

  // 代码逻辑错误
  if (errorMsg.includes('undefined') || errorMsg.includes('null') || errorMsg.includes('type')) {
    tools.push('th-gitnexus-assistant');  // 分析代码影响
  }

  // 复杂错误 - 多模型分析
  if (tools.length === 0 || errorMsg.includes('race') || errorMsg.includes('deadlock')) {
    tools.push('th-model-compare-search');
  }

  return {
    tools,
    priority: 'high',
    reasoning: '基于错误类型智能选择修复策略'
  };
}
```

---

## 工具选择矩阵

| 问题类型 | 首选工具 | 备选工具 | 理由 |
|---------|---------|---------|------|
| 需要最新信息 | `unified-search` | `web-fetch` | 联网获取最新文档 |
| 代码影响分析 | `th-gitnexus-assistant` | `mcp__gitnexus__impact` | 知识图谱分析 |
| 复杂问题诊断 | `th-model-compare-search` | `th-deep-coder2` | 多模型聚合 |
| 代码实现 | `prd-to-code` | `Agent` | PRD驱动开发 |
| 安全审查 | `th-gitnexus-assistant` + `security-reviewer` | - | 代码图谱+专业审查 |

---

## 决策执行示例

### 示例1: 测试失败决策

```javascript
// 输入
const context = {
  phase: 7,
  task: "修复测试失败",
  context: {
    error: "WebSocket connection timeout",
    stack: "...",
    files: ["src/websocket/handler.ts"]
  }
};

// 决策
await Skill({
  name: "th-workflow-decision-engine",
  args: JSON.stringify(context)
});

// 输出
{
  tools: ['unified-search', 'th-model-compare-search'],
  priority: 'high',
  reasoning: 'WebSocket超时错误可能涉及网络配置或代码逻辑，先搜索最佳实践，再用多模型诊断',
  searchQuery: 'WebSocket connection timeout Node.js 解决方案'
}
```

### 示例2: Bug修复决策

```javascript
// 输入
const context = {
  phase: 6,
  task: "修复竞态条件bug",
  context: {
    error: "connection already exists",
    files: ["src/connection/manager.ts", "src/websocket/handler.ts"]
  }
};

// 决策输出
{
  tools: ['th-gitnexus-assistant', 'th-deep-coder2', 'prd-to-code'],
  priority: 'high',
  reasoning: '竞态条件需要代码影响分析确定修复范围，再用深度代码分析找出根因',
  analysisTarget: "connection manager race condition"
}
```

---

## 集成到 Workflow

### 在阶段5（代码审查）中调用

```javascript
// 阶段5: 代码审查准备 - 智能工具选择
const reviewDecision = await Skill({
  name: "th-workflow-decision-engine",
  args: JSON.stringify({
    phase: 5,
    task: "代码审查",
    context: { files: changedFiles }
  })
});

// 根据决策执行
if (reviewDecision.tools.includes('th-gitnexus-assistant')) {
  // 执行影响分析
  await analyzeImpactWithGitNexus();
}

if (reviewDecision.tools.includes('unified-search')) {
  // 搜索最佳实践
  await searchBestPractices();
}

// 执行多模型代码审查
await Skill({ name: "th-model-compare-search", ... });
```

### 在阶段7（自动化测试）中调用

```javascript
// 测试失败处理
if (!testPassed) {
  const fixDecision = await Skill({
    name: "th-workflow-decision-engine",
    args: JSON.stringify({
      phase: 7,
      task: "修复测试失败",
      context: { error: testError }
    })
  });

  // 执行推荐的修复流程
  for (const tool of fixDecision.tools) {
    await Skill({ name: tool, ... });
  }
}
```

---

## 降级策略

| 工具失败 | 降级到 | 说明 |
|---------|--------|------|
| `th-gitnexus-assistant` | `Grep` + `Read` | 手动代码搜索 |
| `unified-search` | `web-fetch` | 单源搜索 |
| `th-model-compare-search` | `kimi-cli` | 单模型分析 |
| `th-deep-coder2` | `code-reviewer` Agent | 代码审查Agent |

---

*版本: v1.0 | 决策大脑 for th-prd-driven-dev-workflow*
