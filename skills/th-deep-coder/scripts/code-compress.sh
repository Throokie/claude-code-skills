#!/bin/bash
# code-compress.sh - 压缩代码库为适合大模型处理的文本格式
# 支持：全库分析、Git差异、指定路径

# set -e  # 暂时禁用，便于调试

# 配置
MAX_FILE_SIZE=1048576  # 1MB
EXCLUDE_PATTERNS=(
    "node_modules"
    ".git"
    ".venv"
    "venv"
    "__pycache__"
    "target"           # Rust
    "dist"             # JS build
    "build"
    ".next"
    ".nuxt"
    "*.log"
    "*.tmp"
    "*.temp"
    "*.min.js"
    "*.min.css"
    "package-lock.json"
    "yarn.lock"
    "pnpm-lock.yaml"
    "Cargo.lock"
    "*.pyc"
    "*.class"
    "*.o"
    "*.a"
    "*.so"
    "*.dll"
    "*.exe"
    "*.bin"
    "*.pkl"
    "*.h5"
    "*.onnx"
    "*.pt"
    "*.pth"
)

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 打印帮助
print_help() {
    cat << EOF
Usage: $(basename "$0") [OPTIONS]

压缩代码库为适合大模型处理的文本格式

Options:
    --full              压缩整个代码库
    --diff [REF]        只压缩Git差异（默认HEAD~1）
    --path PATH         压缩指定路径
    --output FILE       输出文件（默认/tmp/code-context.txt）
    --max-size SIZE     最大文件大小（字节，默认1MB）
    -h, --help          显示帮助

Examples:
    $(basename "$0") --full
    $(basename "$0") --diff HEAD~3
    $(basename "$0") --path src/components
    $(basename "$0") --diff main --output ./context.txt
EOF
}

# 初始化变量
MODE="full"
DIFF_REF="HEAD~1"
TARGET_PATH="."
OUTPUT_FILE="/tmp/code-context.txt"

# 解析参数
while [[ $# -gt 0 ]]; do
    case $1 in
        --full)
            MODE="full"
            shift
            ;;
        --diff)
            MODE="diff"
            if [[ -n "$2" && ! "$2" =~ ^-- ]]; then
                DIFF_REF="$2"
                shift 2
            else
                shift
            fi
            ;;
        --path)
            MODE="path"
            TARGET_PATH="$2"
            shift 2
            ;;
        --output)
            OUTPUT_FILE="$2"
            shift 2
            ;;
        --max-size)
            MAX_FILE_SIZE="$2"
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

# 构建排除参数
build_exclude_args() {
    local args=""
    for pattern in "${EXCLUDE_PATTERNS[@]}"; do
        args="$args --exclude=$pattern"
    done
    echo "$args"
}

# 检查文件是否应该包含
should_include_file() {
    local file="$1"
    local size

    # 检查文件大小
    if [[ -f "$file" ]]; then
        size=$(stat -c%s "$file" 2>/dev/null || stat -f%z "$file" 2>/dev/null)
        if [[ $size -gt $MAX_FILE_SIZE ]]; then
            return 1
        fi
    fi

    # 检查是否在排除列表中
    for pattern in "${EXCLUDE_PATTERNS[@]}"; do
        if [[ "$file" == *"$pattern"* ]]; then
            return 1
        fi
    done

    # 检查是否是文本文件
    if [[ -f "$file" ]]; then
        if ! file "$file" | grep -qE "text|ASCII|UTF-8|empty"; then
            # 检查是否是已知代码文件
            if ! [[ "$file" =~ \.(py|js|ts|jsx|tsx|java|go|rs|cpp|c|h|hpp|cs|swift|kt|rb|php|pl|sh|fish|zsh|bash|ps1|lua|vim|el|clj|scala|groovy|dart|flutter|sol|vy|move)$ ]]; then
                return 1
            fi
        fi
    fi

    return 0
}

# 压缩文件
compress_file() {
    local file="$1"
    local prefix="$2"

    echo "=== ${prefix}${file} ==="
    echo ""
    cat "$file" 2>/dev/null || echo "[无法读取文件]"
    echo ""
    echo ""
}

