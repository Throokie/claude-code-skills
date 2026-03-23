---
name: th-enterprise-test-agent
description: 企业级软件发布测试Agent - 当用户需要进行商业化级别的软件测试、发布前的质量门禁、E2E自动化测试、性能/安全/兼容性测试时使用。支持Web应用、API服务、CLI工具、桌面应用等多种类型。集成Puppeteer进行浏览器自动化，支持多模型聚合搜索获取测试方案，可调用th-code-expert进行代码级深度分析。触发词：发布测试、企业级测试、商业化测试、质量门禁、E2E测试、自动化测试、发布前检查、销售级测试、严苛测试。
---

# Enterprise Test Agent - 企业级发布测试Agent

> **版本**: v1.0.0 (商业化发布标准)
> **核心**: 严苛质量门禁 + 多维度测试 + 自动化报告 + 发布决策

---

## 🎯 何时使用

| 场景 | 触发词 |
|------|--------|
| **商业化发布前** | "我要发布软件去卖钱了"、"商业化测试" |
| **企业级标准** | "企业级测试"、"严苛测试"、"销售级测试" |
| **质量门禁** | "发布前检查"、"质量门禁"、"能否发布" |
| **E2E测试** | "E2E测试"、"端到端测试"、"自动化测试" |
| **Web应用测试** | "测试我的网站"、"Web应用测试"、"前端测试" |
| **API测试** | "API测试"、"接口测试"、"后端测试" |
| **安全测试** | "安全测试"、"渗透测试"、"漏洞扫描" |
| **性能测试** | "性能测试"、"压力测试"、"负载测试" |

---

## ✨ 核心特性

### 🔴 商业化发布标准 (Enterprise Grade)

**这不是普通的测试，这是软件商业化前的最后一道防线。**

#### 测试维度矩阵

| 维度 | 权重 | 通过标准 |
|------|------|----------|
| **功能正确性** | 35% | 100% 测试通过，0 个P1/P2缺陷 |
| **性能表现** | 20% | 响应时间 P95 < 2s，错误率 < 0.1% |
| **安全合规** | 20% | 0 个高危漏洞，0 个中危漏洞 |
| **兼容性** | 15% | 支持 Chrome/Firefox/Safari/Edge 最新2个版本 |
| **稳定性** | 10% | 7x24小时连续运行无崩溃 |

### 🎭 多Agent协作架构

```
                    ┌─────────────────────────────────────┐
                    │      Enterprise Test Orchestrator    │
                    └─────────────────┬───────────────────┘
                                      │
        ┌──────────────┬──────────────┼──────────────┬──────────────┐
        ▼              ▼              ▼              ▼              ▼
   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐
   │Puppeteer│   │  Code   │   │  Model  │   │ Security│   │  Report │
   │ Agent   │   │ Expert  │   │ Search  │   │ Scanner │   │ Generator│
   └─────────┘   └─────────┘   └─────────┘   └─────────┘   └─────────┘
```

### 🛠️ 集成工具栈

| 工具 | 用途 | 触发场景 |
|------|------|----------|
| **puppeteer-cli** | 浏览器自动化 (Chrome) | Web应用E2E测试（单浏览器） |
| **playwright-cli** | 浏览器自动化 (Chrome/Firefox/Safari) | Web应用E2E测试（跨浏览器） |
| **model-compare-search** | 多模型聚合搜索 | 复杂测试方案获取 |
| **th-code-expert** | 代码级深度分析 | 安全漏洞、性能瓶颈 |
| **curl/wget** | API测试 | REST/GraphQL接口 |
| **k6/lighthouse** | 性能测试 | 负载、速度分析 |
| **npm audit** | 依赖安全 | Node.js项目 |
| **bandit/safety** | Python安全 | Python项目 |

**浏览器测试选择指南：**
- 只需要 Chrome 测试 → 使用 **puppeteer-cli**
- 需要跨浏览器测试（Chrome/Firefox/Safari）→ 使用 **playwright-cli**
- 需要测试移动端 → 使用 **playwright-cli**（设备库更丰富）

---

## 🚀 使用方法

### 方式 1: 直接命令调用

```bash
# 完整企业级测试（所有维度）
~/.claude/skills/enterprise-test-agent/scripts/test.sh --full

# Web应用E2E测试
~/.claude/skills/enterprise-test-agent/scripts/test.sh --web --url https://your-app.com

# API服务测试
~/.claude/skills/enterprise-test-agent/scripts/test.sh --api --spec ./api-spec.yaml

# 安全扫描
~/.claude/skills/enterprise-test-agent/scripts/test.sh --security

# 性能测试
~/.claude/skills/enterprise-test-agent/scripts/test.sh --performance --duration 10m

# 特定技术栈
~/.claude/skills/enterprise-test-agent/scripts/test.sh --stack nodejs --full
```

