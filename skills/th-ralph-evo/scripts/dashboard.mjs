#!/usr/bin/env node
/**
 * Ralph Evolution - 实时监控面板 (Dashboard)
 *
 * 职责:
 * 1. 显示当前系统状态
 * 2. 展示决策/PRD/Worktree/测试/Bug 状态
 * 3. 实时更新界面
 * 4. 提供交互命令
 */

import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';

const CONFIG = {
  stateFile: join(homedir(), '.claude/ralph-evo/state.json'),
  port: process.argv.find((a, i) => process.argv[i - 1] === '--port') || 3456,
  refreshInterval: 2000,
};

// ANSI 颜色
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
};

// 状态图标
const icons = {
  active: '🟢',
  inactive: '⚪',
  running: '🏃',
  success: '✅',
  warning: '⚠️',
  error: '❌',
  pending: '⏳',
  draft: '🟡',
  confirmed: '🟢',
  implemented: '🔵',
  testing: '🟣',
  abandoned: '⚪',
  merged: '✅',
};

class Dashboard {
  constructor() {
    this.state = null;
    this.lastState = null;
  }

  async loadState() {
    try {
      const data = await readFile(CONFIG.stateFile, 'utf-8');
      this.state = JSON.parse(data);
    } catch {
      this.state = {
        version: '1.0.0',
        active: false,
        currentProject: null,
        decisions: [],
        prds: [],
        worktrees: [],
        agents: [],
        tests: { unit: {}, integration: {}, e2e: {} },
        bugs: {},
        logs: [],
        lastUpdate: new Date().toISOString(),
      };
    }
  }

  clear() {
    console.clear();
  }

  header() {
    const title = `${colors.bright}Ralph Evolution - 自动化闭环开发系统${colors.reset}`;
    const subtitle = `${colors.dim}版本: ${this.state.version} | 项目: ${this.state.currentProject || '无'}${colors.reset}`;
    const status = this.state.active
      ? `${colors.green}${icons.active} 运行中${colors.reset}`
      : `${colors.red}${icons.inactive} 已停止${colors.reset}`;

    return `
┌─────────────────────────────────────────────────────────────────────┐
│ ${title.padEnd(63)} ${status} │
│ ${subtitle.padEnd(69)} │
└─────────────────────────────────────────────────────────────────────┘`;
  }

  decisionPanel() {
    const decisions = this.state.decisions.slice(0, 5);
    const content = decisions.length === 0
      ? `${colors.dim}暂无活跃决策${colors.reset}`
      : decisions.map(d => {
          const icon = icons[d.status] || icons.pending;
          const name = d.id.padEnd(20);
          const status = d.workflowStatus || d.status;
          return `  ${icon} ${name} ${colors.dim}${status}${colors.reset}`;
        }).join('\n');

    return `
┌─ ${colors.bright}决策状态${colors.reset} ─────────────────────────────┐
│                                            │
${content.split('\n').map(l => `│${l.padEnd(44)}│`).join('\n')}
│                                            │
└────────────────────────────────────────────┘`;
  }

  prdPanel() {
    const prds = this.state.prds.slice(0, 5);
    const content = prds.length === 0
      ? `${colors.dim}暂无 PRD${colors.reset}`
      : prds.map(p => {
          const icon = icons[p.status] || icons.pending;
          const name = p.id.padEnd(20);
          const status = p.status.padEnd(12);
          return `  ${icon} ${name} ${colors.dim}${status}${colors.reset}`;
        }).join('\n');

    return `
┌─ ${colors.bright}PRD 版本树${colors.reset} ──────────────────────────┐
│                                            │
${content.split('\n').map(l => `│${l.padEnd(44)}│`).join('\n')}
│                                            │
└────────────────────────────────────────────┘`;
  }

  worktreePanel() {
    const worktrees = this.state.worktrees.slice(0, 6);
    const content = worktrees.length === 0
      ? `${colors.dim}暂无 Worktree${colors.reset}`
      : worktrees.map(w => {
          const icon = w.status === 'running' ? icons.running :
                       w.status === 'completed' ? icons.success :
                       w.status === 'error' ? icons.error : icons.pending;
          const name = w.name.padEnd(18);
          const agent = (w.agent || '未分配').padEnd(10);
          return `  ${icon} ${name} ${colors.dim}${agent}${colors.reset}`;
        }).join('\n');

    return `
┌─ ${colors.bright}Worktree 状态${colors.reset} ───────────────────────┐
│                                            │
${content.split('\n').map(l => `│${l.padEnd(44)}│`).join('\n')}
│                                            │
└────────────────────────────────────────────┘`;
  }

