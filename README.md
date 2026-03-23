<div align="center">

# 🤖 Claude Code Skills & Agents

[![GitHub stars](https://img.shields.io/github/stars/Throokie/claude-code-skills?style=social)](https://github.com/Throokie/claude-code-skills/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/Throokie/claude-code-skills?style=social)](https://github.com/Throokie/claude-code-skills/network/members)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**Production-ready Claude Code extensions for building software at scale**

[Installation](#installation) • [Quick Start](#quick-start) • [Workflow](#recommended-workflow) • [Skills](#available-skills) • [Agents](#available-agents)

</div>

---

## ✨ What is this?

A curated collection of **37 Skills** and **9 Agents** that transform Claude Code into a professional software development powerhouse. Built for teams who want to ship faster with AI-assisted workflows.

> "From idea to production with Claude Code"

---

## 🚀 Installation

```bash
# Clone to your Claude Code skills directory
git clone https://github.com/Throokie/claude-code-skills.git ~/.claude/skills-repo

# Copy skills and agents to your Claude config
cp -r ~/.claude/skills-repo/skills/* ~/.claude/skills/
cp -r ~/.claude/skills-repo/agents/* ~/.claude/agents/
```

---

## ⚡ Quick Start

### One-command magic

| Trigger | What happens |
|---------|--------------|
| `decision-record` | Capture requirements and evolve them systematically |
| `/requirement-to-prd` | Turn ideas into production-ready PRDs |
| `prd-to-code` | Generate full-stack implementations from specs |
| `th-enterprise-test-agent` | Enterprise-grade testing with browser automation |
| `th-bug-analyzer` | Impact analysis and fix suggestions |

---

## 🎯 Recommended Workflow

The **Ralph Evolution** methodology for building software with Claude Code:

```
┌─────────────────────────────────────────────────────────────────┐
│                    RALPH EVOLUTION WORKFLOW                      │
└─────────────────────────────────────────────────────────────────┘

    💡 Idea
     │
     ▼
    ┌─────────────────────┐
    │ decision-record     │  Capture & evolve requirements
    │ + your pain points  │  Iterate until crystal clear
    └─────────────────────┘
     │
     ▼
    ┌─────────────────────┐
    │ /requirement-to-prd │  Generate structured PRD
    └─────────────────────┘
     │
     ▼
    ┌─────────────────────┐
    │ prd-to-code         │  Multi-agent code generation
    │ + th-deep-coder2    │  Optional: deep code analysis
    │ + th-deep-coder     │  Optional: model aggregation
    └─────────────────────┘
     │
     ▼
    ┌─────────────────────┐
    │ th-enterprise-test  │  Commercial-grade testing
    │ + playwright-cli    │  Browser automation
    │ + puppeteer-cli     │  Alternative browser testing
    └─────────────────────┘
     │
     ▼
    ┌─────────────────────┐
    │ th-bug-analyzer     │  Fix remaining issues
    └─────────────────────┘
     │
     ▼
    🎉 Production

   🔁 Loop: Arbitrary combinations, continuous iteration
   💪 Result: Even low-end models produce excellent results
```

---

## 📦 Available Skills

### Core Development

| Skill | Trigger | Purpose |
|-------|---------|---------|
| **decision-record** | `记录决策`, `需求演进` | Decision tracking & requirement evolution |
| **requirement-to-prd** | `生成PRD`, `需求转PRD` | Convert requirements to PRD |
| **prd-to-code** | `PRD转代码`, `根据PRD开发` | Generate code from PRD |
| **prd-evolution** | `更新PRD`, `PRD版本管理` | PRD versioning & updates |
| **code-review** | `代码审查`, `review代码` | Systematic code review |

### Testing & Quality

| Skill | Trigger | Purpose |
|-------|---------|---------|
| **th-enterprise-test-agent** | `发布测试`, `E2E测试` | Enterprise-grade testing |
| **th-bug-analyzer** | `分析bug影响` | Bug impact analysis |
| **playwright-cli** | `浏览器测试` | Browser automation |
| **puppeteer-cli** | `网页截图` | Web scraping & testing |

### Agents & Orchestration

| Skill | Trigger | Purpose |
|-------|---------|---------|
| **agent-factory** | `创建团队`, `多代理` | Dynamic agent generation |
| **orchestrator** | `多代理协作` | Multi-agent orchestration |
| **long-running-agent** | `长任务`, `复杂项目` | Long-running tasks |

### Research & Analysis

| Skill | Trigger | Purpose |
|-------|---------|---------|
| **th-deep-coder** | `深度代码分析` | Multi-model code analysis |
| **th-deep-coder2** | `深度代码研究` | Agent factory + analysis |
| **th-gitnexus-assistant** | `gitnexus`, `代码分析` | Code knowledge graph |
| **unified-search** | `统一搜索` | Multi-source search |
| **site-analyzer** | `分析网站` | Website deep analysis |
| **web-fetch** | `抓取网页` | Web scraping |

### Productivity

| Skill | Trigger | Purpose |
|-------|---------|---------|
| **article-writing** | `文章写作` | Long-form content |
| **long-doc-generator** | `生成文档` | Documentation generation |
| **decision-record** | `决策记录` | Decision tracking |
| **knowledge-hub** | `记录`, `学习` | Knowledge management |

### Integration

| Skill | Trigger | Purpose |
|-------|---------|---------|
| **github** | `GitHub`, `gh命令` | GitHub CLI integration |
| **newapi-cli** | `newapi`, `调用模型` | NewAPI model calling |
| **browser-use** | `打开网页` | Browser automation |
| **arch-linux** | `Arch Linux` | Arch system utilities |

### Model & Prompt

| Skill | Trigger | Purpose |
|-------|---------|---------|
| **model-compare-search** | `多模型搜索` | Multi-model comparison |
| **prompt-expert** | `prompt专家` | Prompt optimization |
| **prompt-optimizer** | `优化prompt` | Prompt enhancement |

---

## 🤖 Available Agents

| Agent | Purpose |
|-------|---------|
| **agent-factory** | Dynamic agent generation (母体模式) |
| **css-architect** | CSS architecture specialist |
| **frontend-tester** | Frontend testing expert |
| **th-bug-analyzer** | Bug impact scope analyzer |
| **ui-designer** | UI design specialist |
| **ux-researcher** | UX research expert |

---

## 🔥 Why This Works

> **"低端模型也能跑出不错的成绩"**

The secret is **composition**:

1. **Multi-skill orchestration** - Each skill handles one thing well
2. **Continuous feedback loops** - Iterate until quality is achieved
3. **Automation at every step** - From requirements to testing
4. **Agent specialization** - Purpose-built agents for specific tasks

---

## 📚 Documentation

- [SKILL.md](docs/SKILL.md) - Skill development guide
- [AGENT.md](docs/AGENT.md) - Agent creation guide
- [WORKFLOW.md](docs/WORKFLOW.md) - Detailed workflow documentation

---

## 🤝 Contributing

PRs welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

<div align="center">

**Made with ❤️ for the Claude Code community**

[⭐ Star this repo](https://github.com/Throokie/claude-code-skills) • [🍴 Fork it](https://github.com/Throokie/claude-code-skills/fork) • [📖 Documentation](https://github.com/Throokie/claude-code-skills/wiki)

</div>
