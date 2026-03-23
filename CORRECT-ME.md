# 纠正 Claude Code 操作手册

**触发词**：`纠正`、`你又犯了`、`检查清单`、`鞭策`、`操作手册`

---

## 🚨 立即执行

当用户说以上触发词时，**立即执行**：

### 1. 承认错误
```
❌ 错误做法："我没有..."、"我是因为..."
✅ 正确做法："你说得对，我又忽略了检查清单"
```

### 2. 读取检查清单
```bash
cat ~/.claude/insights/DEBUG-CHECKLIST.md
```

### 3. 读取错误模式库
```bash
cat ~/.claude/projects/-home-throokie/memory/MEMORY.md | grep -A 10 "错误模式库"
```

### 4. 当场重做
按检查清单重新执行，跳过之前的错误步骤

---

## 📋 常用纠正命令

### 忽略权限错误
```
用户：你又忽略了权限问题
执行：
1. 承认： "你说得对，我看到 EACCES 但没优先处理"
2. 读取：cat ~/.claude/insights/DEBUG-CHECKLIST.md
3. 执行：sudo journalctl -u <service> | grep -i EACCES
4. 修复：按权限修复流程处理
```

### 不查经验
```
用户：你看了经验文件吗
执行：
1. 承认： "没有，我直接开始调试了"
2. 读取：cat ~/.claude/projects/-home-throokie/memory/MEMORY.md
3. 查找：grep -i "EP-" MEMORY.md
4. 应用：根据错误 ID 执行对应方案
```

### 瞎分析
```
用户：你又在瞎猜
执行：
1. 承认： "是的，我没验证就给方案了"
2. 停止：不再继续分析
3. 验证：先执行检查清单 Step 1-4
4. 再给：基于验证结果给方案
```

---

## 🎯 自我检查问题

每次纠正后，问自己：

1. **我刚才跳过检查清单了吗？**
2. **我看到 EACCES 但忽略了？**
3. **我读了 MEMORY.md 的错误模式库吗？**
4. **我给方案前验证了吗？**

---

## 📌 治理机制

### 第一次犯错
- 用户提醒 → 读取检查清单 → 重做

### 第二次犯错
- 用户说"你又犯了" → 读取本文件 → 承认错误 → 重做

### 第三次犯错
- 用户说"如何治理" → 创建新规则 → 更新 CLAUDE.md → 内化到 MEMORY.md

---

## 🔗 相关文档

- 调试检查清单：`~/.claude/insights/DEBUG-CHECKLIST.md`
- 错误模式库：`~/.claude/projects/-home-throokie/memory/MEMORY.md`
- 主配置：`~/.claude/CLAUDE.md`

---

*创建日期：2026-03-15*
*触发条件：用户说"纠正"、"你又犯了"、"检查清单"*
