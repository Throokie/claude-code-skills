---
note: 由 2 个文件合并而成
---

# Idle Detection Unified.Md

> 本文件由 2 个独立文件合并而成

---
## ai-idle-detection-fix

# AI 空闲检测误判问题

**日期**: 2026-03-18
**场景**: Claude Smart Drive v4 空闲监控
**相关文件**: `/home/throokie/claude-drive-smart-v4.sh`

---

## 问题描述

**现象**:
- ws1 会话：正常运行，定期触发 prompt（轮次 1→2→3）
- ws2 会话：首次注入后，再也没触发过 prompt

**日志对比**:

**ws1 日志** (正常):
```
[04:54:29] 💤 空闲计数：1 / 4
[04:54:44] 💤 空闲计数：2 / 4
[04:54:59] 💤 空闲计数：3 / 4
[04:55:14] 💤 空闲计数：4 / 4
[04:55:14] 🚀 触发 process_session (空闲阈值达到)
[04:55:14]   轮次：2
```

**ws2 日志** (异常):
```
[04:38:44] ✓ 首次注入完成，进入循环监控...
[04:38:44] ℹ️ 等待会话空闲...
# 之后没有任何日志输出
```

---

## 根本原因

检测 AI 工作状态的关键词过于宽泛，匹配到了 Claude 的后台命令完成通知：

**原检测正则**:
```bash
if echo "$content" | grep -qE "(thinking|Levitating|Executing|Running|command.*completed)"; then
```

**ws2 屏幕内容** (被误判):
```
● Background command "Start the tmux-web-term server" completed (exit code 0)
● Background command "Run server directly to see errors" failed with exit code 1
```

**问题**:
- `command.*completed` 匹配了后台命令完成通知
- 每次检测都判定为"AI 正在工作"
- idle 计数被重置为 0，永远无法触发 prompt

---

## 解决方案

**修改后的检测正则**:
```bash
# ✅ 只检测 Claude 主动工作状态
if echo "$content" | grep -qE "(thinking|Levitating|Executing |Running command|^● [A-Z])"; then
```

**修改说明**:

| 原关键词 | 新关键词 | 说明 |
|---------|---------|------|
| `Executing` | `Executing ` | 加空格，只匹配"Executing tool" |
| `Running` | `Running command` | 只匹配主动执行命令 |
| `command.*completed` | 移除 | 后台通知不是 AI 工作 |
| - | `^● [A-Z]` | 匹配任务标题（如"● Task completed"） |

---

## 验证方法

```bash
# 测试正则是否匹配后台通知
echo "● Background command completed" | grep -qE "(command.*completed)" && echo "匹配" || echo "不匹配"
# 输出：匹配 (这是问题)

echo "● Background command completed" | grep -qE "(Executing |Running command|^● [A-Z])" && echo "匹配" || echo "不匹配"
# 输出：不匹配 (正确)

# 测试是否匹配真正的 AI 工作
echo "thinking" | grep -qE "(thinking|Levitating|Executing |Running command|^● [A-Z])" && echo "匹配" || echo "不匹配"
# 输出：匹配 (正确)
```

---

## 设计原则

**AI 工作状态判定**:
1. ✅ Claude 主动思考：`thinking`、`Levitating`
2. ✅ Claude 执行工具：`Executing `（后跟空格）
3. ✅ Claude 运行命令：`Running command`
4. ✅ Claude 任务标题：`^● [A-Z]`
5. ❌ 后台命令完成通知：不是 AI 主动工作

**核心思想**: 只检测 Claude **主动**行为，排除**被动**通知。

---

## 相关文件

- 错误模式：`~/.claude/insights/pitfalls.md` (EP-023)
- 脚本位置：`/home/throokie/claude-drive-smart-v4.sh` 第 333 行
- ws1 日志：`/tmp/claude-drive-ws1.log`
- ws2 日志：`/tmp/claude-drive-ws2.log`


---

## idle-detection-system-fix

# 空闲检测计数重置逻辑修复

**日期**: 2026-03-18
**场景**: Claude Smart Drive v4 空闲监控误触发
**相关文件**: `/home/throokie/claude-drive-smart-v4.sh`

---

## 问题描述

**现象**:
- 屏幕内容持续变化（Claude 正在输出），但空闲计数持续增加
- 达到阈值后触发 prompt，但 Claude 实际还在工作
- 造成 prompt 轰炸，打断 Claude 正常工作流程

**日志表现**:
```
[05:07:31] 💤 空闲计数：1 / 4
[05:08:46] 💤 空闲计数：1 / 4   # 注意：不是递增，是重置为 1
[05:09:02] 💤 空闲计数：2 / 4
[05:09:17] 💤 空闲计数：3 / 4
[05:09:32] 💤 空闲计数：4 / 4
[05:09:32] 🚀 触发 process_session
```

