<div align="center">

# 🤖 Claude Code 技能与代理

[![GitHub stars](https://img.shields.io/github/stars/Throokie/claude-code-skills?style=social)](https://github.com/Throokie/claude-code-skills/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/Throokie/claude-code-skills?style=social)](https://github.com/Throokie/claude-code-skills/network/members)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**生产级 Claude Code 扩展，助力规模化软件开发**

[English](README.md) • [简体中文](README.zh-CN.md) • [繁體中文](README.zh-TW.md)

[安装](#安装) • [快速开始](#快速开始) • [工作流](#推荐工作流) • [技能](#可用技能) • [代理](#可用代理)

</div>

---

## ✨ 这是什么？

精心策划的 **37 个技能** 和 **9 个代理**，将 Claude Code 转变为专业软件开发利器。专为希望借助 AI 辅助工作流快速交付的团队打造。

> "从想法到产品，只需 Claude Code"

---

## 🚀 安装

```bash
# 克隆到 Claude Code 技能目录
git clone https://github.com/Throokie/claude-code-skills.git ~/.claude/skills-repo

# 复制技能和代理到 Claude 配置
cp -r ~/.claude/skills-repo/skills/* ~/.claude/skills/
cp -r ~/.claude/skills-repo/agents/* ~/.claude/agents/
```

---

## ⚡ 快速开始

### 一键魔法

| 触发词 | 功能 |
|--------|------|
| `decision-record` | 捕获需求并系统化演进 |
| `/requirement-to-prd` | 将想法转化为生产级 PRD |
| `prd-to-code` | 从规格生成全栈实现 |
| `th-enterprise-test-agent` | 企业级自动化测试 |
| `th-bug-analyzer` | 影响分析和修复建议 |

---

## 🎯 推荐工作流

**Ralph Evolution** 方法论，使用 Claude Code 构建软件：

```
┌─────────────────────────────────────────────────────────────────┐
│                    RALPH EVOLUTION 工作流                        │
└─────────────────────────────────────────────────────────────────┘

    💡 想法
     │
     ▼
    ┌─────────────────────┐
    │ decision-record     │  捕获与演进需求
    │ + 你的痛点          │  迭代直到清晰
    └─────────────────────┘
     │
     ▼
    ┌─────────────────────┐
    │ /requirement-to-prd │  生成结构化 PRD
    └─────────────────────┘
     │
     ▼
    ┌─────────────────────┐
    │ prd-to-code         │  多代理代码生成
    │ + th-deep-coder2    │  可选：深度代码分析
    │ + th-deep-coder     │  可选：模型聚合
    └─────────────────────┘
     │
     ▼
    ┌─────────────────────┐
    │ th-enterprise-test  │  商业级测试
    │ + playwright-cli    │  浏览器自动化
    │ + puppeteer-cli     │  替代浏览器测试
    └─────────────────────┘
     │
     ▼
    ┌─────────────────────┐
    │ th-bug-analyzer     │  修复剩余问题
    └─────────────────────┘
     │
     ▼
    🎉 生产环境

   🔁 循环：任意组合，持续迭代
   💪 结果：低端模型也能跑出不错的成绩
```

---

## 📦 可用技能

### 核心开发

| 技能 | 触发词 | 用途 |
|------|--------|------|
| **decision-record** | `记录决策`, `需求演进` | 决策追踪与需求演进 |
| **requirement-to-prd** | `生成PRD`, `需求转PRD` | 需求转 PRD |
| **prd-to-code** | `PRD转代码`, `根据PRD开发` | 从 PRD 生成代码 |
| **prd-evolution** | `更新PRD`, `PRD版本管理` | PRD 版本管理 |
| **code-review** | `代码审查`, `review代码` | 系统化代码审查 |

### 测试与质量

| 技能 | 触发词 | 用途 |
|------|--------|------|
| **th-enterprise-test-agent** | `发布测试`, `E2E测试` | 企业级测试 |
| **th-bug-analyzer** | `分析bug影响` | Bug 影响分析 |
| **playwright-cli** | `浏览器测试` | 浏览器自动化 |
| **puppeteer-cli** | `网页截图` | 网页抓取与测试 |

### 代理与编排

| 技能 | 触发词 | 用途 |
|------|--------|------|
| **agent-factory** | `创建团队`, `多代理` | 动态代理生成 |
| **orchestrator** | `多代理协作` | 多代理编排 |
| **long-running-agent** | `长任务`, `复杂项目` | 长周期任务 |

### 研究与分析

| 技能 | 触发词 | 用途 |
|------|--------|------|
| **th-deep-coder** | `深度代码分析` | 多模型代码分析 |
| **th-deep-coder2** | `深度代码研究` | 代理工厂 + 分析 |
| **th-gitnexus-assistant** | `gitnexus`, `代码分析` | 代码知识图谱 |
| **unified-search** | `统一搜索` | 多源搜索 |
| **site-analyzer** | `分析网站` | 网站深度分析 |
| **web-fetch** | `抓取网页` | 网页抓取 |

### 生产力

| 技能 | 触发词 | 用途 |
|------|--------|------|
| **article-writing** | `文章写作` | 长文写作 |
| **long-doc-generator** | `生成文档` | 文档生成 |
| **decision-record** | `决策记录` | 决策追踪 |
| **knowledge-hub** | `记录`, `学习` | 知识管理 |

### 集成

| 技能 | 触发词 | 用途 |
|------|--------|------|
| **github** | `GitHub`, `gh命令` | GitHub CLI 集成 |
| **newapi-cli** | `newapi`, `调用模型` | NewAPI 模型调用 |
| **browser-use** | `打开网页` | 浏览器自动化 |
| **arch-linux** | `Arch Linux` | Arch 系统工具 |

### 模型与提示词

| 技能 | 触发词 | 用途 |
|------|--------|------|
| **model-compare-search** | `多模型搜索` | 多模型对比 |
| **prompt-expert** | `prompt专家` | 提示词优化 |
| **prompt-optimizer** | `优化prompt` | 提示词增强 |

---

## 🤖 可用代理

| 代理 | 用途 |
|------|------|
| **agent-factory** | 动态代理生成（母体模式） |
| **css-architect** | CSS 架构专家 |
| **frontend-tester** | 前端测试专家 |
| **th-bug-analyzer** | Bug 影响范围分析器 |
| **ui-designer** | UI 设计专家 |
| **ux-researcher** | UX 研究专家 |

---

## 🔥 为什么有效

> **"低端模型也能跑出不错的成绩"**

秘诀在于**组合**：

1. **多技能编排** - 每个技能专注做好一件事
2. **持续反馈循环** - 迭代直到质量达标
3. **每一步自动化** - 从需求到测试
4. **代理专业化** - 为特定任务构建的专用代理

---

## 📚 文档

- [SKILL.md](docs/SKILL.md) - 技能开发指南
- [AGENT.md](docs/AGENT.md) - 代理创建指南
- [WORKFLOW.md](docs/WORKFLOW.md) - 详细工作流文档

---

## 🤝 贡献

欢迎 PR！查看 [CONTRIBUTING.md](CONTRIBUTING.md) 了解指南。

---

## 📄 许可证

MIT 许可证 - 查看 [LICENSE](LICENSE) 了解详情。

---

<div align="center">

**用 ❤️ 为 Claude Code 社区制作**

[⭐ 给仓库点赞](https://github.com/Throokie/claude-code-skills) • [🍴 Fork 仓库](https://github.com/Throokie/claude-code-skills/fork) • [📖 文档](https://github.com/Throokie/claude-code-skills/wiki)

</div>
