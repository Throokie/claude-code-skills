#!/bin/bash
# ============================================================
# 大型商业网站分析工作流
# 整合 neo、browser-use、VL 模型进行深度分析
# ============================================================

set -e

# 配置
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILLS_DIR="$(dirname "$SCRIPT_DIR")"
OUTPUT_BASE="${OUTPUT_BASE:-$HOME/site-analysis}"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 用法
usage() {
    cat << EOF
用法: $0 <URL> [选项]

大型商业网站深度分析工作流

参数:
    URL                 目标网站 URL

选项:
    --name NAME         项目名称 (默认: 域名)
    --phase PHASE       执行阶段: capture, analyze, generate, all (默认: all)
    --vl                启用 VL 模型分析
    --headless          无头模式运行
    --output DIR        输出目录 (默认: ~/site-analysis/<name>)

示例:
    $0 https://shop.example.com --name shop --vl
    $0 https://app.example.com --phase capture
    $0 https://dashboard.example.com --phase analyze

EOF
    exit 1
}

# 解析参数
URL=""
NAME=""
PHASE="all"
USE_VL=false
HEADLESS=false
OUTPUT_DIR=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --name) NAME="$2"; shift 2 ;;
        --phase) PHASE="$2"; shift 2 ;;
        --vl) USE_VL=true; shift ;;
        --headless) HEADLESS=true; shift ;;
        --output) OUTPUT_DIR="$2"; shift 2 ;;
        -h|--help) usage ;;
        *)
            if [[ -z "$URL" ]]; then
                URL="$1"
            else
                log_error "未知参数: $1"
                usage
            fi
            shift
            ;;
    esac
done

# 验证参数
if [[ -z "$URL" ]]; then
    log_error "必须提供目标 URL"
    usage
fi

# 提取域名
DOMAIN=$(echo "$URL" | sed -E 's|https?://([^/]+).*|\1|')
NAME="${NAME:-$DOMAIN}"
OUTPUT_DIR="${OUTPUT_DIR:-$OUTPUT_BASE/$NAME}"

# 创建目录
mkdir -p "$OUTPUT_DIR"/{captures,screenshots,analysis,knowledge}

log_info "目标: $URL"
log_info "域名: $DOMAIN"
log_info "输出: $OUTPUT_DIR"

# ============================================================
# Phase 1: 捕获阶段
# ============================================================
phase_capture() {
    log_info "=== Phase 1: 捕获阶段 ==="

    # 1.1 检查 neo 是否安装
    if ! command -v neo &> /dev/null; then
        log_warn "neo 未安装，跳过 API 捕获"
        log_info "安装方法: git clone https://github.com/4ier/neo && cd neo && npm install && npm link"
    else
        log_info "使用 neo 捕获 API 流量..."

        # 连接浏览器
        neo connect 2>/dev/null || neo launch chrome

        # 打开目标网站
        neo open "$URL"

        # 等待用户操作
        log_info "请在浏览器中操作网站，按 Enter 继续..."
        read

        # 导出捕获数据
        neo capture list "$DOMAIN" --json > "$OUTPUT_DIR/captures/api-captures.json" 2>/dev/null || true
        neo capture export "$DOMAIN" --format har > "$OUTPUT_DIR/captures/traffic.har" 2>/dev/null || true
        neo capture stats "$DOMAIN" > "$OUTPUT_DIR/captures/stats.txt" 2>/dev/null || true

        log_success "API 捕获完成"
    fi

    # 1.2 使用 browser-use 截图
    log_info "使用 browser-use 捕获页面..."

    BROWSER_CMD="browser-use"
    if $HEADLESS; then
        BROWSER_CMD="browser-use --browser chromium"
    fi

    $BROWSER_CMD open "$URL" 2>/dev/null
    $BROWSER_CMD screenshot "$OUTPUT_DIR/screenshots/homepage.png" --full 2>/dev/null || true
    $BROWSER_CMD state --json > "$OUTPUT_DIR/captures/page-state.json" 2>/dev/null || true

    log_success "页面捕获完成"
}

