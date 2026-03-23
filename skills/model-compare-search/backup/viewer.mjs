#!/usr/bin/env node
/**
 * Model Compare Search - 结果查看器
 *
 * 功能:
 * - 列出所有历史会话
 * - 查看特定会话详情
 * - 统计模型成功率
 * - 导出结果
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const DATA_DIR = join(homedir(), '.claude', 'skills', 'model-compare-search', 'data');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// 获取所有会话
function getAllSessions() {
  if (!existsSync(DATA_DIR)) return [];

  const sessions = [];
  const entries = readdirSync(DATA_DIR);

  for (const entry of entries) {
    const metaPath = join(DATA_DIR, entry, 'meta.json');
    if (existsSync(metaPath)) {
      try {
        const meta = JSON.parse(readFileSync(metaPath, 'utf-8'));
        sessions.push({
          id: entry,
          ...meta
        });
      } catch (e) {
        // 忽略损坏的文件
      }
    }
  }

  // 按时间倒序
  return sessions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

// 列出会话
function listSessions(sessions, limit = 10) {
  if (sessions.length === 0) {
    console.log(`${colors.yellow}暂无搜索记录${colors.reset}`);
    return;
  }

  console.log(`\n${colors.bright}📋 最近 ${Math.min(limit, sessions.length)} 次搜索${colors.reset}\n`);
  console.log(`${colors.dim}ID | 时间 | 查询 | 成功率${colors.reset}`);
  console.log('-'.repeat(80));

  sessions.slice(0, limit).forEach((s, i) => {
    const date = new Date(s.timestamp).toLocaleString('zh-CN');
    const query = s.query.slice(0, 40) + (s.query.length > 40 ? '...' : '');
    const status = s.stats.success === s.stats.total
      ? colors.green
      : s.stats.success >= s.stats.total / 2
        ? colors.yellow
        : colors.red;
    console.log(`${i + 1}. ${colors.dim}${s.id.slice(0, 16)}${colors.reset} | ${date} | ${query} | ${status}${s.stats.success}/${s.stats.total}${colors.reset}`);
  });
  console.log();
}

// 查看特定会话
function showSession(sessionId) {
  const sessions = getAllSessions();
  const session = sessions.find(s => s.id === sessionId || s.id.startsWith(sessionId));

  if (!session) {
    console.log(`${colors.red}❌ 未找到会话: ${sessionId}${colors.reset}`);
    return;
  }

  const sessionDir = join(DATA_DIR, session.id);

  console.log(`\n${colors.bright}${colors.cyan}📊 会话详情${colors.reset}\n`);
  console.log(`${colors.bright}查询:${colors.reset} ${session.query}`);
  console.log(`${colors.bright}时间:${colors.reset} ${session.timestamp}`);
  console.log(`${colors.bright}类型:${colors.reset} ${session.task_type}`);
  console.log(`${colors.bright}成功率:${colors.reset} ${session.stats.success}/${session.stats.total} (${session.stats.success_rate})`);
  console.log(`${colors.bright}总Tokens:${colors.reset} ${session.stats.total_tokens}`);
  console.log(`${colors.bright}平均耗时:${colors.reset} ${session.stats.avg_duration_ms}ms`);
  console.log(`${colors.bright}目录:${colors.reset} ${sessionDir}\n`);

  // 模型详情
  console.log(`${colors.bright}模型结果:${colors.reset}\n`);
  session.models.forEach(m => {
    const status = m.success ? colors.green + '✅' : colors.red + '❌';
    const details = m.success
      ? `${m.duration}ms, ${m.tokens} tokens`
      : m.error || 'Unknown error';
    console.log(`  ${status} ${m.name}${colors.reset}`);
    console.log(`     ${colors.dim}${details}${colors.reset}`);
  });

  // 可用文件
  console.log(`\n${colors.bright}可用文件:${colors.reset}`);
  console.log(`  • ${join(sessionDir, 'meta.json')}`);
  console.log(`  • ${join(sessionDir, 'summary.md')}`);
  session.models.forEach(m => {
    if (m.success) {
      console.log(`  • ${join(sessionDir, 'models', m.name.replace(/[^a-zA-Z0-9_-]/g, '_'), 'response.md')}`);
    }
  });
  console.log();
}

// 统计模型成功率
function showStats() {
  const sessions = getAllSessions();

  if (sessions.length === 0) {
    console.log(`${colors.yellow}暂无数据用于统计${colors.reset}`);
    return;
  }

  const modelStats = {};

  sessions.forEach(s => {
    s.models.forEach(m => {
      if (!modelStats[m.name]) {
        modelStats[m.name] = { success: 0, failed: 0, total: 0, totalDuration: 0, totalTokens: 0 };
      }
      modelStats[m.name].total++;
      if (m.success) {
        modelStats[m.name].success++;
        modelStats[m.name].totalDuration += m.duration;
        modelStats[m.name].totalTokens += m.tokens;
      } else {
        modelStats[m.name].failed++;
      }
    });
  });

  console.log(`\n${colors.bright}📈 模型统计 (${sessions.length} 次会话)${colors.reset}\n`);
  console.log(`${colors.bright}模型 | 成功率 | 调用次数 | 平均耗时 | 平均Tokens${colors.reset}`);
  console.log('-'.repeat(80));

  const sortedModels = Object.entries(modelStats)
    .sort(([, a], [, b]) => b.total - a.total);

  sortedModels.forEach(([name, stats]) => {
    const rate = Math.round((stats.success / stats.total) * 100);
    const rateColor = rate >= 90 ? colors.green : rate >= 70 ? colors.yellow : colors.red;
    const avgDuration = stats.success > 0 ? Math.round(stats.totalDuration / stats.success) : 0;
    const avgTokens = stats.success > 0 ? Math.round(stats.totalTokens / stats.success) : 0;
    const shortName = name.split('/').pop() || name;
    console.log(`${shortName.padEnd(25)} | ${rateColor}${rate}%${colors.reset} | ${stats.total} | ${avgDuration}ms | ${avgTokens}`);
  });
  console.log();
}

// 导出会话
function exportSession(sessionId, format = 'json') {
  const sessions = getAllSessions();
  const session = sessions.find(s => s.id === sessionId || s.id.startsWith(sessionId));

  if (!session) {
    console.log(`${colors.red}❌ 未找到会话: ${sessionId}${colors.reset}`);
    return;
  }

  const sessionDir = join(DATA_DIR, session.id);

  if (format === 'json') {
    console.log(JSON.stringify(session, null, 2));
  } else if (format === 'markdown') {
    // 读取 summary.md
    const summaryPath = join(sessionDir, 'summary.md');
    if (existsSync(summaryPath)) {
      console.log(readFileSync(summaryPath, 'utf-8'));
    } else {
      console.log(`${colors.yellow}该会话没有 Markdown 总结${colors.reset}`);
    }
  }
}

// 主函数
function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'list';

  switch (command) {
    case 'list':
    case 'ls':
      const limit = parseInt(args[1]) || 10;
      listSessions(getAllSessions(), limit);
      break;

    case 'show':
    case 'view':
      if (!args[1]) {
        console.log(`${colors.red}用法: viewer.mjs show <session-id>${colors.reset}`);
        return;
      }
      showSession(args[1]);
      break;

    case 'stats':
    case 'stat':
      showStats();
      break;

    case 'export':
      if (!args[1]) {
        console.log(`${colors.red}用法: viewer.mjs export <session-id> [json|markdown]${colors.reset}`);
        return;
      }
      exportSession(args[1], args[2] || 'json');
      break;

    case 'help':
    default:
      console.log(`
${colors.bright}Model Compare Search - 结果查看器${colors.reset}

用法:
  viewer.mjs list [n]      列出最近 n 次搜索 (默认 10)
  viewer.mjs show <id>     查看特定会话详情
  viewer.mjs stats         显示模型统计
  viewer.mjs export <id>   导出会话 (json|markdown)
  viewer.mjs help          显示此帮助

示例:
  viewer.mjs list 5
  viewer.mjs show 2026-03-23T12-00-00
  viewer.mjs stats
  viewer.mjs export 2026-03-23T12-00-00 markdown
`);
  }
}

main();