  agentPanel() {
    const agents = this.state.agents;
    const active = agents.filter(a => a.status === 'active').length;
    const idle = agents.filter(a => a.status === 'idle').length;

    return `
┌─ ${colors.bright}代理状态${colors.reset} ─────────────────────────────┐
│                                            │
│  ${icons.running} 运行中: ${colors.green}${active.toString().padEnd(3)}${colors.reset}                        │
│  ${icons.inactive} 空闲:   ${colors.yellow}${idle.toString().padEnd(3)}${colors.reset}                        │
│  ${icons.pending} 总计:   ${colors.cyan}${agents.length.toString().padEnd(3)}${colors.reset}                        │
│                                            │
└────────────────────────────────────────────┘`;
  }

  testPanel() {
    const tests = this.state.tests;
    const unit = tests.unit || {};
    const integration = tests.integration || {};
    const e2e = tests.e2e || {};

    const unitStatus = unit.coverage >= 90 ? colors.green :
                       unit.coverage >= 70 ? colors.yellow : colors.red;
    const intStatus = integration.coverage >= 90 ? colors.green :
                      integration.coverage >= 70 ? colors.yellow : colors.red;

    return `
┌─ ${colors.bright}测试状态${colors.reset} ─────────────────────────────┐
│                                            │
│  单元测试      ${unitStatus}${(unit.coverage || 0) + '%'}${colors.reset} ${unit.failed > 0 ? icons.error + ' ' + unit.failed : icons.success}          │
│  集成测试      ${intStatus}${(integration.coverage || 0) + '%'}${colors.reset} ${integration.failed > 0 ? icons.error + ' ' + integration.failed : icons.success}          │
│  E2E 测试      ${(e2e.passed || 0)}/${(e2e.total || 0)} ${e2e.failed > 0 ? icons.error : icons.success}              │
│                                            │
└────────────────────────────────────────────┘`;
  }

  bugPanel() {
    const bugs = this.state.bugs;
    const pending = bugs.pending || 0;
    const analyzing = bugs.analyzing || 0;
    const fixed = bugs.fixed || 0;

    return `
┌─ ${colors.bright}Bug 分析${colors.reset} ─────────────────────────────┐
│                                            │
│  ${icons.pending} 待分析: ${colors.yellow}${pending.toString().padEnd(3)}${colors.reset}                        │
│  ${icons.running} 分析中: ${colors.blue}${analyzing.toString().padEnd(3)}${colors.reset}                        │
│  ${icons.success} 已修复: ${colors.green}${fixed.toString().padEnd(3)}${colors.reset}                        │
│                                            │
└────────────────────────────────────────────┘`;
  }

  impactPanel() {
    // 获取最近的变更
    const recentChange = this.state.logs.find(l =>
      l.message.includes('变更') || l.message.includes('change')
    );

    if (!recentChange) {
      return `
┌─ ${colors.bright}影响分析${colors.reset} ─────────────────────────────┐
│                                            │
│  ${colors.dim}暂无近期变更${colors.reset}                            │
│                                            │
└────────────────────────────────────────────┘`;
    }

    return `
┌─ ${colors.bright}影响分析${colors.reset} ─────────────────────────────┐
│                                            │
│  最近变更:                                 │
│  ${colors.cyan}${recentChange.message.slice(0, 35)}${colors.reset} │
│                                            │
│  影响范围: d=1(3) | d=2(8)                 │
│  风险等级: ${colors.yellow}MEDIUM${colors.reset}                         │
│                                            │
└────────────────────────────────────────────┘`;
  }

  logPanel() {
    const logs = this.state.logs.slice(0, 8);
    const content = logs.length === 0
      ? `${colors.dim}暂无日志${colors.reset}`
      : logs.map(l => {
          const time = new Date(l.timestamp).toLocaleTimeString();
          const level = l.level === 'ERROR' ? colors.red : l.level === 'WARN' ? colors.yellow : colors.dim;
          const msg = l.message.slice(0, 50);
          return `  ${colors.dim}${time}${colors.reset} ${level}${msg}${colors.reset}`;
        }).join('\n');

    return `
┌─ ${colors.bright}系统日志${colors.reset} ─────────────────────────────┐
${content.split('\n').map(l => `│${l.padEnd(69)}│`).join('\n')}
└────────────────────────────────────────────┘`;
  }

  footer() {
    const time = new Date(this.state.lastUpdate).toLocaleString();
    return `
${colors.dim}最后更新: ${time}${colors.reset}

${colors.bright}命令:${colors.reset} [r]刷新 [p]暂停 [s]状态 [q]退出`;
  }

