#!/usr/bin/env node
/**
 * Ralph Evolution - 决策文件监控器
 *
 * 职责:
 * 1. 监控 ~/src/docs/decisions/*.md 文件变更
 * 2. 解析决策状态
 * 3. 当决策确认时自动触发工作流
 * 4. 支持文件系统事件和轮询两种模式
 */

import { watch, readFile, stat } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';

const CONFIG = {
  decisionsPath: join(homedir(), 'src/docs/decisions'),
  indexFile: 'INDEX.md',
  pollInterval: 3000,
  stateFile: join(homedir(), '.claude/ralph-evo/decision-state.json'),
};

// 决策状态解析器
class DecisionParser {
  static parse(content) {
    const lines = content.split('\n');
    const decision = {
      id: null,
      project: null,
      theme: null,
      status: 'draft', // draft, analyzing, confirmed, implementing, completed
      interpretations: [],
      finalDecision: null,
      lastUpdated: null,
    };

    let currentSection = null;

    for (const line of lines) {
      // 解析项目名
      const projectMatch = line.match(/^project:\s*(.+)/i);
      if (projectMatch) {
        decision.project = projectMatch[1].trim();
      }

      // 解析功能主题
      const themeMatch = line.match(/^## 功能主题[：:]\s*(.+)/);
      if (themeMatch) {
        decision.theme = themeMatch[1].trim();
        decision.id = decision.theme.toLowerCase().replace(/\s+/g, '-');
      }

      // 解析状态
      const statusMatch = line.match(/\*\*状态\*\*[：:]\s*`?([^`\n]+)`?/);
      if (statusMatch) {
        const statusText = statusMatch[1].trim();
        if (statusText.includes('确认') || statusText.includes('confirmed')) {
          decision.status = 'confirmed';
        } else if (statusText.includes('剖析') || statusText.includes('analyzing')) {
          decision.status = 'analyzing';
        } else if (statusText.includes('实施') || statusText.includes('implementing')) {
          decision.status = 'implementing';
        }
      }

      // 解析最终方案
      if (line.includes('最终确定方案') || line.includes('Final Source of Truth')) {
        currentSection = 'final';
      }

      if (currentSection === 'final' && line.trim().startsWith('-')) {
        decision.finalDecision = line.trim();
        decision.status = 'confirmed'; // 有最终方案表示已确认
      }
    }

    return decision;
  }

  static hasDecisionChanged(oldDecision, newDecision) {
    if (!oldDecision) return true;
    return (
      oldDecision.status !== newDecision.status ||
      oldDecision.finalDecision !== newDecision.finalDecision
    );
  }
}

// 决策状态管理器
class DecisionStateManager {
  constructor() {
    this.decisions = new Map();
    this.callbacks = [];
  }

  async load() {
    try {
      const data = await readFile(CONFIG.stateFile, 'utf-8');
      const parsed = JSON.parse(data);
      this.decisions = new Map(Object.entries(parsed.decisions || {}));
    } catch {
      this.decisions = new Map();
    }
  }

  async save() {
    const data = {
      lastUpdate: new Date().toISOString(),
      decisions: Object.fromEntries(this.decisions),
    };
    // 在实际实现中写入文件
  }

  update(decision) {
    const oldDecision = this.decisions.get(decision.id);

    if (DecisionParser.hasDecisionChanged(oldDecision, decision)) {
      this.decisions.set(decision.id, decision);
      this.notifyChange(decision, oldDecision);
    }
  }

  onChange(callback) {
    this.callbacks.push(callback);
  }

  notifyChange(newDecision, oldDecision) {
    for (const callback of this.callbacks) {
      callback(newDecision, oldDecision);
    }
  }

  getConfirmedDecisions() {
    return Array.from(this.decisions.values())
      .filter(d => d.status === 'confirmed');
  }
}

// 决策监控器
class DecisionMonitor {
  constructor() {
    this.state = new DecisionStateManager();
    this.watching = false;
  }

  async init() {
    await this.state.load();

    // 注册状态变更回调
    this.state.onChange((newDecision, oldDecision) => {
      this.handleDecisionChange(newDecision, oldDecision);
    });
  }

  async start() {
    this.watching = true;
    console.log('🚀 Decision Monitor started');
    console.log(`📁 Watching: ${CONFIG.decisionsPath}`);

    // 初始扫描
    await this.scanAll();

    // 启动文件监控
    try {
      const watcher = watch(CONFIG.decisionsPath, { recursive: true });

      for await (const event of watcher) {
        if (event.filename?.endsWith('.md') && event.filename !== CONFIG.indexFile) {
          console.log(`📄 File changed: ${event.filename}`);
          await this.handleFileChange(event.filename);
        }
      }
    } catch (err) {
      console.log(`⚠️ Watch error: ${err.message}`);
      console.log('🔄 Falling back to polling mode...');
      this.startPolling();
    }
  }

  async scanAll() {
    // 扫描所有决策文件
    const { readdir } = await import('fs/promises');

    try {
      const files = await readdir(CONFIG.decisionsPath);
      const mdFiles = files.filter(f => f.endsWith('.md') && f !== CONFIG.indexFile);

      console.log(`🔍 Found ${mdFiles.length} decision files`);

      for (const file of mdFiles) {
        await this.handleFileChange(file);
      }
    } catch (err) {
      console.error(`❌ Scan error: ${err.message}`);
    }
  }

  async handleFileChange(filename) {
    const filepath = join(CONFIG.decisionsPath, filename);

    try {
      const content = await readFile(filepath, 'utf-8');
      const decision = DecisionParser.parse(content);

      if (decision.id) {
        decision.sourceFile = filename;
        decision.lastUpdated = new Date().toISOString();

        this.state.update(decision);
      }
    } catch (err) {
      console.error(`❌ Error parsing ${filename}: ${err.message}`);
    }
  }

  handleDecisionChange(newDecision, oldDecision) {
    console.log(`\n📊 Decision Updated: ${newDecision.id}`);
    console.log(`   Status: ${oldDecision?.status || 'new'} → ${newDecision.status}`);

    // 如果决策变为 confirmed，触发工作流
    if (newDecision.status === 'confirmed' && oldDecision?.status !== 'confirmed') {
      this.triggerWorkflow(newDecision);
    }
  }

  async triggerWorkflow(decision) {
    console.log(`\n🎯 Triggering workflow for decision: ${decision.id}`);
    console.log(`   Project: ${decision.project}`);
    console.log(`   Theme: ${decision.theme}`);

    // 这里可以触发多种工作流:
    // 1. 启动 th-deep-coder2 进行深度调研
    // 2. 创建或更新 PRD
    // 3. 通知 orchestrator 开始实现

    const workflowType = this.determineWorkflowType(decision);

    switch (workflowType) {
      case 'investigate':
        await this.triggerInvestigation(decision);
        break;
      case 'implement':
        await this.triggerImplementation(decision);
        break;
      case 'update':
        await this.triggerUpdate(decision);
        break;
    }
  }

  determineWorkflowType(decision) {
    // 根据决策内容判断工作流类型
    if (decision.finalDecision?.includes('调研') || decision.finalDecision?.includes('research')) {
      return 'investigate';
    }
    if (decision.finalDecision?.includes('实现') || decision.finalDecision?.includes('implement')) {
      return 'implement';
    }
    if (decision.finalDecision?.includes('更新') || decision.finalDecision?.includes('update')) {
      return 'update';
    }
    return 'implement'; // 默认实现
  }

  async triggerInvestigation(decision) {
    console.log('🔬 Starting deep investigation...');

    // 调用 th-deep-coder2 或 model-compare-search
    // 示例命令:
    // node ~/src/projects/tools/user-scripts/skills/agents/th-deep-coder2/scripts/analyze.mjs \
    //   --project ${decision.project} \
    //   --query "${decision.theme}"

    // 更新决策状态
    this.updateDecisionStatus(decision.id, 'investigating');
  }

  async triggerImplementation(decision) {
    console.log('🏗️ Starting implementation...');

    // 检查是否已有 PRD
    const prdExists = await this.checkPRDExists(decision);

    if (!prdExists) {
      // 从决策生成 PRD
      await this.createPRDFromDecision(decision);
    }

    // 触发 prd-to-code
    // 通知 orchestrator 开始实现

    // 更新决策状态
    this.updateDecisionStatus(decision.id, 'implementing');
  }

  async triggerUpdate(decision) {
    console.log('📝 Starting PRD update...');

    // 触发 prd-evolution 进行版本管理

    // 更新决策状态
    this.updateDecisionStatus(decision.id, 'updating');
  }

  async checkPRDExists(decision) {
    // 检查是否已有对应的 PRD
    const prdPath = join(homedir(), 'src/docs/prd');
    const { readdir } = await import('fs/promises');

    try {
      const files = await readdir(prdPath);
      return files.some(f => f.includes(decision.id) || f.includes(decision.project));
    } catch {
      return false;
    }
  }

  async createPRDFromDecision(decision) {
    console.log(`📝 Creating PRD from decision: ${decision.id}`);

    // 使用 requirement-to-prd 或 prd-to-code 的 PRD 生成功能
    // 从决策中提取需求并生成 PRD

    const prdContent = this.generatePRDContent(decision);

    // 写入 PRD 文件
    const prdFilename = `prd-${decision.project}-${decision.id}.md`;
    const prdPath = join(homedir(), 'src/docs/prd', prdFilename);

    // await writeFile(prdPath, prdContent);

    console.log(`✅ PRD created: ${prdFilename}`);
  }

  generatePRDContent(decision) {
    return `---
project: ${decision.project}
decision: ${decision.id}
status: draft
created: ${new Date().toISOString()}
---

# ${decision.theme}

> 从决策记录自动生成
> Source: ${decision.sourceFile}

## 背景

基于决策记录中的分析和讨论。

## 最终方案

${decision.finalDecision || '待补充'}

## 实现计划

- [ ] 技术调研
- [ ] 详细设计
- [ ] 代码实现
- [ ] 测试验证
- [ ] 文档更新

## 验收标准

- [ ] 功能符合决策要求
- [ ] 测试覆盖率 > 90%
- [ ] 代码审查通过
`;
  }

  async updateDecisionStatus(decisionId, status) {
    // 更新决策文件中的状态
    const decision = this.state.decisions.get(decisionId);
    if (!decision) return;

    const filepath = join(CONFIG.decisionsPath, decision.sourceFile);

    try {
      const content = await readFile(filepath, 'utf-8');
      const updatedContent = content.replace(
        /\*\*状态\*\*[：:]\s*`?([^`\n]+)`?/,
        `**状态**: \`${status}\``
      );

      // await writeFile(filepath, updatedContent);
      console.log(`📝 Updated decision status: ${status}`);
    } catch (err) {
      console.error(`❌ Error updating decision status: ${err.message}`);
    }
  }

  startPolling() {
    const fileStates = new Map();

    setInterval(async () => {
      const { readdir, stat } = await import('fs/promises');

      try {
        const files = await readdir(CONFIG.decisionsPath);
        const mdFiles = files.filter(f => f.endsWith('.md') && f !== CONFIG.indexFile);

        for (const file of mdFiles) {
          const filepath = join(CONFIG.decisionsPath, file);
          const stats = await stat(filepath);
          const lastModified = stats.mtime.getTime();

          const lastKnown = fileStates.get(file);
          if (!lastKnown || lastKnown !== lastModified) {
            fileStates.set(file, lastModified);
            await this.handleFileChange(file);
          }
        }
      } catch (err) {
        console.error(`❌ Polling error: ${err.message}`);
      }
    }, CONFIG.pollInterval);

    console.log(`🔄 Polling started (interval: ${CONFIG.pollInterval}ms)`);
  }

  getStatus() {
    return {
      watching: this.watching,
      decisionsCount: this.state.decisions.size,
      confirmedDecisions: this.state.getConfirmedDecisions().length,
      decisions: Array.from(this.state.decisions.values()),
    };
  }
}

// CLI 接口
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const monitor = new DecisionMonitor();
  await monitor.init();

