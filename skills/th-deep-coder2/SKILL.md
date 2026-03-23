---
name: th-deep-coder2
description: 深度代码研究工具 v2 - 使用agent-factory动态生成专业团队，结合model-compare-search多模型聚合分析代码库。流程：父代理收集上下文 → agent-factory生成分析子代理 → 多模型分析 → Kimi总结 → 实施子代理执行修复。
triggers:
  - 深度代码研究 v2
  - 多模型代码分析 v2
  - agent工厂代码分析
  - 创建分析团队
  - 编排修复流程
  - th-deep-coder2
---

# Code Expert Orchestrator

整合 **agent-factory** + **model-compare-search** + **codebundle** + **kimi-cli** 的完整代码分析修复工作流。

## 架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                         父代理 (Claude)                              │
│  - 收集项目上下文(git信息、文件结构、错误日志)                          │
│  - 准备详细任务描述和约束条件                                          │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Agent Factory (母体)                              │
│  输入: 任务描述 + 技术栈 + 约束条件                                     │
│  输出: 专业分析子代理配置                                              │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    [分析子代理] 执行流程                               │
│                                                                      │
│  Step 1: codebundle打包项目 → project-bundle-{git}.txt               │
│                                                                      │
│  Step 2: model-compare-search多模型分析                               │
│          自动获取可用模型 → 并行调用8个顶级模型 → Kimi总结              │
│          输入: 任务 + 代码包内容                                       │
│          输出: summary.md + 各模型responses                            │
│                                                                      │
│  Step 3: kimi-cli深度总结                                            │
│          综合多模型观点 → 提取共识/分歧 → 给出修复方案                  │
│          输出: final-analysis-{git}.md                                │
│                                                                      │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          │ 返回 final-analysis-{git}.md
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         父代理审查                                    │
│  - 查看分析报告                                                        │
│  - 确认修复方案                                                        │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Agent Factory 生成实施子代理                         │
│  输入: 分析报告 + 修复方案 + 代码包                                    │
│  输出: 实施子代理配置                                                  │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    [实施子代理] 执行修复                               │
│  - 读取final-analysis和project-bundle                                 │
│  - 执行代码修复/功能实现                                               │
│  - 验证修复效果                                                        │
└─────────────────────────────────────────────────────────────────────┘
```

## 完整工作流程

### 阶段1: 父代理收集上下文

父代理需要准备以下信息：

```yaml
任务信息:
  description: "分析WebSocket竞态条件bug"
  type: "bug" | "review" | "arch" | "feature"
  priority: "high" | "medium" | "low"

项目上下文:
  path: "/home/throokie/src/production/tmux-web-term"
  git_commit: "abc123"
  git_tag: "v1.2.3"
  tech_stack: ["TypeScript", "Node.js", "WebSocket"]
  related_files: ["src/websocket/handler.ts", "src/connection/manager.ts"]

错误信息（如果是bug）:
  error_message: "connection already exists"
  stack_trace: "..."
  reproduce_steps: "..."

约束条件:
  time_limit: "2小时"
  backward_compatible: true
  test_coverage: "必须添加回归测试"
```

### 阶段2: Agent Factory 生成分析子代理

使用 agent-factory skill 创建分析团队：

```bash
# 触发 agent-factory
/agent-factory

# 提供信息：
项目描述: 分析tmux-web-term的WebSocket竞态条件bug
技术栈: TypeScript, Node.js, WebSocket, tmux
约束: 需要多模型聚合分析，使用codebundle打包代码
版本: v1.2.3
```

Agent Factory 输出分析子代理配置：

```yaml
Agent名称: code-analyzer-websocket-race
类型: 代码分析专家

系统提示词: |
  你是专业的代码分析专家，专注于并发问题和WebSocket协议。

  ## 任务
  分析WebSocket连接在高并发下的竞态条件问题。

  ## 工作流程（必须严格执行）

  ### Step 1: 代码打包
  ```bash
  cd /home/throokie/src/production/tmux-web-term
  codebundle --include="*.ts,*.js,*.json,*.md" \
    --exclude="node_modules,dist" \
    --output="project-bundle-v1.2.3.txt"
  ```

  ### Step 2: 多模型聚合分析
  ```bash
  # 创建分析任务文件
  cat > /tmp/analysis-task.txt << 'EOF'
  任务：分析WebSocket竞态条件bug

  项目代码：
  [读取project-bundle-v1.2.3.txt的内容]

  错误信息：connection already exists
  相关文件：src/websocket/handler.ts

  请提供：
  1. 根因分析（具体到文件和行号）
  2. 修复方案（完整可运行代码）
  3. 并发测试建议
  4. 风险评估
  EOF

  # 调用model-compare-search进行多模型分析
  ~/.claude/skills/model-compare-search/scripts/search.mjs \
    "$(cat /tmp/analysis-task.txt)"
  ```

  ### Step 3: 读取多模型结果
  结果保存在：~/.claude/skills/model-compare-search/data/YYYYMMDD-HHMMSS/
  - summary.md: Kimi综合总结
  - models/: 各模型详细回答

  ### Step 4: Kimi深度总结
  ```bash
  kimi-cli ask "作为首席架构师总结以下多模型分析结果...

  分析结果：$(cat ~/.claude/skills/model-compare-search/data/XXX/summary.md)

  要求：
  1. 提取所有模型共识（高置信度）
  2. 标注分歧点及推荐方案
  3. 给出最终修复方案（含具体代码）
  4. 评估实施风险
  5. 提供测试建议" \
    --model kimi-k2.5 \
    --output final-analysis-v1.2.3.md
  ```

  ### Step 5: 返回结果
  将final-analysis-v1.2.3.md内容返回给父代理。
