#!/usr/bin/env fish
# 知识管理 PostToolUse Hook
# 位置：~/.claude/hooks/knowledge-manager.sh
#
# 功能：
# 1. 检测是否创建了知识文章（learnings/fixes/work-log 目录）
# 2. 提示是否要 git commit
# 3. 检测文件夹规范
# 4. 自动更新知识索引

# 配置
set -l INSIGHTS_DIR "$HOME/.claude/insights"
set -l LEARNINGS_DIR "$INSIGHTS_DIR/learnings"
set -l FIXES_DIR "$INSIGHTS_DIR/fixes"
set -l WORKLOG_DIR "$INSIGHTS_DIR/work-log"
set -l KNOWLEDGE_INDEX "$INSIGHTS_DIR/KNOWLEDGE-INDEX.md"

# 读取输入
set -l input "$CLAUDE_HOOK_INPUT"
if test -z "$input"
    echo '{"approved": true}'
    exit 0
end

# 提取工具信息
set -l tool_name (echo "$input" | jq -r '.tool.name // ""')
set -l tool_type (echo "$input" | jq -r '.tool.type // ""')
set -l command (echo "$input" | jq -r '.tool.command // ""')
set -l args (echo "$input" | jq -r '.tool.args // [] | join(" ")')

# 检测是否是写文件操作
if string match -q "Write" "$tool_name" -o string match -q "Write" "$tool_type" -o string match -q "*cat*>*" "$command" -o string match -q "*" ">" "$args"
    # 提取写入的文件路径
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
        # 检查是否在正确的目录
        set -l year (date +%Y)
        set -l month (date +%m)
        set -l day (date +%d)
        set -l expected_pattern "$year-$month-$day-*"

        set -l filename (basename "$file_path")

        # 检查命名规范
        if not string match -q "[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]-*.md" "$filename"
            echo "{\"approved\": false, \"reason\": \"知识文章命名不规范！应该使用 $expected_pattern.md 格式\\n建议：mv $file_path $LEARNINGS_DIR/$expected_pattern.md\"}"
            exit 1
        end

        # 提示是否要更新索引
        echo "{\"approved\": true, \"message\": \"✓ 知识文章已创建：$filename\\n\\n后续操作建议:\\n1. git add 并 commit: git add $file_path && git commit -m 'docs: add $filename'\\n2. 更新 KNOWLEDGE-INDEX.md\\n3. 如果属于新主题，添加分类索引\"}"
    end
end

# 检测是否是 git 操作
if string match -q "git*" "$command" -o string match -q "git*" "$args"
    # 检查是否涉及知识目录
    if string match -q "*\.claude/insights*" "$args" -o string match -q "*learnings/*" "$args"
        echo "{\"approved\": true, \"message\": \"✓ Git 操作检测：涉及知识目录\\n\\n记得在 commit 消息中标注 docs: 前缀\\n例如：git commit -m 'docs: add xxx-fix.md'\"}"
    end
end

# 检测是否更新了索引
set -l file_path (echo "$input" | jq -r '.tool.args.path // "" // .tool.input.path // ""')
if string match -q "$KNOWLEDGE_INDEX" "$file_path"
    echo "{\"approved\": true, \"message\": \"✓ 知识索引已更新\\n\\n建议：git add $KNOWLEDGE_INDEX && git commit -m 'docs: update knowledge index'\"}"
end

# 默认通过
echo '{"approved": true}'
exit 0
