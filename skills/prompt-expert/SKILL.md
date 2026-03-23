---
name: prompt-expert
description: 智能提示词专家 - 根据上下文和对话环境动态生成最优提示词
version: 1.0.0
created: 2026-03-21
---

# Prompt Expert - 智能提示词专家

> **用途**: 分析当前对话上下文、项目环境、用户意图，智能生成最合适的提示词
> **触发策略**: 多模型聚合分析 + 本地上下文感知
> **核心理念**: 不是优化提示词本身，而是根据场景生成最适合的提示词

---

## 🚀 快速开始

### 自动触发（三种方式）

#### 方式 1: 关键词触发

当用户输入包含以下关键词时，自动调用提示词专家：

| 用户输入 | 自动调用 |
|----------|----------|
| "怎么提示"、"如何 prompt"、"提示词怎么写" | `prompt-expert` |
| "这个场景怎么问"、"应该怎么问" | `prompt-expert` |
| "帮我生成提示词"、"写个 prompt" | `prompt-expert` |
| "optimize prompt"、"how to prompt"、"write a prompt" | `prompt-expert` |
| "best way to ask"、"how should I ask" | `prompt-expert` |

#### 方式 2: 场景感知触发

当检测到以下场景时，自动提供提示词建议：

| 场景 | 触发动作 |
|------|----------|
| 用户描述复杂需求但表达模糊 | 生成结构化提示词 |
| 用户在多个话题间切换 | 生成聚焦提示词 |
| 用户准备开始新任务 | 生成任务启动提示词 |
| 用户遇到阻碍/困惑 | 生成问题诊断提示词 |

#### 方式 3: 手动触发

```bash
# 基础分析
node ~/src/projects/tools/user-scripts/skills/prompt-expert/main.mjs "你的需求"

# 带上下文分析
node ~/src/projects/tools/user-scripts/skills/prompt-expert/main.mjs --context

# 深度分析（多模型）
node ~/src/projects/tools/user-scripts/skills/prompt-expert/main.mjs --deep

# 查看最近的提示词建议
cat ~/.claude/projects/-home-throokie/prompt-suggestions.md
```

---

## 🏗️ 架构设计

```
用户输入/当前对话
       │
       ▼
┌─────────────────┐
│  上下文感知引擎  │  ← 分析对话历史、项目状态、文件变更
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  意图识别层      │  ← 确定用户想要完成什么
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  场景匹配引擎    │  ← 匹配到预定义场景模板
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  多模型提示词生成 │  ← 并行生成多个提示词版本
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  质量评估与整合  │  ← 选择最优提示词
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  输出提示词      │  ← 附带使用建议
└─────────────────┘
```

---

## 📁 目录结构

```
prompt-expert/
├── SKILL.md              # 本文件
├── README.md             # 详细文档
├── main.mjs              # 主入口
├── scripts/
│   ├── context-analyzer.mjs    # 上下文分析
│   ├── scenario-matcher.mjs    # 场景匹配
│   ├── prompt-generator.mjs    # 提示词生成
│   ├── quality-scorer.mjs      # 质量评分
│   └── template-library.md     # 提示词模板库
├── config/
│   ├── scenarios.json      # 场景定义
│   └── prompts.yaml        # 提示词配置
└── output/
    └── suggestions/        # 生成的提示词建议
```

---

## 📊 场景类型定义

### 按任务复杂度

| 场景 | 特征 | 提示词策略 |
|------|------|------------|
| **简单查询** | 单一问题、事实性 | 直接、精确、一行 |
| **任务执行** | 需要操作、有步骤 | 结构化、分步骤、带验收标准 |
| **探索研究** | 开放性问题、需要调研 | 多轮对话、分阶段 |
| **创意设计** | 需要创意、头脑风暴 | 发散性、多角度 |
| **问题诊断** | 调试、排查 | 假设驱动、排除法 |
| **学习理解** | 新概念、新技能 | 类比、示例驱动 |

