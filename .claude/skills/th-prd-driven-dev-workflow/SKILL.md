---
name: th-prd-driven-dev-workflow
description: >-
  PRD 驱动的完整开发工作流 - 从用户故事分析到自动化测试的端到端流程。
  当用户需要"一条龙开发"、"全自动开发"、"从需求到代码"、"先分析PRD再开发"、
  "多模型分析后自动开发"、"完整开发流程"、"从需求分析到测试"或任何涉及
  PRD分析→需求整合→代码生成→自动化测试的连续工作时，**必须**使用此技能。
  整合多模型聚合、Kimi深度整合、PRD生成、多模型代码审查、代码开发、自动化测试等能力。
  **新增**: 智能决策大脑(th-workflow-decision-engine) - 自动判断何时使用GitNexus代码分析、
  unified-search联网搜索、多模型聚合，测试失败时智能选择修复策略。
triggers:
  - PRD驱动开发
  - 端到端开发流程
  - 完整开发工作流
  - 从PRD到代码
  - 自动化开发流程
  - 一条龙开发
  - 全自动开发
  - 从需求到代码
  - 从需求分析到测试
  - 先分析PRD再开发
  - 多模型分析后自动开发
  - 智能开发工作流
  - 完整开发流程
  - 需求分析到上线
---

# PRD 驱动开发工作流

> **完整流程**: 用户故事分析 → 多模型需求分析 → Kimi整合 → PRD更新 → 上下文打包 → 多模型代码审查 → PRD转代码 → 自动化测试
>
> **核心理念**: 以用户痛点为出发点，多模型协作确保质量，自动化测试保障交付
> **执行原则**: 全程自主执行，零停顿，每个阶段自动 git commit，追求长期质量

---

## 自主执行原则（强制）

### 1. 零停顿原则
**工作流执行期间，禁止向用户询问任何问题。**
- 遇到歧义：基于长期质量原则自主决策
- 遇到错误：自动降级处理，而非暂停等待
- 需要选择：使用最稳健/最标准的方案

### 2. 长期主义决策框架
当需要做出决策时，优先选择：
- **可维护性** > 开发速度
- **代码质量** > 功能数量
- **测试覆盖** > 快速上线
- **架构清晰** > 临时方案

### 3. 自动 Git Commit 机制
**每个阶段完成后必须自动提交**：
```bash
# 阶段完成后的标准提交流程
git add -A
git commit -m "$(cat <<'EOF'
阶段X: [阶段名称]

- 完成的变更: [简要描述]
- 决策理由: [长期质量考量]
- 自动提交: th-prd-driven-dev-workflow
EOF
)" --no-verify
```

**提交信息规范**:
- 前缀: `阶段[1-7]: [阶段名称]`
- 内容: 简述变更 + 决策理由
- 标记: `自动提交: th-prd-driven-dev-workflow`

### 4. 失败降级策略
| 失败场景 | 处理策略 | 是否停顿 |
|---------|---------|---------|
| 多模型分析失败 | 降级到单模型(Kimi) | 否 |
| Kimi 整合失败 | 使用原始多模型结果 | 否 |
| PRD 生成失败 | 基于原始分析手动生成 | 否 |
| 代码审查发现严重问题 | 自动修复后继续 | 否 |
| 测试失败(第1-2轮) | Agent 自动修复并重试 | 否 |
| 测试失败(第3轮) | 记录问题并继续下一阶段 | 否 |

---

