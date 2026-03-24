#!/usr/bin/env node
/**
 * Ralph Evolution - 中央编排器 (Core Orchestrator)
 *
 * 职责:
 * 1. 监听决策文件变更
 * 2. 协调 PRD 生命周期
 * 3. 管理多代理团队
 * 4. 处理 Bug 分析闭环
 * 5. 输出状态到 Dashboard
 */

import { watch } from 'fs/promises';
import { readFile, writeFile, access } from 'fs/promises';
import { spawn } from 'child_process';
import { join } from 'path';
import { homedir } from 'os';

// 配置
const CONFIG = {
  decisionsPath: join(homedir(), 'src/docs/decisions'),
  prdPath: join(homedir(), 'src/docs/prd'),
  stateFile: join(homedir(), '.claude/ralph-evo/state.json'),
  dashboardPort: 3456,
  pollInterval: 5000, // 5秒轮询
};

// 状态管理
class StateManager {
  constructor() {
    this.state = {
      version: '1.0.0',
      active: false,
      currentProject: null,
      decisions: [],
      prds: [],
      worktrees: [],
      agents: [],
      tests: {
        unit: { passed: 0, failed: 0, coverage: 0 },
        integration: { passed: 0, failed: 0, coverage: 0 },
        e2e: { passed: 0, failed: 0 },
      },
      bugs: {
        pending: 0,
        analyzing: 0,
        fixed: 0,
      },
      logs: [],
      lastUpdate: new Date().toISOString(),
    };
  }

  async load() {
    try {
      const data = await readFile(CONFIG.stateFile, 'utf-8');
      this.state = JSON.parse(data);
      this.log('State loaded from file');
    } catch {
      this.log('No existing state, starting fresh');
    }
  }

  async save() {
    this.state.lastUpdate = new Date().toISOString();
    await writeFile(CONFIG.stateFile, JSON.stringify(this.state, null, 2));
  }

  log(message, level = 'INFO') {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };
    this.state.logs.unshift(entry);
    if (this.state.logs.length > 100) {
      this.state.logs.pop();
    }
    console.log(`[${level}] ${message}`);
  }

  updateDecision(decision) {
    const idx = this.state.decisions.findIndex(d => d.id === decision.id);
    if (idx >= 0) {
      this.state.decisions[idx] = { ...this.state.decisions[idx], ...decision };
    } else {
      this.state.decisions.push(decision);
    }
    this.save();
  }

  updatePRD(prd) {
    const idx = this.state.prds.findIndex(p => p.id === prd.id);
    if (idx >= 0) {
      this.state.prds[idx] = { ...this.state.prds[idx], ...prd };
    } else {
      this.state.prds.push(prd);
    }
    this.save();
  }

  updateWorktree(worktree) {
    const idx = this.state.worktrees.findIndex(w => w.name === worktree.name);
    if (idx >= 0) {
      this.state.worktrees[idx] = { ...this.state.worktrees[idx], ...worktree };
    } else {
      this.state.worktrees.push(worktree);
    }
    this.save();
  }

  updateAgent(agent) {
    const idx = this.state.agents.findIndex(a => a.name === agent.name);
    if (idx >= 0) {
      this.state.agents[idx] = { ...this.state.agents[idx], ...agent };
    } else {
      this.state.agents.push(agent);
    }
    this.save();
  }
}

// 决策监控器
class DecisionMonitor {
  constructor(stateManager) {
    this.state = stateManager;
    this.watching = false;
  }

  async start() {
    this.watching = true;
    this.state.log('Starting decision monitor...');

    try {
      const watcher = watch(CONFIG.decisionsPath, { recursive: true });

      for await (const event of watcher) {
        if (event.filename?.endsWith('.md')) {
          await this.handleDecisionChange(event.filename);
        }
      }
    } catch (err) {
      this.state.log(`Watch error: ${err.message}`, 'ERROR');
      // 降级到轮询模式
      this.startPolling();
    }
  }

