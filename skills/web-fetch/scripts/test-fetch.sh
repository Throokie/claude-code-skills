#!/bin/bash
# Web Fetch 测试脚本
# 用途：测试各种抓取方法

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FETCH_SCRIPT="$SCRIPT_DIR/fetch-page.mjs"

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅  $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌  $1${NC}" >&2; }

# 测试计数器
TESTS_PASSED=0
TESTS_FAILED=0

# 测试函数
run_test() {
    local name="$1"
    local cmd="$2"
    local expect_success="${3:-true}"

    log_info "测试：$name"

    set +e
    output=$(eval "$cmd" 2>&1)
    exit_code=$?
    set -e

    if [ "$expect_success" = "true" ]; then
        if [ $exit_code -eq 0 ]; then
            log_success "✓ $name - 通过"
            TESTS_PASSED=$((TESTS_PASSED + 1))
            echo "$output" | head -10
            return 0
        else
            log_error "✗ $name - 失败 (退出码：$exit_code)"
            echo "$output" | head -5
            TESTS_FAILED=$((TESTS_FAILED + 1))
            return 1
        fi
    else
        if [ $exit_code -ne 0 ]; then
            log_success "✓ $name - 正确失败"
            TESTS_PASSED=$((TESTS_PASSED + 1))
            return 0
        else
            log_error "✗ $name - 应该失败但成功了"
            TESTS_FAILED=$((TESTS_FAILED + 1))
            return 1
        fi
    fi
}

# 主流程
main() {
    echo "======================================"
    echo "     Web Fetch 测试套件"
    echo "======================================"
    echo ""

    # 测试 1: 帮助信息
    run_test "帮助信息" "node $FETCH_SCRIPT --help"

    # 测试 2: 无 URL（应失败）
    run_test "无 URL 应失败" "node $FETCH_SCRIPT" false

    # 测试 3: 无效 URL（应失败）
    run_test "无效 URL 应失败" "node $FETCH_SCRIPT 'not-a-url'" false

    # 测试 4: curl 方法（简单静态页面）
    run_test "curl 方法 - example.com" "node $FETCH_SCRIPT 'https://example.com' --method curl"

    # 测试 5: 自动模式
    run_test "自动模式 - example.com" "node $FETCH_SCRIPT 'https://example.com' --no-retry"

    # 测试 6: JSON 输出
    run_test "JSON 输出" "node $FETCH_SCRIPT 'https://example.com' --json --no-retry"

    # 测试 7: 带等待时间
    run_test "等待模式" "node $FETCH_SCRIPT 'https://example.com' --wait 2 --no-retry"

    # 测试 8: 保存输出
    run_test "保存到文件" "node $FETCH_SCRIPT 'https://example.com' --output /tmp/test-fetch.html --no-retry"

    # 检查输出文件
    if [ -f /tmp/test-fetch.html ] && [ -s /tmp/test-fetch.html ]; then
        log_success "✓ 文件保存 - 通过"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        rm /tmp/test-fetch.html
    else
        log_error "✗ 文件保存 - 失败"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi

    echo ""
    echo "======================================"
    echo "           测试摘要"
    echo "======================================"
    log_info "通过：$TESTS_PASSED"
    if [ $TESTS_FAILED -gt 0 ]; then
        log_error "失败：$TESTS_FAILED"
    else
        log_success "失败：$TESTS_FAILED"
    fi
    echo "======================================"

    if [ $TESTS_FAILED -gt 0 ]; then
        exit 1
    fi
    exit 0
}

main "$@"