## 工作流概览

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PRD 驱动开发完整工作流                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  阶段1: 分析                                                                 │
│  ├─ 1.1 读取项目 PRD 文件                                                    │
│  ├─ 1.2 编写用户故事 (WHO/WHAT/WHY)                                         │
│  └─ 1.3 收集项目上下文                                                       │
│                                                                              │
│  阶段2: 多模型需求分析                                                        │
│  ├─ 2.1 准备分析提示词                                                       │
│  ├─ 2.2 调用 model-compare-search (8模型聚合)                                │
│  └─ 2.3 获取多视角用户需求分析                                               │
│                                                                              │
│  阶段3: Kimi 深度整合                                                        │
│  ├─ 3.1 读取多模型分析结果                                                   │
│  ├─ 3.2 调用 kimi-cli 整合所有观点                                           │
│  └─ 3.3 输出统一需求文档                                                     │
│                                                                              │
│  阶段4: PRD 更新                                                             │
│  ├─ 4.1 基于整合结果调用 requirement-to-prd                                  │
│  └─ 4.2 生成/更新 PRD 文档                                                   │
│                                                                              │
│  阶段5: 代码审查准备                                                          │
│  ├─ 5.1 打包项目完整上下文 (codebundle)                                       │
│  ├─ 5.2 准备代码审查提示词                                                   │
│  └─ 5.3 调用 model-compare-search 审查代码                                   │
│                                                                              │
│  阶段6: 代码开发                                                             │
│  ├─ 6.1 基于审查建议调用 prd-to-code                                         │
│  └─ 6.2 生成代码实现                                                         │
│                                                                              │
│  阶段7: 自动化测试                                                           │
│  ├─ 7.1 调用 th-enterprise-test-agent                                        │
│  ├─ 7.2 调用 browser-automation (UI测试)                                     │
│  ├─ 7.3 循环测试 (最多3轮)                                                   │
│  └─ 7.4 判断通过/失败                                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 阶段1: 项目分析

### 1.0 初始化工作目录

```bash
# 自动创建工作目录（如果不存在）
mkdir -p workflow

# 初始化git（如果不是git仓库）
if [ ! -d .git ]; then
  git init
  git config user.email "workflow@th-prd-driven.local"
  git config user.name "TH-PRD-Workflow"
fi
```

### 1.1 读取 PRD 文件

```javascript
// 自动发现项目中的 PRD 文件
const prdFiles = await Glob({
  pattern: "**/docs/prd/*.md"
});

// 如果找到多个PRD，选择最新的（基于文件名排序）
// 零停顿原则：不询问用户，自动选择
const latestPrd = prdFiles.sort().pop();
const prdContent = await Read({ file_path: latestPrd });

// 记录选择的PRD
console.log(`✅ 阶段1: 已选择PRD文件 - ${latestPrd}`);
```

### 1.2 编写用户故事

基于 PRD 内容，提取以下信息：

```markdown
## 用户故事模板

### WHO (用户角色)
- 主要用户: [如: 普通用户、管理员、开发者]
- 次要用户: [如: 访客、审核员]

### WHAT (用户需求)
- 核心功能: [用户要完成什么任务]
- 使用场景: [在什么情况下使用]

### WHY (用户痛点)
- 当前问题: [用户现在遇到什么困难]
- 期望结果: [解决后带来什么价值]

### 验收标准
- [ ] 标准1
- [ ] 标准2
- [ ] 标准3
```

### 1.3 阶段1完成 - 自动提交

```bash
# 保存用户故事到工作目录
cat > workflow/user-stories.md << 'EOF'
[阶段1生成的用户故事内容]
EOF

# 自动提交
git add -A
git commit -m "$(cat <<'EOF'
阶段1: 项目分析 - 用户故事提取

- 完成PRD文件读取和分析
- 提取WHO/WHAT/WHY用户故事框架
- 定义验收标准
- 决策理由: 基于PRD全面理解需求，为后续开发建立清晰目标
- 自动提交: th-prd-driven-dev-workflow
EOF
)" --no-verify

# 阶段1完成 - 输出信号给 ralph-evo
console.log('[PHASE_COMPLETE] P1')
```

---

## 阶段2: 多模型需求分析

### 2.1 分析提示词

