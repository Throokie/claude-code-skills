# AI Drive 技能融合完成记录

**日期**: 2026-03-18
**状态**: ✅ 已完成并验证

---

## 融合决策

### 原始问题

**6 个独立技能**:
| Skill | 问题 |
|-------|------|
| product-builder | 产品级构建框架 |
| time-boxing | 时间盒管理 |
| e2e-optimizer | E2E 测试优化 |
| git-worktree | Git 并行开发 |
| deep-work-tracker | 深度工作追踪（冗余） |
| long-running-agent | 多 agent 管理 |

**核心问题**:
1. Claude 无法同时内化 6 套不同的工作流
2. 技能之间有重叠（如 time-boxing vs product-builder 的时间盒）
3. 实际只调用 surface-level 概念，没有深入实践
4. Prompt 过长（约 800 字）

---

## 融合方案

### 新技能结构

```
ai-drive/SKILL.md          ← 主框架（融合 4 个技能）
    ↓
long-running-agent/SKILL.md ← 依赖工具（独立）
```

**融合的技能**:
- `product-builder` → Phase 0-1 流程、PRD 模板、质量标准
- `time-boxing` → 时间感知系统、MVU 优先级、防卡死协议
- `e2e-optimizer` → 精确打击测试策略、秒级反馈原则
- `git-worktree` → Git 存档流程（简化版）

**移除的技能**:
- `deep-work-tracker` → 功能被 time-boxing 完全覆盖

**独立的技能**:
- `long-running-agent` → 这是元框架（管理 agent 的工具），不宜修改

---

## 实现细节

### 1. 创建 ai-drive/SKILL.md

**位置**: `/home/throokie/.claude/skills/ai-drive/SKILL.md`

**核心结构**:
```markdown
一、工作流总览（Phase 0-5）
二、多 Agent 协作（强制）
三、时间盒执行
四、质量标准
五、Phase 0: 需求澄清（必须）
六、Phase 1: 设计先行
七、轮次推进逻辑
八、闭环协议
九、依赖技能
十、快速启动
```

**关键特性**:
- 强制 2-3 个 agent 并行开发
- 每轮汇报 Agent 进度和剩余时间
- 防卡死协议（3 次失败降级）
- Git 存档每轮自动执行

### 2. 修改 claude-drive-smart-v4.sh

**generate_file_list()** - 精简武器库:
```bash
# 默认武器库（精简版 - 只保留最核心的）
if [ -z "$custom_files" ]; then
    result="$result- ~/.claude/skills/ai-drive/SKILL.md - AI 自主开发驱动框架（主 skill）\n"
    result="$result- ~/.claude/skills/long-running-agent/SKILL.md - 多 agent 创建工具（依赖）\n"
fi
```

**generate_pb_prompt()** - 精简 Prompt:
```bash
# 从 /product-builder 改为 /ai-drive
/ai-drive 请继续推进项目，当前需遵循以下武器库与规范：

【武器库与原则】
- ~/.claude/skills/ai-drive/SKILL.md
- ~/.claude/skills/long-running-agent/SKILL.md

【本轮执行要求】
1. 读取武器库文件，遵循 AI Drive 框架执行
2. 强制使用多 Agent 并行开发（主 Agent + UI Agent + 测试 Agent）
3. 每轮必须汇报各 Agent 进度和剩余时间

【防卡死协议】
- 同一个 Bug 修复尝试超过 3 次失败 → 立即降级或跳过
- 核心流程跑通（E2E 通过） → 立刻停止优化，进入下一模块
```

**Prompt 长度对比**:
- 原版：约 800 字
- 新版：约 200 字
- 精简：75% 减少

---

## 预期效果

| 指标 | 融合前 | 融合后 |
|------|--------|--------|
| 技能数量 | 6 个 | 2 个（1 主 +1 依赖） |
| Prompt 长度 | ~800 字 | ~200 字 |
| Token 消耗 | 高 | 低 |
| AI 理解成本 | 高（多套术语） | 低（单一框架） |
| 多 Agent 执行率 | 低（停留在口号） | 高（强制要求） |
| 时间盒感知 | 无 | 有（每轮汇报剩余时间） |

---

## 验证步骤

### 1. 文件验证
```bash
ls -la ~/.claude/skills/ai-drive/SKILL.md
# ✅ 6473 字节，已创建
```

### 2. 脚本验证
```bash
# 检查 generate_file_list 输出
- ~/.claude/skills/ai-drive/SKILL.md - AI 自主开发驱动框架（主 skill）
- ~/.claude/skills/long-running-agent/SKILL.md - 多 agent 创建工具（依赖）
# ✅ 正确
```

### 3. 运行验证
```bash
claude-drive "ws1" /home/throokie/src/dev-projects/projects/tianjige -q
```

**日志输出**:
```
[10:07:46] ✓ load-buffer 成功
[10:07:46] ✓ paste-buffer 成功
[10:07:47] ✓ 已发送驱动提示词
[10:07:47] ✓ 首次注入完成，进入循环监控...
[10:08:05] 📝 屏幕内容变化 → 重置空闲计数  # ✅ 空闲检测修复
```

**预期 Claude 输出**:
- [ ] 创建子 agent（使用 `/long-running-agent`）
- [ ] Agent 进度报告表格
- [ ] 剩余时间汇报
- [ ] MVU 优先级执行

---

## 关联修复

### EP-025: 空闲检测计数重置逻辑错误

**问题**: 屏幕内容变化但空闲计数持续增加

**原因**: 检测顺序错误
```bash
# ❌ 错误顺序
1. AI 状态检测（关键词匹配）
2. 内容变化检测（MD5 hash）

# ✅ 正确顺序
1. 内容变化检测（MD5 hash）- 优先级最高
2. AI 状态检测（关键词匹配）- 辅助
```

**修复位置**: `claude-drive-smart-v4.sh` 后台循环部分

---

## 相关文件

### 创建/修改的文件
| 文件 | 状态 | 说明 |
|------|------|------|
| `~/.claude/skills/ai-drive/SKILL.md` | ✅ 创建 | 融合主技能 |
| `claude-drive-smart-v4.sh` | ✅ 修改 | 更新 prompt 生成 |
| `~/.claude/insights/pitfalls.md` | ✅ 更新 | 添加 EP-025 |

### 学习笔记
| 文件 | 说明 |
|------|------|
| `2026-03-18-ai-drive-skill-merge.md` | 融合设计文档 |
| `2026-03-18-skill-loadout-simplify.md` | 精简决策文档 |
| `2026-03-18-idle-detection-fix.md` | 空闲检测修复 |
| `2026-03-18-ai-drive-fusion-complete.md` | 本文档（完成记录） |

---

## 后续观察

**验证清单**:
1. [ ] Claude 是否主动创建子 agent
2. [ ] Agent 进度表格是否出现
3. [ ] 剩余时间是否汇报
4. [ ] Git 存档是否每轮执行
5. [ ] 防卡死协议是否生效

**调整策略**:
- 如果运行稳定 → 保持现状，让 Claude 彻底内化
- 如果有问题 → 针对性调整 ai-drive/SKILL.md
- 绝不会超过 3 个技能

**核心原则**: 宁可少做，不可贪多。2 个技能是上限。