### 方式 2: Claude Code 自动触发

说出以下关键词，我会自动启动企业级测试流程：

| 触发词 | 行为 |
|--------|------|
| "我要发布软件去卖钱了" | **启动完整商业化测试** |
| "企业级测试" | 企业标准全维度测试 |
| "严苛测试"、"销售级测试" | 最严格标准测试 |
| "发布前检查"、"质量门禁" | 发布决策测试 |
| "E2E测试"、"端到端测试" | Web应用自动化测试 |
| "测试我的网站" | Web应用全面测试 |
| "API测试"、"接口测试" | 后端服务测试 |
| "安全测试" | 安全扫描+渗透测试 |
| "性能测试" | 负载+压力+速度测试 |

---

## 📋 测试检查清单 (商业化发布标准)

### 阶段 1: 静态分析

- [ ] **代码质量**
  - [ ] ESLint/Prettier 0 错误 0 警告
  - [ ] TypeScript 类型检查通过
  - [ ] 代码覆盖率 ≥ 90%
  - [ ] 圈复杂度 < 15

- [ ] **依赖安全**
  - [ ] npm audit / pip audit / go mod audit 0 高危漏洞
  - [ ] 依赖版本最新（6个月内）
  - [ ] 无废弃/停止维护的依赖

- [ ] **文档完整性**
  - [ ] README 包含安装/配置/使用说明
  - [ ] API 文档完整
  - [ ] Changelog 更新

### 阶段 2: 功能测试

- [ ] **单元测试**
  - [ ] 核心功能 100% 覆盖
  - [ ] 边界条件测试通过
  - [ ] 异常处理测试通过

- [ ] **集成测试**
  - [ ] 模块间交互正常
  - [ ] 数据库操作正确
  - [ ] 第三方服务调用正常

- [ ] **E2E测试** (Web应用)
  - [ ] 用户登录流程
  - [ ] 核心业务流程
  - [ ] 支付流程（如有）
  - [ ] 错误页面显示

### 阶段 3: 兼容性测试

- [ ] **浏览器兼容性**
  - [ ] Chrome 最新2版本
  - [ ] Firefox 最新2版本
  - [ ] Safari 最新2版本
  - [ ] Edge 最新2版本

- [ ] **设备兼容性**
  - [ ] Desktop (1920x1080)
  - [ ] Tablet (768x1024)
  - [ ] Mobile (375x667)

- [ ] **响应式测试**
  - [ ] 布局无错位
  - [ ] 文字可读
  - [ ] 按钮可点击

### 阶段 4: 性能测试

- [ ] **加载性能**
  - [ ] First Contentful Paint < 1.8s
  - [ ] Largest Contentful Paint < 2.5s
  - [ ] Time to Interactive < 3.8s

- [ ] **运行时性能**
  - [ ] Frame rate > 60fps
  - [ ] Memory usage < 200MB
  - [ ] No memory leaks

- [ ] **负载测试**
  - [ ] 100并发用户响应 < 2s
  - [ ] 1000并发用户响应 < 5s
  - [ ] 错误率 < 0.1%

### 阶段 5: 安全测试

- [ ] **OWASP Top 10**
  - [ ] SQL 注入防护
  - [ ] XSS 防护
  - [ ] CSRF 防护
  - [ ] 认证授权检查

- [ ] **敏感数据**
  - [ ] 密码加密存储
  - [ ] API Key 不在前端暴露
  - [ ] HTTPS 强制

- [ ] **依赖漏洞**
  - [ ] 0 个高危 CVE
  - [ ] 0 个中危 CVE

### 阶段 6: 发布准备

- [ ] **环境检查**
  - [ ] 生产环境配置正确
  - [ ] 数据库迁移脚本
  - [ ] 日志监控配置

- [ ] **回滚方案**
  - [ ] 版本回滚流程
  - [ ] 数据备份策略
  - [ ] 应急联系方案

---

## 🔧 配置

### 全局配置

`~/.claude/skills/enterprise-test-agent/config/config.yaml`

```yaml
# 测试标准级别
strictness: enterprise  # basic | enterprise | strict

# Web应用配置
web:
  baseUrl: http://localhost:3000
  timeout: 30000
  browsers: [chrome, firefox, safari]
  devices: [desktop, tablet, mobile]

# API测试配置
api:
  baseUrl: http://localhost:4000
  timeout: 10000
  concurrent: 100

# 性能测试配置
performance:
  duration: 10m
  vus: 100
  thresholds:
    http_req_duration: ['p(95)<2000']
    http_req_failed: ['rate<0.001']

# 安全测试配置
security:
  severity: high  # low | medium | high
  owasp: true
  dependencies: true

# 通知配置
notifications:
  slack: "#releases"
  email: "team@example.com"
```

### 项目级配置

