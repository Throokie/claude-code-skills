---
name: gitnexus-assistant
description: "GitNexus 智能助手 - 代码库知识图谱查询工具。触发词：gitnexus、代码分析、影响分析、依赖查询、代码图谱、分析变更、查询符号、查找调用。自动识别查询意图并执行对应的 GitNexus MCP 工具。"
---

# GitNexus 智能助手

一个便捷的 GitNexus 查询工具，自动识别用户意图并执行对应的代码知识图谱查询。

## 触发词

| 用户说 | 执行操作 |
|--------|----------|
| "gitnexus" / "代码图谱" | 显示帮助和当前仓库状态 |
| "分析 [函数/类] 的影响" | 执行 impact 分析 |
| "查询 [符号]" / "查找 [函数]" | 执行 context + query 分析 |
| "谁调用了 [函数]" | 查找所有调用者 |
| "分析当前变更" | 执行 detect_changes |
| "重命名 [符号]" | 执行 rename 预览 |
| "代码搜索 [关键词]" | 执行语义查询 |
| "cypher 查询" | 执行自定义 Cypher |

## 核心功能

### 1. 影响分析 (Impact Analysis)

```javascript
// 触发："分析 xxx 的影响" / "blast radius of xxx"
mcp__gitnexus__impact({
  target: "functionName",
  direction: "upstream",  // 谁依赖我
  maxDepth: 3,
  includeTests: true
})
```

**输出**: 风险等级、直接影响(d=1)、间接影响(d=2/3)、受影响流程

---

### 2. 符号详情查询 (Symbol Context)

```javascript
// 触发："查询 xxx" / "xxx 是什么" / "查看 xxx"
mcp__gitnexus__context({
  name: "symbolName",
  include_content: true  // 包含源代码
})
```

**输出**: 360度视图 - 调用者、被调用者、属性访问、参与的流程

---

### 3. 语义搜索 (Semantic Query)

```javascript
// 触发："搜索 xxx 相关代码" / "找一下 xxx 的实现"
mcp__gitnexus__query({
  query: "user authentication flow",
  goal: "understanding how auth works",
  task_context: "implementing OAuth",
  limit: 5
})
```

**输出**: 按相关性排序的执行流程、符号列表

---

### 4. 变更分析 (Change Detection)

```javascript
// 触发："分析当前变更" / "这些改动影响什么"
mcp__gitnexus__detect_changes({
  scope: "unstaged"  // unstaged | staged | all | compare
})
```

**输出**: 变更的符号、受影响的流程、风险摘要

---

### 5. 智能重命名 (Smart Rename)

```javascript
// 触发："重命名 xxx" / "把 xxx 改名为 yyy"
mcp__gitnexus__rename({
  symbol_name: "oldName",
  new_name: "newName",
  dry_run: true  // 先预览，确认后再执行
})
```

**输出**: 置信度标记的编辑列表（graph=高置信度, text_search=低置信度）

---

### 6. Cypher 查询 (Custom Query)

```javascript
// 触发："cypher 查询" / "自定义查询"
mcp__gitnexus__cypher({
  query: `MATCH (f:Function)-[:CodeRelation {type: 'CALLS'}]->(t:Function {name: "target"})
          RETURN f.name, f.filePath`
})
```

**常用 Cypher 模式**:

```cypher
// 查找函数的所有调用者
MATCH (caller)-[:CodeRelation {type: 'CALLS'}]->(f:Function {name: "myFunc"})
RETURN caller.name, caller.filePath

// 查找类的所有方法
MATCH (c:Class {name: "MyClass"})-[:CodeRelation {type: 'HAS_METHOD'}]->(m:Method)
RETURN m.name, m.parameterCount

// 查找写入某字段的所有函数
MATCH (f:Function)-[r:CodeRelation {type: 'ACCESSES', reason: 'write'}]->(p:Property {name: "fieldName"})
RETURN f.name, f.filePath

// 查找继承关系
MATCH (d:Class)-[:CodeRelation {type: 'EXTENDS'}]->(b:Class)
WHERE b.name = "BaseClass"
RETURN d.name
```

---

## 资源引用 (Resources)

```javascript
// 读取仓库上下文（索引状态、统计信息）
ReadMcpResourceTool({server: "gitnexus", uri: "gitnexus://repo/{name}/context"})

// 读取功能区域列表
ReadMcpResourceTool({server: "gitnexus", uri: "gitnexus://repo/{name}/clusters"})

// 读取特定区域的成员
ReadMcpResourceTool({server: "gitnexus", uri: "gitnexus://repo/{name}/cluster/{clusterName}"})

// 读取所有执行流程
ReadMcpResourceTool({server: "gitnexus", uri: "gitnexus://repo/{name}/processes"})

// 读取特定流程详情
ReadMcpResourceTool({server: "gitnexus", uri: "gitnexus://repo/{name}/process/{processName}"})

// 读取图 schema
ReadMcpResourceTool({server: "gitnexus", uri: "gitnexus://repo/{name}/schema"})
```

---

## 工作流模式

### 模式 A: 探索未知代码库

```
1. 读取 gitnexus://repo/{name}/context 获取概览
2. 读取 clusters 了解功能分区
3. 用 query 搜索感兴趣的领域
4. 用 context 深入了解关键符号
```

### 模式 B: Bug 影响分析

```
1. 用 impact 分析 bug 函数的依赖范围
2. 用 context 查看符号详情和调用链
3. 用 detect_changes 验证修复影响
4. 生成风险评估报告
```

### 模式 C: 重构准备

```
1. 用 impact 分析修改的影响范围
2. 用 rename 预览重命名操作
3. 用 cypher 查找相关代码模式
4. 制定安全重构计划
```

---

## 快速参考

| 我想... | 命令 |
|---------|------|
| 知道谁调用了某函数 | `impact` upstream |
| 了解某函数调用了谁 | `impact` downstream |
| 查看函数完整信息 | `context` |
| 搜索某功能相关代码 | `query` |
| 检查当前改动影响 | `detect_changes` |
| 安全重命名符号 | `rename` (dry_run first) |
| 自定义图查询 | `cypher` |

---

## 故障排除

| 问题 | 解决 |
|------|------|
| "Index is stale" | 运行 `npx gitnexus analyze` |
| "Symbol not found" | 检查拼写、尝试不同命名风格 |
| 结果为空 | 检查仓库是否已索引 (`npx gitnexus status`) |
| MCP 工具不可用 | 重启 Claude Code 重新加载 MCP |

---

## 相关技能

- **th-bug-analyzer**: 深度的 Bug 影响分析（生成完整报告）
- **gitnexus-cli**: GitNexus CLI 命令（analyze/status/clean/wiki）
