# Code Expert Orchestrator 使用指南 (整合版)

整合 **agent-factory** + **model-compare-search** + **codebundle** + **kimi-cli**

## 工具链说明

| 工具 | 作用 |
|------|------|
| **agent-factory** | 动态生成专业Agent（母体模式） |
| **model-compare-search** | 自动获取模型列表，并行调用8个顶级模型 |
| **codebundle** | 打包项目代码为txt |
| **kimi-cli** | 深度总结多模型结果 |

## 快速开始

### 基本用法

```bash
# 分析当前目录的bug
code-expert-orchestrator --task "分析WebSocket竞态条件bug"

# 指定项目路径和技术栈
code-expert-orchestrator \
  --task "重构配置模块" \
  --project ~/src/my-project \
  --type arch \
  --tech-stack "TypeScript,Node.js"

# 只执行分析阶段
code-expert-orchestrator --task "安全审查" --type review --phase analyze
```

## 完整工作流程

### 阶段1: 父代理收集上下文

父代理（你当前使用的Claude）需要收集：

```yaml
任务信息:
  description: "分析WebSocket竞态条件"
  type: "bug"  # bug|review|arch|feature
  priority: "high"

项目上下文:
  path: "/home/throokie/src/production/tmux-web-term"
  git_commit: "abc123"
  tech_stack: ["TypeScript", "Node.js", "WebSocket"]
  related_files: ["src/websocket/handler.ts"]

约束:
  backward_compatible: true
  test_coverage: "必须添加回归测试"
```

### 阶段2: 运行编排器

```bash
cd ~/src/production/tmux-web-term

code-expert-orchestrator \
  --task "分析WebSocket连接在高并发下的竞态条件问题，偶发connection already exists错误" \
  --type bug \
  --include "*.ts,*.js,*.json,*.md" \
  --exclude "node_modules,dist,test-reports" \
  --tech-stack "TypeScript,Node.js,WebSocket,tmux"
```

编排器自动执行：

```
📦 Step 1: codebundle打包
   → .code-expert/project-bundle-abc123.txt

🤖 Step 2: model-compare-search多模型分析
   → 自动获取8个顶级模型
   → Kimi-K2.5 + DeepSeek-R1 + GLM-5 + ...
   → 结果保存到 ~/.claude/skills/model-compare-search/data/YYYYMMDD-HHMMSS/

🧠 Step 3: kimi-cli深度总结
   → .code-expert/final-analysis-abc123.md

📝 Step 4: 生成Agent Factory配置
   → .code-expert/agent-analyzer-xxx.yaml
   → .code-expert/agent-implementer-xxx.yaml
```

### 阶段3: 使用Agent Factory创建子代理

#### 创建分析子代理

```
用户: 帮我创建代码分析代理

Claude: 使用agent-factory创建专业分析代理：

/agent-factory

提供信息：
---
项目描述: 分析tmux-web-term的WebSocket竞态条件bug
技术栈: TypeScript, Node.js, WebSocket, tmux
约束: 需要多模型聚合分析，使用codebundle打包代码
版本: v1.2.3
---

Agent Factory输出分析子代理配置后，加载配置文件：

cat .code-expert/agent-analyzer-xxx.yaml
```

#### 分析子代理执行流程

子代理启动后自动执行：

```bash
# Step 1: 打包代码
codebundle --include="*.ts,*.js" --output="project-bundle-abc123.txt"

# Step 2: 多模型分析
~/.claude/skills/model-compare-search/scripts/search.mjs \
  "分析WebSocket竞态条件bug...

项目代码：
[project-bundle-abc123.txt内容]

请提供根因分析、修复方案、风险评估"

# Step 3: 读取多模型结果
# 结果在: ~/.claude/skills/model-compare-search/data/YYYYMMDD-HHMMSS/
# - summary.md (Kimi综合总结)
# - models/ (各模型详细回答)

# Step 4: Kimi深度总结
kimi-cli ask "作为首席架构师总结多模型分析..." \
  --model kimi-k2.5 \
  --output final-analysis-abc123.md

# Step 5: 返回结果给父代理
```

### 阶段4: 父代理审查

```bash
# 查看分析报告
cat .code-expert/final-analysis-abc123.md

# 报告包含：
# - 多模型共识（高置信度）
# - 分歧点及推荐方案
# - 最终修复代码
# - 实施步骤
# - 风险评估
```

### 阶段5: 创建实施子代理

```
用户: 根据分析报告执行修复

Claude: 使用agent-factory创建实施代理：

/agent-factory

提供信息：
---
项目描述: 执行WebSocket竞态条件修复
技术栈: TypeScript, Node.js, WebSocket
约束: 按照分析报告的方案实施，保持代码风格一致
版本: v1.2.3
分析报告: .code-expert/final-analysis-abc123.md
---

Agent Factory输出生成实施子代理配置后，加载配置文件：

cat .code-expert/agent-implementer-xxx.yaml
```