  async handleDecisionChange(filename) {
    this.state.log(`Decision file changed: ${filename}`);

    // 解析决策文件
    const decision = await this.parseDecisionFile(filename);

    // 如果决策已确认，自动触发下一步
    if (decision.status === 'confirmed') {
      await this.triggerPRDCreation(decision);
    }
  }

  async parseDecisionFile(filename) {
    // 简化解析，实际实现会更复杂
    return {
      id: filename.replace('.md', ''),
      filename,
      status: 'confirmed', // 从文件内容解析
      timestamp: new Date().toISOString(),
    };
  }

  async triggerPRDCreation(decision) {
    this.state.log(`Triggering PRD creation for decision: ${decision.id}`);

    // 更新状态
    this.state.updateDecision({
      ...decision,
      workflowStatus: 'prd_creating',
    });

    // 这里可以触发 th-deep-coder2 进行深度调研
    // 然后创建 PRD
  }

  startPolling() {
    this.state.log('Starting polling mode...');
    setInterval(async () => {
      // 轮询检查文件变更
    }, CONFIG.pollInterval);
  }
}

// PRD 同步器
class PRDSync {
  constructor(stateManager) {
    this.state = stateManager;
  }

  async syncFromEvolution() {
    this.state.log('Syncing PRD status from prd-evolution...');

    try {
      // 读取 prd-evolution 的 tree.md
      const treePath = join(CONFIG.prdPath, 'tree.md');
      const content = await readFile(treePath, 'utf-8');

      // 解析 PRD 树
      const prds = this.parsePRDTree(content);

      for (const prd of prds) {
        this.state.updatePRD(prd);

        // 如果 PRD 状态变为 confirmed，触发代码实现
        if (prd.status === 'confirmed' && !prd.implementationStarted) {
          await this.triggerImplementation(prd);
        }
      }
    } catch (err) {
      this.state.log(`PRD sync error: ${err.message}`, 'ERROR');
    }
  }

  parsePRDTree(content) {
    // 简化实现
    const prds = [];
    const lines = content.split('\n');

    for (const line of lines) {
      // 匹配类似: feature-name (🔵 已实现)
      const match = line.match(/([\w-]+)\s*\(([🔵🟡🟢⚪🟣✅])\s*([^)]+)\)/);
      if (match) {
        prds.push({
          id: match[1],
          icon: match[2],
          status: this.iconToStatus(match[2]),
          description: match[3],
        });
      }
    }

    return prds;
  }

  iconToStatus(icon) {
    const map = {
      '🔵': 'implemented',
      '🟡': 'draft',
      '🟢': 'confirmed',
      '⚪': 'abandoned',
      '🟣': 'testing',
      '✅': 'merged',
    };
    return map[icon] || 'unknown';
  }

  async triggerImplementation(prd) {
    this.state.log(`Triggering implementation for PRD: ${prd.id}`);

    // 更新 PRD 状态
    this.state.updatePRD({
      ...prd,
      implementationStarted: true,
      workflowStatus: 'implementing',
    });

    // 触发 prd-to-code 多代理实现
    // 这里可以调用 prd-to-code 的逻辑
  }
}

// Bug 分析桥接
class BugAnalyzerBridge {
  constructor(stateManager) {
    this.state = stateManager;
  }

  async analyzeTestFailure(testResult) {
    this.state.log(`Analyzing test failure: ${testResult.name}`);

    // 创建 bug 分析任务
    const bug = {
      id: `bug-${Date.now()}`,
      testName: testResult.name,
      status: 'analyzing',
      timestamp: new Date().toISOString(),
    };

    this.state.bugs.analyzing++;
    await this.state.save();

    // 触发 th-bug-analyzer
    // 这里可以调用 bug 分析 agent

    return bug;
  }

