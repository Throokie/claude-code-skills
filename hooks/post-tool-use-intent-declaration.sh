#!/usr/bin/env fish
# PostToolUse Hook - 强制 AI 输出意图声明
# 位置：~/.claude/hooks/post-tool-use-intent-declaration.sh
#
# 功能：
# 检测 AI 是否在执行前输出了结构化意图声明
# 如果没有，添加注释提醒

# 读取输入
set -l input "$CLAUDE_HOOK_INPUT"
if test -z "$input"
    echo '{"approved": true}'
    exit 0
end

# 提取工具信息和响应
set -l tool_name (echo "$input" | jq -r '.tool.name // ""')
set -l command (echo "$input" | jq -r '.tool.command // .tool.args.command // .tool.input.command // ""')

# 只检查 Bash 工具
if test "$tool_name" != "Bash"
    echo '{"approved": true}'
    exit 0
end

# 跳过空命令
if test -z "$command"
    echo '{"approved": true}'
    exit 0
end

# 这里不拦截，只记录日志用于分析
# 真正的检查由 pre-tool-use-intent-declaration.sh 完成

echo '{"approved": true}'
exit 0