# 全库模式
mode_full() {
    echo -e "${YELLOW}正在扫描代码库...${NC}"

    local file_count=0
    local total_size=0

    # 使用find查找所有文件
    while IFS= read -r -d '' file; do
        if should_include_file "$file"; then
            compress_file "$file" ""
            ((file_count++))
            if [[ -f "$file" ]]; then
                total_size=$(($(stat -c%s "$file" 2>/dev/null || stat -f%z "$file" 2>/dev/null) + total_size))
            fi
        fi
    done < <(find "$TARGET_PATH" -type f -print0 2>/dev/null | head -z -n 500)

    echo -e "${GREEN}✓ 处理了 $file_count 个文件，总计 $(numfmt --to=iec $total_size 2>/dev/null || echo $total_size) 字节${NC}"
}

# Git差异模式
mode_diff() {
    echo -e "${YELLOW}正在获取Git差异 ($DIFF_REF)...${NC}"

    if ! git rev-parse --verify "$DIFF_REF" > /dev/null 2>&1; then
        echo -e "${RED}Error: 无效的Git引用: $DIFF_REF${NC}"
        exit 1
    fi

    # 获取变更的文件列表
    local changed_files
    changed_files=$(git diff --name-only "$DIFF_REF" 2>/dev/null || git diff --name-only HEAD "$DIFF_REF" 2>/dev/null)

    if [[ -z "$changed_files" ]]; then
        echo -e "${YELLOW}Warning: 没有找到变更的文件${NC}"
        exit 0
    fi

    local file_count=0

    echo "$changed_files" | while IFS= read -r file; do
        if [[ -f "$file" ]] && should_include_file "$file"; then
            compress_file "$file" ""
            ((file_count++))
        fi
    done

    echo -e "${GREEN}✓ 处理了 $file_count 个变更文件${NC}"

    # 添加diff内容
    echo ""
    echo "=== Git Diff ==="
    echo ""
    git diff "$DIFF_REF" --stat 2>/dev/null || true
    echo ""
}

# 指定路径模式
mode_path() {
    echo -e "${YELLOW}正在扫描路径: $TARGET_PATH${NC}"

    if [[ ! -e "$TARGET_PATH" ]]; then
        echo -e "${RED}Error: 路径不存在: $TARGET_PATH${NC}"
        exit 1
    fi

    if [[ -f "$TARGET_PATH" ]]; then
        # 单个文件
        if should_include_file "$TARGET_PATH"; then
            compress_file "$TARGET_PATH" ""
            echo -e "${GREEN}✓ 处理了 1 个文件${NC}"
        else
            echo -e "${RED}Error: 文件被排除或不是文本文件${NC}"
            exit 1
        fi
    else
        # 目录
        local file_count=0

        while IFS= read -r -d '' file; do
            if should_include_file "$file"; then
                compress_file "$file" ""
                ((file_count++))
            fi
        done < <(find "$TARGET_PATH" -type f -print0 2>/dev/null | head -z -n 500)

        echo -e "${GREEN}✓ 处理了 $file_count 个文件${NC}"
    fi
}

# 主函数
main() {
    # 检查依赖
    if ! command -v file &> /dev/null; then
        echo -e "${YELLOW}Warning: 'file' 命令未安装，可能影响文件类型检测${NC}"
    fi

    # 清空输出文件
    > "$OUTPUT_FILE"

    # 添加头部信息
    {
        echo "# 代码库上下文"
        echo ""
        echo "生成时间: $(date)"
        echo "模式: $MODE"
        if [[ "$MODE" == "diff" ]]; then
            echo "Git引用: $DIFF_REF"
        fi
        if [[ "$MODE" == "path" ]]; then
            echo "目标路径: $TARGET_PATH"
        fi
        echo "工作目录: $(pwd)"
        echo ""
        echo "========================================"
        echo ""
    } >> "$OUTPUT_FILE"

    # 执行对应模式
    case $MODE in
        full)
            mode_full >> "$OUTPUT_FILE" 2>&1
            ;;
        diff)
            mode_diff >> "$OUTPUT_FILE" 2>&1
            ;;
        path)
            mode_path >> "$OUTPUT_FILE" 2>&1
            ;;
    esac

    # 显示统计
    local output_size
    output_size=$(stat -c%s "$OUTPUT_FILE" 2>/dev/null || stat -f%z "$OUTPUT_FILE" 2>/dev/null)
    echo -e "${GREEN}✓ 代码上下文已生成: $OUTPUT_FILE ($(numfmt --to=iec $output_size 2>/dev/null || echo $output_size))${NC}"
}

main
