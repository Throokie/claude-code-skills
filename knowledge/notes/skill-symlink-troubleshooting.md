# Skill 符号链接故障排查指南

> **创建日期**: 2026-03-17
> **来源**: long-running-agent 路径问题排查
> **类型**: 故障排查 + 经验总结

---

## 问题描述

**现象**: `long-running-agent` skill 无法被 Claude Code 识别，运行 `/skills` 不显示该技能。

**根本原因**: 符号链接指向的路径是错误的，缺少了 `agents/` 子目录层。

---

## 排查过程

### Step 1: 验证符号链接状态

```bash
# 检查符号链接是否存在
ls -la ~/.claude/skills/ | grep long

# 输出:
# lrwxrwxrwx  1 throokie throokie   57  3 月 15 日 03:19 long-running-agent -> /home/throokie/src/user-scripts/skills/long-running-agent
```

符号链接存在，但需要验证目标路径是否正确。

### Step 2: 验证目标路径

```bash
# 检查符号链接实际指向
readlink -f ~/.claude/skills/long-running-agent

# 检查源目录是否存在
ls -la /home/throokie/src/user-scripts/skills/long-running-agent/
# 输出：没有那个文件或目录 ❌
```

### Step 3: 查找实际目录位置

```bash
# 在 skills 目录下搜索
ls -la /home/throokie/src/user-scripts/skills/ | grep agent

# 输出:
# drwxr-xr-x 1 throokie throokie    72  3 月 17 日 16:06 agent-factory
# drwxr-xr-x 1 throokie throokie    94  3 月 16 日 02:17 agents  ← 注意这个!

# 检查 agents 子目录
ls -la /home/throokie/src/user-scripts/skills/agents/
# 输出:
# drwxr-xr-x 1 throokie throokie   96  3 月 17 日 17:07 long-running-agent  ✓ 找到了!
```

### Step 4: 修复符号链接

```bash
# 删除错误的符号链接
rm ~/.claude/skills/long-running-agent

# 创建正确的符号链接（使用绝对路径）
ln -s /home/throokie/src/user-scripts/skills/agents/long-running-agent ~/.claude/skills/long-running-agent

# 验证
ls -la ~/.claude/skills/ | grep long
# 输出:
# lrwxrwxrwx  1 throokie throokie   64  3 月 17 日 17:12 long-running-agent -> /home/throokie/src/user-scripts/skills/agents/long-running-agent ✓
```

---

## 经验教训

### 1. 符号链接必须用绝对路径

**错误做法**:
```bash
ln -s ../skills/agents/long-running-agent ~/.claude/skills/long-running-agent
```

**正确做法**:
```bash
ln -s /home/throokie/src/user-scripts/skills/agents/long-running-agent ~/.claude/skills/long-running-agent
```

**原因**:
- 相对路径在不同工作目录下可能失效
- Claude Code 可能从不同目录启动，导致相对路径解析错误

### 2. 检查目录结构层次

当 Skill 被组织在子目录中时（如 `agents/`），符号链接必须包含完整的子目录路径：

```
正确: ~/.claude/skills/{name} -> ~/src/user-scripts/skills/agents/{name}/
错误: ~/.claude/skills/{name} -> ~/src/user-scripts/skills/{name}/  # 缺少 agents/
```

### 3. 验证 SKILL.md 文件格式

符号链接正确后，还需要验证源文件包含必需的 frontmatter：

```bash
# 检查文件是否存在
cat /home/throokie/src/user-scripts/skills/agents/long-running-agent/SKILL.md

# 必需包含:
---
name: long-running-agent
description: 中文描述...
---
```

### 4. 会话缓存问题

即使符号链接修复，**当前 Claude Code 会话可能仍使用旧的缓存**。

**解决方案**:
- 启动新的 Claude Code 会话
- 或在当前会话中等待一段时间后重试

---

## 自动化检查脚本

```bash
#!/bin/bash
# 检查所有 skill 符号链接是否有效

echo "Checking all skill symlinks..."
for link in ~/.claude/skills/*; do
  if [ -L "$link" ]; then
    target=$(readlink -f "$link")
    if [ ! -e "$target" ]; then
      echo "❌ BROKEN: $link -> $target"
    else
      if [ ! -f "$target/SKILL.md" ]; then
        echo "⚠️  MISSING SKILL.md: $link -> $target"
      else
        echo "✓ OK: $link"
      fi
    fi
  fi
done
```

---

## 相关文档

- [Skill 目录结构规范](~/src/user-scripts/CONVENTIONS.md)
- [符号链接最佳实践](~/.claude/insights/directory-structure.md)
- [错误模式库 - EP-019](~/.claude/projects/-home-throokie/memory/MEMORY.md)

---

*最后更新：2026-03-17*
