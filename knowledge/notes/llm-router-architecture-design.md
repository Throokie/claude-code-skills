# 2026-03-15 LLM 路由架构

**主题**: 中控模型按需调用顶级大模型的路由架构

---

## 核心洞察

**用户原话**: "我发现不同大模型的内部掌握的信息量不一样。所以能否让中控大模型（低端的），按需去顶级大模型那里获取信息呢，就当成信息搜索引擎那样子去用"

## 方案对比

| 方案 | 核心思想 | 代表项目 |
|------|----------|----------|
| Semantic Routing | 用小型分类器识别查询类型路由 | vLLM Semantic Router |
| Cascading | 先试便宜模型，置信度低再升级 | RouteLLM (ICLR 2025) |
| 自然语言路由 | **用 Skill 文档定义规则，Claude 自动识别** | 当前方案 |

## 最终方案：自然语言路由

**不需要额外 router 代码**，直接在 Skill 文档中用自然语言定义路由规则：

```markdown
| 查询类型 | 路由目标 | 触发词 |
|----------|----------|--------|
| 搜索信息 | tavily-search | "搜索"、"查一下" |
| 找相似 | exa-search | "类似的"、"替代品" |
| 视频理解 | kimi | "分析视频"、"长文件" |
| 超大上下文 | kimi | "长文档"、"PDF 摘要" |
| 本地大文件 | kimi | "分析这个大文件" |
```

Claude Code 阅读 SKILL.md 后自动识别触发词并调用对应 Skill。

## Kimi 定位调整

**Kimi 不再是搜索引擎**，而是专注于：

| 用途 | 说明 | 示例 |
|------|------|------|
| 🎬 视频理解 | 直接上传视频文件分析 | "分析这个视频" |
| 📄 超大上下文 | 262K 上下文，处理长文档 | "总结这个 PDF" |
| 📁 本地大文件 | 分析日志、代码库 | "分析这个日志文件" |

**搜索任务优先级**：
1. tavily-search - 快速事实查询
2. exa-search - 语义搜索、找相似
3. kimi - **不再用于搜索**

## 级联策略

```
当前模型 → tavily-search → exa-search → kimi → browser-use
(免费)      (免费额度)     (免费额度)    (262K 上下文)  (视觉交互)
```

## 文件变更

- `~/.claude/CLAUDE.md` - 移除 kimi 作为搜索引擎
- `~/src/user-scripts/skills/orchestrator/SKILL.md` - 更新 LLM 路由规则

---

## 参考资源

- [vLLM Semantic Router](https://github.com/vllm-project/semantic-router)
- [RouteLLM](https://github.com/lm-sys/RouteLLM)
- [LiteLLM Router](https://github.com/BerriAI/litellm)
- [Building Effective Agents](https://www.anthropic.com/research/building-effective-agents)
