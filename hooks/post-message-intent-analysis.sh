#!/usr/bin/env fish
# PostMessage Hook - 智能意图分析（多模型已禁用）
# 位置：~/.claude/hooks/post-message-intent-analysis.sh
# 用途：在用户发送消息后，先分析意图再让 Claude 响应
# 策略：本地分类器置信度<0.7 时调用多模型分析

set -l input "$CLAUDE_HOOK_INPUT"

if test -z "$input"
  echo '{"approved": true}'
  exit 0
end

# 提取用户消息和会话 ID
set -l message (echo "$input" | jq -r '.message // ""')
set -l conversation_id (echo "$input" | jq -r '.conversation_id // "default"' | tr -cd 'a-zA-Z0-9_-')

# 跳过空消息或短消息
if test -z "$message" -o (echo "$message" | string length) -lt 10
  echo '{"approved": true}'
  exit 0
end

# 跳过已经是意图分析结果的回复
if string match -q "*## 意图分析*" "$message" -o "$message" = "intent-analysis"
  echo '{"approved": true}'
  exit 0
end

# 步骤 1: 本地快速分类
set -l classify_result (node ~/src/projects/tools/user-scripts/skills/model-compare-search/scripts/classify.mjs "$message" 2>/dev/null)
set -l intent_type (echo "$classify_result" | grep "分类：" | awk '{print $2}' | tr -d '"')
set -l confidence (echo "$classify_result" | grep "置信度：" | awk '{print $2}' | tr -d '%')

# 步骤 2: 判断是否需要深度分析（已禁用多模型）
set -l need_deep_analysis false

# 注意：多模型分析已禁用，只保留本地分类器
# 如需启用，取消下面注释：
# if test -n "$confidence"
#   set -l conf_int (echo "$confidence" | sed 's/\.//g')
#   if test "$conf_int" -lt 70
#     set -l need_deep_analysis true
#   end
# end

# 步骤 3: 深度分析已禁用
# if test "$need_deep_analysis" = true
#   # 多模型分析代码已注释
# end

# 始终允许通过
echo '{"approved": true}'
exit 0