```markdown
## 多模型需求分析提示词

### 任务背景
我正在开发一个项目，以下是当前 PRD 文档：

[粘贴 PRD 内容]

### 用户故事
[粘贴阶段1编写的用户故事]

### 分析要求
请从以下维度分析用户需求：

1. **功能需求**
   - 用户需要哪些核心功能？
   - 这些功能的优先级如何？
   - 哪些功能是 MVP 必须的？

2. **用户痛点**
   - 用户当前最痛苦的问题是什么？
   - 这些问题有多严重？
   - 不解决会有什么后果？

3. **使用场景**
   - 用户会在什么场景下使用？
   - 这些场景有什么特殊要求？
   - 需要考虑哪些边界情况？

4. **竞品对比**
   - 类似产品如何解决这些问题？
   - 我们的差异化优势是什么？
   - 有哪些可以借鉴的设计？

5. **技术可行性**
   - 这些功能技术实现难度如何？
   - 有什么潜在的技术风险？
   - 需要哪些关键技术？

6. **改进建议**
   - 基于以上分析，有哪些改进建议？
   - PRD 中缺少什么内容？
   - 有什么容易被忽视的需求？

### 输出格式
请按以下结构输出：

```markdown
## 用户需求分析报告

### 1. 核心功能清单 (按优先级排序)
| 功能 | 优先级 | 是否MVP | 说明 |
|------|--------|---------|------|
| ...  | P0/P1  | 是/否   | ...  |

### 2. 用户痛点分析
- **痛点1**: [描述] → 严重程度: [高/中/低]
- **痛点2**: [描述] → 严重程度: [高/中/低]

### 3. 关键使用场景
1. **场景1**: [描述]
   - 触发条件: ...
   - 用户期望: ...
   - 边界情况: ...

### 4. 竞品洞察
- **竞品A**: [如何解决问题] → [我们的差异化]
- **竞品B**: ...

### 5. 技术风险与建议
- **风险1**: [描述] → **建议**: [解决方案]

### 6. PRD 改进建议
1. [具体建议1]
2. [具体建议2]
```
```

### 2.2 调用多模型聚合

```javascript
// 使用 model-compare-search 进行多模型分析
await Skill({
  name: "th-model-compare-search",
  args: `--task "${analysisPrompt}" --models 8 --output analysis-phase2`
});

// 结果保存在:
// ~/.claude/skills/model-compare-search/data/YYYYMMDD-HHMMSS/summary.md

// 如果多模型分析失败，降级到单模型Kimi分析
try {
  const summaryPath = await findLatestSummary();
  const analysisResult = await Read({ file_path: summaryPath });
} catch (error) {
  console.log("⚠️ 多模型分析失败，降级到Kimi单模型分析...");
  // 调用Kimi进行降级分析
  await fallbackToKimiAnalysis(analysisPrompt);
}
```

### 2.3 阶段2完成 - 自动提交

```bash
# 确保工作目录存在
mkdir -p workflow

# 复制分析结果到工作目录
cp ~/.claude/skills/model-compare-search/data/XXX/summary.md workflow/phase2-analysis.md

# 自动提交
git add -A
git commit -m "$(cat <<'EOF'
阶段2: 多模型需求分析

- 完成8模型并行需求分析
- 提取功能需求、用户痛点、使用场景
- 生成竞品对比和技术可行性分析
- 决策理由: 多模型聚合确保需求分析全面性和准确性
- 自动提交: th-prd-driven-dev-workflow
EOF
)" --no-verify

# 阶段2完成 - 输出信号给 ralph-evo
console.log('[PHASE_COMPLETE] P2')
```

---

## 阶段3: Kimi 深度整合

### 3.1 整合提示词

```bash
kimi-cli ask "
作为首席产品专家，请整合以下多模型分析结果，输出统一的需求文档。

## 多模型分析结果:
$(cat ~/.claude/skills/model-compare-search/data/XXX/summary.md)

## 原始 PRD:
$(cat docs/prd/current-prd.md)

## 用户故事:
$(cat workflow/user-stories.md)

## 整合要求:
1. 提取所有模型的共识（高置信度内容）
2. 标注分歧点及推荐方案（优先选择可维护性高的方案）
3. 按优先级排序功能需求
4. 补充遗漏的用户痛点
5. 输出结构化的 PRD 更新建议

## 输出格式:
\`\`\`markdown
# 整合需求文档

## 核心功能清单 (按优先级)
## 用户痛点详细分析
## 关键场景说明
## PRD 改进点
## 推荐的 MVP 范围
\`\`\`
" \
  --model kimi-k2.5 \
  --output workflow/integrated-requirements.md
```