## 输出文件说明

| 文件 | 位置 | 用途 |
|------|------|------|
| `project-bundle-{commit}.txt` | `.code-expert/` | 代码压缩包 |
| `final-analysis-{commit}.md` | `.code-expert/` | Kimi深度总结 |
| `agent-analyzer-{id}.yaml` | `.code-expert/` | 分析子代理配置 |
| `agent-implementer-{id}.yaml` | `.code-expert/` | 实施子代理配置 |
| `summary.md` | `~/.claude/skills/model-compare-search/data/YYYYMMDD-HHMMSS/` | 多模型综合总结 |
| `models/` | `~/.claude/skills/model-compare-search/data/YYYYMMDD-HHMMSS/` | 各模型原始输出 |

## 在Claude Code中使用

### 方式1: 直接调用编排器

```
用户: 多模型分析这个项目的bug

Claude: 我使用code-expert-orchestrator进行多模型聚合分析：

$ code-expert-orchestrator --task "分析WebSocket竞态条件" --project .

[等待分析完成...]

✅ 分析完成！生成文件：
   - .code-expert/project-bundle-abc123.txt
   - .code-expert/final-analysis-abc123.md
   - .code-expert/agent-analyzer-xxx.yaml

现在使用agent-factory创建分析子代理：

$ /agent-factory
[提供配置信息...]

子代理执行多模型分析后，查看最终报告：

$ cat .code-expert/final-analysis-abc123.md

现在创建实施子代理执行修复...
```

### 方式2: Claude直接编排（不使用命令行）

```javascript
// 父代理直接编排

// Step 1: 收集上下文
const context = {
  project: '~/src/tmux-web-term',
  task: '分析WebSocket竞态条件',
  gitCommit: 'abc123'
};

// Step 2: 打包代码
await bash('codebundle --include="*.ts,*.js" --output="project-bundle-abc123.txt"');

// Step 3: 多模型分析
await bash('~/.claude/skills/model-compare-search/scripts/search.mjs "分析任务..."');

// Step 4: Kimi总结
await bash('kimi-cli ask "总结多模型结果..." --model kimi-k2.5');

// Step 5: 创建分析子代理
await Agent({
  subagent_type: "general-purpose",
  name: "code-analyzer-1",
  prompt: buildAnalysisPrompt(context)
});

// Step 6: 创建实施子代理
await Agent({
  subagent_type: "general-purpose",
  name: "code-implementer-1",
  prompt: buildImplementationPrompt(analysis, context)
});
```

## 对比旧版

| 特性 | 旧版 (th-code-expert) | 新版 (整合版) |
|------|----------------------|---------------|
| 子代理创建 | 手动 | agent-factory动态生成 |
| 模型选择 | 固定3个模型 (DeepSeek+Kimi+Qwen) | model-compare-search自动选8个 |
| 模型管理 | 需手动配置 | 自动获取可用模型列表 |
| 配置生成 | 无 | 自动生成Agent Factory配置 |
| 专业度 | 通用 | 根据任务动态定制 |

## 高级用法

### 自定义分析Prompt

```bash
# 创建自定义分析任务
cat > /tmp/custom-analysis.txt << 'EOF'
任务：深度分析WebSocket竞态条件

重点：
1. 使用Mutex还是Atomic
2. 性能影响评估
3. 单元测试策略

项目代码：
[粘贴project-bundle内容]
EOF

# 直接使用model-compare-search
~/.claude/skills/model-compare-search/scripts/search.mjs \
  "$(cat /tmp/custom-analysis.txt)"
```

### 增量分析

```bash
# 只分析特定文件
code-expert-orchestrator \
  --task "分析src/auth.ts的JWT逻辑" \
  --include "src/auth.ts,src/jwt.ts"
```

### 多轮分析

```bash
# 第一轮：根因分析
code-expert-orchestrator --task "定位竞态条件根因" --type bug

# 第二轮：方案评估（基于第一轮）
code-expert-orchestrator \
  --task "评估mutex vs atomic方案" \
  --type arch \
  --phase analyze
```

## 故障排查

### model-compare-search未找到
```bash
# 检查skill是否存在
ls ~/.claude/skills/model-compare-search/scripts/search.mjs

# 如果不存在，从备份恢复
# 或直接使用newapi-cli
```

### codebundle失败
```bash
# 检查codebundle
which codebundle

# 手动打包测试
codebundle --include="*.ts" --output="test.txt" .
```

### kimi-cli未配置
```bash
# 配置kimi-cli
kimi-cli config set api_key your_key
```

## 参考文档

- **agent-factory**: ~/.claude/skills/agent-factory/SKILL.md
- **model-compare-search**: ~/.claude/skills/model-compare-search/SKILL.md
- **codebundle**: ~/.local/bin/codebundle
- **kimi-cli**: ~/.local/bin/kimi-cli
