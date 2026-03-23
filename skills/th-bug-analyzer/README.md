# th-bug-analyzer

一个利用 GitNexus 知识图谱分析 Bug 影响范围的 Skill 和 Agent，支持 Playwright 前端/UI 测试分析。

## 功能

当你给出代码中的问题位置，这个工具会：
- 自动分析**上游依赖**（哪些代码调用了有问题的函数）
- 分析**下游依赖**（有问题的函数调用了哪些代码）
- 评估**风险等级**（LOW/MEDIUM/HIGH/CRITICAL）
- 生成**结构化报告**（按影响深度分类）
- 提供**修复建议**（测试策略、回滚方案）
- **Playwright 集成**（前端/UI bug 截图、多浏览器测试、E2E 测试失败分析）

## 安装

```bash
# Skill 安装
ln -s ~/.claude/skills/th-bug-analyzer ~/.claude/skills/active/th-bug-analyzer

# Agent 安装（可选，用于更复杂的分析场景）
# Agent 会自动在需要时激活
```

## 使用方式

### 方式1: 作为 Skill 自动触发

只要你说以下关键词，Skill 会自动激活：
- "分析这个bug的影响"
- "看看这个函数影响了哪些地方"
- "检查修改的影响范围"
- "找一下关联的代码"
- "评估风险"

### 方式2: 显式调用

```
/skill bug-impact-analyzer
```

### 方式3: 作为 Agent 深度分析

```
/bug-impact-analyzer-agent analyze impact of function X
```

## 使用示例

### 示例 1: 分析函数影响
```
用户: validateUser 函数有个bug，帮我看看影响范围

AI: 正在分析 validateUser 的影响...

# Impact Analysis: validateUser

## Summary
- Risk Level: HIGH
- Direct Dependencies: 12
- Indirect Dependencies: 28
- Total Affected: 40

## Direct Impact (d=1) - WILL BREAK
| Symbol | Type | File | Relationship |
|--------|------|------|--------------|
| login | Function | auth.ts:45 | Calls validateUser |
| register | Function | auth.ts:78 | Calls validateUser |
...

## Recommendations
1. 检查所有登录相关流程
2. 运行 auth 模块的完整测试
3. 考虑使用 feature flag 控制修复发布
```

### 示例 2: 分析类的影响
```
用户: UserService 类需要重构，看看影响

AI: 正在分析 UserService 类及其方法的影响...
```

### 示例 3: 分析未提交的变更
```
用户: 我改了一些代码，看看影响范围

AI: 正在检测未提交的变更并分析影响...
```

### 示例 4: 分析前端/UI Bug（Playwright 集成）
```
用户: 登录页面在移动端显示异常，帮我分析一下

AI: 正在使用 Playwright 捕获页面状态并分析影响...

# Frontend Bug Analysis: Login Page Mobile Display

## Visual Evidence
- **Screenshot (Desktop)**: ![Desktop](/tmp/bug-desktop.png)
- **Screenshot (Mobile)**: ![Mobile](/tmp/bug-mobile.png)
- **Cross-browser Test**: Issue confirmed in Chromium, Firefox, WebKit

## Environment
- **URL**: http://localhost:3000/login
- **Viewport**: 375x667 (iPhone 12)
- **Browsers Affected**: All

## Code Impact
[Standard GitNexus impact analysis for related components]

## Recommended Fix
1. Check responsive CSS for login form
2. Verify viewport meta tag
3. Test media queries at 375px breakpoint
```

## GitNexus 集成

这个 Skill 深度集成了 GitNexus MCP 工具：

- **mcp__gitnexus__impact**: 分析代码影响范围
- **mcp__gitnexus__context**: 获取符号的360度上下文
- **mcp__gitnexus__query**: 查询执行流程
- **mcp__gitnexus__detect_changes**: 检测变更影响
- **mcp__gitnexus__cypher**: 执行自定义 Cypher 查询

## Playwright 集成

用于前端/UI/E2E 测试失败的分析：

### 支持的 Playwright 命令
```bash
# 截图分析
playwright screenshot --full-page <url> /tmp/bug-current.png

# 多浏览器测试
playwright screenshot -b chromium <url> /tmp/bug-chromium.png
playwright screenshot -b firefox <url> /tmp/bug-firefox.png
playwright screenshot -b webkit <url> /tmp/bug-webkit.png

# 移动端测试
playwright screenshot --device="iPhone 12" <url> /tmp/bug-mobile.png

# 生成复现脚本
playwright codegen <url>

# E2E 测试追踪
playwright test --trace on
playwright show-trace test-results/trace.zip
```

### 前端 Bug 分析触发词
- "UI 显示异常"
- "页面截图"
- "E2E 测试失败"
- "跨浏览器问题"
- "响应式布局问题"

## 风险等级说明

| 等级 | 条件 | 处理方式 |
|------|------|----------|
| **CRITICAL** | >20直接调用者，或影响认证/安全 | 必须用户确认后才能修改 |
| **HIGH** | 5-20直接调用者，或影响主要功能 | 建议多视角审查 |
| **MEDIUM** | 2-5直接调用者 | 标准审查流程 |
| **LOW** | 0-1直接调用者 | 可直接修改 |

## 工作流程集成

这个 Skill 是**鲁棒性修复工作流**的第一步：

1. **Bug Impact Analyzer** (本 Skill) → 分析影响范围
2. **code-reviewer** → 审查修复代码
3. **security-reviewer** → 安全检查
4. **tdd-guide** → 编写回归测试

## 配置

无需额外配置，但需要：
- GitNexus MCP 服务器已配置
- 代码库已被 GitNexus 索引
- **Playwright**（可选，用于前端/UI 分析）：`npm install -g playwright`

## 故障排除

### 如果目标找不到
- 检查拼写是否正确
- 尝试不同的命名风格 (camelCase vs snake_case)
- 确认文件已被 GitNexus 索引

### 如果影响分析为空
- 可能是一个新函数，还没有被调用
- 可能是测试代码或内部工具函数
- 可以尝试手动 Grep 搜索

## 文件结构

```
bug-impact-analyzer/
├── SKILL.md              # Skill 定义
├── README.md             # 本文件
└── agents/
    └── bug-impact-analyzer.md  # Agent 定义
```

## 与其他 Skill 的关系

- **code-review**: 在分析完影响后，使用 code-review 审查修复代码
- **security-reviewer**: 如果涉及输入验证或权限，先进行安全审查
- **tdd-guide**: 根据影响范围编写针对性的回归测试
- **robust-fix-workflow**: 本 Skill 是该工作流的第一步
- **puppeteer-cli**: 另一个浏览器自动化工具，可与 Playwright 互为补充

## 更新日志