```

### 阶段3: 分析子代理执行

子代理启动后自动执行：

```bash
# 1. 打包代码
codebundle --include="*.ts,*.js" --output="project-bundle-v1.2.3.txt"

# 2. 多模型分析（自动选择8个顶级模型）
~/.claude/skills/model-compare-search/scripts/search.mjs "分析任务..."

# 3. Kimi总结
kimi-cli ask "总结多模型结果..." --model kimi-k2.5
```

### 阶段4: 父代理审查

```bash
# 查看分析报告
cat final-analysis-v1.2.3.md

# 分析报告包含：
# - 根因定位
# - 修复代码
# - 风险评估
# - 测试建议
```

### 阶段5: 创建实施子代理

再次使用 agent-factory 生成实施代理：

```yaml
Agent名称: code-implementer-websocket-fix
类型: 代码实施专家

系统提示词: |
  你是专业的代码实施专家，负责执行bug修复。

  ## 分析报告摘要
  [读取final-analysis-v1.2.3.md]

  ## 任务
  按照分析报告的方案修复WebSocket竞态条件。

  ## 可用资源
  - 代码包: project-bundle-v1.2.3.txt
  - 分析报告: final-analysis-v1.2.3.md
  - 项目路径: /home/throokie/src/production/tmux-web-term

  ## 实施要求
  1. 先读取代码包了解完整上下文
  2. 按照分析报告的修复方案实施
  3. 保持代码风格一致
  4. 添加必要注释
  5. 确保向后兼容

  ## 验证清单
  - [ ] 修复了报告中的所有问题
  - [ ] 代码能正常编译/运行
  - [ ] 没有引入新问题
  - [ ] 生成了清晰的diff
```

## 工具链整合

| 工具 | 用途 | 在流程中的作用 |
|------|------|---------------|
| **agent-factory** | 动态生成专业Agent | 创建分析子代理 + 实施子代理 |
| **model-compare-search** | 多模型聚合搜索 | 8个顶级模型并行分析 |
| **codebundle** | 代码打包 | 生成project-bundle-{git}.txt |
| **kimi-cli** | Kimi模型调用 | 深度总结多模型结果 |

## 使用方式

### 方式1: Skill自动触发

说出以下关键词：
- "多模型代码分析这个项目"
- "创建代码专家团队分析bug"
- "编排多模型修复流程"

### 方式2: 命令行调用

```bash
# 完整编排流程
code-expert-orchestrator \
  --task "分析WebSocket竞态条件" \
  --project ~/src/tmux-web-term \
  --type bug \
  --models 8

# 只执行分析阶段
code-expert-orchestrator \
  --task "审查代码安全性" \
  --phase analyze

# 创建实施代理（已有分析报告）
code-expert-orchestrator \
  --task "实施修复" \
  --phase implement \
  --analysis final-analysis-v1.2.3.md
```

### 方式3: Claude Code中直接编排

```javascript
// 步骤1: 父代理收集上下文
const context = await collectContext({
  project: '~/src/tmux-web-term',
  gitCommit: 'abc123',
  task: '分析WebSocket竞态条件'
});

// 步骤2: 使用agent-factory创建分析子代理
const analysisAgent = await Agent({
  subagent_type: "general-purpose",
  name: "code-analyzer-race-condition",
  prompt: buildAnalysisPrompt(context)
});

// 步骤3: 分析子代理执行（内部调用model-compare-search + codebundle）
// 自动完成：
// - codebundle打包
// - model-compare-search多模型分析
// - kimi-cli总结

// 步骤4: 父代理读取结果
const analysis = fs.readFileSync('final-analysis-abc123.md');

// 步骤5: 使用agent-factory创建实施子代理
const implementAgent = await Agent({
  subagent_type: "general-purpose",
  name: "code-implementer-fix",
  prompt: buildImplementationPrompt(analysis, context)
});
```

## 文件输出

```
项目目录/
├── .code-expert/
│   ├── project-bundle-v1.2.3.txt       # 代码包（带git版本）
│   ├── final-analysis-v1.2.3.md        # 最终分析报告
│   └── implement-prompt-xxx.md         # 实施代理prompt
└── ~/.claude/skills/model-compare-search/data/
    └── 20260323-120000/                # 多模型原始结果
        ├── meta.json                   # 元数据（成功率等）
        ├── summary.md                  # Kimi综合总结
        └── models/                     # 各模型回答
            ├── Pro_moonshotai_Kimi-K2.5/
            ├── Pro_deepseek-ai_DeepSeek-R1/
            └── ...
```

## 关键优势

1. **Agent Factory动态生成**: 根据任务类型自动选择最合适的专业代理
2. **Model Compare Search自动模型管理**: 无需配置，自动获取最优模型列表
3. **Codebundle完整上下文**: 将整个项目压缩传递给多模型分析
4. **Kimi-cli深度总结**: 顶级模型综合多模型观点
5. **两阶段分离**: 分析阶段和实施阶段分离，便于人工审查

## 注意事项

1. **代码包大小**: codebundle可能生成几MB的文件，确保磁盘空间
2. **模型调用成本**: model-compare-search调用8个模型，成本较高
3. **时间消耗**: 完整流程可能需要10-15分钟（模型响应慢）
4. **Git版本**: 每次分析自动记录commit，便于追溯
