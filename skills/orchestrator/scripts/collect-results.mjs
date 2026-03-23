#!/usr/bin/env node

/**
 * Orchestrator - Collect Results
 *
 * 收集子代理执行结果并聚合
 *
 * 用法：
 *   node collect-results.mjs                      # 收集所有结果
 *   node collect-results.mjs "Rust"               # 按任务过滤
 *   node collect-results.mjs --json               # 导出为 JSON
 *   node collect-results.mjs --aggregate --output report.md
 */

import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HOME = process.env.HOME;

// 解析命令行参数
function parseArgs(args) {
  const result = {
    filter: '',
    json: false,
    aggregate: false,
    output: null,
    stats: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--json') {
      result.json = true;
    } else if (arg === '--aggregate') {
      result.aggregate = true;
    } else if (arg === '--output' && args[i + 1]) {
      result.output = args[++i];
    } else if (arg === '--stats') {
      result.stats = true;
    } else if (!arg.startsWith('--')) {
      result.filter = arg;
    }
  }

  return result;
}

// 收集所有子代理结果
function collectResults(filter = '') {
  const sessionDir = `${HOME}/.claude/subagents`;
  const results = {
    completed: [],
    failed: [],
    pending: [],
    stats: {
      total: 0,
      completed: 0,
      failed: 0,
      pending: 0,
      byType: {}
    }
  };

  if (!existsSync(sessionDir)) {
    console.log('📁 子代理目录不存在，没有结果可收集');
    return results;
  }

  try {
    const files = readdirSync(sessionDir);

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const sessionPath = `${sessionDir}/${file}`;
      const session = JSON.parse(readFileSync(sessionPath, 'utf-8'));

      // 过滤
      if (filter && !session.task.toLowerCase().includes(filter.toLowerCase())) {
        continue;
      }

      // 统计
      results.stats.total++;
      const type = session.agentType || 'unknown';
      results.stats.byType[type] = (results.stats.byType[type] || 0) + 1;

      if (session.status === 'completed') {
        results.completed.push(session);
        results.stats.completed++;
      } else if (session.status === 'failed') {
        results.failed.push(session);
        results.stats.failed++;
      } else {
        results.pending.push(session);
        results.stats.pending++;
      }
    }

    // 按创建时间排序
    results.completed.sort((a, b) => new Date(a.created) - new Date(b.created));
    results.failed.sort((a, b) => new Date(a.created) - new Date(b.created));

  } catch (e) {
    console.error('读取结果失败:', e.message);
  }

  return results;
}

// 输出结果为 JSON
function outputJson(results) {
  console.log(JSON.stringify(results, null, 2));
}

// 输出统计信息
function outputStats(results) {
  const stats = results.stats;

  console.log('\n📊 子代理执行统计\n');
  console.log('='.repeat(40));
  console.log(`总数：    ${stats.total}`);
  console.log(`完成：    ${stats.completed} ✅`);
  console.log(`失败：    ${stats.failed} ❌`);
  console.log(`进行中：  ${stats.pending} ⏳`);
  console.log('');
  console.log('按类型分布:');
  for (const [type, count] of Object.entries(stats.byType)) {
    console.log(`  ${type}: ${count}`);
  }
  console.log('='.repeat(40));
}

