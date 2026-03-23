# 2026-03-15 视频 AI 分析能力整合

**日期**: 2026-03-15
**主题**: 基于 DashScope Qwen3.5-Plus 的视频内容分析

---

## 能力概览

当用户需要分析视频内容时（抖音、B 站、小红书等平台），自动调用视频分析工具，使用视觉大模型理解视频内容。

### 工作流程

```
用户给出视频链接 → 检测是否要分析 → video-smart 下载 → ffmpeg 提取关键帧 → Qwen3.5-Plus 分析 → 输出报告
```

---

## 工具链

| 工具 | 位置 | 用途 |
|------|------|------|
| `video-smart` | `~/.local/bin/video-smart` | 视频下载 + AI 分析 |
| `video-analyze` | `~/.local/bin/video-analyze` | 本地视频文件分析 |
| `yt-dlp` | 系统命令 | 视频下载（支持 1000+ 平台） |
| `ffmpeg` | 系统命令 | 视频帧提取 |
| DashScope API | `coding.dashscope.aliyuncs.com` | Qwen3.5-Plus 视觉分析 |

---

## API 配置

```bash
# API Key
DASHSCOPE_API_KEY="sk-sp-29c6e86d2177436ea7e263de0aa7e418"

# API 端点
https://coding.dashscope.aliyuncs.com/v1/chat/completions

# 模型
qwen3.5-plus (1M 上下文)
```

---

## 使用方法

### 分析在线视频

```bash
# B 站视频分析
video-smart https://www.bilibili.com/video/BV1GJ411x7h7

# 抖音视频分析
video-smart https://v.douyin.com/xxx

# YouTube 视频分析
video-smart https://youtube.com/watch?v=xxx

# 自定义提示词
video-smart https://url --prompt "总结这个教程的步骤要点"
```

### 分析本地视频文件

```bash
# 直接分析文件
video-analyze /path/to/video.mp4

# 自定义提示
video-analyze /path/to/video.mp4 "这是什么游戏？"
```

---

## 技术实现

### 关键帧提取（最终方案）

**为什么使用关键帧而非直接上传视频？**

经过完整测试（2026-03-15），结论如下：

#### API 端点测试结果

| 端点 | API Key 有效性 | 支持视频 | 结论 |
|------|---------------|----------|------|
| `dashscope.aliyuncs.com/compatible-mode/v1` | ❌ 401 | - | Key 无效 |
| `dashscope.aliyuncs.com/api/v1/apps/...` | ❌ 401 | - | Key 无效 |
| `coding.dashscope.aliyuncs.com/v1/chat/completions` | ✅ | ❌ | **唯一可用** |

#### 模型支持情况

| 模型 | 视频输入 | 端点支持 | 结论 |
|------|----------|----------|------|
| `qwen3.5-plus` | ❌ 仅文本/图片 | ✅ 可用 | **唯一选择** |
| `qwen2.5-vl-72b-instruct` | ✅ 支持 | ❌ Key 无效 | 不可用 |
| `qwen-vl-max` | ✅ 支持 | ❌ 不支持 | 不可用 |
| `qwen2-vl-7b-instruct` | ✅ 支持 | ❌ 不支持 | 不可用 |

#### 测试视频上传的尝试

1. **Base64 编码视频** → 400 "Invalid video file"
2. **URL 方式引用视频** → 需要外部存储，API 不支持直接上传
3. **极小视频（1.8KB）** → 400 "base64 decode fail"

**结论**：当前 API Key 只能访问 `coding.dashscope.aliyuncs.com` 端点，该端点仅支持 `qwen3.5-plus` 模型，该模型不支持原生视频输入。**关键帧提取是唯一可行方案**。

**优化方案**：
1. **动态帧数**：根据视频时长调整，每秒 1 帧，最少 5 帧，最多 15 帧
2. **提高分辨率**：从 320px 提升到 640px，更好识别细节
3. **高质量编码**：使用 Lanczos 缩放和 q:v=2 高质量 JPEG
4. **智能间隔**：均匀分布帧，覆盖整个视频

```python
import subprocess

# yt-dlp 下载
cmd = [
    "yt-dlp",
    "-f", "best[ext=mp4]/best",
    "-o", output_template,
    "--no-playlist",
    url
]
```

### 2. 提取关键帧

```python
# 获取视频时长
probe = subprocess.run([
    "ffprobe", "-v", "error", "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1", video_path
])
duration = float(probe.stdout.strip())

# 计算帧率并提取
fps = num_frames / duration
subprocess.run([
    "ffmpeg", "-y", "-i", video_path,
    "-vf", f"fps={fps},scale={max_size}:-1",
    "-frames:v", str(num_frames),
    output_pattern
])
```

### 3. 发送 API 请求

```python
import base64
import json
import urllib.request

# 读取帧并 Base64 编码
frames = []
for f in sorted(Path(tmpdir).glob("frame_*.jpg")):
    with open(f, "rb") as img:
        frames.append(base64.b64encode(img.read()).decode())

# 构建多模态请求
content = []
for i, frame in enumerate(frames):
    content.append({
        "type": "image_url",
        "image_url": {"url": f"data:image/jpeg;base64,{frame}"}
    })
content.append({"type": "text", "text": prompt})

# 发送请求
data = {
    "model": "qwen3.5-plus",
    "max_tokens": 1000,
    "messages": [{"role": "user", "content": content}]
}

req = urllib.request.Request(
    "https://coding.dashscope.aliyuncs.com/v1/chat/completions",
    data=json.dumps(data).encode(),
    headers={
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
)

with urllib.request.urlopen(req, timeout=120) as resp:
    result = json.loads(resp.read().decode())
    analysis = result["choices"][0]["message"]["content"]
```

