# Claude Code Hooks 开发指南

> **创建日期**: 2026-03-20
> **来源**: Hook 配置实战经验
> **用途**: 指导 Claude Code hook 脚本开发、调试和部署

---

## 快速开始

### 什么是 Claude Code Hooks？

Hooks 是在特定事件（如用户发送消息、工具调用前后）自动执行的脚本，用于：
- 意图分析和路由
- 工具调用拦截
- 知识管理自动化
- 自定义通知和提醒

### Hook 执行流程

```
用户消息 → UserPromptSubmit Hook → Claude 处理 → PreToolUse → 工具执行 → PostToolUse → 响应返回
```

---

## 目录结构

```
~/.claude/
├── settings.local.json      # Hook 配置入口
└── hooks/
    ├── post-message-intent-analysis.sh    # 用户消息后：意图分析
    ├── pre-tool-use-intent-check.sh       # 工具调用前：意图检查
    ├── pre-tool-use.sh                    # 工具调用前：安全拦截
    ├── knowledge-nudge.sh                 # 写文件前：知识文章提示
    ├── knowledge-manager.sh               # 工具调用后：知识管理
    └── skill-post-execution.sh            # 工具调用后：占位
```

---

## 配置规范

### settings.json 结构

```json
{
  "hooks": {
    "EventName": [
      {
        "matcher": "ToolName|Pattern",
        "hooks": [
          {
            "type": "command",
            "command": "fish ~/.claude/hooks/your-hook.sh",
            "timeout": 5,
            "async": true,
            "statusMessage": "正在执行..."
          }
        ]
      }
    ]
  }
}
```

### Hook 事件类型

| 事件 | 触发时机 | 典型用途 |
|------|---------|---------|
| `UserPromptSubmit` | 用户发送消息后 | 意图分析、消息预处理 |
| `PreToolUse` | 工具调用前 | 安全拦截、参数修改 |
| `PostToolUse` | 工具调用成功后 | 知识管理、日志记录 |
| `PostToolUseFailure` | 工具调用失败后 | 错误处理、降级方案 |
| `Stop` | 会话结束时 | 会话总结、状态保存 |
| `SessionStart` | 会话开始时 | 加载上下文、初始化 |

### 常用 Tool Matcher

| Matcher | 匹配工具 |
|---------|---------|
| `*` | 所有工具 |
| `Bash` | Bash 命令执行 |
| `Write` | 文件写入 |
| `Edit` | 文件编辑 |
| `Read` | 文件读取 |
| `Glob` | 文件搜索 |
| `Grep` | 内容搜索 |

---

## 脚本语言规范 ⭐⭐⭐

### 必须使用 Fish Shell

**项目默认 shell 是 fish**，所有 hook 脚本必须使用 fish 语法！

### Shebang 推荐

```fish
#!/usr/bin/env fish
# 或使用 fish 命令执行
```

### settings.json 配置

```json
{
  "command": "fish ~/.claude/hooks/your-hook.sh"
}
```

### Bash vs Fish 语法对比

| 功能 | Bash (❌) | Fish (✅) |
|------|----------|----------|
| 变量定义 | `VAR="value"` | `set -l VAR "value"` |
| 命令替换 | `$(cmd)` | `(cmd)` |
| If 语句 | `if []; then ... fi` | `if test ... end` |
| 字符串匹配 | `[[ $var == *.md ]]` | `string match -q "*.md" "$var"` |
| 字符串替换 | `${var#prefix}` | `(echo "$var" \| string replace -r '^prefix' '')` |
| Heredoc | `cat <<EOF` | `printf '%s\n' '...'` 或 `echo` |
| 数组 | `arr=(a b c)` | `set arr a b c` |
| 退出 | `exit 0` | `exit 0` (相同) |

### 完整示例

```fish
#!/usr/bin/env fish
# PreToolUse Hook - 意图检查器

# 读取输入（从环境变量）
set -l input "$CLAUDE_HOOK_INPUT"

# 空输入检查
if test -z "$input"
  echo '{"approved": true}'
  exit 0
end

# 提取工具名称（使用 jq）
set -l tool_name (echo "$input" | jq -r '.tool.name // ""')

# 规则：禁止 WebFetch 工具
if test "$tool_name" = "WebFetch"
  echo "{\"approved\": false, \"reason\": \"禁止使用 WebFetch，请使用 curl -s <URL> 替代\"}"
  exit 1
end

# 默认：允许通过
echo '{"approved": true}'
exit 0
```

