# 鲁棒性修复工作流 - 快速开始

## 什么时候使用

- **修复bug时** → 强制使用此工作流
- **修改现有代码** → 视复杂程度使用
- **新功能开发** → 使用标准 development-workflow

## 核心流程（5步法）

```
1. 影响分析 → 2. 回答问题 → 3. 多视角审查 → 4. 防御性实现 → 5. 回归验证
```

## 实用命令

### 1. 创建修复分析文档
```bash
cat ~/.claude/rules/common/fix-analysis-template.md > /tmp/fix-$(date +%s).md
```

### 2. 运行影响分析
```javascript
// 在Claude Code中执行
mcp__gitnexus__impact({target: "functionName", direction: "upstream", maxDepth: 3})
```

### 3. 启动多视角审查
```
// 同时启动3个agents
Agent 1: code-reviewer (正确性/边界条件)
Agent 2: security-reviewer (安全影响)
Agent 3: tdd-guide (测试覆盖)
```

## 5个必答问题（在分析文档中回答）

1. **根本原因** - 为什么发生这个bug？
2. **影响范围** - 哪些函数/模块依赖此代码？
3. **边界情况** - null/空值/最大值/并发如何处理？
4. **失败模式** - 如果修复失败，最坏情况是什么？如何回滚？
5. **测试策略** - 如何测试修复？如何防止回归？

## 风险等级处理

| 风险等级 | 处理方式 |
|---------|---------|
| LOW | 标准审查流程 |
| MEDIUM | code-reviewer + tdd-guide |
| HIGH | 多视角审查 + 用户确认 |
| CRITICAL | 停止工作，提交给用户决策 |

## 记忆点

**关键规则**: 任何bug修复前，必须：
- ✅ 完成GitNexus影响分析
- ✅ 书面回答5个问题
- ✅ 通过code-reviewer审查
- ✅ 有回归测试

**禁止行为**:
- ❌ 不分析影响直接修改
- ❌ 跳过边界情况处理
- ❌ 不写回归测试
- ❌ 忽视HIGH/CRITICAL风险警告

## 快捷触发词

| 你说 | AI应该做 |
|-----|---------|
| "修复这个bug" | 启动鲁棒性修复流程 |
| "分析影响" | 运行gitnexus impact |
| "多视角审查" | 并行启动3-4个agents |
| "修复模板" | 创建fix-analysis文档 |

## 参考文档

- 完整工作流: `~/.claude/rules/common/robust-fix-workflow.md`
- 分析模板: `~/.claude/rules/common/fix-analysis-template.md`
- 开发工作流: `~/.claude/rules/common/development-workflow.md`
