# 2026-03-15 视频理解方案对比

**日期**: 2026-03-15
**主题**: 本地部署 vs 云端 API 视频理解方案

---

## 方案总览

| 方案 | 类型 | 成本 | 部署难度 | 推荐度 |
|------|------|------|----------|--------|
| **SiliconFlow** | 云端 API | $0.05/1M tokens | ⭐ 无需部署 | ⭐⭐⭐⭐ |
| **OpenRouter** | 云端 API | $0.20/1M tokens | ⭐ 无需部署 | ⭐⭐⭐⭐ |
| **当前关键帧** | 云端 API | 免费额度内 | ⭐ 无需部署 | ⭐⭐⭐ |
| **Ollama 本地** | 本地部署 | 硬件成本 | ⭐⭐ 简单 | ⭐⭐⭐⭐ |
| **vLLM 本地** | 本地部署 | 硬件成本 | ⭐⭐⭐ 中等 | ⭐⭐⭐ |

---

## 方案一：SiliconFlow（性价比最高）

### API 配置

```bash
API 端点：https://api.siliconflow.cn/v1/chat/completions
API Key: sk-ntavgeclkhgxcrksgpmoyytartwuwunxkbtahqsokpsfjscq
```

### 可用模型

| 模型 | 价格 | 上下文 | 视频支持 |
|------|------|--------|----------|
| Qwen2.5-VL-32B-Instruct | $0.05/1M tokens | 32K | ✅ 图片 |
| Qwen3-VL-8B-Instruct | $0.05/1M tokens | 32K | ✅ 图片 |
| Qwen3-VL-30B-A3B-Instruct | $0.18/1M tokens | 32K | ✅ 图片 |
| Qwen3-VL-235B-A22B-Instruct | $1.28/1M tokens | 32K | ✅ 图片 |

### 测试结果（2026-03-15）

| 测试项 | 结果 |
|--------|------|
| API 连通性 | ✅ 正常 |
| 图片理解 | ✅ 正常 |
| 原生视频上传 | ❌ 不支持（返回 50507 错误） |
| 关键帧方案 | ✅ 可用 |

### 使用方法

```bash
# 设置环境变量
export SILICONFLOW_API_KEY="sk-ntavgeclkhgxcrksgpmoyytartwuwunxkbtahqsokpsfjscq"

# 使用视频分析工具
video-analyze-siliconflow /path/to/video.mp4 "描述这个视频"
```

### 成本估算

假设分析一个 5 分钟视频：
- 提取 10 帧 @ 640x480 ≈ 50K tokens/帧
- 总输入：500K tokens
- 成本：500K × $0.05/1M = **$0.025** (约 ¥0.18)

---

## 方案二：OpenRouter

### API 配置

```bash
API 端点：https://openrouter.ai/api/v1/chat/completions
```

### 可用模型

| 模型 | 价格 | 上下文 |
|------|------|--------|
| Qwen2.5-VL-72B-Instruct | $0.80/1M tokens | 32K |
| Qwen2.5-VL-3B-Instruct | $0.20/1M tokens | 64K |

### 优势

- 模型选择更多
- 支持 fallback 机制
- 统一的 API 格式

---

## 方案三：Ollama 本地部署

### 硬件要求

| 模型 | VRAM | 推荐配置 |
|------|------|----------|
| Qwen2.5-VL-7B | 8GB | 单卡 RTX 3060 |
| Qwen2.5-VL-32B | 24GB | 单卡 RTX 3090/4090 |
| Qwen2.5-VL-72B | 48GB+ | 双卡 RTX 3090 |

### 部署命令

```bash
# 安装 Ollama
curl -fsSL https://ollama.com/install.sh | sh

# 拉取模型
ollama pull qwen2.5-vl:7b

# 启动服务
ollama serve

# API 调用
curl http://localhost:11434/api/chat -d '{
  "model": "qwen2.5-vl:7b",
  "messages": [{"role": "user", "content": "描述这张图片", "images": ["base64..."]}]
}'
```

### 成本分析

- **一次性投入**：约 ¥2000-5000（GPU）
- **运行成本**：电费
- **优势**：隐私性好，长期免费

---

## 方案四：vLLM 本地部署

### 部署命令

```bash
# Docker 部署
docker run --gpus all \
  -p 8000:8000 \
  vllm/vllm-openai:latest \
  --model Qwen/Qwen2.5-VL-7B-Instruct \
  --trust-remote-code

# API 调用（OpenAI 兼容格式）
curl http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "Qwen/Qwen2.5-VL-7B-Instruct",
    "messages": [...]
  }'
```

### 优势

- 高吞吐量
- 支持并发
- 生产级部署

---

## 方案对比总结

### 性价比排名

| 排名 | 方案 | 适用场景 |
|------|------|----------|
| 1 | **SiliconFlow** | 个人/小批量使用，追求性价比 |
| 2 | **Ollama 本地** | 大量使用，有 GPU 硬件 |
| 3 | **OpenRouter** | 需要多种模型选择 |
| 4 | **vLLM 本地** | 企业级部署，高并发 |
| 5 | **当前关键帧** | 已有免费额度 |

### 推荐决策流程

```
有 GPU 硬件？
├─ 是 → Ollama 本地部署（长期最便宜）
└─ 否 → 云端 API
    ├─ 追求性价比 → SiliconFlow
    ├─ 需要大模型 → OpenRouter (Qwen2.5-VL-72B)
    └─ 已有免费额度 → 当前关键帧方案
```

---

## 已创建工具

| 工具 | 位置 | 用途 |
|------|------|------|
| `video-analyze` | `~/.local/bin/video-analyze` | DashScope 关键帧分析 |
| `video-smart` | `~/.local/bin/video-smart` | 下载视频 + 关键帧分析 |
| `video-analyze-siliconflow` | `~/.local/bin/video-analyze-siliconflow` | SiliconFlow API 分析 |

---

## 下一步

1. [ ] 配置 SiliconFlow 自动充值（如需要）
2. [ ] 测试实际视频分析效果
3. [ ] 评估本地部署的可行性（如有 GPU）

---

## 参考资源

- [SiliconFlow 官网](https://cloud.siliconflow.cn)
- [OpenRouter](https://openrouter.ai)
- [Ollama 文档](https://ollama.com)
- [vLLM 文档](https://docs.vllm.ai)

---