项目根目录 `.enterprise-test.yaml`:

```yaml
# 覆盖全局配置
type: web  # web | api | cli | desktop
entry: ./src/index.ts
build: npm run build

test:
  exclude:
    - "**/node_modules/**"
    - "**/*.test.ts"

security:
  ignore:
    - "CVE-2023-1234"  # 已知但不修复的漏洞
```

---

## 📊 测试报告

### 报告结构

```
reports/
├── YYYY-MM-DD-HH-mm-ss/
│   ├── index.html              # 可视化报告
│   ├── report.json             # 结构化数据
│   ├── summary.md              # 执行摘要
│   ├── screenshots/            # 截图证据
│   ├── logs/                   # 详细日志
│   └── attachments/            # 附件
```

### 报告内容

#### 执行摘要
- 测试通过率: XX%
- 发现的缺陷: X个P1, X个P2, X个P3
- 发布建议: ✅ 可以发布 / ⚠️ 条件发布 / ❌ 阻止发布
- 关键风险: XXX

#### 详细结果
- 每个测试用例的状态和详情
- 失败截图和日志
- 性能指标图表
- 安全扫描结果

### 发布决策矩阵

| 分数 | 等级 | 决策 |
|------|------|------|
| 95-100 | A+ | ✅ 立即发布 |
| 85-94 | A | ✅ 可以发布 |
| 70-84 | B | ⚠️ 条件发布（需修复P1缺陷） |
| 50-69 | C | ❌ 阻止发布（需大量修复） |
| 0-49 | D | ❌ 严重阻止（需重构） |

---

## 🤖 多Agent协作流程

### Agent 1: Test Orchestrator (主控)

**职责**: 协调测试流程，分配任务，汇总结果

```yaml
steps:
  1. 解析用户需求
  2. 检测项目类型和技术栈
  3. 调用 Puppeteer Agent 进行 E2E 测试
  4. 调用 Code Expert 进行代码分析
  5. 调用 Model Search 获取测试方案
  6. 调用 Security Scanner 进行安全扫描
  7. 汇总所有结果
  8. 生成发布决策报告
```

### Agent 2: Puppeteer Agent (浏览器测试)

**职责**: Web应用的E2E测试

**触发条件**:
- 检测到 `package.json` 中有 `puppeteer` 或 `playwright`
- 用户明确说 "测试网站"、"E2E测试"
- 项目包含 `*.html` 或前端框架

**执行**:
```bash
# 使用 puppeteer-cli 技能
/skill puppeteer-cli navigate <url>
/skill puppeteer-cli screenshot --full-page
/skill puppeteer-cli evaluate "document.querySelector('button').click()"
```

### Agent 3: Code Expert Agent (代码分析)

**职责**: 深度代码审查、性能瓶颈、安全漏洞

**触发条件**:
- 用户说 "代码分析"、"安全审查"
- 发现复杂代码逻辑
- 性能问题排查

**执行**:
```bash
/skill th-code-expert analyze ./src
/skill th-code-expert security --scan-all
/skill th-code-expert performance --find-bottlenecks
```

### Agent 4: Model Search Agent (方案获取)

**职责**: 获取最佳测试实践

**触发条件**:
- 遇到不熟悉的测试场景
- 需要行业最佳实践
- 多方案对比决策

**执行**:
```bash
/skill model-compare-search "如何测试微服务架构的分布式事务"
/skill model-compare-search "React应用性能测试最佳实践"
```

### Agent 5: Security Scanner (安全扫描)

**职责**: 安全漏洞扫描、渗透测试

**触发条件**:
- 用户说 "安全测试"、"渗透测试"
- Web应用发布前
- API服务对外暴露

**执行**:
```bash
npm audit --audit-level=high
# 或
safety check
# 或
bandit -r ./src
```

### Agent 6: Report Generator (报告生成)

**职责**: 生成专业测试报告

**功能**:
- 数据可视化 (图表)
- 失败截图
- 日志聚合
- 发布建议

---

## 💡 使用示例

### 示例 1: Web应用商业化发布测试

**用户**: "我要把电商网站发布去卖钱了，帮我做最严格的测试"