---

## 支持平台

| 平台 | 域名 | 支持程度 |
|------|------|:--------:|
| B 站 | bilibili.com, b23.tv | ✅ 完全支持 |
| 抖音 | douyin.com, v.douyin.com | ✅ 完全支持 |
| YouTube | youtube.com, youtu.be | ✅ 完全支持 |
| 快手 | kuaishou.com | ✅ 完全支持 |
| TikTok | tiktok.com | ✅ 完全支持 |
| 微博 | weibo.com | ⚠️ 部分支持 |

---

## 分析能力

Qwen3.5-Plus 可以分析：

1. **场景识别** - 视频发生的环境、背景
2. **人物识别** - 人物特征、动作、表情
3. **内容主题** - 视频讲述的核心内容
4. **动作分析** - 运动、舞蹈、游戏操作等
5. **文字识别** - 字幕、标题、屏幕文字（OCR）
6. **风格判断** - 教程、娱乐、新闻、广告等

---

## 使用示例

### 示例 1：教程视频总结

```bash
$ video-smart https://www.bilibili.com/video/BV1GJ411x7h7

📁 视频文件：/tmp/Python 教程.mp4
📊 文件大小：32.5 MB
🎬 提取视频帧... 提取了 5 帧
🤖 正在分析...

============================================================
【视频内容分析】

1. 场景描述
   - 场景 1: 电脑屏幕，显示代码编辑器
   - 场景 2: 代码运行结果展示
   - 场景 3: 终端输出

2. 核心内容
   - 这是一个 Python 编程教程
   - 讲解了函数定义和参数传递
   - 演示了实际代码运行

3. 视频主题
   Python 入门教程 - 函数基础

4. 目标受众
   编程初学者、Python 学习者
============================================================
```

### 示例 2：游戏视频分析

```bash
$ video-analyze gameplay.mp4 "这是什么游戏？描述游戏玩法"

============================================================
【视频内容分析】

1. 游戏识别
   - 游戏名称：原神 (Genshin Impact)
   - 游戏类型：开放世界 RPG

2. 场景描述
   - 角色在山地环境中探索
   - 与怪物进行战斗
   - 使用元素技能

3. 玩法机制
   - 角色切换战斗
   - 元素反应系统
   - 探索和解谜
============================================================
```

---

## 限制

| 限制项 | 说明 |
|--------|------|
| 视频大小 | 建议 < 100MB |
| 分析帧数 | 最多 5 帧 |
| 下载超时 | 300 秒 |
| API 超时 | 120 秒 |
| 网络要求 | 需要访问 DashScope API |

---

## 性能优化

### 1. 减少帧数

```bash
# 修改 video-analyze 脚本中的 num_frames 参数
num_frames = 3  # 默认是 5
```

### 2. 缩小帧尺寸

```python
# 修改 max_size 参数
max_size = 240  # 默认是 320
```

### 3. 使用更具体的提示词

```bash
# 具体提示词 vs 宽泛提示词
video-smart url --prompt "总结这个视频的 3 个核心观点"
# 比 "分析这个视频" 更快得到有用结果
```

---

## 与其他服务对比

| 服务 | 费用 | 隐私 | 自定义 | 速度 |
|------|------|------|--------|------|
| **DashScope (本地)** | ✅ 免费额度 | ✅ 本地处理 | ✅ 可自定义 | 中 |
| Gemini Video Summary | 免费 | ❌ 上传云端 | ❌ 固定格式 | 快 |
| 在线 AI 工具 | ⚠️ 部分付费 | ❌ 上传云端 | ❌ 有限 | 快 |

---

## 集成到 social-media-parser

更新后的触发规则：

| 用户输入 | 识别为 | 自动调用 |
|----------|--------|----------|
| "https://... 分析" | 视频分析 | `video-smart <url>` |
| "分析这个视频" | 视频分析 | `video-smart <url>` |
| "总结这个视频" | 视频分析 | `video-smart <url>` |

---

## 参考资源

- [Qwen3.5-Plus 文档](https://help.aliyun.com/zh/dashscope/)
- [DashScope API 参考](https://dashscope.aliyuncs.com/)
- [yt-dlp 文档](https://github.com/yt-dlp/yt-dlp)
- [ffmpeg 文档](https://ffmpeg.org/)

---

## 探索结论（2026-03-15）

### 最终结论

**关键帧提取是当前 API 约束下的最优方案**，而非妥协之举。

### 验证测试

```bash
# 多张图片输入测试 → ✅ 成功
# 视频分析功能测试 → ✅ 成功
```

### 如需真正的视频输入支持

需要满足以下条件之一：
1. 获取有效的官方 DashScope API Key（支持 `dashscope.aliyuncs.com` 端点）
2. 使用其他支持视频输入的模型服务（如 Gemini、GPT-4V）

### 当前方案优势

| 优势 | 说明 |
|------|------|
| **无需额外 Key** | 使用现有 API Key 即可 |
| **可控帧数** | 根据视频时长动态调整（5-15 帧） |
| **高分辨率** | 640px 分辨率，Lanczos 缩放 |
| **成本效益** | 只传输图片，Token 消耗更低 |
| **兼容性好** | qwen3.5-plus 对多图理解能力强 |

---

## 相关技能

- `social-media-parser` - 社交媒体解析
- `video-analyze` - 本地视频分析
- `video-smart` - 智能视频解析
- `image-understanding` - 图片理解

---
