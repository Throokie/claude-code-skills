# Src-Link Skill 管理

> **类型**: 通用工具
> **描述**: 统一管理 src/projects 下各项目到 ~/.claude/skills 的软链接
> **版本**: v1.0.0
> **位置**: `~/src/projects/tools/user-scripts/skills/src-link/`

## 快速开始

```bash
# 查看所有链接
src-link list

# 查看源目录中的 skill
src-link sources

# 检查指定 skill 状态
src-link check <skill-name>

# 创建单个链接
src-link create <skill-name>

# 批量创建所有未链接的 skill
src-link create-all
```

## 命令参考

| 命令 | 说明 |
|------|------|
| `list` | 列出 ~/.claude/skills 下所有软链接 |
| `sources` | 扫描并列出所有源目录中的 skill |
| `check <name>` | 检查指定 skill 的链接状态 |
| `create <name>` | 为指定 skill 创建软链接 |
| `create-all` | 为所有未链接的 skill 创建软链接 |
| `remove <name>` | 移除指定 skill 的软链接 |
| `fix` | 自动修复断裂的链接 |
| `search <keyword>` | 搜索 skill |

## 工作原理

1. **自动扫描源目录**:
   - `~/src/projects/tools/user-scripts/skills`
   - `~/src/projects/ai/skills/skills`
   - `~/src/projects/*/skills`

2. **识别有效 skill**: 必须包含 `SKILL.md` 文件

3. **创建软链接**: 从源目录链接到 `~/.claude/skills/`

## 规则

- **必须**使用 `src-link` 工具创建软链接
- 修改源目录文件后，软链接自动同步
- 禁止在 `~/.claude/skills/` 下直接创建普通目录
- 禁止修改 `~/.claude/skills/` 下的文件
