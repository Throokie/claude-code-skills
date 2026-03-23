<div align="center">

# 🤖 Claude Code 技能與代理

[![GitHub stars](https://img.shields.io/github/stars/Throokie/claude-code-skills?style=social)](https://github.com/Throokie/claude-code-skills/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/Throokie/claude-code-skills?style=social)](https://github.com/Throokie/claude-code-skills/network/members)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**生產級 Claude Code 擴展，助力規模化軟體開發**

[English](README.md) • [简体中文](README.zh-CN.md) • [繁體中文](README.zh-TW.md)

[安裝](#安裝) • [快速開始](#快速開始) • [工作流程](#推薦工作流程) • [技能](#可用技能) • [代理](#可用代理)

</div>

---

## ✨ 這是什麼？

精心策劃的 **37 個技能** 和 **9 個代理**，將 Claude Code 轉變為專業軟體開發利器。專為希望藉助 AI 輔助工作流程快速交付的團隊打造。

> "從想法到產品，只需 Claude Code"

---

## 🚀 安裝

```bash
# 克隆到 Claude Code 技能目錄
git clone https://github.com/Throokie/claude-code-skills.git ~/.claude/skills-repo

# 複製技能和代理到 Claude 配置
cp -r ~/.claude/skills-repo/skills/* ~/.claude/skills/
cp -r ~/.claude/skills-repo/agents/* ~/.claude/agents/
```

---

## ⚡ 快速開始

### 一鍵魔法

| 觸發詞 | 功能 |
|--------|------|
| `decision-record` | 捕獲需求並系統化演進 |
| `/requirement-to-prd` | 將想法轉化為生產級 PRD |
| `prd-to-code` | 從規格生成全端實現 |
| `th-enterprise-test-agent` | 企業級自動化測試 |
| `th-bug-analyzer` | 影響分析和修復建議 |

---

## 🎯 推薦工作流程

**Ralph Evolution** 方法論，使用 Claude Code 構建軟體：

```
┌─────────────────────────────────────────────────────────────────┐
│                    RALPH EVOLUTION 工作流程                      │
└─────────────────────────────────────────────────────────────────┘

    💡 想法
     │
     ▼
    ┌─────────────────────┐
    │ decision-record     │  捕獲與演進需求
    │ + 你的痛點          │  疊代直到清晰
    └─────────────────────┘
     │
     ▼
    ┌─────────────────────┐
    │ /requirement-to-prd │  生成結構化 PRD
    └─────────────────────┘
     │
     ▼
    ┌─────────────────────┐
    │ prd-to-code         │  多代理代碼生成
    │ + th-deep-coder2    │  可選：深度代碼分析
    │ + th-deep-coder     │  可選：模型聚合
    └─────────────────────┘
     │
     ▼
    ┌─────────────────────┐
    │ th-enterprise-test  │  商業級測試
    │ + playwright-cli    │  瀏覽器自動化
    │ + puppeteer-cli     │  替代瀏覽器測試
    └─────────────────────┘
     │
     ▼
    ┌─────────────────────┐
    │ th-bug-analyzer     │  修復剩餘問題
    └─────────────────────┘
     │
     ▼
    🎉 生產環境

   🔁 循環：任意組合，持續疊代
   💪 結果：低端模型也能跑出不错的成绩
```

---

## 📦 可用技能

### 核心開發

| 技能 | 觸發詞 | 用途 |
|------|--------|------|
| **decision-record** | `記錄決策`, `需求演進` | 決策追蹤與需求演進 |
| **requirement-to-prd** | `生成PRD`, `需求轉PRD` | 需求轉 PRD |
| **prd-to-code** | `PRD轉代碼`, `根據PRD開發` | 從 PRD 生成代碼 |
| **prd-evolution** | `更新PRD`, `PRD版本管理` | PRD 版本管理 |
| **code-review** | `代碼審查`, `review代碼` | 系統化代碼審查 |

### 測試與品質

| 技能 | 觸發詞 | 用途 |
|------|--------|------|
| **th-enterprise-test-agent** | `發布測試`, `E2E測試` | 企業級測試 |
| **th-bug-analyzer** | `分析bug影響` | Bug 影響分析 |
| **playwright-cli** | `瀏覽器測試` | 瀏覽器自動化 |
| **puppeteer-cli** | `網頁截圖` | 網頁抓取與測試 |

### 代理與編排

| 技能 | 觸發詞 | 用途 |
|------|--------|------|
| **agent-factory** | `創建團隊`, `多代理` | 動態代理生成 |
| **orchestrator** | `多代理協作` | 多代理編排 |
| **long-running-agent** | `長任務`, `複雜項目` | 長週期任務 |

### 研究與分析

| 技能 | 觸發詞 | 用途 |
|------|--------|------|
| **th-deep-coder** | `深度代碼分析` | 多模型代碼分析 |
| **th-deep-coder2** | `深度代碼研究` | 代理工廠 + 分析 |
| **th-gitnexus-assistant** | `gitnexus`, `代碼分析` | 代碼知識圖譜 |
| **unified-search** | `統一搜索` | 多源搜索 |
| **site-analyzer** | `分析網站` | 網站深度分析 |
| **web-fetch** | `抓取網頁` | 網頁抓取 |

### 生產力

| 技能 | 觸發詞 | 用途 |
|------|--------|------|
| **article-writing** | `文章寫作` | 長文寫作 |
| **long-doc-generator** | `生成文檔` | 文檔生成 |
| **decision-record** | `決策記錄` | 決策追蹤 |
| **knowledge-hub** | `記錄`, `學習` | 知識管理 |

### 集成

| 技能 | 觸發詞 | 用途 |
|------|--------|------|
| **github** | `GitHub`, `gh命令` | GitHub CLI 集成 |
| **newapi-cli** | `newapi`, `調用模型` | NewAPI 模型調用 |
| **browser-use** | `打開網頁` | 瀏覽器自動化 |
| **arch-linux** | `Arch Linux` | Arch 系統工具 |

### 模型與提示詞

| 技能 | 觸發詞 | 用途 |
|------|--------|------|
| **model-compare-search** | `多模型搜索` | 多模型對比 |
| **prompt-expert** | `prompt專家` | 提示詞優化 |
| **prompt-optimizer** | `優化prompt` | 提示詞增強 |

---

## 🤖 可用代理

| 代理 | 用途 |
|------|------|
| **agent-factory** | 動態代理生成（母體模式） |
| **css-architect** | CSS 架構專家 |
| **frontend-tester** | 前端測試專家 |
| **th-bug-analyzer** | Bug 影響範圍分析器 |
| **ui-designer** | UI 設計專家 |
| **ux-researcher** | UX 研究專家 |

---

## 🔥 為什麼有效

> **"低端模型也能跑出不错的成绩"**

秘訣在於**組合**：

1. **多技能編排** - 每個技能專注做好一件事
2. **持續反饋循環** - 疊代直到品質達標
3. **每一步自動化** - 從需求到測試
4. **代理專業化** - 為特定任務構建的專用代理

---

## 📚 文檔

- [SKILL.md](docs/SKILL.md) - 技能開發指南
- [AGENT.md](docs/AGENT.md) - 代理創建指南
- [WORKFLOW.md](docs/WORKFLOW.md) - 詳細工作流程文檔

---

## 🤝 貢獻

歡迎 PR！查看 [CONTRIBUTING.md](CONTRIBUTING.md) 了解指南。

---

## 📄 許可證

MIT 許可證 - 查看 [LICENSE](LICENSE) 了解詳情。

---

<div align="center">

**用 ❤️ 為 Claude Code 社區製作**

[⭐ 給倉庫點贊](https://github.com/Throokie/claude-code-skills) • [🍴 Fork 倉庫](https://github.com/Throokie/claude-code-skills/fork) • [📖 文檔](https://github.com/Throokie/claude-code-skills/wiki)

</div>
