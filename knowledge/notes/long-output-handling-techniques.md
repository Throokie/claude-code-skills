# 学习笔记：超长文本输出技术

> **日期**: 2026-03-15
> **主题**: AI Agent 长文档生成技术操控方式
> **来源**: 100+ 篇技术文章/官方文档分析

---

## 核心收获

### 1. Token 限制是硬约束

Claude Code 单次输出限制为 **25,000 tokens**，无法绕过。

**解决方案**：
- 分块生成（Chunking）
- 模块化文档架构
- MapReduce 并行生成

### 2. 层级分块是最佳策略

对于 Markdown 文档，按标题层级分块效果最好：

```python
# 伪代码
def split_by_headers(content):
    sections = re.split(r'^(#+)\s+(.+)$', content, flags=re.MULTILINE)
    # 保持结构完整性
```

### 3. 上下文工程比扩大上下文更重要

Anthropic 官方研究：
- 结构化摘要压缩率 60-80%，信息保留率 85%
- 会话摘要模板非常有效

### 4. 多代理模式适合复杂文档

```
Initializer → Writers (并行) → Reviewer → Aggregator
```

**效果**：
- 单次生成准确率：~40%
- 2-3 轮迭代后：~60-80%
- 5+ 轮迭代：~85%+

### 5. Claude Code 流式输出暂不支持

**临时方案**：
```bash
claude "任务" > task.log 2>&1 &
tail -f task.log
```

---

## 实践清单

### 生成前
- [ ] 确定文档规模和类型
- [ ] 选择合适的分块策略
- [ ] 准备文档模板（如有）

### 生成中
- [ ] 逐章生成，避免超限
- [ ] 实时写入进度文件
- [ ] 保存中间结果

### 生成后
- [ ] 质量审查（使用审查清单）
- [ ] 合并章节 + 生成过渡
- [ ] 归档会话

---

## 关键代码片段

### Token 估算
```python
def estimate_tokens(text):
    return len(text) * 0.75  # 粗略估算
```

### 进度追踪
```python
def log_progress(phase, status):
    with open('progress.md', 'a') as f:
        f.write(f"- [{'x' if status == 'done' else ' '}] {phase}\n")
```

---

## 参考资源

| 资源 | 链接 |
|------|------|
| Anthropic 工程博客 | https://www.anthropic.com/engineering |
| 上下文工程指南 | https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents |
| 长任务 Harness | https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents |

---

*学习笔记 v1.0 - 基于深度研究*
