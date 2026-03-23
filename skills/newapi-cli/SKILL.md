---
name: newapi-cli
description: New API CLI 工具 - 当用户需要调用 New API 上的模型、批量调用多个模型、并发测试不同渠道模型时使用。支持列出所有模型、调用单个模型、并发调用多个模型、按供应商/渠道过滤。触发词：newapi、调用模型、批量调用、测试模型、渠道测试、并发调用、模型列表。
---

# New API CLI

> **版本**: v1.0.0
> **核心**: 多渠道模型调用 + 并发测试 + 灵活过滤

---

## 🎯 何时使用

| 场景 | 示例 |
|------|------|
| 查看可用模型 | "newapi 有哪些模型" |
| 调用单个模型 | "用 newapi 调用 gemini" |
| 批量测试模型 | "测试所有 qwen 模型" |
| 渠道对比 | "对比 SiliconFlow 和 NVIDIA 的模型" |
| 并发调用 | "并发调用所有渠道的模型" |
| 过滤查询 | "列出所有 DeepSeek 模型" |

---

## ✨ 核心特性

### 支持渠道

| 渠道 | 说明 |
|------|------|
| SCNet | 中国超算 |
| SiliconFlow | 硅动科技 |
| NVIDIA | 英伟达 |
| CTYUN | 天翼云 |
| DashScope | 阿里云灵积 |
| Gemini | Google |

### 支持供应商

- 阿里巴巴 (Qwen)
- DeepSeek
- 智谱AI (GLM)
- 月之暗面 (Kimi)
- MiniMax
- Google (Gemini)
- Meta (Llama)
- Mistral AI

---

## 🚀 使用方法

### 方式 1：CLI 直接调用

```bash
# 列出所有模型
newapi-cli list

# 按渠道过滤
newapi-cli list -c SiliconFlow

# 按供应商过滤
newapi-cli list -p qwen

# 调用单个模型
newapi-cli call "gemini-2.5-flash" -m "你好"

# 并发调用所有模型
newapi-cli call-all -m "你好" -w 10

# 只调用特定渠道的模型
newapi-cli call-all -m "你好" -c SiliconFlow

# 只调用特定供应商的模型
newapi-cli call-all -m "你好" -p deepseek
```

### 方式 2：Claude Code 自动触发

说出以下关键词，我会自动调用 newapi-cli:

| 触发词 | 行为 |
|--------|------|
| "newapi 模型列表" | 列出所有可用模型 |
| "调用 newapi" | 调用单个模型 |
| "批量调用模型" | 并发调用多个模型 |
| "测试所有模型" | 调用所有模型进行对比 |
| " SiliconFlow 渠道" | 按渠道过滤调用 |
| "测试 deepseek 模型" | 按供应商过滤调用 |

---

## 📊 配置

配置文件: `~/.newapi-cli.yaml`

```yaml
api-key: your-api-key
base-url: http://localhost:4000
verbose: false
```

或使用环境变量:
```bash
export NEWAPI_API_KEY=your-api-key
export NEWAPI_BASE_URL=http://localhost:4000
```

---

## 🔧 命令参考

### list 命令

```bash
newapi-cli list [flags]

Flags:
  -c, --channel string    按渠道过滤
  -p, --provider string   按供应商过滤
  -f, --format string     输出格式 (table/json/yaml/names)
  -g, --group-by string   分组方式 (channel/provider)
```

### call 命令

```bash
newapi-cli call [model] [flags]

Flags:
  -m, --message string    用户消息
  -s, --system string   系统提示词
  -t, --max-tokens int  最大token数 (默认2048)
  -T, --temperature float 温度参数 (默认0.7)
  --stream               流式输出 (默认true)
  --json                 JSON格式输出
```

### call-all 命令

```bash
newapi-cli call-all [flags]

Flags:
  -c, --channel string   按渠道过滤
  -p, --provider string  按供应商过滤
  -w, --workers int      并发worker数 (默认10)
  -t, --timeout int      超时时间秒 (默认60)
  -m, --message string   用户消息
  -s, --system string    系统提示词
  --json                 JSON格式输出
  --save string          保存结果到文件
```

---

## 📝 示例

### 列出模型

```bash
# 表格形式列出所有模型
newapi-cli list

# JSON输出
newapi-cli list -f json

# 只输出模型名
newapi-cli list -f names
```

### 调用模型

```bash
# 简单调用
newapi-cli call "gemini-2.5-flash" -m "你好"

# 带系统提示词
newapi-cli call "gemini-2.5-flash" -m "你好" -s "你是一个助手"

# 调整参数
newapi-cli call "gemini-2.5-flash" -m "你好" -T 0.5 -t 1024

# 从stdin读取
echo "解释Docker" | newapi-cli call "gemini-2.5-flash"
```

### 批量调用

```bash
# 调用所有模型
newapi-cli call-all -m "你好"

# 5个并发
newapi-cli call-all -m "你好" -w 5

# 只调用 SiliconFlow 渠道
newapi-cli call-all -m "你好" -c SiliconFlow

# 只调用 Qwen 模型
newapi-cli call-all -m "你好" -p qwen

# 保存结果
newapi-cli call-all -m "你好" --save results.json
```

---

## 🔗 相关技能

- `model-compare-search`: 多模型对比搜索（8模型并行 + Kimi总结）
- `unified-search`: 统一搜索工具

---

## 📚 源码位置

`/home/throokie/src/production/newapi-cli/`

---

*最后更新: 2026-03-23*
