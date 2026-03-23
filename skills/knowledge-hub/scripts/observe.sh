#!/bin/bash
# Knowledge Hub - Observation Hook
# 简化版自动捕获脚本 - 记录有价值的交互

set -e

KNOWLEDGE_DIR="${HOME}/.claude/knowledge"
TODAY=$(date +%Y-%m-%d)
HOOK_PHASE="${1:-post}"

# 只处理 PostToolUse（工具执行后）
if [ "$HOOK_PHASE" != "post" ]; then
    exit 0
fi

# 读取 JSON 输入
INPUT_JSON=$(cat)
if [ -z "$INPUT_JSON" ]; then
    exit 0
fi

# 解析工具信息（使用 grep/sed 避免依赖 python）
TOOL_NAME=$(echo "$INPUT_JSON" | grep -o '"tool_name"[^}]*' | cut -d'"' -f4)
if [ -z "$TOOL_NAME" ]; then
    TOOL_NAME=$(echo "$INPUT_JSON" | grep -o '"tool"[^}]*' | cut -d'"' -f4)
fi

# 只记录特定类型的工具（Edit/Write 等修改操作）
case "$TOOL_NAME" in
    Edit|Write| Bash) ;;
    *) exit 0 ;;
esac

# 创建收件箱目录
mkdir -p "${KNOWLEDGE_DIR}/inbox"
INBOX_FILE="${KNOWLEDGE_DIR}/inbox/${TODAY}.md"

# 如果没有今日文件，创建头部
if [ ! -f "$INBOX_FILE" ]; then
    cat > "$INBOX_FILE" << EOF
# ${TODAY} 自动记录

> 自动捕获的工具使用记录

EOF
fi

# 提取会话ID和工具输入
SESSION_ID=$(echo "$INPUT_JSON" | grep -o '"session_id"[^,]*' | cut -d'"' -f4)
if [ -z "$SESSION_ID" ]; then
    SESSION_ID="unknown"
fi

NOW=$(date +%H:%M)

# 追加记录（脱敏处理）
echo "" >> "$INBOX_FILE"
echo "## [${NOW}] ${TOOL_NAME}" >> "$INBOX_FILE"
echo "" >> "$INBOX_FILE"
echo "**会话**: ${SESSION_ID}" >> "$INBOX_FILE"
echo "" >> "$INBOX_FILE"
echo "*自动捕获 by Knowledge Hub*" >> "$INBOX_FILE"

exit 0
