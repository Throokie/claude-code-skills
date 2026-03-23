# Enterprise Test Agent - Agent定义

## Test Orchestrator (主控Agent)

**职责**: 协调测试流程，分配任务，汇总结果

**输入**:
- 项目路径
- 测试类型 (web/api/cli/desktop)
- 严格程度 (basic/enterprise/strict)

**输出**:
- 测试报告
- 发布决策
- 改进建议

**工作流程**:
1. 解析用户需求
2. 检测项目类型和技术栈
3. 调用各专项Agent
4. 汇总所有结果
5. 生成发布决策报告

---

## Puppeteer Agent (浏览器测试)

**职责**: Web应用的E2E测试

**触发条件**:
- 检测到Web应用
- 用户明确说"测试网站"、"E2E测试"
- 项目包含前端框架

**技能调用**:
```bash
/skill puppeteer-cli navigate <url>
/skill puppeteer-cli screenshot --full-page
/skill puppeteer-cli evaluate "document.querySelector('button').click()"
```

**测试场景**:
- 用户登录
- 核心业务流程
- 支付流程
- 错误处理
- 响应式布局

---

## Code Expert Agent (代码分析)

**职责**: 深度代码审查、性能瓶颈、安全漏洞

**触发条件**:
- 用户说"代码分析"、"安全审查"
- 发现复杂代码逻辑
- 性能问题排查

**技能调用**:
```bash
/skill th-code-expert analyze ./src
/skill th-code-expert security --scan-all
/skill th-code-expert performance --find-bottlenecks
```

**分析维度**:
- 代码复杂度
- 安全漏洞
- 性能瓶颈
- 架构问题

---

## Model Search Agent (方案获取)

**职责**: 获取最佳测试实践

**触发条件**:
- 遇到不熟悉的测试场景
- 需要行业最佳实践
- 多方案对比决策

**技能调用**:
```bash
/skill model-compare-search "如何测试微服务架构的分布式事务"
/skill model-compare-search "React应用性能测试最佳实践"
```

**使用场景**:
- 获取测试方案
- 对比不同方法
- 验证测试策略

---

## Security Scanner (安全扫描)

**职责**: 安全漏洞扫描、渗透测试

**触发条件**:
- 用户说"安全测试"、"渗透测试"
- Web应用发布前
- API服务对外暴露

**工具**:
- npm audit
- safety (Python)
- bandit (Python)
- govulncheck (Go)
- Trivy

**扫描范围**:
- 依赖漏洞
- OWASP Top 10
- 敏感信息泄露
- 配置安全

---

## Report Generator (报告生成)

**职责**: 生成专业测试报告

**功能**:
- 数据可视化
- 失败截图
- 日志聚合
- 发布建议

**输出格式**:
- HTML可视化报告
- JSON结构化数据
- Markdown摘要
- CI/CD集成格式

---

## Agent协作流程

```
┌─────────────────────────────────────────────────────────────┐
│                    Test Orchestrator                        │
└─────────────────┬───────────────────────────────────────────┘
                  │
    ┌─────────────┼─────────────┬─────────────┬─────────────┐
    │             │             │             │             │
    ▼             ▼             ▼             ▼             ▼
┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
│Puppeteer│  │ Code    │  │ Model   │  │Security │  │ Report  │
│ Agent   │  │ Expert  │  │ Search  │  │Scanner  │  │Generator│
└────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘
     │            │            │            │            │
     └────────────┴────────────┴────────────┴────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  综合评分 &      │
                    │  发布决策        │
                    └─────────────────┘
```