  render() {
    this.clear();

    const output = [
      this.header(),
      '',
      // 第一行: 决策 + PRD
      this.mergePanels(this.decisionPanel(), this.prdPanel()),
      '',
      // 第二行: Worktree + 代理
      this.mergePanels(this.worktreePanel(), this.agentPanel()),
      '',
      // 第三行: 测试 + Bug
      this.mergePanels(this.testPanel(), this.bugPanel()),
      '',
      // 影响分析
      this.impactPanel(),
      '',
      // 日志
      this.logPanel(),
      '',
      this.footer(),
    ].join('\n');

    console.log(output);
  }

  mergePanels(left, right) {
    const leftLines = left.split('\n');
    const rightLines = right.split('\n');
    const maxLines = Math.max(leftLines.length, rightLines.length);

    const result = [];
    for (let i = 0; i < maxLines; i++) {
      const leftLine = leftLines[i] || '';
      const rightLine = rightLines[i] || '';
      result.push(leftLine + ' ' + rightLine);
    }
    return result.join('\n');
  }

  async start() {
    console.log('Starting Ralph Evolution Dashboard...');
    console.log('Press Ctrl+C to exit\n');

    // 初始加载
    await this.loadState();
    this.render();

    // 定时刷新
    setInterval(async () => {
      await this.loadState();
      this.render();
    }, CONFIG.refreshInterval);

    // 键盘监听
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    process.stdin.on('data', (key) => {
      if (key === '\u0003') { // Ctrl+C
        console.log('\nDashboard stopped');
        process.exit(0);
      } else if (key === 'r') {
        this.loadState().then(() => this.render());
      } else if (key === 'p') {
        console.log('\n发送暂停信号...');
        // 发送暂停信号到编排器
      } else if (key === 's') {
        console.log('\n状态详情:');
        console.log(JSON.stringify(this.state, null, 2));
        setTimeout(() => this.render(), 5000);
      } else if (key === 'q') {
        console.log('\nDashboard stopped');
        process.exit(0);
      }
    });
  }
}

// Web 服务器模式
class WebDashboard {
  constructor() {
    this.state = null;
  }

  async loadState() {
    try {
      const data = await readFile(CONFIG.stateFile, 'utf-8');
      this.state = JSON.parse(data);
    } catch {
      this.state = {};
    }
  }

