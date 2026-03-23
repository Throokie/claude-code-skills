---
name: knowledge-hub
description: 统一知识管理系统 - 集成学习记录、经验捕获、持久记忆。触发词：记录、学习、记住、回忆、整理。
version: 1.0.0
---

# Knowledge Hub - 统一知识管理

取代 insight-capture 和 continuous-learning-v2，提供更简洁、统一的知识管理体验。

## 核心理念

**"一个入口，三层存储，自动流转"**

```
用户输入 → 原始捕获 → 提炼加工 → 持久记忆
              ↓           ↓           ↓
           [Inbox]    [Notes]    [Memory]
            (临时)     (短期)      (长期)
```

## 存储结构

实际位置：`~/src/projects/tools/user-scripts/knowledge/`
软链接：`~/.claude/knowledge/`

```
knowledge/
├── inbox/                     # 收件箱（临时捕获）
│   └── YYYY-MM-DD.md          # 每日原始记录
├── notes/                     # 笔记（加工整理）
│   ├── patterns/              # 模式/经验
│   ├── traps/                 # 踩坑记录（原 fixes）
│   ├── workflows/             # 工作流程
│   └── projects/{name}/       # 项目笔记（原 work-log）
├── memory/                    # 持久记忆（长期）
│   ├── user.md                # 用户画像（原 profile）
│   ├── rules.md               # 工作规则（原 preferences）
│   └── index.md               # 记忆索引（原 MEMORY.md）
└── archive/                   # 归档（历史）
    └── YYYY/                  # 按年归档
```

## 触发词

| 触发词 | 功能 | 示例 |
|--------|------|------|
| `记录` | 快速记录到 inbox | "记录：遇到 XX 问题" |
| `学习` | 从对话提取知识 | "学习这个经验" |
| `记住` | 保存到持久记忆 | "记住我喜欢用 alt" |
| `回忆` | 搜索知识库 | "回忆一下 OpenSnitch 配置" |
| `整理` | 整理 inbox 到 notes | "整理今天的记录" |

## 工作流程

### 1. 快速记录（Inbox）

当用户说"记录"或自动触发时：

```bash
# 写入 inbox/YYYY-MM-DD.md
echo "## [$(date +%H:%M)] 标签
**原文**: [用户输入]
**上下文**: [当前任务]
**我的想法**: [为什么记录]
" >> ~/.claude/knowledge/inbox/$(date +%Y-%m-%d).md
```

### 2. 知识加工（Notes）

定期整理 inbox，提炼为 notes：

```markdown
---
created: YYYY-MM-DD
updated: YYYY-MM-DD
tags: [tag1, tag2]
confidence: high    # low/medium/high
---

# 标题

## 问题/场景
## 解决方案
## 应用示例
```

### 3. 持久记忆（Memory）

经过验证的知识提升到 memory：

```markdown
## 规则名称

**原则**: 一句话概括
**为什么**: 背景说明
**何时用**: 适用场景
**怎么用**: 具体做法
```

## 层级流转

| 层级 | 用途 | 停留时间 | 晋升条件 |
|------|------|----------|----------|
| **Inbox** | 快速记录 | 1-7 天 | 整理时分类 |
| **Notes** | 加工知识 | 30-90 天 | 验证 3+ 次有效 |
| **Memory** | 持久规则 | 永久 | 核心原则 |

## 自动捕获（Hooks）

在 `~/.claude/settings.json` 中添加：

```json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "*",
      "hooks": [{
        "type": "command",
        "command": "~/.claude/skills/knowledge-hub/scripts/observe.sh post"
      }]
    }]
  }
}
```

自动捕获场景：
- 文件修改操作（Edit/Write）
- 命令执行（Bash）
- 记录到 `inbox/YYYY-MM-DD.md`

**注意**：此 hook 已替代 continuous-learning-v2 的 observe.sh

## 命令速查

```bash
# 今日记录
knowledge today

# 搜索知识
knowledge search "关键词"

# 整理 inbox
knowledge organize

# 查看统计
knowledge stats

# 手动备份
knowledge backup
```

## 与旧系统对比

| 原系统 | Knowledge Hub |
|--------|---------------|
| ~~insight-capture~~ | 整合为统一入口（已替代） |
| ~~continuous-learning-v2~~ | hooks 迁移到本技能（已替代） |
| ~~memory-structure~~ Level 0-3 | 简化为 Inbox/Notes/Memory |
| 4 个存储位置 | 统一到 knowledge/ |

**可删除的旧技能**（已迁移完成）：
- `~/.claude/skills/insight-capture/` → 功能已合并
- `~/.claude/skills/continuous-learning-v2/` → hooks 已迁移

## 迁移状态

- [x] 数据从 insights/ 迁移到 notes/
- [x] 数据从 memory/ 迁移到 memory/
- [x] 创建统一目录结构
- [x] 创建软链接
- [ ] 配置 hooks（可选）
- [ ] 禁用旧 skill（用户手动操作）

---

*Knowledge Hub - 让知识流动起来*