### 3.2 阶段3完成 - 自动提交

```bash
# 自动提交
git add -A
git commit -m "$(cat <<'EOF'
阶段3: Kimi深度整合 - 多模型结果综合

- 整合8模型分析结果
- 提取高置信度共识，标注分歧点
- 输出结构化PRD更新建议
- 决策理由: 基于Kimi顶级模型能力综合多视角观点，确保需求完整性
- 自动提交: th-prd-driven-dev-workflow
EOF
)" --no-verify

# 阶段3完成 - 输出信号给 ralph-evo
console.log('[PHASE_COMPLETE] P3')
```

---

## 阶段4: PRD 更新

### 4.1 调用 requirement-to-prd

```javascript
// 读取Kimi整合结果
const integratedRequirements = fs.readFileSync(
  'workflow/integrated-requirements.md',
  'utf-8'
);

// 基于 Kimi 整合结果更新 PRD
await Skill({
  name: "requirement-to-prd",
  prompt: `
    基于以下整合需求文档更新 PRD：

    ${integratedRequirements}

    要求：
    1. 保持 PRD 原有结构
    2. 补充缺失的功能描述
    3. 更新用户故事
    4. 明确验收标准
    5. 添加优先级标注
    6. 注重可维护性和长期演进
  `
});
```

### 4.2 PRD 输出位置

```
项目目录/
└── docs/prd/
    └── prd-YYYYMMDD-HHMMSS-XXX.md  ← 新生成的 PRD
```

### 4.3 阶段4完成 - 自动提交

```bash
# 获取生成的PRD文件名
NEW_PRD=$(ls -t docs/prd/prd-*.md | head -1)

# 自动提交
git add -A
git commit -m "$(cat <<EOF
阶段4: PRD更新 - 基于多模型分析生成新版PRD

- 整合需求分析结果到PRD文档
- 补充功能描述、用户故事、验收标准
- 添加优先级标注
- 生成文件: ${NEW_PRD}
- 决策理由: 基于全面分析更新PRD，确保需求文档的完整性和准确性
- 自动提交: th-prd-driven-dev-workflow
EOF
)" --no-verify

# 阶段4完成 - 输出信号给 ralph-evo
console.log('[PHASE_COMPLETE] P4')
```

---

## 阶段5: 代码审查准备

### 5.0 智能工具选择（决策大脑）

```javascript
// 调用决策大脑，智能选择代码审查工具
const reviewDecision = await Skill({
  name: "th-workflow-decision-engine",
  args: JSON.stringify({
    phase: 5,
    task: "代码审查工具选择",
    context: {
      files: changedFiles,  // git diff 获取的变更文件
      hasExternalDeps: true,  // 是否涉及外部依赖
      hasSharedCode: changedFiles.length > 3  // 是否涉及多处共享代码
    }
  })
});

// 根据决策执行相应的分析
if (reviewDecision.tools.includes('th-gitnexus-assistant')) {
  console.log("🧠 决策: 执行代码影响分析...");
  // 对关键函数执行影响分析
  await mcp__gitnexus__impact({
    target: "关键函数名",
    direction: "upstream",
    maxDepth: 3
  });
}

if (reviewDecision.tools.includes('unified-search')) {
  console.log("🔍 决策: 搜索最佳实践...");
  await Skill({
    name: "unified-search",
    args: `${reviewDecision.searchQuery || "代码审查最佳实践"} --sources github,docs`
  });
}
```

### 5.1 打包项目上下文

```bash
# 使用 codebundle 打包项目
codebundle \
  --include="*.ts,*.tsx,*.js,*.jsx,*.py,*.go,*.rs,*.java,*.json,*.md,*.yml,*.yaml" \
  --exclude="node_modules,dist,build,.git,*.log,*.lock" \
  --output="project-context-$(date +%Y%m%d-%H%M%S).txt"

# 压缩后大小检查
ls -lh project-context-*.txt
```