---

## 根本原因

**检测逻辑顺序错误**:

```bash
# ❌ 错误顺序
while true; do
    content=$(tmux capture-pane -t "$SESSION" -p -S -30)

    # 1. 先检测 AI 状态
    if echo "$content" | grep -qE "(thinking|Levitating|...)"; then
        echo "0" > "$IDLE_FILE"
        continue  # 重置计数，跳过后续
    fi

    # 2. 再检测内容变化
    hash=$(echo "$content" | md5sum | cut -d' ' -f1)
    if [ "$hash" != "$(cat $HASH_FILE)" ]; then
        echo "$hash" > "$HASH_FILE"
        echo "0" > "$IDLE_FILE"
        continue
    fi

    # 3. 增加空闲计数
    count=$(($(cat "$IDLE_FILE") + 1))
    echo "$count" > "$IDLE_FILE"
done
```

**问题分析**:
1. **AI 状态检测过于严格**：只匹配关键词，但 Claude 输出普通文本时不匹配
2. **内容变化检测被跳过**：当 AI 状态检测失败后，即使屏幕在滚动也不重置计数
3. **初始 hash 未设置**：快速启动模式下，首次注入后没有设置 hash
4. **执行后未更新 hash**：process_session 执行后 hash 还是旧的，立即再次触发

---

## 解决方案

**修改后的逻辑**:

```bash
# ✅ 正确顺序：内容变化优先
while true; do
    content=$(tmux capture-pane -t "$SESSION" -p -S -30)

    # 1. 优先检测内容变化（屏幕滚动 = 有人在工作）
    hash=$(echo "$content" | md5sum | cut -d' ' -f1)
    if [ "$hash" != "$(cat $HASH_FILE)" ]; then
        echo "$hash" > "$HASH_FILE"
        echo "0" > "$IDLE_FILE"
        log "📝 屏幕内容变化 → 重置空闲计数"
        continue
    fi

    # 2. 内容未变时，再检测 AI 是否在处理（静态思考状态）
    if echo "$content" | grep -qE "(thinking|Levitating|Executing |Running command)"; then
        echo "0" > "$IDLE_FILE"
        log "🤖 AI 正在工作 → 重置空闲计数"
        continue
    fi

    # 3. 两者都未命中，增加空闲计数
    count=$(($(cat "$IDLE_FILE") + 1))
    echo "$count" > "$IDLE_FILE"
    log "💤 空闲计数：$count / $IDLE_CYCLES"
done
```

**关键修改**:

| 修改点 | 原逻辑 | 新逻辑 |
|--------|--------|--------|
| 检测顺序 | AI 状态 → 内容变化 | 内容变化 → AI 状态 |
| 检测粒度 | 关键词匹配 | MD5 hash 全量比较 |
| 初始化 | 无 | 启动时捕获初始 hash |
| 执行后处理 | 无 | 延迟 2 秒后更新 hash |

---

## 多 Agent 强制要求

**新增 Prompt 要求**:

```markdown
【强制要求：多 Agent 协作】
- **必须使用 2-3 个 agent 并行开发**：1 个负责核心逻辑，1 个负责 UI/测试，可选第 3 个负责文档/集成
- 使用 `/orchestrator` 或 `long-running-agent` 创建子代理
- 每个 agent 分配明确的任务边界和时间盒
- 主 agent 负责协调和集成
```

**对齐反思 Prompt 也增加**:
- "多 Agent 协作是否高效？是否有 agent 在等待或做无用功？"
- "如果 Agent 协作效率低，重新分配任务边界。"

---

## 验证方法

```bash
# 1. 启动驱动
claude-drive "ws1" ~/project -q

# 2. 观察日志，屏幕变化时应立即重置计数
tail -f /tmp/claude-drive-ws1.log | grep "重置"

# 3. 预期输出
📝 屏幕内容变化 → 重置空闲计数
📝 屏幕内容变化 → 重置空闲计数
💤 空闲计数：1 / 4  # 只有真正空闲时才增加
```

---

## 设计原则

**空闲检测优先级**:
1. ✅ **屏幕内容变化** - 最可靠，任何输出都算"活跃"
2. ✅ **AI 状态关键词** - 辅助检测静态思考状态
3. ❌ **仅依赖关键词** - 会漏判普通文本输出

**多 Agent 协作**:
- 强制要求 2-3 个 agent 并行
- 明确任务边界
- 定期反思协作效率

---

## 相关文件

- 错误模式：`~/.claude/insights/pitfalls.md` (EP-025)
- 脚本位置：`/home/throokie/claude-drive-smart-v4.sh` 后台循环部分
- 学习笔记：`~/.claude/insights/learnings/2026-03-18-idle-detection-fix.md`


---