**执行流程**:
```
1. 检测项目类型: React + Node.js Web应用
2. 启动多Agent协作:
   - Puppeteer Agent: 测试购物车、支付、登录流程
   - Code Expert: 检查支付逻辑安全性
   - Security Scanner: OWASP扫描
   - Model Search: 获取电商测试最佳实践
3. 运行所有测试维度:
   - 功能: 15个E2E用例
   - 性能: Lighthouse评分
   - 安全: 0高危漏洞
   - 兼容: 4浏览器 x 3设备
4. 生成报告:

═══════════════════════════════════════════════════════════════
                     测试结果汇总
═══════════════════════════════════════════════════════════════

┌────────────────┬────────┬───────┬─────────────────────────────────────┐
│     测试项     │  状态  │ 图标  │              详情                   │
├────────────────┼────────┼───────┼─────────────────────────────────────┤
│ Page Load      │ PASS   │ ✅    │ Title: "电商网站首页"                │
│ Element Check  │ PASS   │ ✅    │ Found: cart, pay, login             │
│ Connection Flow│ PASS   │ ✅    │ WebSocket connected                 │
│ Payment Flow   │ PASS   │ ✅    │ Payment processed successfully      │
│ Session Panel  │ FAIL   │ ❌    │ Session not persisting              │
│ Terminal Input │ PASS   │ ✅    │ Keyboard input working              │
│ Responsive     │ PASS   │ ✅    │ Mobile viewport renders correctly   │
│ Performance    │ PASS   │ ✅    │ Load time: 1.2s                     │
└────────────────┴────────┴───────┴─────────────────────────────────────┘

═══════════════════════════════════════════════════════════════
                        测试摘要
═══════════════════════════════════════════════════════════════
  总测试数: 8
  通过:     7
  失败:     1
  跳过:     0
  通过率:   87.5%
  评分等级: A
  用时:     45320ms
═══════════════════════════════════════════════════════════════

  ✅ 可以发布

═══════════════════════════════════════════════════════════════
                     关键证据摘要
═══════════════════════════════════════════════════════════════

  浏览器自动化测试成功验证了以下功能:

  ✅ 页面加载并正确渲染
  ✅ 关键元素（购物车、支付、登录）已找到
  ✅ WebSocket连接建立成功
  ✅ 支付流程功能正常
  ✅ 终端输入功能工作正常
  ✅ 响应式设计在移动端正确渲染
  ✅ 性能指标符合要求

  截图证据保存在: ./test-reports/screenshots/

═══════════════════════════════════════════════════════════════

  总分: 87.5/100 (A级)
  发现: 1个P2缺陷（Session持久化问题）
  建议: ✅ 可以发布（Session问题可延后修复）
```

### 示例 2: API服务发布测试

**用户**: "API要对外开放了，做企业级测试"

**执行流程**:
```
1. 检测项目类型: Go API服务
2. 执行测试:
   - API契约测试 (OpenAPI spec)
   - 负载测试 (k6)
   - 安全扫描 (JWT、SQL注入)
   - 依赖审计 (go.mod)
3. 生成报告:
   - 总分: 97/100 (A+级)
   - 建议: ✅ 立即发布
```

### 示例 3: CLI工具发布测试

**用户**: "我的CLI工具要发布到npm，需要测试"

**执行流程**:
```
1. 检测项目类型: Node.js CLI
2. 执行测试:
   - 命令测试 (所有子命令)
   - 跨平台测试 (Linux/Mac/Windows)
   - 帮助文档检查
   - npm包验证
3. 生成报告:
   - 总分: 91/100 (A级)
   - 建议: ✅ 可以发布
```

---

## 🚨 失败处理

### 关键失败 (阻止发布)

| 级别 | 场景 | 处理 |
|------|------|------|
| **P1 - 阻断** | 核心功能失败 | 立即停止测试，要求修复 |
| **P1 - 安全** | 高危漏洞 | 立即停止，强制修复 |
| **P1 - 性能** | 完全不可用 | 建议重构 |

### 非关键失败 (条件发布)

| 级别 | 场景 | 处理 |
|------|------|------|
| **P2** | 次要功能缺陷 | 记录，建议修复 |
| **P2** | 中危漏洞 | 记录，30天内修复 |
| **P3** | 样式问题 | 记录，下次迭代修复 |

---

## 🔗 集成CI/CD

### GitHub Actions

```yaml
name: Enterprise Test
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run Enterprise Test
        run: |
          claude /skill enterprise-test-agent --full --ci
      - name: Upload Report
        uses: actions/upload-artifact@v2
        with:
          name: test-report
          path: ./reports/
```

### GitLab CI

```yaml
test:
  script:
    - claude /skill enterprise-test-agent --full --ci
  artifacts:
    reports:
      junit: reports/junit.xml
```

---

## 📚 相关技能

- **puppeteer-cli**: 浏览器自动化测试
- **model-compare-search**: 多模型聚合搜索
- **th-code-expert**: 代码深度分析
- **code-review**: 代码审查
- **security-reviewer**: 安全审查

---

## ⚠️ 重要提示

1. **这是一个严苛的测试流程**，可能会发现大量问题
2. **商业化发布标准很高**，初次测试可能无法通过
3. **测试会消耗资源**，大型项目可能需要几十分钟
4. **报告会指出所有问题**，请准备好面对
5. **这是为你好**，现在发现问题比客户发现好

---

*最后更新: 2026-03-23 | 版本: v1.0.0 (商业化发布标准)*
