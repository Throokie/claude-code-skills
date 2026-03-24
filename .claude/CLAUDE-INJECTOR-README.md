# 🚀 Claude Injector + Ralph Evo

**让 AI 替你写代码的终极方案**

[![Build](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/throokie/claude-injector)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Version](https://img.shields.io/badge/version-2.0-orange)](https://github.com/throokie/claude-injector/releases)

```
[2026-03-24 02:43:00] ✓ 已发送到 tmux 会话: 💻claude-dev
[2026-03-24 02:43:00] 提示词: /th-prd-driven-dev-workflow --phase 6
[2026-03-24 02:43:45] 阶段6完成: 代码开发 - 基于PRD实现功能
```

定时注入提示词 → PRD驱动开发 → 自动Git提交 → 7阶段闭环

---

## 📸 实测截图

**claude-injector 运行状态**（tmux 多窗格实时监控）

![Injector Status](/home/throokie/下载/tmux-web/CopyQ.OiPLfo.png)

**ralph-evo 工作流进度**（八字算命项目 - 已完成6阶段）

![Workflow Progress](/home/throokie/下载/tmux-web/CopyQ.tXkMqL.png)

---

## ⚡ Quick Start

### 1. 启动注入器

```bash
./claude-injector.sh ~/src/my-project "claude-dev" 300 "/th-prd-driven-dev-workflow"
```

参数说明：
- `~/src/my-project` - 项目目录
- `"claude-dev"` - tmux 会话名
- `300` - 每5分钟注入一次
- `"/th-prd-driven-dev-workflow"` - 执行的Skill

### 2. 查看工作流状态

```bash
cat ~/.ralph-evo/state.json
```

输出：
```json
{
  "currentProject": "/home/throokie/src/projects/tools/dev-projects/八字算命",
  "currentPhase": 6,
  "loopCount": 1,
  "recentCommits": [
    "阶段1: 项目分析",
    "阶段2: 多模型需求分析",
    "阶段3: Kimi深度整合",
    "阶段4: PRD更新",
    "阶段5: 代码审查准备",
    "阶段6: 代码开发"
  ]
}
```

---

## 🎯 核心特性

| 特性 | 说明 |
|------|------|
| ⏰ **定时注入** | 自动向 tmux 发送提示词，无需人工值守 |
| 📋 **PRD驱动** | 7阶段完整开发工作流 |
| 🤖 **多模型聚合** | 8模型并行分析 + Kimi深度整合 |
| 🔍 **自动代码审查** | 多模型审查 + 自动修复问题 |
| 🧪 **自动化测试** | E2E/性能/安全/兼容性测试 |
| 💾 **自动Git提交** | 每个阶段自动commit，记录完整 |
| 🎛️ **阶段控制** | `--phase 1-3` 灵活执行任意阶段 |

---

## 🏗️ 技术架构

```
┌─────────────────────────────────────────────────────────────────┐
│                      claude-injector.sh                          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐  │
│  │ 定时器(300s)│ →  │ tmux发送   │ →  │ ralph-evo 调度器    │  │
│  └─────────────┘    └─────────────┘    └─────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     ralph-evo 工作流                             │
│                                                                  │
│  P1:项目分析 → P2:多模型分析 → P3:Kimi整合 → P4:PRD更新          │
│                              ↓                                   │
│                    P5:代码审查准备                               │
│                              ↓                                   │
│                    P6:代码开发                                   │
│                              ↓                                   │
│                    P7:自动化测试                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 实战案例：八字算命项目

**项目状态**：已完成 6/7 阶段

| 阶段 | 状态 | 产出 |
|------|------|------|
| ✅ P1 项目分析 | 完成 | user-stories.md |
| ✅ P2 多模型需求分析 | 完成 | phase2-analysis.md |
| ✅ P3 Kimi深度整合 | 完成 | integrated-requirements.md |
| ✅ P4 PRD更新 | 完成 | docs/prd/prd-*.md |
| ✅ P5 代码审查准备 | 完成 | code-review-report.md |
| ✅ P6 代码开发 | 完成 | src/ + tests/ |
| ⏳ P7 自动化测试 | 待执行 | - |

**耗时**：约 5 小时完成 6 阶段

**Git提交记录**：
```
b158764 feat: 添加 --phase 参数支持阶段控制
e7bd8a2 fix: 添加 mkdir -p workflow 到所有阶段
5b96ed9 Fix auth loading and ship PWA/WSS groundwork
2c0fe84 feat: 实现 PRD F-002/F-003 - 模式回退策略
```

---

## 🛠️ 使用示例

### 分阶段执行（可控模式）

```bash
# 只运行分析阶段（1-3）
/skill prd-driven-dev-workflow --phase 1-3

# 从代码开发开始
/skill prd-driven-dev-workflow --phase 6-7

# 只跑测试
/skill prd-driven-dev-workflow --phase 7
```

### 完整工作流

```javascript
await Skill({
  name: "prd-driven-dev-workflow",
  args: `
    --project ~/src/my-project
    --prd docs/prd/current-prd.md
    --max-test-rounds 3
    --models 8
  `
});
```

---

## 📁 项目结构

```
~
├── bin/
│   ├── claude-injector.sh      # 定时注入器
│   └── lib/tmux-injector.sh    # 公共库
├── .ralph-evo/
│   ├── state.json              # 当前状态
│   └── messages.jsonl          # 消息日志
└── .claude/skills/
    └── th-prd-driven-dev-workflow/
        └── SKILL.md            # 7阶段工作流定义
```

---

## 🔧 安装

```bash
# 克隆到 bin 目录
git clone https://github.com/throokie/claude-injector.git ~/bin/claude-injector

# 添加到 PATH
echo 'export PATH="$HOME/bin:$PATH"' >> ~/.bashrc

# 验证
claude-injector.sh --help
```

---

## 🤝 贡献

欢迎 PR！请确保：
- 遵循现有代码风格
- 添加测试
- 更新文档

---

## 📜 License

MIT License - 详见 [LICENSE](LICENSE)

---

**Made with ❤️ by throokie**
