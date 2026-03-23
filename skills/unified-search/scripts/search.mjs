#!/usr/bin/env node
/**
 * Unified Search - 统一搜索工具主入口
 * Usage: unified-search <query> [options]
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = join(__dirname, '..', 'config', 'sources.json');

// 解析命令行参数
function parseArgs(args) {
  const options = {
    query: '',
    sources: [],
    count: 5,
    parallel: false,
    output: null,
    format: 'terminal',
    timeout: 30,
    curlUrl: null,
    ghRepo: null,
    verbose: false
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === '-h' || arg === '--help') {
      showHelp();
      process.exit(0);
    } else if (arg === '-s' || arg === '--sources') {
      options.sources = args[++i].split(',').map(s => s.trim());
    } else if (arg === '-c' || arg === '--count') {
      options.count = parseInt(args[++i]);
    } else if (arg === '-p' || arg === '--parallel') {
      options.parallel = true;
    } else if (arg === '-o' || arg === '--output') {
      options.output = args[++i];
    } else if (arg === '-f' || arg === '--format') {
      options.format = args[++i];
    } else if (arg === '-t' || arg === '--timeout') {
      options.timeout = parseInt(args[++i]);
    } else if (arg === '--curl-url') {
      options.curlUrl = args[++i];
    } else if (arg === '--gh-repo') {
      options.ghRepo = args[++i];
    } else if (arg === '-v' || arg === '--verbose') {
      options.verbose = true;
    } else if (!arg.startsWith('-') && !options.query) {
      options.query = arg;
    }
    i++;
  }

  return options;
}

// 显示帮助
function showHelp() {
  console.log(`
🔍 Unified Search - 统一搜索工具

Usage: unified-search <query> [options]

Options:
  -s, --sources <list>    指定搜索源，逗号分隔 (google,web,curl,git,file,gh)
  -c, --count <n>         每源结果数量 (默认: 5)
  -p, --parallel          并行模式（最快）
  -o, --output <file>     输出到文件
  -f, --format <format>   输出格式: terminal, markdown, json (默认: terminal)
  -t, --timeout <sec>     超时时间 (默认: 30)
  --curl-url <url>        curl 模式：指定 URL 模板，如 "https://api.example.com/search?q={query}"
  --gh-repo <repo>        GitHub 搜索：指定仓库，如 "owner/repo"
  -v, --verbose           详细输出
  -h, --help              显示帮助

Examples:
  unified-search "Golang context 最佳实践"
  unified-search "关键词" --sources google,web --parallel
  unified-search "TODO" --sources git --count 10
  unified-search "bug" --sources gh --gh-repo "myorg/myrepo"
  unified-search "error" --sources curl --curl-url "https://api.example.com/logs?q={query}"
`);
}

// 加载配置
function loadConfig() {
  try {
    const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
    return config;
  } catch (error) {
    console.error('Error loading config:', error.message);
    process.exit(1);
  }
}

// 打印状态行
function printStatus(sourceName, status, detail = '') {
  const statusEmoji = {
    'pending': '⏳',
    'requesting': '📡',
    'success': '✅',
    'error': '❌',
    'warning': '⚠️'
  };
  const emoji = statusEmoji[status] || '➡️';
  const statusText = {
    'pending': '等待中',
    'requesting': '请求中',
    'success': '正常',
    'error': '异常',
    'warning': '警告'
  }[status] || status;

  if (detail) {
    console.log(`${emoji} ${sourceName.padEnd(12)} | 状态: ${statusText.padEnd(6)} | ${detail}`);
  } else {
    console.log(`${emoji} ${sourceName.padEnd(12)} | 状态: ${statusText}`);
  }
}

// 执行搜索源
async function executeSource(sourceKey, source, query, count, timeout, verbose, statusCallback, options = {}) {
  const startTime = Date.now();

  try {
    let command;

    switch (sourceKey) {
      case 'google':
        command = `google-search "${query}" ${count}`;
        break;
      case 'web':
        command = `web-search "${query}" ${count}`;
        break;
      case 'curl':
        // curl 模式：直接请求 URL 或使用默认搜索
        if (options.curlUrl) {
          const url = options.curlUrl.replace('{query}', encodeURIComponent(query));
          command = `curl -sL --max-time ${timeout} "${url}" 2>&1 | head -c 10000`;
        } else {
          // 默认使用 DuckDuckGo 的 html 版本
          command = `curl -sL --max-time ${timeout} "https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}" 2>&1 | grep -oE '<a[^>]+class="result__a"[^>]+>[^<]+</a>' | head -${count}`;
        }
        break;
      case 'gh':
        // GitHub CLI 搜索
        if (options.ghRepo) {
          // 搜索指定仓库的 issues 和 PRs
          command = `gh search issues "${query}" --repo="${options.ghRepo}" --limit=${count} 2>/dev/null || gh search prs "${query}" --repo="${options.ghRepo}" --limit=${count} 2>/dev/null || echo "GitHub CLI 需要认证或未找到仓库"`;
        } else {
          // 全局搜索 issues
          command = `gh search issues "${query}" --limit=${count} 2>/dev/null || echo "GitHub CLI 需要认证或没有结果"`;
        }
        break;
      case 'git':
        command = `git log --all --oneline --grep="${query}" -n ${count} 2>/dev/null || echo "Git 搜索需要在工作目录中执行"`;
        break;
      case 'file':
        command = `exa --recursive --ignore-glob='.git|node_modules' . 2>/dev/null | grep -i "${query}" | head -${count} || find . -type f -name "*${query}*" 2>/dev/null | head -${count}`;
        break;
      default:
        throw new Error(`Unknown source: ${sourceKey}`);
    }

    if (verbose) {
      console.log(`🔧 Executing: ${command}`);
    }

    // 通知开始请求
    if (statusCallback) statusCallback(sourceKey, source.name, 'requesting');

    const result = execSync(command, {
      encoding: 'utf-8',
      timeout: timeout * 1000,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const duration = Date.now() - startTime;
    const resultLines = result.trim().split('\n').filter(l => l.trim());
    const resultCount = resultLines.length;

    return {
      source: sourceKey,
      name: source.name,
      success: true,
      result: result.trim(),
      resultCount: resultCount,
      duration: duration,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    let errorReason = error.message;

    // 分析错误类型
    if (error.message.includes('timeout')) {
      errorReason = '请求超时';
    } else if (error.message.includes('ENOENT')) {
      errorReason = '命令未找到';
    } else if (error.message.includes('ETIMEDOUT') || error.message.includes('ECONNREFUSED')) {
      errorReason = '网络连接失败';
    } else if (error.message.includes('empty') || error.message.includes('无结果')) {
      errorReason = '没有数据';
    }

    return {
      source: sourceKey,
      name: source.name,
      success: false,
      result: error.message,
      errorReason: errorReason,
      resultCount: 0,
      duration: duration,
      timestamp: new Date().toISOString()
    };
  }
}

// 并行执行搜索
async function executeParallel(sources, query, count, timeout, verbose, options) {
  const results = [];
  const pendingSources = Object.entries(sources);

  console.log('\n📋 搜索计划:');
  for (const [key, source] of pendingSources) {
    printStatus(source.name, 'pending');
  }
  console.log('');

  const promises = Object.entries(sources).map(([key, source]) => {
    return executeSource(key, source, query, count, timeout, verbose, (srcKey, srcName, status) => {
      printStatus(srcName, status);
    }, options).then(result => {
      // 打印完成状态
      if (result.success) {
        printStatus(result.name, 'success', `结果数: ${result.resultCount} | 耗时: ${result.duration}ms`);
      } else {
        printStatus(result.name, 'error', `原因: ${result.errorReason}`);
      }
      return result;
    });
  });

  return await Promise.all(promises);
}

// 串行执行搜索
async function executeSequential(sources, query, count, timeout, verbose, options) {
  const results = [];

  console.log('\n📋 开始搜索:');

  for (const [key, source] of Object.entries(sources)) {
    // 打印请求中状态
    printStatus(source.name, 'requesting');

    const result = await executeSource(key, source, query, count, timeout, verbose, null, options);

    // 打印完成状态
    if (result.success) {
      printStatus(result.name, 'success', `结果数: ${result.resultCount} | 耗时: ${result.duration}ms`);
    } else {
      printStatus(result.name, 'error', `原因: ${result.errorReason}`);
    }

    results.push(result);
  }

  return results;
}

// 打印汇总表格
function printSummary(results) {
  console.log('\n' + '═'.repeat(70));
  console.log('📊 搜索汇总');
  console.log('─'.repeat(70));
  console.log(`${'工具名称'.padEnd(12)} | ${'状态'.padEnd(8)} | ${'结果数'.padEnd(8)} | ${'耗时'.padEnd(10)} | 备注`);
  console.log('─'.repeat(70));

  for (const r of results) {
    const status = r.success ? '✅ 正常' : '❌ 异常';
    const resultCount = r.success ? String(r.resultCount).padEnd(8) : '-'.padEnd(8);
    const duration = `${r.duration}ms`.padEnd(10);
    const note = r.success
      ? (r.resultCount === 0 ? '无数据' : '')
      : r.errorReason;

    console.log(`${r.name.padEnd(12)} | ${status.padEnd(8)} | ${resultCount} | ${duration} | ${note}`);
  }

  console.log('─'.repeat(70));
  const successCount = results.filter(r => r.success).length;
  const failCount = results.length - successCount;
  const totalResults = results.reduce((sum, r) => sum + (r.resultCount || 0), 0);

  console.log(`总计: ${results.length} 个工具 | ✅ 成功: ${successCount} | ❌ 失败: ${failCount} | 📄 总结果: ${totalResults}`);
  console.log('═'.repeat(70));
}

// 格式化结果
function formatResults(results, format) {
  switch (format) {
    case 'json':
      return JSON.stringify(results, null, 2);

    case 'markdown':
      return formatMarkdown(results);

    case 'terminal':
    default:
      return formatTerminal(results);
  }
}

// 终端格式化
function formatTerminal(results) {
  const lines = [];

  lines.push('');
  lines.push('🔍 详细搜索结果');
  lines.push('═'.repeat(60));
  lines.push('');

  for (const r of results) {
    if (r.success && r.result) {
      lines.push(`\n【${r.name}】✅ ${r.duration}ms (${r.resultCount} 条结果)`);
      lines.push('─'.repeat(50));

      // 限制输出行数
      const resultLines = r.result.split('\n').slice(0, 10);
      lines.push(...resultLines);
      if (r.result.split('\n').length > 10) {
        lines.push(`... (${r.resultCount - 10} 条更多)`);
      }
    } else if (!r.success) {
      lines.push(`\n【${r.name}】❌ ${r.duration}ms`);
      lines.push('─'.repeat(50));
      lines.push(`错误: ${r.result.substring(0, 100)}`);
    }
  }

  lines.push('');
  return lines.join('\n');
}

// Markdown 格式化
function formatMarkdown(results) {
  const lines = [];

  lines.push('# 🔍 Unified Search Results');
  lines.push('');
  lines.push(`**搜索时间**: ${new Date().toLocaleString()}`);
  lines.push('');

  // 汇总表格
  lines.push('## 📊 搜索汇总');
  lines.push('');
  lines.push('| 工具 | 状态 | 结果数 | 耗时 | 备注 |');
  lines.push('|------|------|--------|------|------|');

  for (const r of results) {
    const status = r.success ? '✅ 正常' : '❌ 异常';
    const resultCount = r.success ? r.resultCount : '-';
    const duration = `${r.duration}ms`;
    const note = r.success
      ? (r.resultCount === 0 ? '无数据' : '')
      : (r.errorReason || '失败');
    lines.push(`| ${r.name} | ${status} | ${resultCount} | ${duration} | ${note} |`);
  }

  lines.push('');
  lines.push('## 📄 详细结果');
  lines.push('');

  for (const r of results) {
    lines.push(`### ${r.name} ${r.success ? '✅' : '❌'}`);
    lines.push('');
    lines.push(`- **耗时**: ${r.duration}ms`);
    lines.push(`- **时间戳**: ${r.timestamp}`);
    lines.push(`- **结果数**: ${r.resultCount || 0}`);
    lines.push('');

    if (r.success && r.result) {
      lines.push('```');
      lines.push(r.result);
      lines.push('```');
    } else {
      lines.push(`> 错误: ${r.result}`);
    }

    lines.push('');
  }

  return lines.join('\n');
}

// 主函数
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '-h' || args[0] === '--help') {
    showHelp();
    process.exit(0);
  }

  const options = parseArgs(args);

  if (!options.query) {
    console.error('❌ 错误: 请提供搜索关键词');
    showHelp();
    process.exit(1);
  }

  console.log(`\n🔍 Unified Search: "${options.query}"`);

  const config = loadConfig();

  // 选择搜索源
  let selectedSources = {};

  if (options.sources.length > 0) {
    for (const key of options.sources) {
      if (config.sources[key]) {
        selectedSources[key] = config.sources[key];
      }
    }
  } else {
    selectedSources = config.sources;
  }

  // 过滤掉禁用的源
  selectedSources = Object.fromEntries(
    Object.entries(selectedSources).filter(([_, s]) => s.enabled)
  );

  if (Object.keys(selectedSources).length === 0) {
    console.error('❌ 错误: 没有可用的搜索源');
    process.exit(1);
  }

  console.log(`📡 搜索源: ${Object.keys(selectedSources).join(', ')}`);
  if (options.curlUrl) console.log(`📎 curl URL: ${options.curlUrl}`);
  if (options.ghRepo) console.log(`📎 GitHub 仓库: ${options.ghRepo}`);
  console.log(`📊 并行模式: ${options.parallel ? '是' : '否'}`);

  // 执行搜索
  const startTime = Date.now();
  const execOptions = {
    curlUrl: options.curlUrl,
    ghRepo: options.ghRepo
  };
  const results = options.parallel
    ? await executeParallel(selectedSources, options.query, options.count, options.timeout, options.verbose, execOptions)
    : await executeSequential(selectedSources, options.query, options.count, options.timeout, options.verbose, execOptions);
  const totalDuration = Date.now() - startTime;

  // 打印汇总
  printSummary(results);

  // 格式化输出
  const output = formatResults(results, options.format);

  // 输出到文件或终端
  if (options.output) {
    const outputDir = dirname(options.output);
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    const fs = await import('fs');
    fs.writeFileSync(options.output, output);
    console.log(`\n💾 结果已保存到: ${options.output}`);
  } else {
    console.log(output);
  }

  // 自动保存到 /tmp 目录
  const fs = await import('fs');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const formatExt = options.format === 'terminal' ? 'md' : options.format;
  const tmpPath = `/tmp/unified-search-results-${timestamp}.${formatExt}`;

  // 为终端格式生成 Markdown 版本用于保存
  const outputToSave = options.format === 'terminal' ? formatResults(results, 'markdown') : output;
  fs.writeFileSync(tmpPath, outputToSave);
  console.log(`\n📁 自动保存到: ${tmpPath}`);

  console.log(`\n⏱️  总耗时: ${totalDuration}ms`);
}

main().catch(console.error);
