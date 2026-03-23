#!/bin/bash
# generate-report.sh - 从多模型搜索结果生成结构化Markdown报告

set -e

# 配置
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_FILE="./research-report.md"
SEARCH_DIR=""

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 打印帮助
print_help() {
    cat << EOF
Usage: $(basename "$0") --search-dir DIR [OPTIONS]

从多模型搜索结果生成结构化Markdown报告

Required:
    --search-dir DIR    model-compare-search的输出目录

Options:
    --output FILE       输出文件路径（默认./research-report.md）
    --title TITLE       报告标题
    -h, --help          显示帮助

Examples:
    $(basename "$0") --search-dir ~/.claude/skills/model-compare-search/data/2026-03-23-120000
    $(basename "$0") --search-dir ./data/2026-03-23-120000 --output ./security-audit.md --title "安全审计报告"
EOF
}

# 解析参数
while [[ $# -gt 0 ]]; do
    case $1 in
        --search-dir)
            SEARCH_DIR="$2"
            shift 2
            ;;
        --output)
            OUTPUT_FILE="$2"
            shift 2
            ;;
        --title)
            TITLE="$2"
            shift 2
            ;;
        -h|--help)
            print_help
            exit 0
            ;;
        *)
            echo -e "${RED}Error: Unknown option $1${NC}"
            print_help
            exit 1
            ;;
    esac
done

# 验证参数
if [[ -z "$SEARCH_DIR" ]]; then
    echo -e "${RED}Error: --search-dir 是必需的${NC}"
    print_help
    exit 1
fi

if [[ ! -d "$SEARCH_DIR" ]]; then
    echo -e "${RED}Error: 目录不存在: $SEARCH_DIR${NC}"
    exit 1
fi

# 提取元数据
extract_metadata() {
    local meta_file="$SEARCH_DIR/meta.json"
    if [[ -f "$meta_file" ]]; then
        cat "$meta_file"
    else
        echo '{}'
    fi
}

# 获取模型响应列表
get_model_responses() {
    local models_dir="$SEARCH_DIR/models"
    if [[ -d "$models_dir" ]]; then
        find "$models_dir" -name "response.md" -type f | sort
    fi
}

# 提取模型名称
get_model_name() {
    local response_path="$1"
    basename "$(dirname "$response_path")"
}

# 读取Kimi总结
get_kimi_summary() {
    local summary_file="$SEARCH_DIR/summary.md"
    if [[ -f "$summary_file" ]]; then
        cat "$summary_file"
    fi
}

# 生成报告标题
get_report_title() {
    if [[ -n "$TITLE" ]]; then
        echo "$TITLE"
    else
        # 尝试从meta.json提取查询
        local query
        query=$(extract_metadata | grep -o '"query": "[^"]*"' | cut -d'"' -f4 | head -1)
        if [[ -n "$query" ]]; then
            echo "深度代码研究：$query"
        else
            echo "深度代码研究报告"
        fi
    fi
}

# 生成置信度评分（基于响应长度）
calculate_confidence() {
    local response_file="$1"
    local length
    length=$(wc -c < "$response_file")

    # 简单的启发式评分
    if [[ $length -gt 5000 ]]; then
        echo "95"
    elif [[ $length -gt 3000 ]]; then
        echo "90"
    elif [[ $length -gt 1500 ]]; then
        echo "85"
    else
        echo "75"
    fi
}

# 生成报告
generate_report() {
    local title
    title=$(get_report_title)

    local timestamp
    timestamp=$(date)

    local meta
    meta=$(extract_metadata)

    local query
    query=$(echo "$meta" | grep -o '"query": "[^"]*"' | cut -d'"' -f4 | head -1 || echo "未指定")

    local total_models
    total_models=$(echo "$meta" | grep -o '"total_models": [0-9]*' | cut -d' ' -f2 || echo "0")

    local success_count
    success_count=$(echo "$meta" | grep -o '"success_count": [0-9]*' | cut -d' ' -f2 || echo "0")

    local total_tokens
    total_tokens=$(echo "$meta" | grep -o '"total_tokens": [0-9]*' | cut -d' ' -f2 || echo "0")

    # 开始生成报告
    {
        echo "# $title"
        echo ""
        echo "## 执行摘要"
        echo ""
        echo "| 项目 | 值 |"
        echo "|------|-----|"
        echo "| 生成时间 | $timestamp |"
        echo "| 研究问题 | $query |"
        echo "| 模型总数 | $total_models |"
        echo "| 成功响应 | $success_count/$total_models |"
        echo "| 总Token数 | $total_tokens |"
        echo ""

        # 读取Kimi总结
        local kimi_summary
        kimi_summary=$(get_kimi_summary)
        if [[ -n "$kimi_summary" ]]; then
            echo "## Kimi综合总结"
            echo ""
            echo "$kimi_summary"
            echo ""
        fi

        # 各模型观点对比
        echo "## 多模型观点对比"
        echo ""

        local responses
        responses=$(get_model_responses)

        if [[ -n "$responses" ]]; then
            while IFS= read -r response_file; do
                if [[ -f "$response_file" ]]; then
                    local model_name
                    model_name=$(get_model_name "$response_file")

                    local confidence
                    confidence=$(calculate_confidence "$response_file")

                    echo "### $model_name"
                    echo ""
                    echo "**置信度**: $confidence%"
                    echo ""

                    # 提取前500字符作为摘要
                    local summary
                    summary=$(head -c 500 "$response_file" | sed 's/^/> /')
                    echo "> $summary..."
                    echo ""

                    # 链接到完整响应
                    echo "*[查看完整响应]($response_file)*"
                    echo ""
                fi
            done <<< "$responses"
        else
            echo "*未找到模型响应*"
            echo ""
        fi

        # 建议部分（占位，实际由Claude填充）
        echo "## 具体建议"
        echo ""
        echo "*此部分应由父代理根据多模型分析结果填充*"
        echo ""

        # 参考数据
        echo "## 参考数据"
        echo ""
        echo "- **原始数据目录**: \`$SEARCH_DIR\`"
        echo "- **元数据文件**: \`$SEARCH_DIR/meta.json\`"
        echo ""

        echo "---"
        echo ""
        echo "*本报告由 th-deep-coder 生成*"

    } > "$OUTPUT_FILE"

    echo -e "${GREEN}✓ 报告已生成: $OUTPUT_FILE${NC}"
}

# 主函数
main() {
    generate_report
}

main