### 按对话阶段

| 阶段 | 特征 | 提示词策略 |
|------|------|------------|
| **启动阶段** | 刚开始任务 | 设定目标、范围、期望 |
| **执行阶段** | 进行中 | 聚焦当前步骤、上下文保持 |
| **阻塞阶段** | 遇到困难 | 问题定位、备选方案 |
| **收尾阶段** | 接近完成 | 验收、验证、文档化 |

### 按项目上下文

| 项目类型 | 检测信号 | 提示词调整 |
|----------|----------|------------|
| **新项目** | 无 git 历史、空目录 | 强调脚手架、最佳实践 |
| **现有项目** | 有代码库、规范 | 强调遵循现有模式 |
| **多模块项目** | 复杂目录结构 | 强调模块边界、依赖关系 |
| **协作项目** | 有 PR、issue | 强调沟通、文档 |

---

## 🔧 核心功能

### 1. 上下文感知分析

```javascript
// 分析的维度
const contextDimensions = {
  // 对话历史
  conversationHistory: {
    recentTopics: [],      // 最近讨论的话题
    unresolvedQuestions: [], // 未解答的问题
    recurringThemes: []     // 反复出现的主题
  },

  // 项目状态
  projectState: {
    currentDirectory: '',   // 当前工作目录
    gitStatus: '',          // git 状态
    recentChanges: [],      // 最近的代码变更
    openFiles: []           // 打开的文件
  },

  // 用户状态
  userState: {
    currentTask: '',        // 当前任务
    taskProgress: '',       // 任务进度
    frustrationSignals: [], // 挫折信号
    confidenceLevel: ''     // 信心水平
  }
};
```

### 2. 场景匹配引擎

```javascript
// 场景匹配规则
const scenarioRules = {
  'bug-fix': {
    signals: ['报错', 'error', 'failed', '不工作', 'bug'],
    promptTemplate: `
你正在调试一个问题。请按以下步骤进行：

1. **问题复现**: 先确认问题现象和复现步骤
2. **定位范围**: 确定问题可能出现的模块
3. **假设验证**: 提出 3 个最可能的原因，逐一排查
4. **修复方案**: 给出修复代码和验证方法

当前上下文：
- 项目类型：{projectType}
- 技术栈：{techStack}
- 错误信息：{errorMessage}
`
  },

  'feature-implementation': {
    signals: ['实现', '添加', 'create', 'build', '新功能'],
    promptTemplate: `
你正在实现一个新功能。请按以下流程进行：

1. **需求澄清**: 确认功能的具体需求和边界
2. **设计先行**: 先设计接口/组件结构，再编码
3. **测试驱动**: 先写测试，再实现功能
4. **代码审查**: 完成后自查代码质量

技术要求：
- 遵循项目的代码规范
- 参考类似功能的实现模式
- 保证 80%+ 测试覆盖率
`
  },

  'research-exploration': {
    signals: ['怎么', '如何', 'how to', '了解', '学习', '原理'],
    promptTemplate: `
你正在探索一个新技术/概念。请按以下方式进行：

1. **背景介绍**: 这是什么？为什么重要？
2. **核心概念**: 关键术语和概念解释
3. **实践示例**: 最小可运行的代码示例
4. **最佳实践**: 业界推荐的使用方式
5. **常见陷阱**: 容易犯的错误和如何避免

学习路径建议：
- 入门资料（15 分钟）
- 深入资料（1 小时）
- 实战项目（1 天）
`
  }
};
```

### 3. 提示词生成器

```javascript
// 提示词生成的元原则
const promptGenerationPrinciples = {
  // 清晰度
  clarity: '用简洁明确的语言，避免歧义',

  // 上下文
  context: '包含必要的背景信息，但不过载',

  // 结构
  structure: '使用分点、编号、代码块等结构化格式',

  // 可执行
  actionability: '明确指出期望的输出和行动',

  // 约束
  constraints: '设定合理的边界和限制',

  // 示例
  examples: '提供示例说明期望的输出格式'
};
```

