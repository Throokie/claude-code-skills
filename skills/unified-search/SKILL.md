---
name: unified-search
description: 统一搜索工具，整合 curl、google-search、web-search、git、exa、GitHub CLI 等多种搜索工具，支持并行搜索和结果整合。当用户需要"快速搜索"、"统一搜索"、"多源搜索"、"并行搜索"、"搜索GitHub"时自动触发。
version: 1.2.0
created: 2026-03-23
updated: 2026-03-23
---

# Unified Search - 统一搜索工具

> **版本**: v1.2.0
> **用途**: 整合多种搜索工具，支持并行搜索和结果整合
> **工具源**: google-search, web-search, curl, git, exa, GitHub CLI

---

## 📋 概述

本 Skill 整合你环境中的多种搜索工具，提供统一的搜索接口：

1. **Google 搜索** (`google-search`) - 通过 Serper API 搜索 Google
2. **DuckDuckGo 搜索** (`web-search`) - 通过 ddgs 搜索 DuckDuckGo
3. **GitHub CLI** (`gh`) - 搜索 GitHub Issues 和 PRs
4. **Git 搜索** (`git`) - 搜索 Git 历史、分支、标签
5. **文件搜索** (`exa`/`find`) - 搜索本地文件系统
6. **HTTP 请求** (`curl`) - 直接 API 调用

---

## 🚀 快速开始

### 基础用法

```bash
# 统一搜索（使用所有可用源）
unified-search "搜索关键词"

# 指定搜索源
unified-search "关键词" --sources google,web
unified-search "关键词" --sources git
unified-search "关键词" --sources gh        # GitHub CLI 搜索
unified-search "关键词" --sources curl      # HTTP 请求

# 指定结果数量
unified-search "关键词" --count 10

# 并行模式（最快）
unified-search "关键词" --parallel

# 保存结果到文件
unified-search "关键词" --output result.md

# GitHub 仓库特定搜索
unified-search "bug" --sources gh --gh-repo "owner/repo"

# curl 自定义 URL
unified-search "query" --sources curl --curl-url "https://api.example.com/search?q={query}"
```

### Claude Code 自动触发

| 用户输入 | 自动调用 |
|----------|----------|
| "快速搜索" | unified-search |
| "统一搜索" | unified-search |
| "多源搜索" | unified-search --parallel |
| "并行搜索" | unified-search --parallel |
| "帮我查一下" | unified-search |
| "搜索GitHub" | unified-search --sources gh |
| "找GitHub issues" | unified-search --sources gh |

---

## 📊 状态输出格式

搜索时会显示实时状态：

```
📋 搜索计划:
⏳ Google Search | 状态: 等待中
⏳ DuckDuckGo Search | 状态: 等待中
⏳ GitHub CLI   | 状态: 等待中

📡 Google Search | 状态: 请求中
📡 DuckDuckGo Search | 状态: 请求中
📡 GitHub CLI   | 状态: 请求中
✅ Google Search | 状态: 正常     | 结果数: 9 | 耗时: 1236ms
✅ DuckDuckGo Search | 状态: 正常     | 结果数: 9 | 耗时: 3603ms
✅ GitHub CLI   | 状态: 正常     | 结果数: 3 | 耗时: 1777ms
```

### 状态说明

| 状态图标 | 含义 |
|----------|------|
| ⏳ | 等待中 |
| 📡 | 请求中 |
| ✅ | 正常完成 |
| ❌ | 异常/错误 |
| ⚠️ | 警告 |

---

## 💾 自动保存到 /tmp

**所有搜索结果都会自动保存到 `/tmp` 目录**，方便后续查看：

- 格式：`/tmp/unified-search-results-{timestamp}.{ext}`
- 时间戳使用 ISO 8601 格式
- 扩展名根据 `--format` 参数自动确定：
  - `terminal` → `.md` (Markdown)
  - `markdown` → `.markdown`
  - `json` → `.json`

```bash
# 查看最新保存的结果
ls -lt /tmp/unified-search-results-* | head -5
```