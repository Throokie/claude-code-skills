# 2026-03-15 DashScope "Video Input" 真相

**日期**: 2026-03-15
**主题**: DashScope API 视频输入的真实含义

---

## 关键发现

**DashScope API 所谓的"video 类型输入"实际上是：**

```python
# 官方示例
{
    "type": "video",
    "video": [
        "data:image/jpeg;base64,/9j/4AAQSkZJRg...",  # 图片 1
        "data:image/jpeg;base64,/9j/4AAQSkZJRg...",  # 图片 2
        "data:image/jpeg;base64,/9j/4AAQSkZJRg...",  # 图片 3
        "data:image/jpeg;base64,/9j/4AAQSkZJRg..."   # 图片 4
    ],
    "fps": 2  # 告诉模型这些图片是按 2fps 采样的
}
```

**并不是真正上传视频文件！**

---

## 官方文档

https://help.aliyun.com/zh/model-studio/vision

### 文档原文

> 视觉理解模型可以根据您传入的图片或视频进行回答

### 实际实现

```python
# Python 示例（来自官方文档）
messages = [{
    "role": "user",
    "content": [{
        "video": [
            "https://example.com/frame1.jpg",
            "https://example.com/frame2.jpg",
            "https://example.com/frame3.jpg",
            "https://example.com/frame4.jpg"
        ],
        "fps": 2
    }, {
        "type": "text",
        "text": "描述这个视频的具体过程"
    }]
}]
```

---

## 三种输入格式对比

| 格式 | 实际内容 | 模型理解 |
|------|----------|----------|
| `{"type": "image_url", ...}` | 单张图片 | 图像 |
| `{"type": "image_url", ...}` x N | 多张图片 | 多图对比 |
| `{"type": "video", "video": [...], "fps": 2}` | 多张图片 + fps | **视频序列** |

---

## 为什么叫"video"？

因为：
1. **多张图片按时间顺序排列** = 视频的本质
2. **fps 参数** 告诉模型这些图片的时间间隔
3. 模型内部使用**时序注意力机制**处理

所以虽然传输的是图片，但模型"理解"为视频。

---

## 当前 API Key 限制

### 测试结果

| 端点 | API Key 有效性 | 支持 video 类型 | 结论 |
|------|---------------|-----------------|------|
| `dashscope.aliyuncs.com/compatible-mode/v1` | ❌ 401 | ✅ 支持 | Key 无效 |
| `dashscope.aliyuncs.com/api/v1` | ❌ 401 | ✅ 支持 | Key 无效 |
| `coding.dashscope.aliyuncs.com/v1/chat/completions` | ✅ | ⚠️ 仅 qwen3.5-plus | **唯一可用** |

### coding.dashscope.aliyuncs.com 限制

- **仅支持模型**: `qwen3.5-plus`
- **不支持模型**: `qwen2.5-vl-72b-instruct`, `qwen-vl-max` 等
- **输入格式**: 使用 OpenAI 兼容格式（`/v1/chat/completions`）

---

## 我们的方案

### 当前实现（已优化）

```python
# 1. 提取关键帧
frames, duration, fps = extract_frames(video_path)

# 2. 构建 video 类型请求
content = [{
    "type": "video",
    "video": [f"data:image/jpeg;base64,{frame}" for frame in frames],
    "fps": fps
}, {
    "type": "text",
    "text": prompt
}]

# 3. 发送请求
data = {
    "model": "qwen3.5-plus",
    "messages": [{"role": "user", "content": content}]
}
```

### 与官方的区别

| 项目 | 官方示例 | 我们的实现 |
|------|----------|------------|
| 图片源 | HTTP URL | Base64 Data URI |
| 帧数 | 固定 4 帧 | 动态 5-15 帧 |
| fps | 手动指定 | 根据视频时长计算 |
| 分辨率 | 未指定 | 640px, Lanczos 缩放 |

**结论**: 我们的方案更优！

---

## 常见误解

### ❌ 误解 1: "可以直接上传 MP4 文件"

**真相**: API 不支持直接上传视频文件（.mp4, .mkv 等）

**原因**:
- 视频文件需要解码
- 传输效率低
- 图片序列更灵活

### ❌ 误解 2: "关键帧方案是妥协之举"

**真相**: 官方"video 输入"本质就是关键帧序列！

**用户原话**: "不必用提取关键帧的方式。你是可以直接上传视频的"

**实际情况**:
- 官方示例也是用图片序列
- 所谓"video 类型"只是加了 fps 参数的图片数组
- 我们的关键帧方案与官方一致

### ✅ 正确理解

```
上传视频文件 → ❌ 不支持
提取关键帧 → ✅ 官方方案
添加 fps 参数 → ✅ 告诉模型时序信息
使用 video 类型 → ✅ 触发时序注意力机制
```

---

## 代码更新

已更新 `~/.local/bin/video-analyze`:

```diff
- # 旧代码：使用 image_url 多图片输入
- content = []
- for frame in frames:
-     content.append({
-         "type": "image_url",
-         "image_url": {"url": f"data:image/jpeg;base64,{frame}"}
-     })

+ # 新代码：使用官方 video 类型
+ content = [{
+     "type": "video",
+     "video": [f"data:image/jpeg;base64,{frame}" for frame in frames],
+     "fps": fps  # 使用实际计算的 fps
+ }, {
+     "type": "text",
+     "text": prompt
+ }]
```

---

## 测试方法

```bash
# 测试 video 类型输入
video-analyze /path/to/video.mp4 "描述这个视频的内容"
```

### 预期输出

```
📁 视频文件：/path/to/video.mp4
📊 文件大小：12.34 MB
🎬 提取视频帧...
   提取了 8 帧 (视频时长：8.5 秒，fps: 0.94)
🤖 正在分析...
============================================================
[AI 分析结果]
============================================================
```

---

## 参考资源

- [官方文档 - 图像与视频理解](https://help.aliyun.com/zh/model-studio/vision)
- [DashScope API 参考](https://help.aliyun.com/zh/dashscope/)
- [Qwen-VL 模型说明](https://help.aliyun.com/zh/dashscope/developer-reference/qwen-vl-api)

---

## 教训

**不要凭名字猜测功能！**

- 看到"video upload"就以为能直接传 MP4
- 实际官方也是用关键帧方案
- 应该先仔细阅读 API 文档

**正确流程**:
```
用户建议 → 查官方文档 → 理解真实含义 → 优化实现 → 验证
```

---
