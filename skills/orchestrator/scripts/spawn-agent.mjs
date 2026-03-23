#!/usr/bin/env node

/**
 * Orchestrator - Spawn Agent
 *
 * 生成子代理并执行任务
 *
 * 用法：
 *   node spawn-agent.mjs "任务描述" --type researcher --parent-session abc123
 *   node spawn-agent.mjs "研究 Rust 异步" --type researcher --dry-run
 */

import { execSync } from 'child_process';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HOME = process.env.HOME;

// 子代理类型定义
const AGENT_TYPES = {
  researcher: {
    description: '研究搜索代理',
    prompt: 'researcher.md',
    timeout: 600000  // 10 分钟
  },
  builder: {
    description: '开发建设代理',
    prompt: 'builder.md',
    timeout: 900000  // 15 分钟
  },
  reviewer: {
    description: '代码审查代理',
    prompt: 'reviewer.md',
    timeout: 900000  // 15 分钟
  },
  archiver: {
    description: '文档归档代理',
    prompt: 'archiver.md',
    timeout: 300000  // 5 分钟
  },
  general: {
    description: '通用代理',
    prompt: null,
    timeout: 900000  // 15 分钟
  }
};

// 解析命令行参数
function parseArgs(args) {
  const result = {
    task: '',
    type: 'general',
    parentSession: null,
    timeout: null,
    dryRun: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--type' && args[i + 1]) {
      result.type = args[++i];
    } else if (arg === '--parent-session' && args[i + 1]) {
      result.parentSession = args[++i];
    } else if (arg === '--timeout' && args[i + 1]) {
      result.timeout = parseInt(args[++i]);
    } else if (arg === '--dry-run') {
      result.dryRun = true;
    } else if (!arg.startsWith('--')) {
      result.task += arg + ' ';
    }
  }

  result.task = result.task.trim();
  return result;
}

// 加载提示词模板
function loadPromptTemplate(type) {
  const templatePath = `${__dirname}/../prompts/${type}.md`;

  if (existsSync(templatePath)) {
    return readFileSync(templatePath, 'utf-8');
  }

  // 默认模板
  return `你是专门的 ${type} 代理。请完成以下任务：

{{TASK}}

任务要求：
1. 专注完成指定任务
2. 在结束时输出明确的结果总结
3. 如果遇到困难，说明具体原因

请以以下格式输出结果：
---
## 任务结果

**状态**: 完成/部分完成/失败

**结果摘要**:
（1-3 句话概括）

**详细内容**:
（具体内容）

**后续建议**:
（可选）
---`;
}

// 生成子代理
function spawnAgent(options) {
  const { task, type, parentSession, timeout, dryRun } = options;

  console.log(`🚀 启动子代理：${type}`);
  console.log(`📝 任务：${task}`);
  console.log(`⏱️  超时：${timeout || AGENT_TYPES[type]?.timeout || 300000}ms`);

  // 验证代理类型
  if (!AGENT_TYPES[type]) {
    console.error(`❌ 未知代理类型：${type}`);
    console.log('可用类型：', Object.keys(AGENT_TYPES).join(', '));
    process.exit(1);
  }

  // 生成子代理 ID
  const subAgentId = `subagent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const sessionDir = `${HOME}/.claude/subagents`;
  const sessionFile = `${sessionDir}/${subAgentId}.json`;

  mkdirSync(sessionDir, { recursive: true });

  // 创建会话记录
  const sessionData = {
    id: subAgentId,
    parentSession: parentSession || process.env.CLAUDE_SESSION_ID || 'unknown',
    agentType: type,
    task,
    created: new Date().toISOString(),
    status: 'pending'
  };

  // 构建提示词
  const template = loadPromptTemplate(type);
  const prompt = template.replace('{{TASK}}', task);

  // 干运行模式
  if (dryRun) {
    console.log('\n🔍 干运行模式 - 不执行任务\n');
    console.log('命令:');
    console.log(`  claude --prompt "${prompt.substring(0, 100)}..."`);
    console.log('\n会话记录:');
    console.log(JSON.stringify(sessionData, null, 2));
    return;
  }

  // 保存会话记录
  writeFileSync(sessionFile, JSON.stringify(sessionData, null, 2));

  console.log(`🆔 子代理 ID: ${subAgentId}`);
  console.log(`📁 会话记录：${sessionFile}`);
  console.log('\n⏳ 执行中...\n');

  try {
    // 执行 claude 命令
    const escapedPrompt = prompt.replace(/"/g, '\\"').replace(/\n/g, '\\n');
    const result = execSync(`claude -p "${escapedPrompt}"`, {
      encoding: 'utf-8',
      timeout: timeout || AGENT_TYPES[type]?.timeout || 300000,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        CLAUDE_SUBAGENT_ID: subAgentId,
        CLAUDE_PARENT_SESSION: parentSession || process.env.CLAUDE_SESSION_ID
      }
    });

    // 更新会话状态
    sessionData.status = 'completed';
    sessionData.result = result;
    sessionData.completed = new Date().toISOString();
    writeFileSync(sessionFile, JSON.stringify(sessionData, null, 2));

    console.log('\n✅ 子代理任务完成\n');
    console.log('='.repeat(50));
    console.log(result);
    console.log('='.repeat(50));

    return { success: true, result, subAgentId };

  } catch (error) {
    // 更新会话状态
    sessionData.status = 'failed';
    sessionData.error = error.message;
    sessionData.failedAt = new Date().toISOString();
    writeFileSync(sessionFile, JSON.stringify(sessionData, null, 2));

    console.error('\n❌ 子代理任务失败\n');
    console.error('错误信息:', error.message);

    if (error.signal === 'SIGTERM') {
      console.error('\n⚠️  任务超时，被终止');
    }

    return { success: false, error: error.message, subAgentId };
  }
}

// 主函数
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
🤖 Orchestrator - Spawn Agent

用法：
  node spawn-agent.mjs "任务描述" [选项]

选项：
  --type <type>           代理类型 (researcher/builder/reviewer/archiver/general)
  --parent-session <id>   父会话 ID
  --timeout <ms>          超时时间（毫秒）
  --dry-run               只打印命令，不执行
  --help                  显示帮助

示例：
  node spawn-agent.mjs "搜索 Rust 异步教程" --type researcher
  node spawn-agent.mjs "开发登录页面" --type builder --timeout 600000
  node spawn-agent.mjs "审查这段代码" --type reviewer --dry-run
`);
    process.exit(0);
  }

  const options = parseArgs(args);

  if (!options.task) {
    console.error('❌ 请提供任务描述');
    process.exit(1);
  }

  spawnAgent(options);
}

main();