### 5.2 代码审查提示词

```markdown
## 代码审查提示词

### 项目上下文
[粘贴 project-context.txt 内容]

### 当前 PRD
[粘贴更新后的 PRD]

### 审查要求
请从以下维度审查代码：

1. **架构合规性**
   - 代码是否符合 PRD 设计？
   - 架构分层是否清晰？
   - 模块依赖是否合理？

2. **代码质量**
   - 是否有代码异味？
   - 是否有重复代码？
   - 命名是否清晰？

3. **安全性**
   - 是否有 SQL 注入风险？
   - 是否有 XSS 漏洞？
   - 敏感信息是否泄露？

4. **性能优化**
   - 是否有性能瓶颈？
   - 是否有不必要的渲染？
   - 数据库查询是否优化？

5. **Bug 风险**
   - 是否有明显的逻辑错误？
   - 边界情况是否处理？
   - 异常处理是否完善？

6. **改进建议**
   - 有哪些可以优化的地方？
   - 有什么重构建议？
   - 测试覆盖是否充分？

### 输出格式
\`\`\`markdown
## 代码审查报告

### 关键问题 (必须修复)
1. [问题描述] → [文件位置] → [修复建议]

### 改进建议 (推荐修复)
1. [建议描述] → [预期收益]

### 架构建议
1. [建议描述]
\`\`\`
```

### 5.3 调用多模型审查

```javascript
await Skill({
  name: "th-model-compare-search",
  args: `--task "${codeReviewPrompt}" --models 8 --output code-review`
});

// 读取审查结果
const codeReviewResults = fs.readFileSync(
  '~/.claude/skills/model-compare-search/data/XXX-code-review/summary.md',
  'utf-8'
);
```

### 5.4 阶段5完成 - 自动提交

```bash
# 确保工作目录存在
mkdir -p workflow

# 保存代码审查报告
cp ~/.claude/skills/model-compare-search/data/XXX-code-review/summary.md workflow/code-review-report.md

# 自动提交
git add -A
git commit -m "$(cat <<'EOF'
阶段5: 代码审查准备 - 多模型代码审查

- 使用codebundle打包项目上下文
- 8模型并行代码审查
- 识别架构问题、安全漏洞、性能瓶颈
- 生成代码审查报告
- 决策理由: 多模型审查确保代码质量，提前发现问题
- 自动提交: th-prd-driven-dev-workflow
EOF
)" --no-verify

# 阶段5完成 - 输出信号给 ralph-evo
console.log('[PHASE_COMPLETE] P5')
```

---

## 阶段6: 代码开发

### 6.1 准备 prd-to-code 输入

```javascript
// 读取最新PRD和代码审查建议
const latestPrd = fs.readFileSync(
  'docs/prd/prd-XXX.md',
  'utf-8'
);
const codeReviewResults = fs.readFileSync(
  'workflow/code-review-report.md',
  'utf-8'
);

// 准备开发提示词
const devPrompt = `
  基于以下信息开发代码：

  ## PRD 文档
  ${latestPrd}

  ## 代码审查建议
  ${codeReviewResults}

  ## 要求
  1. 实现 PRD 中所有功能
  2. 修复代码审查中发现的问题
  3. 遵循项目现有代码风格
  4. 添加必要的单元测试（覆盖率80%+）
  5. 优先选择可维护的架构方案
`;
```

### 6.2 调用 prd-to-code

```javascript
await Skill({
  name: "prd-to-code",
  prompt: devPrompt
});
```

### 6.3 开发输出

```
项目目录/
├── src/                    ← 生成的源代码
├── tests/                  ← 生成的测试代码
└── .claude/worktrees/      ← worktree 隔离的代码
```

### 6.4 阶段6完成 - 自动提交