# ============================================================
# Phase 2: 分析阶段
# ============================================================
phase_analyze() {
    log_info "=== Phase 2: 分析阶段 ==="

    # 2.1 API 模式提取
    if [[ -f "$OUTPUT_DIR/captures/api-captures.json" ]]; then
        log_info "提取 API 模式..."

        python "$SKILLS_DIR/api-pattern-extractor/tools/extract-patterns.py" \
            --captures "$OUTPUT_DIR/captures/api-captures.json" \
            --output "$OUTPUT_DIR/analysis/api-patterns.yaml" 2>/dev/null || {
            log_warn "API 模式提取失败，创建空模式文件"
            echo "endpoints: []" > "$OUTPUT_DIR/analysis/api-patterns.yaml"
        }

        log_success "API 模式提取完成"
    else
        log_warn "无 API 捕获数据，跳过模式提取"
        echo "endpoints: []" > "$OUTPUT_DIR/analysis/api-patterns.yaml"
    fi

    # 2.2 VL 模型分析
    if $USE_VL && [[ -f "$OUTPUT_DIR/screenshots/homepage.png" ]]; then
        log_info "使用 VL 模型分析页面..."

        python "$SKILLS_DIR/visual-analyzer/tools/page-analyzer.py" \
            --image "$OUTPUT_DIR/screenshots/homepage.png" \
            --template structure \
            --output "$OUTPUT_DIR/analysis/visual-analysis.json" 2>/dev/null || {
            log_warn "VL 分析失败"
            echo '{"page_type": "unknown", "components": [], "interactions": []}' > "$OUTPUT_DIR/analysis/visual-analysis.json"
        }

        log_success "VL 分析完成"
    else
        log_warn "跳过 VL 分析"
        echo '{"page_type": "unknown", "components": [], "interactions": []}' > "$OUTPUT_DIR/analysis/visual-analysis.json"
    fi

    # 2.3 合并分析结果
    log_info "合并分析结果..."

    python "$SKILLS_DIR/knowledge-generator/tools/merge-analysis.py" \
        --api "$OUTPUT_DIR/analysis/api-patterns.yaml" \
        --visual "$OUTPUT_DIR/analysis/visual-analysis.json" \
        --output "$OUTPUT_DIR/analysis/merged-analysis.json" \
        --format json 2>/dev/null || true

    log_success "分析完成"
}

# ============================================================
# Phase 3: 知识生成阶段
# ============================================================
phase_generate() {
    log_info "=== Phase 3: 知识生成阶段 ==="

    # 3.1 生成 Skill 文档
    log_info "生成 Skill 文档..."

    python "$SKILLS_DIR/knowledge-generator/tools/generate-skill.py" \
        --api-patterns "$OUTPUT_DIR/analysis/api-patterns.yaml" \
        --visual-analysis "$OUTPUT_DIR/analysis/visual-analysis.json" \
        --name "$NAME-api" \
        --description "$DOMAIN 网站自动化操作指南" \
        --output "$OUTPUT_DIR/knowledge/SKILL.md" 2>/dev/null || {
        log_warn "Skill 生成失败，创建默认文档"
        cat > "$OUTPUT_DIR/knowledge/SKILL.md" << EOF
---
name: $NAME-api
description: $DOMAIN 网站自动化操作指南
version: 1.0
---

# $NAME API

## 概述

本文档由自动化分析工具生成。

## 分析文件

- API 模式: analysis/api-patterns.yaml
- 视觉分析: analysis/visual-analysis.json
- 合并分析: analysis/merged-analysis.json

EOF
    }

    # 3.2 生成测试用例
    log_info "生成测试用例..."

    python "$SKILLS_DIR/knowledge-generator/tools/generate-skill.py" \
        --api-patterns "$OUTPUT_DIR/analysis/api-patterns.yaml" \
        --generate-tests \
        --output "$OUTPUT_DIR/knowledge/tests.py" 2>/dev/null || true

    # 3.3 生成 API 客户端
    log_info "生成 API 客户端..."

    python "$SKILLS_DIR/knowledge-generator/tools/generate-skill.py" \
        --api-patterns "$OUTPUT_DIR/analysis/api-patterns.yaml" \
        --generate-client \
        --language python \
        --output "$OUTPUT_DIR/knowledge/client.py" 2>/dev/null || true

    # 3.4 生成报告
    python "$SKILLS_DIR/knowledge-generator/tools/merge-analysis.py" \
        --api "$OUTPUT_DIR/analysis/api-patterns.yaml" \
        --visual "$OUTPUT_DIR/analysis/visual-analysis.json" \
        --output "$OUTPUT_DIR/knowledge/report.md" \
        --format report 2>/dev/null || true

    log_success "知识生成完成"
}

# ============================================================
# 主流程
# ============================================================
main() {
    log_info "开始分析: $URL"

    START_TIME=$(date +%s)

    case $PHASE in
        capture)
            phase_capture
            ;;
        analyze)
            phase_analyze
            ;;
        generate)
            phase_generate
            ;;
        all)
            phase_capture
            phase_analyze
            phase_generate
            ;;
        *)
            log_error "未知阶段: $PHASE"
            usage
            ;;
    esac

    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))

    log_success "分析完成! 耗时: ${DURATION}s"
    log_info "输出目录: $OUTPUT_DIR"
    log_info "主要文件:"
    echo "  - Skill 文档: $OUTPUT_DIR/knowledge/SKILL.md"
    echo "  - 分析报告: $OUTPUT_DIR/knowledge/report.md"
    echo "  - API 模式: $OUTPUT_DIR/analysis/api-patterns.yaml"
    echo "  - 视觉分析: $OUTPUT_DIR/analysis/visual-analysis.json"

    # 清理
    browser-use close --all 2>/dev/null || true
}

main