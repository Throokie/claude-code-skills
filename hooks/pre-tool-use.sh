#!/usr/bin/env fish
# PreToolUse Hook - 拦截禁止的工具调用
# 位置：~/.claude/hooks/pre-tool-use.sh
#
# 拦截的工具：WebFetch, Browser, Playwright 等内置网络工具
# 强制使用 curl 替代

# 读取输入（Claude 通过环境变量传递工具信息）
set -l input $CLAUDE_HOOK_INPUT

if test -z "$input"
  # 没有输入，允许通过
  echo '{"approved": true}'
  exit 0
end

# 提取工具名称和类型
set -l tool_name (echo "$input" | jq -r '.tool.name // ""')
set -l tool_type (echo "$input" | jq -r '.tool.type // ""')

# 规则 1: 禁止 WebFetch 和 fetch 工具
if test "$tool_name" = "WebFetch" -o "$tool_name" = "fetch" -o "$tool_type" = "WebFetch"
  echo "{\"approved\": false, \"reason\": \"禁止使用 $tool_name 工具，请使用 curl -s <URL> 替代\"}"
  exit 1
end

# 规则 2: 禁止危险的 rm -rf 命令
set -l command (echo "$input" | jq -r '.tool.command // ""')
if string match -q "rm -rf /*" "$command"
  echo '{"approved": false, "reason": "禁止执行 rm -rf /* 危险命令"}'
  exit 1
end

# 默认：允许通过
echo '{"approved": true}'
exit 0