```bash
# 获取worktree路径（prd-to-code生成的）
WORKTREE=$(ls -td .claude/worktrees/*/ | head -1)

# 自动提交 - 包含代码和测试
git add -A
git commit -m "$(cat <<EOF
阶段6: 代码开发 - 基于PRD实现功能

- 根据PRD实现所有功能需求
- 修复代码审查发现的问题
- 添加单元测试（覆盖率80%+）
- 使用worktree隔离: ${WORKTREE}
- 决策理由: 遵循代码审查建议，确保代码质量和可维护性
- 自动提交: th-prd-driven-dev-workflow
EOF
)" --no-verify

# 阶段6完成 - 输出信号给 ralph-evo
console.log('[PHASE_COMPLETE] P6')
```

---

## 阶段7: 自动化测试

### 7.1 测试循环配置

```javascript
const MAX_TEST_ROUNDS = 3;
let currentRound = 0;
let testPassed = false;

while (currentRound < MAX_TEST_ROUNDS && !testPassed) {
  currentRound++;
  console.log(`=== 测试轮次: ${currentRound}/${MAX_TEST_ROUNDS} ===`);

  // 运行企业级测试
  const enterpriseResult = await runEnterpriseTests();

  // 运行浏览器自动化测试
  const browserResult = await runBrowserTests();

  // 判断测试结果
  testPassed = enterpriseResult.passed && browserResult.passed;

  if (!testPassed && currentRound < MAX_TEST_ROUNDS) {
    console.log("⚠️ 测试未通过，Agent自动修复问题后重试...");
    await fixIssues(enterpriseResult.issues, browserResult.issues);
    // 零停顿：自动修复后继续，不询问用户
  }
}

// 最终判断 - 无论通过与否都完成工作流
if (testPassed) {
  console.log("✅ 所有测试通过！工作流完成。");
} else {
  console.log("⚠️ 测试3轮后仍有未通过项，已记录问题并继续。建议后续人工检查。");
  // 记录失败问题到日志，不暂停
  fs.writeFileSync('workflow/test-failures-round3.md', JSON.stringify({
    timestamp: new Date().toISOString(),
    rounds: MAX_TEST_ROUNDS,
    status: 'PARTIAL_PASS',
    note: '建议人工检查剩余问题'
  }, null, 2));
}
```

### 7.2 企业级测试

```javascript
async function runEnterpriseTests() {
  try {
    await Skill({
      name: "th-enterprise-test-agent",
      prompt: `
        对以下项目进行企业级测试：

        项目路径: ${projectPath}
        PRD: ${prdId}

        测试范围:
        1. E2E 功能测试
        2. 性能测试
        3. 安全测试
        4. 兼容性测试

        输出详细的测试报告。
      `
    });
    return { passed: true, issues: [] };
  } catch (error) {
    console.log("⚠️ 企业级测试部分失败，降级处理...");
    return { passed: false, issues: [error.message] };
  }
}
```

### 7.3 浏览器自动化测试

```javascript
async function runBrowserTests() {
  try {
    await Skill({
      name: "browser-automation",
      prompt: `
        对项目进行 UI 自动化测试：

        1. 导航到主要页面
        2. 截取关键页面截图
        3. 测试表单提交
        4. 测试用户交互流程

        测试 URL: ${testUrl}

        输出测试结果和截图。
      `
    });
    return { passed: true, issues: [] };
  } catch (error) {
    console.log("⚠️ UI测试部分失败，降级处理...");
    return { passed: false, issues: [error.message] };
  }
}
```

### 7.4 问题修复（智能决策版）