### 4. 质量评分系统

```javascript
// 提示词质量评分维度
const qualityMetrics = {
  // 完整性 (0-25 分)
  completeness: {
    hasContext: false,      // 有上下文
    hasGoal: false,         // 有明确目标
    hasConstraints: false,  // 有约束条件
    hasExamples: false,     // 有示例
    hasOutputFormat: false  // 有输出格式要求
  },

  // 清晰度 (0-25 分)
  clarity: {
    unambiguous: false,     // 无歧义
    concise: false,         // 简洁
    wellStructured: false,  // 结构良好
    specificLanguage: false // 使用具体语言
  },

  // 可执行性 (0-25 分)
  actionability: {
    clearAction: false,     // 明确的行动指令
    feasible: false,        // 在能力范围内
    testable: false,        // 结果可验证
    prioritized: false      // 优先级清晰
  },

  // 上下文适配 (0-25 分)
  contextFit: {
    projectAligned: false,  // 与项目一致
    conversationAligned: false, // 与对话连贯
    userLevelAligned: false,    // 与用户水平匹配
    timeAppropriate: false  // 时间预算合理
  }
};
```

---

## 📝 使用示例

### 示例 1: 模糊需求 → 结构化提示词

```
用户输入：我想优化这个项目的性能

检测到：
- 当前项目：Node.js 后端服务
- 最近对话：讨论数据库查询
- 代码变更：添加了新的 API 端点

生成的提示词：
```
你正在优化一个 Node.js 后端服务的性能。

**上下文**:
- 项目类型：Express API 服务
- 最近改动：添加了新的数据查询端点
- 性能瓶颈：数据库查询响应时间 > 500ms

**任务要求**:
1. 先分析当前性能瓶颈（使用 profiling 工具）
2. 识别慢查询并优化（考虑索引、缓存）
3. 给出可量化的优化目标和验收标准
4. 不要引入新的外部依赖

**输出格式**:
- 性能分析报告
- 优化方案列表（按影响排序）
- 实施步骤和验证方法
```
```

### 示例 2: 阻塞场景 → 诊断提示词

```
用户输入：这个功能我一直实现不了，卡住了

检测到：
- 用户情绪：挫折
- 尝试次数：多次
- 当前进度：部分完成

生成的提示词：
```
你遇到了一个实现障碍。让我们系统性地诊断问题：

**当前状态**:
- 已完成：{completedParts}
- 阻塞点：{blockingPoint}
- 已尝试：{attemptedSolutions}

**诊断流程**:
1. **重新定义问题**: 用不同方式描述阻塞点
2. **拆解问题**: 把大问题拆成可管理的小步骤
3. **寻求替代**: 是否有其他方式达到同样目标？
4. **外部视角**: 参考类似项目的解决方案

**下一步行动**:
请告诉我具体卡在哪个步骤，以及你期望的行为 vs 实际行为。
```
```

### 示例 3: 新项目启动 → 脚手架提示词

```
用户输入：我要开始一个新项目，做 XXX

检测到：
- 项目状态：空目录
- 用户经验：初次接触该技术栈
- 时间预算：未指定

生成的提示词：
```
你正在启动一个新项目。让我们建立一个坚实的基础：

**项目目标**: {projectGoal}

**启动清单**:
1. **技术选型**: 根据需求选择合适的技术栈
2. **项目脚手架**: 创建标准目录结构
3. **开发环境**: 配置 lint、test、debug 工具
4. **文档框架**: 建立 README、贡献指南
5. **CI/CD**: 设置基础自动化流程

**学习资源**:
- 官方入门教程（预计 2 小时）
- 最佳实践文档（预计 1 小时）
- 示例项目参考（推荐 3 个）

**第一步**: 我们先从项目脚手架开始，我会帮你创建一个标准化的目录结构。
准备好后告诉我。
```
```

