---
name: th-model-compare-search
description: 多模型对比搜索 - 自动从NewAPI获取可用模型，并行调用多模型获取综合答案。触发词：多模型搜索、模型对比、问问多个AI、综合一下、帮我搜索。
---

# Model Compare Search - 多模型对比搜索

> **版本**: v6.0 (简化版) | **核心**: 自动获取模型 → 智能选择 → 并行搜索 → Kimi总结

---

## 🎯 何时使用

- 需要多视角信息验证
- 对比不同AI模型的观点
- 获取更全面的答案
- 验证信息一致性

---

## ✨ 核心特性

### 自动模型管理

**无需配置模型列表**，自动完成：

1. **动态获取** - 从 NewAPI 实时获取可用模型
2. **智能过滤** - 自动排除小模型 (<14B)
3. **能力排序** - 优先选择大模型、Pro版本、推理模型
4. **失败回退** - 模型失败时自动尝试替代

### 极简用法

```bash
# 一句话启动搜索
~/.claude/skills/model-compare-search/scripts/search.mjs "你的问题"
```

---

## 🚀 使用方法

### 方式 1: 直接调用（推荐）

```bash
# 基本搜索
~/.claude/skills/model-compare-search/scripts/search.mjs "什么是优秀的API设计原则"

# 禁用Kimi总结（更快）
~/.claude/skills/model-compare-search/scripts/search.mjs "你的问题" --no-kimi
```

### 方式 2: Claude Code 自动触发

说出以下关键词自动执行：

| 触发词 | 示例 |
|--------|------|
| "多模型搜索" | "多模型搜索什么是微服务" |
| "问问多个AI" | "问问多个AI关于Docker的看法" |
| "综合一下" | "综合一下各个模型的观点" |
| "模型对比" | "模型对比Kubernetes和Swarm" |

---

## 📊 输出结构

结果自动保存到 `~/.claude/skills/model-compare-search/data/YYYYMMDD-HHMMSS/`：

```
data/2026-03-23-120000/
├── meta.json          # 搜索元数据（成功率、token统计）
├── summary.md         # Kimi综合总结
└── models/            # 各模型结果
    ├── Pro_zai-org_GLM-5/
    │   └── response.md
    ├── Pro_moonshotai_Kimi-K2.5/
    │   └── response.md
    └── ...
```

### 查看历史结果

```bash
# 列出最近搜索
ls -lt ~/.claude/skills/model-compare-search/data/ | head -10

# 查看某次结果
cat ~/.claude/skills/model-compare-search/data/2026-03-23-120000/summary.md

# 查看某模型回答
cat ~/.claude/skills/model-compare-search/data/2026-03-23-120000/models/Pro_zai-org_GLM-5/response.md
```

---

## 🔧 配置

### 环境变量

```bash
# NewAPI 配置（默认已设置）
export NEWAPI_BASE_URL="http://localhost:4000/v1"
export NEWAPI_KEY="your-api-key"
```

---

## 📝 工作流程

```
用户输入
    │
    ▼
[动态获取模型列表] → 过滤小模型 → 排序选择前8个
    │
    ▼
[并行请求] → 4并发 → 失败自动回退
    │
    ▼
[保存结果] → 每个模型独立文件夹
    │
    ▼
[Kimi总结] → 综合各模型观点
    │
    ▼
[显示摘要] → 成功率 + 数据目录
```

---

## ⚠️ 注意事项

1. **响应时间**: 通常 30-120 秒，取决于最慢模型
2. **模型选择**: 自动排除 <14B 小模型，优先选择大模型
3. **失败处理**: 模型失败时自动尝试回退，无需干预
4. **数据保存**: 所有结果持久化，可随时查看历史

---

## 💡 示例

**用户**: "多模型搜索什么是优秀的API设计原则"

**执行**:
```bash
search.mjs "什么是优秀的API设计原则"
```

**输出**:
```
🚀 Model Compare Search v6.0
📝 什么是优秀的API设计原则

📡 获取可用模型...
📊 选择 8 个模型:
   • Pro/deepseek-ai/DeepSeek-R1
   • Pro/zai-org/GLM-5
   • Pro/moonshotai/Kimi-K2.5
   • ...

📡 正在请求 8 个模型...
████████ 8/8

🧠 Kimi 正在整合分析...

╔══════════════════════════════════════╗
║      多模型搜索完成                 ║
╚═════════════════════════════════════════════════════════════╝

📊 结果
   成功率: 8/8
   Tokens: 12456
   耗时: 45678ms

✅ 成功
   • Pro/deepseek-ai/DeepSeek-R1
   • Pro/zai-org/GLM-5
   • ...

📁 数据
   ~/.claude/skills/model-compare-search/data/2026-03-23-120000

📝 总结
   ~/.claude/skills/model-compare-search/data/2026-03-23-120000/summary.md
```

---

*版本: v6.0 (简化版) | 最后更新: 2026-03-23*
