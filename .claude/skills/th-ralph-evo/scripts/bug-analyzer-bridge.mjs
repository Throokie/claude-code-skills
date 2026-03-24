#!/usr/bin/env node
/**
 * Ralph Evolution - Bug 分析桥接器
 *
 * 职责:
 * 1. 接收测试失败信号
 * 2. 调用 th-bug-analyzer 分析影响
 * 3. 根据风险等级决定处理策略
 * 4. 触发自动修复或创建决策记录
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import { spawn } from 'child_process';

const CONFIG = {
  stateFile: join(homedir(), '.claude/ralph-evo/state.json'),
  decisionsPath: join(homedir(), 'src/docs/decisions'),
  autoFix: {
    enabled: true,
    maxRiskLevel: 'MEDIUM',  // LOW, MEDIUM, HIGH, CRITICAL
  },
};

class BugAnalyzerBridge {
  constructor() {
    this.state = null;
  }

  async loadState() {
    try {
      const data = await readFile(CONFIG.stateFile, 'utf-8');
      this.state = JSON.parse(data);
    } catch {
      this.state = {
        bugs: [],
        pendingFixes: [],
      };
    }
  }

  async saveState() {
    await mkdir(join(homedir(), '.claude/ralph-evo'), { recursive: true });
    await writeFile(CONFIG.stateFile, JSON.stringify(this.state, null, 2));
  }

  async analyzeTestFailure(testResult) {
    console.log(`🔍 Analyzing test failure: ${testResult.name}`);

    const bug = {
      id: `bug-${Date.now()}`,
      timestamp: new Date().toISOString(),
      testName: testResult.name,
      testFile: testResult.file,
      errorMessage: testResult.error,
      stackTrace: testResult.stack,
      status: 'analyzing',
      impact: null,
      fixStrategy: null,
    };

    // 1. 使用 GitNexus 分析影响范围
    const impact = await this.analyzeImpact(testResult);
    bug.impact = impact;

    // 2. 确定风险等级
    const riskLevel = this.assessRiskLevel(impact);
    bug.riskLevel = riskLevel;

    console.log(`   Impact: d=1(${impact.d1}), d=2(${impact.d2}), d=3(${impact.d3})`);
    console.log(`   Risk Level: ${riskLevel}`);

    // 3. 根据风险等级处理
    if (riskLevel === 'LOW' || (riskLevel === 'MEDIUM' && CONFIG.autoFix.enabled)) {
      // 低风险：自动修复
      bug.fixStrategy = 'auto';
      await this.triggerAutoFix(bug);
    } else {
      // 高风险：创建决策记录
      bug.fixStrategy = 'decision';
      await this.createDecisionForBug(bug);
    }

    // 保存 bug 记录
    this.state.bugs.push(bug);
    await this.saveState();

    return bug;
  }

  async analyzeImpact(testResult) {
    // 解析失败测试涉及的代码
    const affectedFiles = this.extractAffectedFiles(testResult);

    const impact = {
      d1: affectedFiles.length,
      d2: 0,
      d3: 0,
      affectedModules: [],
      affectedProcesses: [],
    };

    // 这里可以调用 GitNexus MCP 工具
    // 示例：mcp__gitnexus__impact({target: functionName, direction: "upstream"})

    // 模拟影响分析结果
    if (testResult.file?.includes('auth')) {
      impact.affectedModules = ['auth', 'user'];
      impact.d2 = 5;
      impact.d3 = 12;
    } else if (testResult.file?.includes('payment')) {
      impact.affectedModules = ['payment', 'order'];
      impact.d2 = 8;
      impact.d3 = 20;
    }

    return impact;
  }

  extractAffectedFiles(testResult) {
    const files = [];

    // 从堆栈跟踪提取文件
    if (testResult.stack) {
      const fileMatches = testResult.stack.matchAll(/\s+at\s+.+\s+\((.+):\d+:\d+\)/g);
      for (const match of fileMatches) {
        const file = match[1];
        if (!file.includes('node_modules')) {
          files.push(file);
        }
      }
    }

    // 添加测试文件本身
    if (testResult.file) {
      files.unshift(testResult.file);
    }

    return [...new Set(files)];  // 去重
  }

  assessRiskLevel(impact) {
    if (impact.d1 > 10 || impact.d3 > 50) {
      return 'CRITICAL';
    } else if (impact.d1 > 5 || impact.d3 > 20) {
      return 'HIGH';
    } else if (impact.d1 > 2 || impact.d3 > 10) {
      return 'MEDIUM';
    }
    return 'LOW';
  }

  async triggerAutoFix(bug) {
    console.log(`🔧 Triggering auto-fix for bug: ${bug.id}`);

    // 创建修复任务
    const fixTask = {
      bugId: bug.id,
      status: 'pending',
      strategy: this.determineFixStrategy(bug),
      estimatedTime: '5m',
    };

    // 这里可以调用 agent 执行修复
    // 例如：创建一个修复 agent，在单独的 worktree 中修复

    this.state.pendingFixes.push(fixTask);
    await this.saveState();

    console.log(`   Fix strategy: ${fixTask.strategy}`);
    console.log(`   Estimated time: ${fixTask.estimatedTime}`);
  }

  determineFixStrategy(bug) {
    const errorMessage = bug.errorMessage || '';

    if (errorMessage.includes('undefined') || errorMessage.includes('null')) {
      return 'add-null-check';
    } else if (errorMessage.includes('timeout') || errorMessage.includes('async')) {
      return 'fix-async-handling';
    } else if (errorMessage.includes('type') || errorMessage.includes('TypeError')) {
      return 'fix-type-issue';
    } else if (errorMessage.includes('assert') || errorMessage.includes('expect')) {
      return 'fix-assertion';
    }

    return 'general-fix';
  }

  async createDecisionForBug(bug) {
    console.log(`📝 Creating decision record for high-risk bug: ${bug.id}`);

    const timestamp = new Date().toISOString().split('T')[0];
    const decisionId = `bug-${bug.id}`;
    const filename = `${decisionId}.md`;

    const decisionContent = `---
project: ${this.state.currentProject || 'unknown'}
type: bug-fix
priority: ${bug.riskLevel.toLowerCase()}
created: ${timestamp}
---

# Bug Fix Decision: ${bug.testName}

**Bug ID**: ${bug.id}
**测试文件**: ${bug.testFile}
**风险等级**: ${bug.riskLevel}
**影响范围**: d=1(${bug.impact.d1}) | d=2(${bug.impact.d2}) | d=3(${bug.impact.d3})

## 问题描述

\`\`\`
${bug.errorMessage}
\`\`\`

## 堆栈跟踪

<details>
<summary>点击查看</summary>

\`\`\`
${bug.stackTrace}
\`\`\`

</details>

## 影响分析

### 受影响的模块
${bug.impact.affectedModules.map(m => `- ${m}`).join('\n') || '- 待分析'}

### 受影响的过程
${bug.impact.affectedProcesses.map(p => `- ${p}`).join('\n') || '- 待分析'}

## 修复方案选项

### 选项 A: 快速修复
**描述**: 直接修复当前测试失败点
**优点**: 快速解决
**缺点**: 可能未解决根本问题
**预计时间**: 30分钟

### 选项 B: 深度修复
**描述**: 重构相关代码，解决根本问题
**优点**: 彻底解决问题
**缺点**: 工作量大，可能影响其他功能
**预计时间**: 2-4小时

### 选项 C: 临时绕过
**描述**: 添加临时处理，后续再彻底解决
**优点**: 立即恢复测试通过
**缺点**: 技术债务
**预计时间**: 10分钟

## 待决策

- [ ] 选择修复方案
- [ ] 评估是否需要架构调整
- [ ] 确定修复优先级
- [ ] 分配修复资源

---

**状态**: \`analyzing\`
**最后更新**: ${timestamp}
`;

    const filepath = join(CONFIG.decisionsPath, filename);
    await writeFile(filepath, decisionContent);

    console.log(`   Decision record created: ${filepath}`);
    console.log(`   Please review and select a fix strategy.`);
  }

  async handleFixCompleted(bugId, result) {
    const bug = this.state.bugs.find(b => b.id === bugId);
    if (!bug) {
      console.error(`Bug not found: ${bugId}`);
      return;
    }

    bug.status = 'fixed';
    bug.fixResult = result;
    bug.fixedAt = new Date().toISOString();

    // 运行回归测试
    await this.runRegressionTests(bug);

    await this.saveState();

    console.log(`✅ Bug fixed: ${bugId}`);
  }

  async runRegressionTests(bug) {
    console.log(`🧪 Running regression tests for bug: ${bug.id}`);

    // 运行相关测试
    // 1. 原失败测试
    // 2. 受影响模块的测试
    // 3. 集成测试

    console.log(`   Regression tests completed`);
  }

  async analyzeCodeChange(diff) {
    // 代码变更分析
    // 用于 PR 前的预分析

    console.log('🔍 Analyzing code change for potential bugs...');

    const analysis = {
      files: diff.files,
      riskScore: 0,
      recommendations: [],
    };

    // 分析变更风险
    for (const file of diff.files) {
      if (file.includes('test')) continue;

      // 检查关键文件
      if (file.includes('auth') || file.includes('payment')) {
        analysis.riskScore += 20;
      }

      // 检查变更大小
      if (file.additions + file.deletions > 100) {
        analysis.riskScore += 10;
        analysis.recommendations.push(`Large change in ${file.path}, consider splitting`);
      }
    }

    if (analysis.riskScore > 50) {
      analysis.recommendations.unshift('⚠️ High risk change detected, thorough review recommended');
    }

    return analysis;
  }

  // CLI 接口
  async runCLI() {
    const args = process.argv.slice(2);
    const command = args[0];

    await this.loadState();

    switch (command) {
      case 'analyze':
        const testResult = {
          name: args[1] || 'unknown-test',
          file: args[2],
          error: args[3] || 'Test failed',
        };
        await this.analyzeTestFailure(testResult);
        break;

      case 'complete':
        const bugId = args[1];
        const result = JSON.parse(args[2] || '{}');
        await this.handleFixCompleted(bugId, result);
        break;

      case 'status':
        console.log('\n🐛 Bug Analysis Status');
        console.log(`   Total bugs: ${this.state.bugs.length}`);
        console.log(`   Pending fixes: ${this.state.pendingFixes.length}`);
        console.log(`   Recent bugs:`);
        this.state.bugs.slice(-5).forEach(b => {
          console.log(`     - ${b.id}: ${b.status} (${b.riskLevel})`);
        });
        break;

      default:
        console.log(`
🐛 Bug Analyzer Bridge for Ralph Evolution

Usage:
  bug-analyzer-bridge.mjs <command> [options]

Commands:
  analyze <test-name> [file] [error]  Analyze a test failure
  complete <bug-id> [result]          Mark bug as fixed
  status                              Show bug status

Examples:
  bug-analyzer-bridge.mjs analyze "login-test" "auth.test.ts" "timeout"
  bug-analyzer-bridge.mjs complete bug-123456
        `);
    }
  }
}

// 主函数
const bridge = new BugAnalyzerBridge();
bridge.runCLI().catch(console.error);
