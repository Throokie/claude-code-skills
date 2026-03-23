# Model Compare Search - 模型对比搜索聚合器

> 版本：v1.0.0 | 创建日期：2026-03-19

## 📖 简介

这是一个**模型对比搜索聚合器**，能够：

1. **智能路由** - 根据任务类型自动路由到不同的模型组
2. **并行请求** - 同时调用多个模型获取不同视角的回答
3. **Kimi 整合** - 使用 Kimi thinking 模式处理超长文本，提取和总结
4. **结构化输出** - 返回对比分析和综合结论

## 🚀 快速开始

### 1. 配置环境变量

LiteLLM 默认配置（与你的 LiteLLM 项目一致）：
```bash
# 默认值，无需设置（已内置）
# LITELLM_BASE_URL="http://localhost:4000/v1"
# LITELLM_API_KEY="sk-nU0if2LBfUPb8BQMQLYlDE6G86DA"

# kimi-cli 使用 OAuth 认证，无需 API Key
# 确保 kimi-cli 已安装并可执行
```

### 2. 运行测试

```bash
cd ~/src/projects/tools/user-scripts/skills/model-compare-search

# 测试运行
node scripts/search.mjs "Python asyncio 和 threading 的区别" --type code
```

### 3. 配置自动触发（可选）

在 `~/.claude/config.json` 中添加：

```json
{
  "_auto_trigger": {
    "model-compare-search": ["对比模型", "模型 PK", "多模型测试", "搜索并总结"]
  }
}
```

## 📁 目录结构

```
model-compare-search/
├── SKILL.md              # 技能主文档
├── README.md             # 本文件
├── scripts/
│   ├── search.mjs        # 主入口脚本
│   ├── classify.mjs      # 任务分类器
│   ├── parallel.mjs      # 并行请求引擎
│   └── kimi-integrate.mjs # Kimi 整合器
├── config/
│   ├── model-routes.json # 模型路由配置
│   └── prompts.md        # 提示词模板
└── output/
    └── results/          # 输出结果
```

## 📊 模型路由

| 任务类型 | 模型组 | 用途 |
|----------|--------|------|
| search | gemini-2-5-pro, GLM-5, DeepSeek-V3 | 信息搜索 |
| code | Qwen3-Coder-480B, glm-5-modal | 代码生成 |
| reasoning | DeepSeek-R1, DeepSeek-R1-0528 | 复杂推理 |
| general | glm-5-modal, qwen3.5-plus, MiniMax-M2.5 | 通用问答 |

## 🔧 用法

### 基础命令

```bash
# 基本用法
node scripts/search.mjs "你的问题"

# 指定任务类型
node scripts/search.mjs "你的问题" --type search|code|reasoning|general

# 指定输出模式
node scripts/search.mjs "你的问题" --output summary|compare|full
```

### 输出模式

- `summary`: 只返回 Kimi 整合后的总结（默认）
- `compare`: 总结 + 各模型原始回答
- `full`: 完整日志 + 所有原始回答 + 错误信息

### 📤 输出格式

#### 运行时实时输出

```
🚀 Model Compare Search 启动
📝 查询："你的问题"
📊 任务类型：search
📡 模型组：信息搜索类任务 - 最大化模型多样性
📡 请求模型：qwen3.5-plus-aliyun, kimi-k2.5-aliyun, ...

📡 正在并行请求 18 个模型...
🔧 并发限制：全局=10, siliconflow=2

✅ qwen3.5-plus-aliyun: 成功响应 (1234ms, 2048 tokens, 1536 字)
✅ kimi-k2.5-aliyun: 成功响应 (2345ms, 3072 tokens, 2304 字)
✅ glm-5-aliyun: 成功响应 (1567ms, 1536 tokens, 1024 字)
...

✅ 成功：15, ❌ 失败：3

🧠 正在使用 Kimi thinking 模式整合结果...
✅ Kimi 整合完成 (45678ms, 0 tokens)

============================================================
[最终输出内容]
```

#### 输出内容说明

| 输出项 | 说明 |
|--------|------|
| `✅ 成功响应` | 每个模型请求成功后实时显示 |
| `响应时间` | 从请求开始到收到响应的毫秒数 |
| `tokens` | 模型返回的 token 数量 |
| `字` | 返回内容的中文字符数（估算） |
| `成功/失败统计` | 所有请求完成后的汇总统计 |

## 📝 示例

### 信息搜索

```bash
node scripts/search.mjs "2026 年最新 AI 大模型进展" --type search
```

### 代码调试

```bash
node scripts/search.mjs "React useEffect 依赖数组为空和不写的区别" --type code --output compare
```

### 问题分析

```bash
node scripts/search.mjs "为什么我的 LiteLLM fallback 策略没有生效？" --type reasoning --output full
```

## ⚙️ 配置

编辑 `config/model-routes.json` 自定义模型路由。

**默认配置**：
- LiteLLM: `http://localhost:4000/v1` (自动从你的 LiteLLM 项目读取)
- Kimi: 使用 `kimi-cli` 命令 (OAuth 认证)

## 🔗 相关文档

- [SKILL.md](./SKILL.md) - 技能完整文档
- [config/prompts.md](./config/prompts.md) - 提示词模板
- [config/model-routes.json](./config/model-routes.json) - 模型路由配置

## 📄 许可证

MIT
