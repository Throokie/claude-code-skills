#!/usr/bin/env node

/**
 * Orchestrator - Route Intent
 *
 * 根据意图自动路由到合适的子代理，支持多代理协作
 *
 * 用法：
 *   node route-intent.mjs "研究 Rust 异步并整理成文档"
 *   node route-intent.mjs "开发一个用户登录系统" --plan-only
 */

import { execSync } from 'child_process';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HOME = process.env.HOME;
const ORCHESTRATOR_DIR = `${HOME}/src/user-scripts/skills/agents/orchestrator`;

// 意图路由规则
const INTENT_RULES = [
  {
    patterns: ['搜索', '研究', '调研', '查找', '对比', '分析'],
    agentType: 'researcher',
    description: '研究搜索'
  },
  {
    patterns: ['开发', '实现', '构建', '编写', '创建', '做个', '写个'],
    agentType: 'builder',
    description: '开发建设'
  },
  {
    patterns: ['review', '审查', '检查', '优化', '重构'],
    agentType: 'reviewer',
    description: '代码审查'
  },
  {
    patterns: ['总结', '归档', '记录', '整理成', '生成文档'],
    agentType: 'archiver',
    description: '文档归档'
  }
];

// 解析用户输入，识别多个意图
function parseMultiIntent(input) {
  const subtasks = [];
  const inputLower = input.toLowerCase();

  // 分割连接词
  const connectors = ['并', '并且', '然后', '再', '同时', '和', '，', ','];
  let segments = [input];

  for (const connector of connectors) {
    const newSegments = [];
    for (const segment of segments) {
      const parts = segment.split(connector);
      newSegments.push(...parts.map(p => p.trim()).filter(p => p.length > 0));
    }
    segments = newSegments;
  }

  // 为每个片段识别意图
  for (const segment of segments) {
    if (segment.length < 3) continue;

    const intent = recognizeIntent(segment);
    subtasks.push({
      description: segment,
      agentType: intent.agentType,
      priority: intent.priority
    });
  }

  // 如果只识别到一个任务，用原始输入
  if (subtasks.length <= 1) {
    const intent = recognizeIntent(input);
    return [{
      description: input,
      agentType: intent.agentType,
      priority: 1
    }];
  }

  return subtasks;
}

// 识别单个意图
function recognizeIntent(segment) {
  const inputLower = segment.toLowerCase();

  for (const rule of INTENT_RULES) {
    for (const pattern of rule.patterns) {
      if (inputLower.includes(pattern.toLowerCase())) {
        return {
          agentType: rule.agentType,
          priority: 1,
          description: rule.description
        };
      }
    }
  }

  // 默认通用代理
  return {
    agentType: 'general',
    priority: 2,
    description: '通用任务'
  };
}

// 生成执行计划
function generatePlan(subtasks) {
  const plan = {
    id: `plan-${Date.now()}`,
    created: new Date().toISOString(),
    subtasks: [],
    estimatedTime: 0
  };

  for (let i = 0; i < subtasks.length; i++) {
    const subtask = subtasks[i];
    const timeEstimate = {
      researcher: 600000,   // 10 分钟
      builder: 900000,      // 15 分钟
      reviewer: 900000,     // 15 分钟
      archiver: 300000,     // 5 分钟
      general: 900000       // 15 分钟
    };

    plan.subtasks.push({
      id: `task-${i + 1}`,
      description: subtask.description,
      agentType: subtask.agentType,
      dependsOn: i > 0 ? [`task-${i}`] : [],
      timeout: timeEstimate[subtask.agentType] || 300000
    });

    plan.estimatedTime += timeEstimate[subtask.agentType] || 300000;
  }

  return plan;
}

// 执行子代理
function executeSubtask(subtask, planId, parentSession) {
  console.log(`\n🚀 执行子任务：${subtask.id}`);
  console.log(`📝 描述：${subtask.description}`);
  console.log(`🤖 代理：${subtask.agentType}`);

  const spawnScript = `${ORCHESTRATOR_DIR}/scripts/spawn-agent.mjs`;
  const command = `node ${spawnScript} "${subtask.description}" --type ${subtask.agentType} --timeout ${subtask.timeout}`;

  try {
    const result = execSync(command, {
      encoding: 'utf-8',
      timeout: subtask.timeout + 60000,
      stdio: 'inherit',
      env: {
        ...process.env,
        CLAUDE_PLAN_ID: planId,
        CLAUDE_SUBTASK_ID: subtask.id,
        CLAUDE_PARENT_SESSION: parentSession || process.env.CLAUDE_SESSION_ID
      }
    });

    return { success: true, result, subtask };
  } catch (error) {
    console.error(`❌ 子任务失败：${error.message}`);
    return { success: false, error: error.message, subtask };
  }
}