---

## Hook 输入/输出规范

### 输入格式 (stdin / 环境变量)

```json
{
  "session_id": "abc123",
  "conversation_id": "xyz789",
  "tool_name": "Write",
  "tool_type": "Write",
  "tool_input": {
    "file_path": "/path/to/file.txt",
    "content": "..."
  },
  "tool_response": {
    "filePath": "/path/to/file.txt"
  }
}
```

### 输出格式 (stdout)

**基础格式**:
```json
{"approved": true}
```

**带消息**:
```json
{
  "approved": true,
  "message": "✓ 操作成功\n\n提示信息..."
}
```

**拒绝操作**:
```json
{
  "approved": false,
  "reason": "拒绝原因..."
}
```

### 特殊字段说明

| 字段 | 用途 | 示例 |
|------|------|------|
| `approved` | 是否允许通过 | `true` / `false` |
| `reason` | 拒绝原因 | `"权限不足"` |
| `message` | 用户提示信息 | `"✓ 已创建文件"` |
| `continue` | (Stop 事件) 是否继续 | `false` 阻止停止 |
| `systemMessage` | 系统消息 | `"Hook 执行完成"` |

---

## 实战案例

### 案例 1: 意图分析 Hook (PostMessage)

**文件**: `~/.claude/hooks/post-message-intent-analysis.sh`

**功能**: 用户发送消息后，分析意图并推荐工具

```fish
#!/usr/bin/env fish
# PostMessage Hook - 智能意图分析

set -l input "$CLAUDE_HOOK_INPUT"

if test -z "$input"
  echo '{"approved": true}'
  exit 0
end

# 提取用户消息
set -l message (echo "$input" | jq -r '.message // ""')

# 跳过空消息或短消息
if test -z "$message" -o (echo "$message" | string length) -lt 10
  echo '{"approved": true}'
  exit 0
end

# 跳过已经是意图分析的回复
if string match -q "*## 意图分析*" "$message"
  echo '{"approved": true}'
  exit 0
end

# 本地快速分类（调用分类脚本）
set -l classify_result (node ~/src/tools/classify.mjs "$message" 2>/dev/null)
set -l intent_type (echo "$classify_result" | grep "分类：" | awk '{print $2}' | tr -d '"')
set -l confidence (echo "$classify_result" | grep "置信度：" | awk '{print $2}' | tr -d '%')

# 判断是否需要多模型分析（置信度<70%）
set -l need_deep_analysis false
if test -n "$confidence"
  set -l conf_int (echo "$confidence" | sed 's/\.//g')
  if test "$conf_int" -lt 70
    set -l need_deep_analysis true
  end
end

# 异步调用多模型分析
if test "$need_deep_analysis" = true
  set -l conversation_id (echo "$input" | jq -r '.conversation_id // "default"' | tr -cd 'a-zA-Z0-9_-')
  set -l analysis_file "/tmp/claude-intent-analysis-$conversation_id.md"

  node ~/src/tools/search.mjs "分析用户意图：$message" --type reasoning > "$analysis_file" 2>/dev/null &
  sleep 0.5
end

# 始终允许通过
echo '{"approved": true}'
exit 0
```

---

### 案例 2: 知识文章提示 Hook (PreWriteFile)

**文件**: `~/.claude/hooks/knowledge-nudge.sh`

**功能**: 检测到写知识文章时，提示命名规范和后续操作

