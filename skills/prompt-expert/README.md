# Prompt Expert - 智能提示词专家

> 根据上下文和对话环境，智能生成最合适的提示词

---

## 🎯 快速开始

### 安装

```bash
# 无需安装，已配置软链接
# 确保脚本可执行
chmod +x ~/src/projects/tools/user-scripts/skills/prompt-expert/main.mjs
```

### 基本用法

```bash
# 基础用法
node ~/src/projects/tools/user-scripts/skills/prompt-expert/main.mjs "如何实现用户登录"

# 带上下文分析
node ~/src/projects/tools/user-scripts/skills/prompt-expert/main.mjs --context "优化数据库查询"

# 深度分析
node ~/src/projects/tools/user-scripts/skills/prompt-expert/main.mjs --deep "API 返回 500 错误"

# 指定场景
node ~/src/projects/tools/user-scripts/skills/prompt-expert/main.mjs --scenario bug-fix "服务启动失败"
```

---

## 📋 支持的场景类型

| 场景 | 触发词 | 说明 |
|------|--------|------|
| `bug-fix` | 报错、error、failed、bug | Bug 修复诊断 |
| `feature-implementation` | 实现、添加、create、build | 新功能开发 |
| `research-exploration` | 怎么、如何、how to、学习 | 技术调研 |
| `code-review` | review、审查、检查 | 代码审查 |
| `performance-optimization` | 优化、performance、慢 | 性能优化 |
| `documentation` | 文档、doc、readme | 文档编写 |
| `project-start` | 新项目、初始化 | 项目启动 |
| `blocked-stuck` | 卡住、stuck、blocked | 排除阻塞 |

---

## 🏗️ 架构说明

### 核心组件

```
prompt-expert/
├── main.mjs                  # 主入口
├── scripts/
│   ├── context-analyzer.mjs  # 上下文分析（待实现）
│   ├── scenario-matcher.mjs  # 场景匹配（待实现）
│   ├── prompt-generator.mjs  # 提示词生成（待实现）
│   ├── quality-scorer.mjs    # 质量评分（待实现）
│   └── template-library.md   # 模板库
├── config/
│   └── scenarios.json        # 场景配置
└── output/
    └── suggestions/          # 生成的建议
```

### 工作流程

```
1. 用户输入需求
       ↓
2. 分析上下文（项目类型、技术栈、对话历史）
       ↓
3. 匹配场景类型
       ↓
4. 选择提示词模板
       ↓
5. 填充变量生成提示词
       ↓
6. 输出建议并保存
```

---

## 📝 使用示例

### 示例 1: Bug 修复

```bash
node main.mjs "数据库连接超时"
```

输出：
```
============================================================
📋 Prompt Expert - 提示词建议
============================================================

📍 场景类型：bug-fix
📁 项目类型：python
🛠️ 技术栈：Python

------------------------------------------------------------
📝 生成的提示词:

你正在调试一个问题。请按以下步骤进行：

**问题描述**:
数据库连接超时

**当前上下文**:
- 项目类型：python
- 技术栈：Python
- 错误信息：待补充
- 复现步骤：待补充

**诊断流程**:
1. **确认现象**: 描述问题的具体表现
2. **定位范围**: 确定问题可能出现的模块
3. **假设驱动**: 提出 3 个最可能的原因
4. **逐一验证**: 设计实验验证每个假设
5. **修复方案**: 给出修复代码和验证方法

**期望输出**:
- 根本原因分析
- 修复方案（含代码）
- 验证步骤
- 预防措施
------------------------------------------------------------

💡 使用建议:
  1. 提供完整的错误信息和堆栈跟踪
  2. 说明复现步骤
  3. 告知已尝试的解决方案

============================================================
```

### 示例 2: 功能实现

```bash
node main.mjs "添加用户注册功能"
```

### 示例 3: 项目启动

```bash
node main.mjs --scenario project-start "创建新的微服务项目"
```

---

## 🔧 配置说明

### 自定义场景

编辑 `config/scenarios.json`:

```json
{
  "customScenarios": {
    "litellm-config": {
      "name": "LiteLLM 配置",
      "signals": ["litellm", "fallback", "model routing"],
      "template": "litellm"
    }
  }
}
```

### 添加模板

编辑 `scripts/template-library.md`，添加新模板后在 `main.mjs` 中引用。

---

## 📈 效果评估

### 提示词质量指标

| 指标 | 说明 | 目标值 |
|------|------|--------|
| 清晰度 | 提示词是否清晰无歧义 | > 85% |
| 完整性 | 是否包含必要上下文 | > 80% |
| 可执行性 | 是否能直接执行 | > 90% |

### 查看历史建议

```bash
# 查看最近的建议
ls -lt ~/src/projects/tools/user-scripts/skills/prompt-expert/output/suggestions/

# 查看特定建议
cat ~/src/projects/tools/user-scripts/skills/prompt-expert/output/suggestions/suggestion-*.md
```

---

## 🔗 相关资源

- [SKILL.md](./SKILL.md) - Skill 完整文档
- [模板库](./scripts/template-library.md) - 50+ 提示词模板
- [意图分析器](../intent-analyzer/SKILL.md) - 意图识别
- [模型对比搜索](../model-compare-search/SKILL.md) - 多模型搜索

---

## 🚧 待实现功能

- [ ] 上下文分析器（读取对话历史）
- [ ] 场景匹配引擎（多模型分析）
- [ ] 质量评分系统
- [ ] 提示词优化建议
- [ ] 与 intent-analyzer 深度集成

---

*最后更新：2026-03-21 | 版本：v1.0.0*