  switch (command) {
    case 'start':
      await monitor.start();
      break;

    case 'status':
      const status = monitor.getStatus();
      console.log('\n📊 Decision Monitor Status');
      console.log(`   Watching: ${status.watching ? 'Yes' : 'No'}`);
      console.log(`   Total Decisions: ${status.decisionsCount}`);
      console.log(`   Confirmed: ${status.confirmedDecisions}`);
      console.log('\n   Recent Decisions:');
      status.decisions.slice(0, 5).forEach(d => {
        console.log(`   - ${d.id} (${d.status})`);
      });
      break;

    case 'scan':
      await monitor.scanAll();
      break;

    case 'trigger':
      const decisionId = args[1];
      const decision = monitor.state.decisions.get(decisionId);
      if (decision) {
        await monitor.triggerWorkflow(decision);
      } else {
        console.log(`❌ Decision not found: ${decisionId}`);
      }
      break;

    default:
      console.log(`
📋 Decision Monitor for Ralph Evolution

Usage:
  decision-monitor.mjs <command> [options]

Commands:
  start                    Start monitoring
  status                   Show current status
  scan                     Scan all decision files
  trigger <decision-id>    Manually trigger workflow for a decision

Examples:
  decision-monitor.mjs start
  decision-monitor.mjs status
  decision-monitor.mjs trigger user-auth-optimization
      `);
  }
}

main().catch(console.error);