```fish
#!/usr/bin/env fish
# 知识文章写作提示 Hook

set -l input "$CLAUDE_HOOK_INPUT"
if test -z "$input"
  echo '{"approved": true}'
  exit 0
end

# 提取文件路径
set -l file_path (echo "$input" | jq -r '.path // ""')
if test -z "$file_path"
  echo '{"approved": true}'
  exit 0
end

# 配置目录
set -l INSIGHTS_DIR "$HOME/.claude/insights"
set -l LEARNINGS_DIR "$INSIGHTS_DIR/learnings"
set -l FIXES_DIR "$INSIGHTS_DIR/fixes"

# 检查是否是知识文章
set -l is_knowledge false
set -l article_type ""

if string match -q "$LEARNINGS_DIR/*" "$file_path"
  set -l is_knowledge true
  set -l article_type "学习笔记"
else if string match -q "$FIXES_DIR/*" "$file_path"
  set -l is_knowledge true
  set -l article_type "修复记录"
end

if test "$is_knowledge" = true
  set -l filename (basename "$file_path")
  # 去除日期前缀，获取主题
  set -l theme (echo "$filename" | string replace -r '^[0-9]{4}-[0-9]{2}-[0-9]{2}-' '')

  # 检查命名规范
  if not string match -q "[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]-*.md" "$filename"
    set -l today (date +%Y-%m-%d)
    echo "{
    \"approved\": true,
    \"message\": \"📝 检测到知识文章创建

⚠️  命名建议：使用 YYYY-MM-DD-主题.md 格式
   当前：$filename
   建议：$today-$theme

📁 类型：$article_type

✅ 后续操作:
1. git add 并 commit
2. 更新 KNOWLEDGE-INDEX.md\"
}"
  end
end

echo '{"approved": true}'
exit 0
```

---

### 案例 3: 知识管理 Hook (PostToolUse)

**文件**: `~/.claude/hooks/knowledge-manager.sh`

**功能**: 检测知识文章创建后，提示 git commit 和索引更新

```fish
#!/usr/bin/env fish
# 知识管理 PostToolUse Hook

# 配置
set -l INSIGHTS_DIR "$HOME/.claude/insights"
set -l LEARNINGS_DIR "$INSIGHTS_DIR/learnings"
set -l FIXES_DIR "$INSIGHTS_DIR/fixes"
set -l WORKLOG_DIR "$INSIGHTS_DIR/work-log"

# 读取输入
set -l input "$CLAUDE_HOOK_INPUT"
if test -z "$input"
  echo '{"approved": true}'
  exit 0
end

# 提取工具信息
set -l tool_name (echo "$input" | jq -r '.tool.name // ""')
set -l file_path (echo "$input" | jq -r '.tool.args.path // "" // .tool.input.path // ""')

# 检测是否是知识文章
set -l is_knowledge false
set -l article_type ""

if string match -q "$LEARNINGS_DIR/*" "$file_path"
  set -l is_knowledge true
  set -l article_type "learning"
else if string match -q "$FIXES_DIR/*" "$file_path"
  set -l is_knowledge true
  set -l article_type "fix"
else if string match -q "$WORKLOG_DIR/*" "$file_path"
  set -l is_knowledge true
  set -l article_type "work-log"
end

if test "$is_knowledge" = true
  set -l filename (basename "$file_path")

  # 检查命名规范
  if not string match -q "[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]-*.md" "$filename"
    set -l year (date +%Y)
    set -l month (date +%m)
    set -l day (date +%d)
    echo "{\"approved\": false, \"reason\": \"知识文章命名不规范！应该使用 $year-$month-$day-*.md 格式\"}"
    exit 1
  end

  echo "{\"approved\": true, \"message\": \"✓ 知识文章已创建：$filename\\n\\n后续操作建议:\\n1. git add 并 commit\\n2. 更新 KNOWLEDGE-INDEX.md\"}"
end

echo '{"approved": true}'
exit 0
```

---

### 案例 4: 安全拦截 Hook (PreToolUse)

**文件**: `~/.claude/hooks/pre-tool-use.sh`

**功能**: 拦截禁止的工具和危险命令

```fish
#!/usr/bin/env fish
# PreToolUse Hook - 安全拦截

set -l input "$CLAUDE_HOOK_INPUT"

if test -z "$input"
  echo '{"approved": true}'
  exit 0
end

# 提取工具名称
set -l tool_name (echo "$input" | jq -r '.tool.name // ""')
set -l command (echo "$input" | jq -r '.tool.command // ""')

# 规则 1: 禁止 WebFetch 工具
if test "$tool_name" = "WebFetch" -o "$tool_name" = "fetch"
  echo "{\"approved\": false, \"reason\": \"禁止使用 $tool_name 工具，请使用 curl -s <URL> 替代\"}"
  exit 1
end

# 规则 2: 禁止危险的 rm -rf 命令
if string match -q "rm -rf /*" "$command"
  echo '{"approved": false, "reason": "禁止执行 rm -rf /* 危险命令"}'
  exit 1
end

# 默认通过
echo '{"approved": true}'
exit 0
```