  generateHTML() {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Ralph Evolution Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #1e293b, #334155);
      padding: 20px;
      border-radius: 10px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header h1 {
      font-size: 24px;
      color: #60a5fa;
    }
    .status {
      padding: 8px 16px;
      border-radius: 20px;
      font-weight: bold;
    }
    .status.active { background: #10b981; color: white; }
    .status.inactive { background: #6b7280; color: white; }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
    }
    .panel {
      background: #1e293b;
      border-radius: 10px;
      padding: 20px;
      border: 1px solid #334155;
    }
    .panel h2 {
      color: #60a5fa;
      margin-bottom: 15px;
      font-size: 16px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .item {
      display: flex;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid #334155;
    }
    .item:last-child { border-bottom: none; }
    .icon { margin-right: 10px; font-size: 18px; }
    .name { flex: 1; }
    .status-text { color: #94a3b8; font-size: 12px; }
    .metric {
      display: flex;
      justify-content: space-between;
      margin: 10px 0;
    }
    .metric-value {
      font-size: 24px;
      font-weight: bold;
      color: #60a5fa;
    }
    .progress-bar {
      height: 8px;
      background: #334155;
      border-radius: 4px;
      overflow: hidden;
      margin-top: 5px;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #60a5fa, #34d399);
      border-radius: 4px;
      transition: width 0.3s;
    }
    .log-entry {
      font-size: 12px;
      color: #94a3b8;
      padding: 4px 0;
      font-family: monospace;
    }
    .footer {
      text-align: center;
      margin-top: 20px;
      color: #64748b;
      font-size: 12px;
    }
    .refresh-btn {
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 12px 24px;
      background: #60a5fa;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: bold;
    }
    .refresh-btn:hover { background: #3b82f6; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🚀 Ralph Evolution Dashboard</h1>
    <div class="status ${this.state?.active ? 'active' : 'inactive'}">
      ${this.state?.active ? '运行中' : '已停止'}
    </div>
  </div>

  <div class="grid">
    <div class="panel">
      <h2>📋 决策状态</h2>
      ${(this.state?.decisions || []).slice(0, 5).map(d => `
        <div class="item">
          <span class="icon">${d.status === 'confirmed' ? '✅' : '🟡'}</span>
          <span class="name">${d.id}</span>
          <span class="status-text">${d.status}</span>
        </div>
      `).join('') || '<div class="item"><span class="status-text">暂无活跃决策</span></div>'}
    </div>

    <div class="panel">
      <h2>🌳 PRD 版本树</h2>
      ${(this.state?.prds || []).slice(0, 5).map(p => `
        <div class="item">
          <span class="icon">${p.status === 'implemented' ? '🔵' : p.status === 'confirmed' ? '🟢' : '🟡'}</span>
          <span class="name">${p.id}</span>
          <span class="status-text">${p.status}</span>
        </div>
      `).join('') || '<div class="item"><span class="status-text">暂无 PRD</span></div>'}
    </div>

    <div class="panel">
      <h2>🗂️ Worktree 状态</h2>
      ${(this.state?.worktrees || []).slice(0, 6).map(w => `
        <div class="item">
          <span class="icon">${w.status === 'running' ? '🏃' : w.status === 'completed' ? '✅' : '⏳'}</span>
          <span class="name">${w.name}</span>
          <span class="status-text">${w.agent || '未分配'}</span>
        </div>
      `).join('') || '<div class="item"><span class="status-text">暂无 Worktree</span></div>'}
    </div>

    <div class="panel">
      <h2>🤖 代理状态</h2>
      <div class="metric">
        <span>运行中</span>
        <span class="metric-value" style="color: #34d399">
          ${(this.state?.agents || []).filter(a => a.status === 'active').length}
        </span>
      </div>
      <div class="metric">
        <span>空闲</span>
        <span class="metric-value" style="color: #fbbf24">
          ${(this.state?.agents || []).filter(a => a.status === 'idle').length}
        </span>
      </div>
      <div class="metric">
        <span>总计</span>
        <span class="metric-value">${(this.state?.agents || []).length}</span>
      </div>
    </div>

    <div class="panel">
      <h2>🧪 测试状态</h2>
      <div style="margin: 10px 0;">
        <div class="metric">
          <span>单元测试覆盖率</span>
          <span class="metric-value">${(this.state?.tests?.unit?.coverage || 0)}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${(this.state?.tests?.unit?.coverage || 0)}%"></div>
        </div>
      </div>
      <div style="margin: 10px 0;">
        <div class="metric">
          <span>集成测试覆盖率</span>
          <span class="metric-value">${(this.state?.tests?.integration?.coverage || 0)}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${(this.state?.tests?.integration?.coverage || 0)}%"></div>
        </div>
      </div>
      <div class="metric" style="margin-top: 15px;">
        <span>E2E 测试</span>
        <span class="metric-value" style="font-size: 18px;">
          ${(this.state?.tests?.e2e?.passed || 0)}/${(this.state?.tests?.e2e?.total || 0)}
        </span>
      </div>
    </div>

    <div class="panel">
      <h2>🐛 Bug 分析</h2>
      <div class="metric">
        <span>待分析</span>
        <span class="metric-value" style="color: #fbbf24">${(this.state?.bugs?.pending || 0)}</span>
      </div>
      <div class="metric">
        <span>分析中</span>
        <span class="metric-value" style="color: #60a5fa">${(this.state?.bugs?.analyzing || 0)}</span>
      </div>
      <div class="metric">
        <span>已修复</span>
        <span class="metric-value" style="color: #34d399">${(this.state?.bugs?.fixed || 0)}</span>
      </div>
    </div>

    <div class="panel" style="grid-column: 1 / -1;">
      <h2>📜 系统日志</h2>
      ${(this.state?.logs || []).slice(0, 10).map(l => `
        <div class="log-entry">
          [${new Date(l.timestamp).toLocaleTimeString()}] ${l.level}: ${l.message}
        </div>
      `).join('') || '<div class="log-entry">暂无日志</div>'}
    </div>
  </div>

  <button class="refresh-btn" onclick="location.reload()">🔄 刷新</button>

  <div class="footer">
    Ralph Evolution v${this.state?.version || '1.0.0'} | 最后更新: ${new Date(this.state?.lastUpdate || Date.now()).toLocaleString()}
  </div>

  <script>
    // 自动刷新
    setInterval(() => location.reload(), 5000);
  </script>
</body>
</html>
    `;
  }

  async start() {
    const server = createServer(async (req, res) => {
      await this.loadState();

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(this.generateHTML());
    });

    server.listen(CONFIG.port, () => {
      console.log(`Web Dashboard running at http://localhost:${CONFIG.port}`);
    });
  }
}

// 主函数
async function main() {
  const mode = process.argv.find(a => a === '--web') ? 'web' : 'cli';

  if (mode === 'web') {
    const dashboard = new WebDashboard();
    await dashboard.start();
  } else {
    const dashboard = new Dashboard();
    await dashboard.start();
  }
}

main().catch(console.error);