  async handleFixProposal(bugId, fix) {
    this.state.log(`Received fix proposal for bug: ${bugId}`);

    // 评估修复方案
    // 如果影响大，创建决策记录
    if (fix.impact === 'high') {
      await this.createDecisionForFix(bugId, fix);
    } else {
      // 直接应用修复
      await this.applyFix(bugId, fix);
    }
  }

  async createDecisionForFix(bugId, fix) {
    this.state.log(`Creating decision record for high-impact fix: ${bugId}`);

    // 生成决策记录文件
    const decisionContent = `
## Bug Fix Decision: ${bugId}

**问题**: ${fix.description}

**影响范围**: ${fix.impactFiles.join(', ')}

**风险等级**: ${fix.impact}

**建议方案**:
${fix.proposal}

**待确认**:
- [ ] 是否接受此修复方案
- [ ] 是否需要更全面的重构
`;

    // 写入决策文件
    const decisionPath = join(CONFIG.decisionsPath, `bug-${bugId}.md`);
    await writeFile(decisionPath, decisionContent);

    this.state.log(`Decision record created: ${decisionPath}`);
  }

  async applyFix(bugId, fix) {
    this.state.log(`Applying fix for bug: ${bugId}`);
    // 实际应用修复
  }
}

// 主编排器
class Orchestrator {
  constructor() {
    this.state = new StateManager();
    this.decisionMonitor = new DecisionMonitor(this.state);
    this.prdSync = new PRDSync(this.state);
    this.bugBridge = new BugAnalyzerBridge(this.state);
    this.running = false;
  }

  async init() {
    await this.state.load();
    this.state.log('Orchestrator initialized');
  }

  async start(projectName = null) {
    if (this.running) {
      console.log('Orchestrator already running');
      return;
    }

    this.running = true;
    this.state.state.active = true;

    if (projectName) {
      this.state.state.currentProject = projectName;
    }

    await this.state.save();
    this.state.log(`Orchestrator started for project: ${projectName || 'none'}`);

    // 启动各个组件
    this.decisionMonitor.start();
    this.startPRDSync();
    this.startDashboard();
  }

  async stop() {
    this.running = false;
    this.state.state.active = false;
    await this.state.save();
    this.state.log('Orchestrator stopped');
  }

  startPRDSync() {
    // 定期同步 PRD 状态
    setInterval(async () => {
      await this.prdSync.syncFromEvolution();
    }, CONFIG.pollInterval);
  }

  startDashboard() {
    // 启动 Dashboard 服务
    const dashboard = spawn('node', [
      join(__dirname, 'dashboard.mjs'),
      '--port', CONFIG.dashboardPort.toString(),
    ], {
      stdio: 'inherit',
    });

    this.state.log(`Dashboard started on port ${CONFIG.dashboardPort}`);
  }

  async getStatus() {
    return {
      ...this.state.state,
      uptime: Date.now() - new Date(this.state.state.lastUpdate).getTime(),
    };
  }
}

// CLI 接口
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const orchestrator = new Orchestrator();
  await orchestrator.init();

  switch (command) {
    case 'start':
      const project = args.find((a, i) => args[i - 1] === '--project') || args[1];
      await orchestrator.start(project);
      break;

    case 'stop':
      await orchestrator.stop();
      break;

    case 'status':
      const status = await orchestrator.getStatus();
      console.log(JSON.stringify(status, null, 2));
      break;

    case 'trigger':
      // 手动触发工作流
      const triggerType = args[1];
      const target = args[2];
      console.log(`Triggering ${triggerType} for ${target}`);
      break;

    default:
      console.log(`
Ralph Evolution Orchestrator

Usage:
  orchestrator.mjs <command> [options]

Commands:
  start [--project <name>]  Start the orchestrator
  stop                      Stop the orchestrator
  status                    Show current status
  trigger <type> <target>   Manually trigger workflow

Examples:
  orchestrator.mjs start --project user-auth
  orchestrator.mjs status
  orchestrator.mjs trigger prd prd-user-auth-v1
      `);
  }
}

main().catch(console.error);