---

## 调试技巧

### 语法检查

```bash
# 检查 fish 脚本语法
fish -n ~/.claude/hooks/your-hook.sh

# 批量检查
for script in ~/.claude/hooks/*.sh; do
  echo "=== $script ==="
  fish -n "$script" && echo "✓ 语法正确" || echo "✗ 语法错误"
done
```

### 手动测试

```bash
# 模拟输入测试
echo '{"tool": {"name": "Bash"}, "conversation_id": "test"}' | \
  fish ~/.claude/hooks/pre-tool-use.sh

# 查看输出
echo '{"test": "data"}' | fish ~/.claude/hooks/your-hook.sh | jq .
```

### 日志调试

```fish
#!/usr/bin/env fish
# 在脚本中添加临时日志

set -l input "$CLAUDE_HOOK_INPUT"
echo "$(date): input=$input" >> /tmp/hook-debug.log

# ... 其他逻辑

echo "执行到此处" >> /tmp/hook-debug.log
```

---

## 常见问题

### Q1: Hook 不执行

**检查清单**:
1. settings.json 配置是否正确
2. JSON 语法是否有效：`jq '.' ~/.claude/settings.local.json`
3. 脚本是否有执行权限：`chmod +x ~/.claude/hooks/*.sh`
4. 是否需要重启 Claude Code

### Q2: Hook 脚本报语法错误

**原因**: 混用 bash 和 fish 语法

**解决**:
```bash
# 使用 fish 检查语法
fish -n your-hook.sh

# 常见错误对照：
# VAR=value     → set -l VAR "value"
# if []; then   → if test
# $(cmd)        → (cmd)
# fi            → end
```

### Q3: Hook 超时

**原因**: 同步执行耗时操作

**解决**: 使用异步模式
```json
{
  "async": true,
  "timeout": 10
}
```

### Q4: 如何传递复杂 JSON 输出

**使用 printf 或 echo**:
```fish
# 方法 1: echo 多行字符串
echo "{
    \"approved\": true,
    \"message\": \"提示：$variable\"
}"

# 方法 2: printf
printf '%s\n' '{"approved": true, "message": "提示"}'
```

---

## 最佳实践

### 1. 脚本结构规范

```fish
#!/usr/bin/env fish
# 简短描述
# 位置：~/.claude/hooks/your-hook.sh
# 用途：...

# 1. 配置区
set -l CONFIG_DIR "$HOME/.config"

# 2. 输入处理
set -l input "$CLAUDE_HOOK_INPUT"
if test -z "$input"
  echo '{"approved": true}'
  exit 0
end

# 3. 业务逻辑
# ...

# 4. 默认输出
echo '{"approved": true}'
exit 0
```

### 2. 错误处理

```fish
# 外部命令调用添加错误抑制
set -l result (node /path/to/script.mjs "$arg" 2>/dev/null)

# 检查命令是否成功
if not command -v node >/dev/null 2>&1
  echo '{"approved": true}'  # 降级处理
  exit 0
end
```

### 3. 异步执行

```fish
# 耗时操作放到后台
long_running_command > /tmp/output.txt 2>/dev/null &

# 等待一小段时间（可选）
sleep 0.5
```

### 4. 日志记录

```fish
# 简单日志
echo "$(date): Hook executed" >> /tmp/hook.log

# 详细日志（调试用）
echo "$(date): input=$input" >> /tmp/hook-debug.log
```

---

## 参考资料

| 文档 | 位置 |
|------|------|
| 防踩坑笔记 EP-026 | `~/.claude/insights/pitfalls.md` |
| 知识索引 | `~/.claude/insights/KNOWLEDGE-INDEX.md` |
| 记忆文件体系 | `~/.claude/insights/memory-structure.md` |
| 调试检查清单 | `~/.claude/insights/DEBUG-CHECKLIST.md` |

---

*最后更新：2026-03-20 | 版本：v1.0*
