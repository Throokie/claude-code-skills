#!/usr/bin/env fish
# PreToolUse Hook - 意图检查器
# 位置：~/.claude/hooks/pre-tool-use-intent-check.sh
# 用途：在 Claude 调用工具前，检查是否已经理解用户意图，如未理解则触发分析

set -l input "$CLAUDE_HOOK_INPUT"

if test -z "$input"
  echo '{"approved": true}'
  exit 0
end

# 提取工具名称和会话 ID
set -l tool_name (echo "$input" | jq -r '.tool.name // ""')
set -l conversation_id (echo "$input" | jq -r '.conversation_id // "default"' | tr -cd 'a-zA-Z0-9_-')

# 跳过某些工具调用（避免循环）
if string match -q "Bash*(node*classify*)" "$input" -o string match -q "Bash*(analyze.mjs*)" "$input"
  echo '{"approved": true}'
  exit 0
end

# 检查是否有最近的意图分析结果
set -l intent_file "/tmp/claude-intent-analysis-$conversation_id.md"
set -l context_file "$HOME/.claude/projects/-home-throokie/current-intent.md"

# 如果没有意图分析结果，触发快速分析
if not test -f "$intent_file" -a -f "$context_file"
  # 获取最近的对话历史（从 hook 输入中提取）
  set -l recent_message (echo "$input" | jq -r '.tool.input.prompt // ""' | head -c 500)

  if test -n "$recent_message"
    # 异步触发意图分析
    node ~/src/projects/tools/user-scripts/skills/intent-analyzer/scripts/analyze.mjs \
      "$recent_message" \
      --output json \
      > /tmp/intent-analysis-temp-$conversation_id.json 2>/dev/null &
  end
end

# 始终允许通过（不阻塞）
echo '{"approved": true}'
exit 0
