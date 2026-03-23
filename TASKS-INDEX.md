# Tasks Index - 任务索引

> **用途**: 追踪长期任务和项目状态
> **位置**: `~/.claude/TASKS-INDEX.md`

---

## 🚀 新会话快速入口

**新会话开始时，按顺序读取**：

```bash
# 1. 系统架构原则（⭐⭐⭐⭐⭐ 最高优先级）
cat ~/.claude/insights/ARCHITECTURE-PRINCIPLES.md

# 2. 目录结构规范
cat ~/.claude/insights/directory-structure.md

# 3. 统一规范
cat ~/src/user-scripts/CONVENTIONS.md

# 4. 本任务索引
cat ~/.claude/TASKS-INDEX.md
```

---

## 📋 当前任务

| ID | 任务 | 状态 | 优先级 | 创建日期 |
|----|------|------|--------|----------|
| #1 | 设计用户目录文件存储规范 | ✅ **已完成** | ⭐⭐⭐⭐⭐ | 2026-03-15 |
| #5 | 清理散落的项目和文件 | ✅ **已完成** | ⭐⭐⭐⭐⭐ | 2026-03-15 |

---

## 📁 项目列表

### 活跃项目

| ID | 项目名称 | 位置 | 说明 |
|----|----------|------|------|
| `refactor-2026` | 目录重构 | ✅ **已完成** | 用户目录重构计划 |
| `openclaw` | OpenClaw | `/home/openclaw/` | OpenClaw 服务 |
| `claude-skills` | Claude Skills | `~/src/user-scripts/skills/` | 技能集合 |

### 归档项目

| ID | 项目名称 | 归档日期 |
|----|----------|----------|
| - | - | - |

---

## 📂 核心文档索引

### 系统架构（⭐⭐⭐⭐⭐ 最高优先级）

| 文档 | 位置 | 用途 |
|------|------|------|
| **架构原则** | `~/.claude/insights/ARCHITECTURE-PRINCIPLES.md` | **系统架构设计原则** |
| 目录结构 | `~/.claude/insights/directory-structure.md` | src/ 详细结构 |
| 重构总结 | `~/.claude/insights/learnings/2026-03-15-refactor-summary.md` | 经验教训 |
| 文件存储规范 | `~/dotfiles/docs/STRUCTURE.md` | 命名/清理规范 |

### 用户目录说明

| 文档 | 位置 |
|------|------|
| 用户目录说明 | `~/README.md` |
| 重构报告 | `~/backups/REFACTOR-COMPLETION-REPORT.md` |
| 审计报告 | `~/backups/DIRECTORY-AUDIT-REPORT.md` |

---

## 🔄 重构完成状态 (refactor-2026)

### 10 个 Phase 全部完成 ✅

| 阶段 | 任务 | 状态 | 完成日期 |
|------|------|------|----------|
| Phase 1-4 | 创建 src/，移动核心项目 | ✅ 完成 | 2026-03-15 |
| Phase 5-8 | 清理 dotfiles，移动 scripts | ✅ 完成 | 2026-03-15 |
| Phase 9 | 移动 my-agents/obsidian 等 | ✅ 完成 | 2026-03-15 |
| Phase 10 | 清理审计（散落项目） | ✅ 完成 | 2026-03-15 |

### 重构成果

**重构前**：用户目录根部有 20+ 个项目散落
**重构后**：用户目录根部只有 5 个核心目录

```
~ (home)
├── dotfiles/          # 配置文件模板
├── src/               # 18 个代码项目
├── projects/          # 工作项目容器
├── data/              # 数据文件
└── backups/           # 临时备份
```

### 后续行动

- [ ] 测试使用 1-2 天，确认功能正常
- [ ] 清理临时备份释放空间
- [ ] 为新增 Git 仓库配置远程仓库

---

## 📝 会话恢复

### 继续任务

```bash
# 查看任务列表
cat ~/.claude/TASKS-INDEX.md

# 切换到项目
~/.claude/scripts/session-isolation.sh switch project <id>

# 切换到任务
~/.claude/scripts/session-isolation.sh switch task <name>
```

---

*最后更新：2026-03-15 | 重构完成*
