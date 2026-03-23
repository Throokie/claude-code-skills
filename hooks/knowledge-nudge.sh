#!/usr/bin/env fish
# 知识文章写作提示 Hook (PreWriteFile)
# 位置：~/.claude/hooks/knowledge-nudge.sh
#
# 功能：
# 1. 检测到写知识文章时，提示添加 git commit
# 2. 提示更新索引
# 3. 检查存储位置

# 读取输入
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

set -l INSIGHTS_DIR "$HOME/.claude/insights"
set -l LEARNINGS_DIR "$INSIGHTS_DIR/learnings"
set -l FIXES_DIR "$INSIGHTS_DIR/fixes"
set -l WORKLOG_DIR "$INSIGHTS_DIR/work-log"
set -l KNOWLEDGE_INDEX "$INSIGHTS_DIR/KNOWLEDGE-INDEX.md"

# 检查是否是知识文章目录
set -l is_knowledge false
set -l article_type ""

if string match -q "$LEARNINGS_DIR/*" "$file_path"
    set -l is_knowledge true
    set -l article_type "学习笔记"
else if string match -q "$FIXES_DIR/*" "$file_path"
    set -l is_knowledge true
    set -l article_type "修复记录"
else if string match -q "$WORKLOG_DIR/*" "$file_path"
    set -l is_knowledge true
    set -l article_type "工作日志"
end

if test "$is_knowledge" = true
    set -l filename (basename "$file_path")
    # 去除 filename 中的日期前缀，获取主题部分
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
📍 位置：$file_path

✅ 后续操作:
1. git add 并 commit:
   git add $file_path
   git commit -m 'docs: add $filename'

2. 更新知识索引:
   ~/.claude/scripts/update-knowledge-index.sh --auto

3. 在 KNOWLEDGE-INDEX.md 中添加分类条目\"
}"
    else
        echo "{
    \"approved\": true,
    \"message\": \"📝 检测到知识文章创建

✓ 命名规范：$filename
📁 类型：$article_type
📍 位置：$file_path

✅ 后续操作:
1. git add 并 commit:
   git add $file_path
   git commit -m 'docs: add $filename'

2. 更新知识索引:
   ~/.claude/scripts/update-knowledge-index.sh --auto

3. 在 KNOWLEDGE-INDEX.md 中添加分类条目\"
}"
    end
end

# 默认通过
echo '{"approved": true}'
exit 0
