#!/bin/bash
# Ralph Evolution 安装脚本

set -e

echo "🚀 Installing Ralph Evolution..."

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$HOME/.claude/skills/th-ralph-evo"
BIN_DIR="$HOME/.local/bin"

# 创建 bin 目录
mkdir -p "$BIN_DIR"

# 链接主命令
ln -sf "$SKILL_DIR/scripts/ralph-evo" "$BIN_DIR/ralph-evo"
ln -sf "$SKILL_DIR/scripts/ralph-evo-bug-analyzer" "$BIN_DIR/ralph-evo-bug-analyzer"

# 检查 PATH
if [[ ":$PATH:" != *":$BIN_DIR:"* ]]; then
    echo ""
    echo "⚠️  $BIN_DIR is not in your PATH"
    echo "Add this to your shell config:"
    echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
fi

echo ""
echo "✅ Ralph Evolution installed successfully!"
echo ""
echo "Quick start:"
echo "  ralph-evo init                    # Initialize project config"
echo "  ralph-evo watch --project .       # Start monitoring"
echo "  ralph-evo status                  # View status panel"
echo ""
echo "For more info: ~/.claude/skills/th-ralph-evo/SKILL.md"