// 输出详细结果
function outputResults(results) {
  const { completed, failed, pending } = results;

  if (completed.length === 0 && failed.length === 0 && pending.length === 0) {
    console.log('\n📭 没有找到子代理结果');
    return;
  }

  // 完成的任务
  if (completed.length > 0) {
    console.log(`\n✅ 完成的任务 (${completed.length})\n`);
    console.log('='.repeat(60));

    for (const session of completed) {
      console.log(`\n🆔 ${session.id}`);
      console.log(`📝 任务：${session.task}`);
      console.log(`🤖 类型：${session.agentType}`);
      console.log(`⏰ 完成：${new Date(session.completed).toLocaleString()}`);
      console.log('-'.repeat(60));

      // 输出结果摘要
      if (session.result) {
        const resultText = session.result.substring(0, 500);
        console.log(`${resultText}...`);
      }
    }
  }

  // 失败的任务
  if (failed.length > 0) {
    console.log(`\n\n❌ 失败的任务 (${failed.length})\n`);
    console.log('='.repeat(60));

    for (const session of failed) {
      console.log(`\n🆔 ${session.id}`);
      console.log(`📝 任务：${session.task}`);
      console.log(`🤖 类型：${session.agentType}`);
      console.log(`⏰ 失败：${new Date(session.failedAt).toLocaleString()}`);
      console.log(`⚠️  错误：${session.error}`);
    }
  }

  // 进行中的任务
  if (pending.length > 0) {
    console.log(`\n\n⏳ 进行中的任务 (${pending.length})\n`);
    console.log('='.repeat(60));

    for (const session of pending) {
      console.log(`\n🆔 ${session.id}`);
      console.log(`📝 任务：${session.task}`);
      console.log(`🤖 类型：${session.agentType}`);
      console.log(`⏰ 开始：${new Date(session.created).toLocaleString()}`);
    }
  }
}

// 聚合结果生成报告
function aggregateResults(results, outputFile) {
  const mdParts = [];

  mdParts.push('# 子代理执行报告\n');
  mdParts.push(`**生成时间**: ${new Date().toLocaleString()}\n`);

  // 统计摘要
  mdParts.push('## 📊 执行摘要\n');
  mdParts.push(`- **总任务数**: ${results.stats.total}`);
  mdParts.push(`- **完成**: ${results.stats.completed} ✅`);
  mdParts.push(`- **失败**: ${results.stats.failed} ❌`);
  mdParts.push(`- **成功率**: ${results.stats.total > 0 ? Math.round(results.stats.completed / results.stats.total * 100) : 0}%\n`);

  // 完成的报告
  if (results.completed.length > 0) {
    mdParts.push('\n## ✅ 完成的任务\n');

    for (const session of results.completed) {
      mdParts.push(`### ${session.id}\n`);
      mdParts.push(`**任务**: ${session.task}\n`);
      mdParts.push(`**类型**: ${session.agentType}\n`);
      mdParts.push(`**完成时间**: ${new Date(session.completed).toLocaleString()}\n`);

      if (session.result) {
        mdParts.push('\n**结果**:\n');
        mdParts.push(session.result);
        mdParts.push('\n');
      }

      mdParts.push('---\n');
    }
  }

  // 失败报告
  if (results.failed.length > 0) {
    mdParts.push('\n## ❌ 失败的任务\n');

    for (const session of results.failed) {
      mdParts.push(`### ${session.id}\n`);
      mdParts.push(`**任务**: ${session.task}\n`);
      mdParts.push(`**错误**: ${session.error}\n`);
      mdParts.push('---\n');
    }
  }

  const content = mdParts.join('\n');

  if (outputFile) {
    const outputPath = outputFile.startsWith('/') ? outputFile : `${process.cwd()}/${outputFile}`;
    const outputDir = dirname(outputPath);
    mkdirSync(outputDir, { recursive: true });
    writeFileSync(outputPath, content);
    console.log(`📄 报告已保存到：${outputFile}`);
  } else {
    console.log(content);
  }
}

// 主函数
function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🤖 Orchestrator - Collect Results

用法：
  node collect-results.mjs [过滤器] [选项]

选项：
  --json          导出为 JSON
  --aggregate     聚合结果生成报告
  --output <file> 输出到文件
  --stats         显示统计信息
  --help          显示帮助

示例：
  node collect-results.mjs                    # 显示所有结果
  node collect-results.mjs "Rust"             # 过滤包含"Rust"的任务
  node collect-results.mjs --json             # 导出 JSON
  node collect-results.mjs --aggregate --output report.md
`);
    process.exit(0);
  }

  const options = parseArgs(args);
  const results = collectResults(options.filter);

  // 输出模式
  if (options.json) {
    outputJson(results);
  } else if (options.aggregate) {
    aggregateResults(results, options.output);
  } else if (options.stats) {
    outputStats(results);
  } else {
    outputResults(results);
  }
}

main();