// 聚合结果
function aggregateResults(results, plan) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 任务执行完成 - 结果聚合');
  console.log('='.repeat(60));

  const completed = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`\n✅ 完成：${completed.length}/${results.length}`);
  console.log(`❌ 失败：${failed.length}/${results.length}`);

  if (failed.length > 0) {
    console.log('\n⚠️  失败任务:');
    for (const result of failed) {
      console.log(`  - ${result.subtask.id}: ${result.error}`);
    }
  }

  console.log('\n' + '='.repeat(60));
}

// 主函数
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
🤖 Orchestrator - Route Intent

用法：
  node route-intent.mjs "任务描述" [选项]

选项：
  --plan-only      只生成计划，不执行
  --parallel       并行执行子代理（实验性）
  --dry-run        只打印计划，不执行
  --help           显示帮助

示例：
  node route-intent.mjs "研究 Rust 异步并整理成文档"
  node route-intent.mjs "开发登录系统" --plan-only
`);
    process.exit(0);
  }

  const planOnly = args.includes('--plan-only');
  const dryRun = args.includes('--dry-run');
  const parallel = args.includes('--parallel');
  const userInput = args.filter(a => !a.startsWith('--')).join(' ');

  if (!userInput) {
    console.error('❌ 请提供任务描述');
    process.exit(1);
  }

  console.log('\n🧠 Orchestrator - 意图分析\n');
  console.log('='.repeat(50));
  console.log(`用户输入：${userInput}`);
  console.log('='.repeat(50));

  // 解析多意图
  const subtasks = parseMultiIntent(userInput);

  console.log(`\n📋 识别到 ${subtasks.length} 个子任务:\n`);
  for (let i = 0; i < subtasks.length; i++) {
    const task = subtasks[i];
    console.log(`  ${i + 1}. [${task.agentType}] ${task.description}`);
  }

  // 生成计划
  const plan = generatePlan(subtasks);

  console.log(`\n📝 执行计划:`);
  console.log(`  计划 ID: ${plan.id}`);
  console.log(`  子任务数：${plan.subtasks.length}`);
  console.log(`  预计时间：${Math.round(plan.estimatedTime / 60000)} 分钟`);

  // 只生成计划模式
  if (planOnly || dryRun) {
    console.log('\n🔍 计划模式 - 不执行任务');
    console.log('\n详细计划:');
    console.log(JSON.stringify(plan, null, 2));

    // 保存计划
    const plansDir = `${HOME}/.claude/orchestrator/plans`;
    mkdirSync(plansDir, { recursive: true });
    const planFile = `${plansDir}/${plan.id}.json`;
    writeFileSync(planFile, JSON.stringify(plan, null, 2));
    console.log(`\n📁 计划已保存：${planFile}`);

    process.exit(0);
  }

  // 确认执行
  console.log('\n⏳ 开始执行子代理...\n');

  const results = [];

  if (parallel) {
    // 并行执行（实验性）
    console.log('⚠️  并行模式尚未完全实现，使用串行执行');
  }

  // 串行执行子任务
  for (const subtask of plan.subtasks) {
    const result = executeSubtask(subtask, plan.id, process.env.CLAUDE_SESSION_ID);
    results.push(result);

    // 如果失败且有关联依赖，跳过后续
    if (!result.success && subtask.dependsOn.length > 0) {
      console.log('\n⚠️  由于前置任务失败，后续任务可能无法继续');
    }
  }

  // 聚合结果
  aggregateResults(results, plan);

  // 保存执行结果
  const resultsFile = `${HOME}/.claude/orchestrator/results/${plan.id}-results.json`;
  mkdirSync(dirname(resultsFile), { recursive: true });
  writeFileSync(resultsFile, JSON.stringify({
    plan,
    results,
    completed: new Date().toISOString()
  }, null, 2));

  console.log(`\n📁 结果已保存：${resultsFile}`);
}

main();
