---
name: th-deep-coder
description: 深度代码研究工具 - 使用多模型聚合搜索分析代码库。当用户需要深度分析代码、多模型代码审查、聚合研究代码、代码专家分析、复杂Bug分析、架构评审时触发。自动压缩代码上下文并并行调用多个AI模型获取综合答案，提升回答的准确性和稳健性。
---

# th-deep-coder - 深度代码研究

> 使用多模型聚合搜索技术，深入分析代码库的架构、Bug、安全性和性能问题。

## 触发条件

**关键词**（说出这些词时自动触发）：
- "多模型研究代码"
- "深度分析代码"
- "聚合研究代码"
- "代码专家分析"
- "多模型代码审查"
- "深入分析这个bug"
- "深度代码审查"

## 核心能力

1. **代码上下文压缩** - 自动将代码库压缩为适合大模型处理的文本格式
2. **多模型聚合分析** - 并行调用8+个不同模型，获取多视角答案
3. **综合报告生成** - 整合各模型观点，输出结构化的Markdown报告

## 工作流程

```
用户触发 → 代码压缩 → 多模型聚合搜索 → 结果整合 → Markdown报告
```

## 使用方法

### 方式1: 分析整个代码库

```
多模型研究代码：分析这个项目的架构设计
```

### 方式2: 分析最近修改（Git差异）

```
深度分析代码：审查最近一次的提交
```

### 方式3: 针对特定问题

```
聚合研究代码：这个函数为什么会有性能问题
```

## 实现步骤

当技能触发时，按以下步骤执行：

### Step 1: 确定分析范围

询问用户或根据上下文判断：
- **全库分析** (默认): 压缩整个代码库
- **差异分析**: 只分析Git差异部分
- **指定文件**: 用户明确指定的文件/目录

### Step 2: 代码压缩

调用压缩脚本生成代码上下文：

```bash
# 全库分析
~/.claude/skills/th-deep-coder/scripts/code-compress.sh --full > /tmp/code-context.txt

# Git差异分析
~/.claude/skills/th-deep-coder/scripts/code-compress.sh --diff HEAD~1 > /tmp/code-context.txt

# 指定目录
~/.claude/skills/th-deep-coder/scripts/code-compress.sh --path src/components > /tmp/code-context.txt
```

### Step 3: 构建研究问题

根据用户需求构建明确的研究问题：

| 场景 | 问题模板 |
|------|----------|
| 架构评审 | "分析以下代码库的架构设计，指出优缺点和改进建议" |
| Bug分析 | "分析以下代码中的潜在Bug，解释根因和修复方案" |
| 安全审计 | "审计以下代码的安全漏洞，按严重程度排序" |
| 性能优化 | "分析以下代码的性能瓶颈，提供优化建议" |

### Step 4: 多模型聚合搜索

调用 model-compare-search 进行分析：

```bash
# 构建完整查询（问题 + 代码上下文）
QUERY="${RESEARCH_QUESTION}

=== 代码上下文 ===
$(cat /tmp/code-context.txt)"

# 执行多模型搜索
~/.claude/skills/model-compare-search/scripts/search.mjs "$QUERY"
```

### Step 5: 生成综合报告

读取多模型搜索结果，生成结构化报告：

```bash
~/.claude/skills/th-deep-coder/scripts/generate-report.sh \
  --search-dir ~/.claude/skills/model-compare-search/data/$(ls -t ~/.claude/skills/model-compare-search/data/ | head -1) \
  --output ./research-report.md
```

## 输出格式

生成的Markdown报告结构：

```markdown
# 深度代码研究报告

## 执行摘要
- 分析范围: [全库/差异/指定文件]
- 涉及模型: [成功响应的模型列表]
- 置信度: [高/中/低]

## 多模型观点对比

### 模型A (DeepSeek-R1)
**观点**: ...
**置信度**: 95%

### 模型B (Kimi-K2.5)
**观点**: ...
**置信度**: 90%

### 模型C (GLM-5)
**观点**: ...
**置信度**: 85%

## 共识分析
所有模型一致认同的要点：
1. ...
2. ...

## 分歧点
需要人工判断的争议点：
1. ...

## 具体建议

### 高优先级
1. ...

### 中优先级
1. ...

### 低优先级
1. ...

## 代码示例
```python
# 推荐的修复方案
...
```

## 参考数据
- 原始数据目录: ~/.claude/skills/model-compare-search/data/YYYYMMDD-HHMMSS/
- 代码上下文: /tmp/code-context.txt
```

## 压缩策略说明

### 智能筛选 (默认)

自动排除以下文件：
- 依赖目录: `node_modules/`, `vendor/`, `.venv/`
- 构建输出: `dist/`, `build/`, `target/`
- 版本控制: `.git/`
- 二进制文件: images, videos, executables
- 大文件: >1MB 的单个文件
- 日志文件: `*.log`

### Git差异模式

只包含最近修改的文件：
```bash
git diff --name-only HEAD~1  # 最近一次提交
git diff --name-only main    # 与主分支的差异
```

## 依赖

- `model-compare-search` skill (必需)
- `git` (用于差异分析)
- `ripgrep` (用于智能筛选)
- `find` (用于文件遍历)

## 限制

1. **Token限制**: 代码上下文通常限制在 50K-100K tokens
2. **响应时间**: 多模型搜索通常需要 30-120 秒
3. **模型失败**: 个别模型可能超时或失败，会自动回退

## 示例

**用户**: "多模型研究代码：分析这个登录模块的安全问题"

**执行**:
1. 压缩 `src/auth/` 目录
2. 构建问题: "分析以下认证代码的安全漏洞..."
3. 调用 model-compare-search
4. 生成包含各模型观点的报告

**输出**: `./research-report.md` (包含DeepSeek、Kimi、GLM等多个模型的安全分析)
