# Bash 波浪号路径展开陷阱

**日期**: 2026-03-18
**场景**: Claude Smart Drive v4 脚本参数处理
**相关文件**: `/home/throokie/claude-drive-smart-v4.sh`

---

## 问题描述

当用户传入 `~/src/workspace/...` 形式的路径参数时，脚本未能正确展开波浪号，导致路径拼接错误：

```bash
# 用户输入
claude-drive "ws2" "~/src/workspace/tmux-web-term" -q

# 错误输出
❌ 项目目录不存在：/home/throokie/~/src/workspace/tmux-web-term
```

注意：`~/` 没有被展开，而是作为字面量拼接到 HOME 目录后。

---

## 根本原因

在 bash case 语句中进行模式匹配和参数扩展时，转义字符使用错误：

```bash
# ❌ 错误代码
case "$RAW_PROJECT_DIR" in
    "~/"*) RAW_PROJECT_DIR="$HOME/${RAW_PROJECT_DIR#\\~/}" ;;
    #                                        ^^^^
    #                                   双反斜杠错误
esac
```

**问题分析**:
- `${VAR#pattern}` 中的 pattern 使用 glob 模式匹配
- `\\~/` 匹配的是字面量 `\~/`（带反斜杠）
- 但实际传入的路径是 `~/`（没有反斜杠）
- 导致模式匹配失败，波浪号未被移除

---

## 解决方案

```bash
# ✅ 正确代码
case "$RAW_PROJECT_DIR" in
    "~/"*) RAW_PROJECT_DIR="$HOME/${RAW_PROJECT_DIR#\~/}" ;;
    #                                        ^^^
    #                                 单反斜杠转义
esac
```

**说明**:
- `\~/` 中的 `\~` 转义波浪号，使其作为字面量匹配
- pattern 中只需要一层转义
- `\\~` 会匹配 `\~`（带反斜杠的波浪号），不是我们想要的

---

## 对比测试

```bash
# 测试代码
RAW_PROJECT_DIR="~/src/workspace/test"
HOME="/home/throokie"

# ❌ 错误方式（双反斜杠）
case "$RAW_PROJECT_DIR" in
    "~/"*) result="$HOME/${RAW_PROJECT_DIR#\\~/}" ;;
esac
echo "错误结果：$result"
# 输出：/home/throokie/~/src/workspace/test  (未展开)

# ✅ 正确方式（单反斜杠）
case "$RAW_PROJECT_DIR" in
    "~/"*) result="$HOME/${RAW_PROJECT_DIR#\~/}" ;;
esac
echo "正确结果：$result"
# 输出：/home/throokie/src/workspace/test
```

---

## Bash 波浪号展开规则

| 场景 | 行为 | 示例 |
|------|------|------|
| 双引号内 | **不展开** | `cd "~/src"` → 字面量 |
| 无引号 | **展开** | `cd ~/src` → `/home/user/src` |
| case 模式 | 需要转义 | `${VAR#\~/}` 匹配 `~/xxx` |
| 参数扩展 | 需要转义 | `${VAR#\~}` 匹配 `~` |

**关键原则**:
1. bash 只在无引号的命令参数中自动展开 `~`
2. 字符串中的 `~` 需要用 `eval` 或手动处理
3. pattern 匹配中用 `\~` 转义波浪号

---

## 替代方案

如果不想处理转义问题，可以使用以下替代方案：

### 方案 1: 使用 eval（有风险）
```bash
RAW_PROJECT_DIR=$(eval echo "$RAW_PROJECT_DIR")
```

### 方案 2: 使用 realpath（推荐）
```bash
# 先展开波浪号，再用 realpath 标准化
case "$RAW_PROJECT_DIR" in
    "~/"*) RAW_PROJECT_DIR="$HOME/${RAW_PROJECT_DIR:2}" ;;
    "~") RAW_PROJECT_DIR="$HOME" ;;
esac
RAW_PROJECT_DIR=$(realpath "$RAW_PROJECT_DIR" 2>/dev/null || echo "$RAW_PROJECT_DIR")
```

### 方案 3: 直接检查（最简洁）
```bash
case "$RAW_PROJECT_DIR" in
    ~/*) RAW_PROJECT_DIR="$HOME/${RAW_PROJECT_DIR:2}" ;;
    ~) RAW_PROJECT_DIR="$HOME" ;;
esac
```

**注**: 方案 3 中 `~/*` 不带引号，bash 会自动展开为 `$HOME/*`，但作为 case 模式时可能需要特殊处理。

---

## 修改位置

`/home/throokie/claude-drive-smart-v4.sh` 第 32 行：

```bash
# 修改前
"~/"*) RAW_PROJECT_DIR="$HOME/${RAW_PROJECT_DIR#\\~/}" ;;

# 修改后
"~/"*) RAW_PROJECT_DIR="$HOME/${RAW_PROJECT_DIR#\~/}" ;;
```

---

## 验证命令

```bash
# 测试各种路径格式
test_path() {
    local path="$1"
    case "$path" in
        "~/"*) path="$HOME/${path#\~/}" ;;
        "~") path="$HOME" ;;
    esac
    echo "$path"
}

test_path "~/src"        # → /home/throokie/src
test_path "~"            # → /home/throokie
test_path "/absolute"    # → /absolute (不变)
test_path "relative"     # → relative (不变)
```

---

## 参考资料

- Bash 参数扩展：https://www.gnu.org/software/bash/manual/html_node/Shell-Parameter-Expansion.html
- Bash 引号：https://www.gnu.org/software/bash/manual/html_node/Quoting.html
- Bash 波浪号展开：https://www.gnu.org/software/bash/manual/html_node/Tilde-Expansion.html