---

## 🎯 提示词模板库

详见 [`scripts/template-library.md`](./scripts/template-library.md)

核心模板分类：

| 分类 | 模板数量 | 适用场景 |
|------|----------|----------|
| **项目启动** | 8 | 新项目初始化、技术选型 |
| **功能开发** | 15 | CRUD、认证、文件处理等 |
| **问题诊断** | 12 | 错误排查、性能优化 |
| **代码审查** | 6 | 自查清单、安全检查 |
| **学习探索** | 10 | 新技术、概念理解 |
| **文档写作** | 5 | API 文档、README |

---

## 🔗 与 ECC 组件集成

### 与 intent-analyzer 协作

```
用户输入 → intent-analyzer 分析意图 → prompt-expert 生成提示词
```

### 与 model-compare-search 协作

```
prompt-expert 检测到研究类需求 → 推荐 model-compare-search
```

### 与 planner agent 协作

```
prompt-expert 检测到复杂任务 → 生成使用 planner 的提示词
```

---

## ⚙️ 配置说明

### 场景自定义

编辑 `config/scenarios.json`:

```json
{
  "customScenarios": [
    {
      "name": "liteellm-config",
      "signals": ["litellm", "fallback", "model routing"],
      "promptTemplate": "见 config/prompts.yaml#liteellm"
    }
  ]
}
```

### 提示词模板

编辑 `config/prompts.yaml`:

```yaml
liteellm:
  context: "LiteLLM 配置项目"
  commonTasks:
    - name: 添加新 provider
      prompt: |
        你正在配置 LiteLLM 的新 provider。

        步骤：
        1. 在 config.yaml 中添加 provider 配置
        2. 设置环境变量和认证信息
        3. 配置模型路由规则
        4. 测试连接和 fallback 链

        参考现有 provider 的配置模式。
```

---

## 📈 效果评估

### 提示词质量指标

| 指标 | 计算方式 | 目标值 |
|------|----------|--------|
| **清晰度得分** | 用户反馈 + 执行成功率 | > 85% |
| **上下文适配** | 项目规范匹配度 | > 90% |
| **执行效率** | 减少澄清轮次 | -50% |
| **用户满意度** | 显式好评率 | > 80% |

### 日志分析

```bash
# 查看生成的提示词建议
ls -lt ~/src/projects/tools/user-scripts/skills/prompt-expert/output/suggestions/

# 分析使用频率
cat ~/src/projects/tools/user-scripts/skills/prompt-expert/output/usage-log.json | jq '.scenarioCounts'

# 查看质量评分
cat ~/src/projects/tools/user-scripts/skills/prompt-expert/output/quality-report.json
```

---

## ⚠️ 故障排查

### 提示词质量不佳

```bash
# 1. 检查上下文分析
node ~/src/projects/tools/user-scripts/skills/prompt-expert/scripts/context-analyzer.mjs --debug

# 2. 检查场景匹配
node ~/src/projects/tools/user-scripts/skills/prompt-expert/scripts/scenario-matcher.mjs --trace

# 3. 手动指定场景
node ~/src/projects/tools/user-scripts/skills/prompt-expert/main.mjs --scenario bug-fix
```

### 与项目规范不符

```bash
# 检查是否检测到项目
cat ~/.claude/projects/-home-throokie/project-context.md

# 手动指定项目类型
node ~/src/projects/tools/user-scripts/skills/prompt-expert/main.mjs --project-type springboot
```

---

## 📚 相关资源

- 意图分析器：`~/src/projects/tools/user-scripts/skills/intent-analyzer/SKILL.md`
- 模型对比搜索：`~/src/projects/tools/user-scripts/skills/model-compare-search/SKILL.md`
- Prompt Optimizer: `~/.claude/skills/prompt-optimizer/SKILL.md`

---

*最后更新：2026-03-21 | 版本：v1.0.0*
