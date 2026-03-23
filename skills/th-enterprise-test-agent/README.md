# Enterprise Test Agent

> **商业化软件发布测试 - 严苛质量门禁**

## 🎯 简介

Enterprise Test Agent 是一个企业级软件发布测试Agent，专为商业化软件设计。这不是普通的测试工具，而是软件商业化前的**最后一道防线**。

## ✨ 核心特性

- 🔴 **商业化发布标准** - 最严苛的质量要求
- 🤖 **多Agent协作** - Puppeteer + Code Expert + Model Search
- 📊 **6维度测试** - 功能/性能/安全/兼容/稳定/文档
- 📈 **发布决策矩阵** - A+到D级的量化评分
- 🔧 **多技术栈支持** - Node.js/Python/Go/Java/Rust

## 🚀 快速开始

### 方式 1: CLI直接调用

```bash
# 完整企业级测试
~/.claude/skills/enterprise-test-agent/scripts/test.sh --full

# Web应用测试
~/.claude/skills/enterprise-test-agent/scripts/test.sh --web

# API服务测试
~/.claude/skills/enterprise-test-agent/scripts/test.sh --api

# 安全扫描
~/.claude/skills/enterprise-test-agent/scripts/test.sh --security
```

### 方式 2: Claude Code自动触发

说出以下关键词，自动启动测试：

- **"我要发布软件去卖钱了"** - 最严格的商业化测试
- **"企业级测试"** - 企业标准全维度测试
- **"严苛测试"**、**"销售级测试"** - 最严格标准
- **"E2E测试"** - Web应用自动化测试
- **"API测试"** - 后端服务测试
- **"安全测试"** - 安全扫描+渗透测试

## 📋 测试维度

| 维度 | 权重 | 通过标准 |
|------|------|----------|
| 功能正确性 | 35% | 100%通过，0 P1/P2缺陷 |
| 性能表现 | 20% | P95<2s，错误率<0.1% |
| 安全合规 | 20% | 0高危，0中危漏洞 |
| 兼容性 | 15% | 4浏览器×3设备 |
| 稳定性 | 10% | 7×24小时无崩溃 |

## 📊 发布决策

| 分数 | 等级 | 决策 |
|------|------|------|
| 95-100 | A+ | ✅ 立即发布 |
| 85-94 | A | ✅ 可以发布 |
| 70-84 | B | ⚠️ 条件发布 |
| 50-69 | C | ❌ 阻止发布 |
| 0-49 | D | ❌ 严重阻止 |

## 🔧 配置

### 全局配置
`~/.claude/skills/enterprise-test-agent/config/config.yaml`

### 项目级配置
项目根目录创建 `.enterprise-test.yaml`:

```yaml
type: web
entry: ./src/index.ts
test: npm test

override:
  coverage:
    threshold: 85
```

## 🛠️ 集成技能

- **puppeteer-cli** - 浏览器自动化
- **model-compare-search** - 多模型聚合搜索
- **th-code-expert** - 代码深度分析
- **code-review** - 代码审查

## 📁 文件结构

```
enterprise-test-agent/
├── SKILL.md                 # 技能文档
├── scripts/
│   └── test.sh             # 主测试脚本
├── config/
│   ├── config.yaml         # 全局配置
│   └── project-example.yaml # 项目配置示例
├── agents/
│   └── README.md           # Agent定义
└── README.md               # 本文件
```

## 🚨 重要提示

1. **这是严苛的测试流程**，可能会发现大量问题
2. **商业化标准很高**，初次测试可能无法通过
3. **测试会消耗资源**，大型项目可能需要几十分钟
4. **报告会指出所有问题**，请准备好面对
5. **这是为你好**，现在发现问题比客户发现好

## 📄 许可证

MIT
