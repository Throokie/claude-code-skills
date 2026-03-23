## Fix Analysis: [BUG-XXX] [简短描述]

### 1. Root Cause Analysis
**问题描述:**
[清晰描述bug的表现]

**根本原因:**
[为什么发生？代码哪里错了？]

**触发条件:**
- [ ] 特定输入
- [ ] 特定状态
- [ ] 并发场景
- [ ] 边界条件

---

### 2. Impact Scope Assessment

#### 代码影响
| 文件/函数 | 变更类型 | 风险等级 |
|-----------|----------|----------|
| `file.ts:funcA()` | 修改逻辑 | MEDIUM |
| `file.ts:funcB()` | 新增参数 | HIGH |

#### 依赖分析 (GitNexus)
```
Impact Analysis Results:
- Direct callers (d=1): [X个函数]
- Indirect deps (d=2): [Y个函数]
- Risk Level: [LOW/MEDIUM/HIGH/CRITICAL]
```

#### API/Schema 变更
- [ ] 无API变更
- [ ] 新增可选参数
- [ ] 修改返回值格式
- [ ] 数据库schema变更

---

### 3. Edge Cases Checklist

| 场景 | 处理方案 | 测试覆盖 |
|------|----------|----------|
| Null/undefined 输入 | [说明] | [ ] |
| 空数组/字符串 | [说明] | [ ] |
| 最大值/溢出 | [说明] | [ ] |
| 并发访问 | [说明] | [ ] |
| 异常中断 | [说明] | [ ] |
| 向后兼容 | [说明] | [ ] |

---

### 4. Failure Mode Analysis

**如果修复失败:**
- 最坏情况: [描述]
- 检测方式: [日志/监控/告警]
- 回滚方案: [如何撤销]

**如果引入新bug:**
- 可能症状: [描述]
- 影响范围: [预测]
- 缓解措施: [说明]

---

### 5. Testing Strategy

#### 复现测试 (必做)
```typescript
// 原始bug的复现用例
test('should reproduce BUG-XXX', () => {
  // Arrange
  const input = ...
  // Act
  const result = targetFunction(input)
  // Assert - 应该失败
  expect(result).toBe(expected)
})
```

#### 回归测试 (必做)
```typescript
// 防止问题再次发生
test('should not regress BUG-XXX', () => {
  // 边界值测试
  // 异常输入测试
})
```

#### 集成测试 (如果需要)
- [ ] 跨模块调用测试
- [ ] 端到端场景测试

---

### 6. Review Checklist

#### 代码审查
- [ ] code-reviewer 通过
- [ ] security-reviewer 通过 (如涉及输入/权限)
- [ ] [language]-reviewer 通过

#### 测试审查
- [ ] tdd-guide 测试覆盖验证
- [ ] 所有边界条件有测试
- [ ] 回归测试通过

#### 回归验证
- [ ] gitnexus_detect_changes 确认影响范围
- [ ] 所有 d=1 依赖项验证通过
- [ ] 性能无退化

---

### 7. Deployment Notes

- [ ] 可独立部署
- [ ] 需要配置变更
- [ ] 需要数据迁移
- [ ] 需要协调发布

---

**分析完成时间:** [YYYY-MM-DD HH:mm]
**分析师:** [AI/Name]
**风险等级:** [LOW/MEDIUM/HIGH/CRITICAL]
**状态:** [分析中/待审查/已批准/已完成]
