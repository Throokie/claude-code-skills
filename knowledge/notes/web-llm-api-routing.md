# 2026-03-15 网页大模型 API 路由架构

**主题**: Kimi、Gemini、Google AI Studio 视频理解与超大上下文路由

---

## 核心发现

**用户测试总结**：

```
平台: Gemini
消息发送：✅ | 模型响应：✅ | API 捕获：✅

平台：Kimi
消息发送：✅ | 模型响应：✅ | API 捕获：✅

平台：DeepSeek
消息发送：✅ | 模型响应：✅ | API 捕获：✅

平台：Google AI Studio
消息发送：✅ | 模型响应：✅ | API 捕获：⚠️ 部分
```

**关键发现**：Kimi 和 Google 系列 (Gemini/AI Studio) 都支持**直接上传视频**进行分析。

---

## 平台能力对比

| 平台 | 视频上传 | 超大上下文 | 代码辅助 | 搜索能力 | Skill 位置 |
|------|----------|------------|----------|----------|------------|
| **Kimi** | ✅ | ✅ 262K | ❌ | ⭐⭐ | `kimi-api` |
| **Google AI Studio** | ✅ | ✅ | ✅ 强 | ⭐⭐⭐ | `google-ai-studio` |
| **Gemini** | ✅ | ✅ | ❌ | ⭐⭐⭐ | `gemini-api` |
| **DeepSeek** | ❌ | ⚠️ | ✅ | ⭐ | `deepseek-api` |
| **DashScope** | ⚠️ 关键帧 | ⚠️ | ❌ | ⭐ | `video-analyze` |

---

## LLM 路由规则更新

### 路由规则表

| 查询类型 | 路由目标 | 触发词 |
|----------|----------|--------|
| **搜索信息** | `tavily-search` | "搜索"、"查一下" |
| **找相似/替代品** | `exa-search` | "类似的"、"替代品" |
| **视频理解** | `kimi-api` / `google-ai-studio` | "分析视频"、"上传视频" |
| **超大上下文** | `kimi-api` | "长文档"、"PDF 摘要"、"万字" |
| **本地大文件** | `kimi-api` | "分析这个大文件"、"读取" |
| **代码辅助** | `google-ai-studio` | "代码助手"、"AI Studio" |
| **Gemini 对话** | `gemini-api` | "Gemini"、"谷歌对话" |

---

## 使用示例

### 视频理解

```markdown
用户：分析这个视频讲的是什么 /path/to/video.mp4

执行：
1. → kimi-api (上传视频进行分析)
2. → 返回视频分析结果
```

### 超大文档处理

```markdown
用户：帮我总结这个 PDF 的核心内容 /path/to/long.pdf

执行：
1. → kimi-api (262K 上下文处理)
2. → 返回摘要结果
```

### 代码辅助

```markdown
用户：帮我看看这个代码项目，给出优化建议

执行：
1. → google-ai-studio (代码辅助能力强)
2. → 返回分析报告
```

### Gemini 对话

```markdown
用户：和 Gemini 聊聊，问问它对 AI 发展的看法

执行：
1. → gemini-api (原生 Gemini 对话)
2. → 返回对话结果
```

---

## 级联策略

```
用户查询
    ↓
1. 当前模型直接回答 (简单问题)
    ↓ (需要外部信息)
2. tavily-search (快速事实)
    ↓ (需要找相似)
3. exa-search (语义搜索)
    ↓ (需要视频/长文档)
4. kimi-api (262K 上下文)
    ↓ (需要代码辅助)
5. google-ai-studio
    ↓ (需要视觉交互)
6. browser-use
```

---

## 各平台详细说明

### Kimi API (`kimi-api`)

**优势**：
- 262K 超大上下文窗口
- 支持直接上传视频文件
- 中文理解能力强
- 本地大文件处理

**适用场景**：
- 长文档摘要 (PDF、论文)
- 视频内容分析
- 日志文件分析
- 代码库理解

### Google AI Studio (`google-ai-studio`)

**优势**：
- 代码辅助能力强
- 支持视频上传
- 多模态处理 (图文混合)
- Google 生态集成

**适用场景**：
- 代码审查与优化
- 技术文档生成
- 多模态任务
- 数据分析

### Gemini API (`gemini-api`)

**优势**：
- 自然流畅的对话
- 支持视频上传
- 内置 Google 搜索
- 多轮对话记忆

**适用场景**：
- 开放式对话
- 创意写作
- 头脑风暴
- 需要搜索增强的对话

---

## 文件变更

- `~/src/user-scripts/skills/orchestrator/SKILL.md` - 更新 LLM 路由规则
  - 新增 `kimi-api`、`google-ai-studio`、`gemini-api` 路由
  - 新增平台能力对比表
  - 更新级联策略

---

## 参考资源

- [Kimi API Skill](~/src/user-scripts/skills/kimi-api/SKILL.md)
- [Gemini API Skill](~/src/user-scripts/skills/gemini-api/SKILL.md)
- [Google AI Studio Skill](~/src/user-scripts/skills/google-ai-studio/SKILL.md)
- [DeepSeek API Skill](~/src/user-scripts/skills/deepseek-api/SKILL.md)

---

*最后更新：2026-03-15 | 基于用户完整测试结果*