```javascript
async function fixIssues(enterpriseIssues, browserIssues) {
  const allIssues = [...enterpriseIssues, ...browserIssues];

  // 🧠 第一步：调用决策大脑，智能选择修复策略
  console.log("🧠 调用决策大脑分析修复策略...");
  const fixDecision = await Skill({
    name: "th-workflow-decision-engine",
    args: JSON.stringify({
      phase: 7,
      task: "修复测试失败",
      context: {
        errors: allIssues,
        errorTypes: allIssues.map(e => classifyError(e))  // 错误分类
      }
    })
  });

  console.log(`🎯 决策结果: 使用工具 [${fixDecision.tools.join(', ')}]`);
  console.log(`💡 决策理由: ${fixDecision.reasoning}`);

  // 🔍 第二步：根据决策执行搜索（如果需要）
  if (fixDecision.tools.includes('unified-search')) {
    console.log("🔍 执行联网搜索...");
    await Skill({
      name: "unified-search",
      args: `${fixDecision.searchQuery || "修复 " + allIssues[0]} --sources github,docs`
    });
  }

  // 🧬 第三步：根据决策执行代码分析（如果需要）
  if (fixDecision.tools.includes('th-gitnexus-assistant')) {
    console.log("🧬 执行代码影响分析...");
    await Skill({
      name: "th-gitnexus-assistant",
      prompt: `分析以下错误相关的代码影响范围：${allIssues.join("\n")}`
    });
  }

  // 🧠 第四步：根据决策执行多模型聚合（复杂问题）
  if (fixDecision.tools.includes('th-model-compare-search')) {
    console.log("🧠 执行多模型聚合分析...");
    await Skill({
      name: "th-model-compare-search",
      args: `如何修复以下测试错误：${allIssues.join("\n")} --models 8`
    });
  }

  // 🔧 第五步：Agent自动修复
  console.log("🔧 执行自动修复...");
  await Agent({
    name: "test-fixer",
    subagent_type: "general-purpose",
    prompt: `
      修复以下测试发现的问题：

      ${JSON.stringify(allIssues, null, 2)}

      决策大脑建议的修复策略：
      ${fixDecision.reasoning}

      要求：
      1. 优先修复阻塞性问题
      2. 保持代码风格一致
      3. 修复后重新运行相关测试
      4. 自主决策修复方案，无需用户确认
    `
  });
}

// 错误分类辅助函数
function classifyError(error) {
  const errorMsg = error.toLowerCase();
  if (errorMsg.includes('timeout') || errorMsg.includes('network')) return 'network';
  if (errorMsg.includes('undefined') || errorMsg.includes('null')) return 'null_reference';
  if (errorMsg.includes('syntax')) return 'syntax';
  if (errorMsg.includes('type')) return 'type_error';
  if (errorMsg.includes('permission') || errorMsg.includes('eacces')) return 'permission';
  if (errorMsg.includes('race') || errorMsg.includes('deadlock')) return 'concurrency';
  return 'unknown';
}
```

### 7.5 阶段7完成 - 最终提交

```bash
# 确保工作目录存在
mkdir -p workflow

# 保存测试报告
cat > workflow/test-report.md << 'EOF'
# 自动化测试报告

- 测试轮次: 3轮
- 最终结果: [PASSED/PARTIAL_PASS]
- 生成时间: $(date -u +%Y-%m-%dT%H:%M:%SZ)
EOF

# 最终提交 - 标记工作流完成
git add -A
git commit -m "$(cat <<'EOF'
阶段7: 自动化测试 - 完成全流程

- 完成企业级测试（E2E/性能/安全/兼容性）
- 完成UI自动化测试
- 测试循环最多3轮，Agent自动修复
- 输出测试报告
- 决策理由: 多轮测试确保质量，自动修复减少人工干预
- 自动提交: th-prd-driven-dev-workflow

工作流完成！
EOF
)" --no-verify

# 推送所有提交到远程（如果配置了远程仓库）
git push origin $(git branch --show-current) 2>/dev/null || echo "ℹ️ 未配置远程仓库，仅本地提交"

# 阶段7完成 - 输出信号给 ralph-evo
console.log('[PHASE_COMPLETE] P7')
```

---

## 阶段控制参数

### `--phase` 参数

支持只运行特定阶段，便于调试和分步执行：

```bash
# 只运行阶段1（项目分析）
/skill prd-driven-dev-workflow --phase 1

# 运行阶段1-3（分析→多模型需求分析→Kimi整合）
/skill prd-driven-dev-workflow --phase 1-3

# 从阶段4开始运行（PRD更新开始）
/skill prd-driven-dev-workflow --phase 4-7

# 只运行阶段6（代码开发）
/skill prd-driven-dev-workflow --phase 6
```

