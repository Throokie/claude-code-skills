#!/usr/bin/env bash
# web-fetch v3.0 完整测试脚本
# 测试并发模式、统计系统、域名屏蔽、浏览器扩展接口

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FETCH="$SCRIPT_DIR/fetch-page.mjs"
BROWSER_EXT="$SCRIPT_DIR/browser-extension.mjs"

echo "=========================================="
echo "web-fetch v3.0 完整测试"
echo "=========================================="
echo ""

# 测试 1: 域名屏蔽
echo "## 测试 1: 域名屏蔽（example.com 应该被禁止）"
echo "------------------------------------------"
if node "$FETCH" "https://example.com" 2>&1 | grep -q "禁止访问的域名"; then
    echo "✅ 域名屏蔽测试通过"
else
    echo "❌ 域名屏蔽测试失败"
    exit 1
fi
echo ""

# 测试 2: 统计报告（无 URL 模式）
echo "## 测试 2: 统计报告"
echo "------------------------------------------"
node "$FETCH" --stats
echo ""

# 测试 3: 并发模式（baidu.com）
echo "## 测试 3: 并发模式（baidu.com）"
echo "------------------------------------------"
node "$FETCH" "https://baidu.com" --method all --timeout 60000
echo ""

# 测试 4: curl 单独模式
echo "## 测试 4: curl 单独模式（wikipedia.org）"
echo "------------------------------------------"
node "$FETCH" "https://wikipedia.org" --method curl --timeout 30000
echo ""

# 测试 5: 优先级模式（如果有历史数据）
echo "## 测试 5: 优先级选择"
echo "------------------------------------------"
node "$FETCH" "https://baidu.com" --priority --timeout 60000
echo ""

# 测试 6: 浏览器扩展接口（帮助）
echo "## 测试 6: 浏览器扩展接口"
echo "------------------------------------------"
node "$BROWSER_EXT" --help
echo ""

# 测试 7: 更新后的统计报告
echo "## 测试 7: 最终统计报告"
echo "------------------------------------------"
node "$FETCH" --stats
echo ""

echo "=========================================="
echo "✅ 所有测试完成！"
echo "=========================================="