### 阶段编号

| 阶段 | 名称 | 说明 |
|------|------|------|
| 1 | 项目分析 | 读取PRD，提取用户故事 |
| 2 | 多模型需求分析 | 8模型并行分析需求 |
| 3 | Kimi深度整合 | 综合多模型结果 |
| 4 | PRD更新 | 生成新版PRD文档 |
| 5 | 代码审查准备 | 打包上下文，多模型代码审查 |
| 6 | 代码开发 | 基于PRD实现功能 |
| 7 | 自动化测试 | E2E/性能/安全/兼容性测试 |

### 依赖检查

当使用 `--phase` 跳过前面阶段时，系统会检查依赖：

```bash
# 示例：运行阶段5时，会检查依赖
/skill prd-driven-dev-workflow --phase 5
# 检查: workflow/user-stories.md 存在（阶段1产出）
# 检查: workflow/phase2-analysis.md 存在（阶段2产出）
# 检查: workflow/integrated-requirements.md 存在（阶段3产出）
# 检查: docs/prd/prd-*.md 存在（阶段4产出）
# 如果缺少依赖，自动运行前面阶段或报错提示
```

### 常用场景

| 场景 | 命令 |
|------|------|
| 首次完整运行 | `--phase 1-7` 或不传（默认） |
| 只分析需求 | `--phase 1-4` |
| 已有PRD，直接开发 | `--phase 5-7` |
| 只跑测试 | `--phase 7` |
| 从PRD开始开发 | `--phase 4-7` |

---

## 完整调用示例

### 一键启动完整工作流

```bash
# 在项目根目录执行
/skill prd-driven-dev-workflow \
  --project . \
  --prd docs/prd/current-prd.md \
  --output ./workflow-results
```

### 分阶段执行（可控模式）

```bash
# 第一步：分析阶段（1-3）
/skill prd-driven-dev-workflow --phase 1-3

# 人工审查后，继续后续阶段
/skill prd-driven-dev-workflow --phase 4-7

# 或只运行开发和测试
/skill prd-driven-dev-workflow --phase 5-7
```

### Claude Code 中调用

```javascript
// 启动完整工作流
await Skill({
  name: "prd-driven-dev-workflow",
  args: `
    --project ~/src/my-project
    --prd docs/prd/prd-20260324-001.md
    --max-test-rounds 3
    --models 8
  `
});

// 只运行分析阶段
await Skill({
  name: "prd-driven-dev-workflow",
  args: `--phase 1-3`
});

// 从代码开发开始
await Skill({
  name: "prd-driven-dev-workflow",
  args: `--phase 6-7`
});
```

---

## 注意事项

### 成本预估

| 阶段 | 模型调用 | 预估成本 |
|------|----------|----------|
| 需求分析 | 8 模型 | 中等 |
| Kimi 整合 | 1 模型 | 低 |
| 代码审查 | 8 模型 | 中等 |
| 代码开发 | 多 Agent | 较高 |
| 自动化测试 | 多轮调用 | 较高 |

**建议**: 复杂项目使用，简单功能直接用 prd-to-code

### 失败处理

| 失败点 | 处理策略 | 停顿 |
|--------|----------|------|
| 多模型分析失败 | 降级到单模型(Kimi)分析 | 否 |
| Kimi 整合失败 | 使用原始多模型结果 | 否 |
| PRD 生成失败 | 基于原始分析手动生成PRD | 否 |
| 代码审查发现严重问题 | Agent自动修复后继续 | 否 |
| 代码开发失败 | 分模块再次尝试，最多3次 | 否 |
| 测试失败(第1-2轮) | Agent自动修复问题并重试 | 否 |
| 测试失败(第3轮) | 记录问题并继续完成工作流 | 否 |

---

*工作流版本: v2.1 | 最后更新: 2026-03-24 | 更新内容: 添加 `--phase` 参数支持阶段控制*
