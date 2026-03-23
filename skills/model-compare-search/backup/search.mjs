#!/usr/bin/env node
/**
 * Model Compare Search - 多模型对比搜索 (v5.0)
 *
 * 改进特性:
 * - 智能重试机制（指数退避）
 * - 模型健康预检
 * - 实时进度状态
 * - 文件存储系统（按模型分类）
 * - 最小化上下文污染
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { homedir } from 'os';

// 导入模型管理器的回退功能
import { getFallbackCandidates, filterSmallModels, rankModelsByCapability } from './model-manager.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_DIR = join(__dirname, '..', 'config');

// 数据存储根目录
const DATA_DIR = join(homedir(), '.claude', 'skills', 'model-compare-search', 'data');

// 确保数据目录存在
function ensureDir(dir) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

// 加载配置
function loadConfig() {
  const modelsPath = join(CONFIG_DIR, 'models.json');
  const models = JSON.parse(readFileSync(modelsPath, 'utf-8'));

  // 加载用户偏好
  const prefPath = join(homedir(), '.claude', 'skills', 'model-compare-search', 'user-preferences.json');
  let userPrefs = {};
  if (existsSync(prefPath)) {
    try {
      userPrefs = JSON.parse(readFileSync(prefPath, 'utf-8'));
    } catch (e) {}
  }

  return {
    models,
    userPrefs,
    baseUrl: process.env.NEWAPI_BASE_URL || 'http://localhost:4000/v1',
    apiKey: process.env.NEWAPI_KEY || 'sk-f7cc2315a7917c2a5bc577d28338eead2cc22cbb8717',
    maxParallel: 4,
    maxRetries: 2,
    retryDelay: 1000
  };
}

// 动态获取模型列表
async function fetchDynamicModels(config) {
  try {
    const response = await fetch(`${config.baseUrl}/models`, {
      headers: { 'Authorization': `Bearer ${config.apiKey}` }
    });
    if (!response.ok) return null;

    const data = await response.json();
    return data.data ? data.data.map(m => m.id || m.model) : null;
  } catch {
    return null;
  }
}

// 获取要使用的模型列表
async function getModelList(config, taskType, strategy = 'default') {
  // 如果用户有自定义偏好，使用偏好
  if (config.userPrefs?.customModels?.[taskType]) {
    return config.userPrefs.customModels[taskType];
  }

  // 如果策略是 auto，尝试动态获取
  if (strategy === 'auto') {
    const dynamicModels = await fetchDynamicModels(config);
    if (dynamicModels) {
      // 过滤掉小模型并按能力排序
      const filtered = filterSmallModels(dynamicModels.map(id => ({ id })));
      const ranked = rankModelsByCapability(filtered, taskType);
      return ranked.slice(0, 8).map(r => r.model.id || r.model);
    }
  }

  // 使用配置文件中的默认模型
  const modelGroup = config.models[taskType] || config.models.general;
  return modelGroup.models;
}

// 任务分类
function classifyTask(query) {
  const patterns = {
    code: /(代码|code|debug|bug|修复|fix|实现|function|编程|programming)/i,
    reasoning: /(分析|analyze|推理|reason|为什么|why|优缺点|利弊|对比|compare)/i,
    search: /(搜索|search|查询|最新|news|动态|进展)/i
  };

  for (const [type, pattern] of Object.entries(patterns)) {
    if (pattern.test(query)) return type;
  }
  return 'general';
}

// 生成时间戳目录名
function generateSessionId() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

// 安全的模型名（用于文件名）
function safeModelName(model) {
  return model.replace(/[^a-zA-Z0-9_-]/g, '_');
}

// 终端颜色
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

// 状态跟踪
class StatusTracker {
  constructor(total) {
    this.total = total;
    this.pending = new Set([...Array(total).keys()]);
    this.success = new Set();
    this.failed = new Set();
    this.results = [];
  }

  update(index, status, data = null) {
    this.pending.delete(index);
    if (status === 'success') this.success.add(index);
    if (status === 'failed') this.failed.add(index);
    if (data) this.results[index] = data;
    this.render();
  }

  render() {
    const pending = this.pending.size;
    const success = this.success.size;
    const failed = this.failed.size;
    const total = this.total;

    const successBar = '█'.repeat(success);
    const failedBar = '░'.repeat(failed);
    const pendingBar = '▒'.repeat(pending);
    const bar = `${colors.green}${successBar}${colors.red}${failedBar}${colors.dim}${pendingBar}${colors.reset}`;

    process.stdout.write(`\r${bar} ${colors.bright}${success}/${total}${colors.reset} ${colors.dim}(pending:${pending}, failed:${failed})${colors.reset}`);
  }

  finalize() {
    process.stdout.write('\n');
  }
}

// 延迟函数
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// 调用单个模型（带重试和回退）
async function callModel(model, query, config, tracker, index, allModels = []) {
  const startTime = Date.now();
  let lastError = null;

  // 先尝试主模型
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    if (attempt > 0) {
      const backoff = config.retryDelay * Math.pow(2, attempt - 1);
      await delay(backoff);
    }

    try {
      const result = await executeModelCall(model, query, config, startTime);
      tracker.update(index, 'success', result);
      return result;
    } catch (error) {
      lastError = error;
      console.log(`${colors.dim}   ${model} 尝试 ${attempt + 1}/${config.maxRetries + 1} 失败: ${error.message}${colors.reset}`);
    }
  }

  // 主模型失败，尝试回退模型
  console.log(`${colors.yellow}   ⚠️ ${model} 失败，尝试回退...${colors.reset}`);
  const fallbacks = getFallbackCandidates(model);

  for (const fallbackModel of fallbacks) {
    // 跳过已在列表中的模型
    if (allModels.includes(fallbackModel) && fallbackModel !== model) {
      console.log(`${colors.dim}   跳过已在列表的回退: ${fallbackModel}${colors.reset}`);
      continue;
    }

    try {
      console.log(`${colors.dim}   尝试回退: ${fallbackModel}${colors.reset}`);
      const result = await executeModelCall(fallbackModel, query, config, startTime);
      result.originalModel = model;
      result.fallbackUsed = fallbackModel;
      tracker.update(index, 'success', result);
      return result;
    } catch (error) {
      console.log(`${colors.dim}   回退 ${fallbackModel} 也失败: ${error.message}${colors.reset}`);
    }
  }

  // 所有尝试都失败
  const result = {
    model,
    content: `Error: ${lastError?.message || 'All fallback attempts failed'}`,
    tokens: 0,
    duration: Date.now() - startTime,
    attempts: config.maxRetries + 1,
    error: lastError?.message || 'All fallback attempts failed',
    success: false
  };
  tracker.update(index, 'failed', result);
  return result;
}

// 执行模型调用
async function executeModelCall(model, query, config, startTime) {
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [{ role: 'user', content: query }],
      temperature: 0.7
    })
  });

  const duration = Date.now() - startTime;

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`HTTP ${response.status}: ${errorData.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return {
    model,
    content: data.choices[0].message.content,
    tokens: data.usage?.total_tokens || 0,
    duration,
    success: true
  };
}

// 健康检查 - 快速检测模型是否可用
async function healthCheck(model, config) {
  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: 'hi' }],
        max_tokens: 5,
        temperature: 0.7
      }),
      // 短超时用于健康检查
      signal: AbortSignal.timeout(5000)
    });
    return response.ok;
  } catch {
    return false;
  }
}

// 并行调用多个模型
async function parallelRequest(models, query, config, sessionDir) {
  console.log(`\n${colors.cyan}📡 正在请求 ${models.length} 个模型...${colors.reset}`);
  console.log(`${colors.dim}   使用重试机制: ${config.maxRetries} 次重试, ${config.maxParallel} 并发${colors.reset}\n`);

  const tracker = new StatusTracker(models.length);
  const results = [];

  // 分批并行
  const batchSize = config.maxParallel;
  for (let i = 0; i < models.length; i += batchSize) {
    const batch = models.slice(i, i + batchSize);
    const batchPromises = batch.map((model, idx) => {
      const index = i + idx;
      return callModel(model, query, config, tracker, index, models);
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // 保存每个模型的结果
    for (const result of batchResults) {
      saveModelResult(result, sessionDir);
    }
  }

  tracker.finalize();
  return results;
}

// 保存单个模型的结果
function saveModelResult(result, sessionDir) {
  const modelDir = join(sessionDir, 'models', safeModelName(result.model));
  ensureDir(modelDir);

  // 保存元数据
  const metadata = {
    model: result.model,
    success: result.success,
    duration_ms: result.duration,
    tokens: result.tokens,
    attempts: result.attempts || 1,
    timestamp: new Date().toISOString(),
    error: result.error || null,
    fallback_used: result.fallbackUsed || null,
    original_model: result.originalModel || null
  };

  writeFileSync(
    join(modelDir, 'metadata.json'),
    JSON.stringify(metadata, null, 2),
    'utf-8'
  );

  // 保存响应内容
  if (result.success) {
    const fallbackNote = result.fallbackUsed
      ? `\n\n> **注意**: 原模型 ${result.originalModel} 失败，已使用回退模型 ${result.fallbackUsed}\n`
      : '';

    writeFileSync(
      join(modelDir, 'response.md'),
      `# ${result.model}${fallbackNote}\n\n## 元数据\n\n- **耗时**: ${result.duration}ms\n- **Tokens**: ${result.tokens}\n- **尝试次数**: ${result.attempts || 1}\n${result.fallbackUsed ? `- **回退模型**: ${result.fallbackUsed}\n` : ''}\n---\n\n## 响应\n\n${result.content}`,
      'utf-8'
    );
  } else {
    writeFileSync(
      join(modelDir, 'error.md'),
      `# ${result.model}\n\n## 错误\n\n- **耗时**: ${result.duration}ms\n- **错误信息**: ${result.error}\n- **尝试次数**: ${result.attempts || 1}\n`,
      'utf-8'
    );
  }
}

// 使用 kimi-cli 进行总结
async function summarizeWithKimi(results, query) {
  console.log(`\n${colors.cyan}🧠 Kimi 正在整合分析...${colors.reset}\n`);

  const successResults = results.filter(r => r.success);

  let summaryPrompt = `# 多模型对比总结任务\n\n## 原始问题\n${query}\n\n## 各模型回答 (${successResults.length}/${results.length} 成功)\n\n`;

  successResults.forEach((r, i) => {
    summaryPrompt += `### 模型 ${i + 1}: ${r.model}\n- 耗时: ${r.duration}ms\n- Tokens: ${r.tokens}\n\n${r.content}\n\n---\n\n`;
  });

  summaryPrompt += `\n## 总结要求\n\n请整合以上回答：\n1. **综合结论**: 各模型共识的核心观点\n2. **观点对比**: 不同模型的异同\n3. **独特见解**: 每个模型独有的观点\n4. **置信度评估**: 基于一致性的可靠性评估\n5. **推荐方案**: 综合各模型优点的建议\n\n以 Markdown 格式输出。`;

  try {
    const kimiProcess = spawn('kimi-cli', ['-p', summaryPrompt], {
      stdio: ['inherit', 'pipe', 'pipe']
    });

    let output = '';
    let errorOutput = '';

    kimiProcess.stdout.on('data', (data) => { output += data.toString(); });
    kimiProcess.stderr.on('data', (data) => { errorOutput += data.toString(); });

    return new Promise((resolve, reject) => {
      kimiProcess.on('close', (code) => {
        if (code !== 0 && output.length < 100) {
          reject(new Error(`kimi-cli 失败: ${errorOutput || '未知错误'}`));
        } else {
          resolve(output || '总结完成');
        }
      });

      setTimeout(() => {
        kimiProcess.kill();
        resolve(output || '总结超时');
      }, 300000);
    });
  } catch (error) {
    throw error;
  }
}

// 保存会话摘要
function saveSessionSummary(sessionDir, query, results, kimiSummary, modelGroup) {
  const successResults = results.filter(r => r.success);
  const failedResults = results.filter(r => !r.success);
  const fallbackResults = results.filter(r => r.fallbackUsed);
  const totalTokens = successResults.reduce((sum, r) => sum + r.tokens, 0);
  const avgDuration = Math.round(successResults.reduce((sum, r) => sum + r.duration, 0) / successResults.length) || 0;

  const summary = {
    session_id: sessionDir.split('/').pop(),
    timestamp: new Date().toISOString(),
    query,
    task_type: modelGroup.description,
    stats: {
      total: results.length,
      success: successResults.length,
      failed: failedResults.length,
      fallbacks_used: fallbackResults.length,
      success_rate: `${Math.round((successResults.length / results.length) * 100)}%`,
      total_tokens: totalTokens,
      avg_duration_ms: avgDuration
    },
    models: results.map(r => ({
      name: r.model,
      success: r.success,
      duration: r.duration,
      tokens: r.tokens,
      error: r.error || null,
      fallback_used: r.fallbackUsed || null,
      original_model: r.originalModel || null
    })),
    kimi_summary_available: !!kimiSummary
  };

  writeFileSync(
    join(sessionDir, 'meta.json'),
    JSON.stringify(summary, null, 2),
    'utf-8'
  );

  if (kimiSummary) {
    writeFileSync(
      join(sessionDir, 'summary.md'),
      `# 多模型搜索总结\n\n**查询**: ${query}\n\n**时间**: ${summary.timestamp}\n\n**成功率**: ${summary.stats.success}/${summary.stats.total} (${summary.stats.success_rate})\n${summary.stats.fallbacks_used > 0 ? `**回退使用**: ${summary.stats.fallbacks_used} 次\n` : ''}\n---\n\n${kimiSummary}\n\n---\n\n## 详细统计\n\n| 指标 | 数值 |\n|------|------|\n| 总Tokens | ${totalTokens} |\n| 平均耗时 | ${avgDuration}ms |\n| 最快模型 | ${successResults.length > 0 ? successResults.reduce((min, r) => r.duration < min.duration ? r : min).model : 'N/A'} |\n| 最慢模型 | ${successResults.length > 0 ? successResults.reduce((max, r) => r.duration > max.duration ? r : max).model : 'N/A'} |\n`,
      'utf-8'
    );
  }

  return summary;
}

// 格式化输出（最小化）
function formatMinimalOutput(summary, sessionDir) {
  const c = colors;
  let output = `\n${c.bright}${c.cyan}╔══════════════════════════════════════╗${c.reset}\n`;
  output += `${c.bright}${c.cyan}║      多模型搜索完成                 ║${c.reset}\n`;
  output += `${c.bright}${c.cyan}╚═════════════════════════════════════════════════════════════╝${c.reset}\n\n`;

  output += `${c.bright}📊 结果摘要${c.reset}\n`;
  output += `   成功率: ${c.green}${summary.stats.success}/${summary.stats.total}${c.reset} (${summary.stats.success_rate})\n`;
  output += `   Tokens: ${summary.stats.total_tokens}\n`;
  output += `   耗时: ${summary.stats.avg_duration_ms}ms\n`;
  if (summary.stats.fallbacks_used > 0) {
    output += `   ${c.yellow}回退使用: ${summary.stats.fallbacks_used} 次${c.reset}\n`;
  }
  output += '\n';

  // 成功的模型
  if (summary.stats.success > 0) {
    output += `${c.green}${c.bright}✅ 成功模型${c.reset}\n`;
    summary.models
      .filter(m => m.success)
      .forEach(m => {
        const fallbackNote = m.fallback_used ? ` ${c.yellow}(回退: ${m.fallback_used})${c.reset}` : '';
        output += `   • ${m.name}${fallbackNote} (${m.duration}ms, ${m.tokens} tokens)\n`;
      });
    output += '\n';
  }

  // 失败的模型
  const failedModels = summary.models.filter(m => !m.success);
  if (failedModels.length > 0) {
    output += `${c.red}${c.bright}❌ 失败模型${c.reset}\n`;
    failedModels.forEach(m => {
      output += `   • ${m.name}: ${c.dim}${m.error}${c.reset}\n`;
    });
    output += '\n';
  }

  output += `${c.bright}📁 数据目录${c.reset}\n`;
  output += `   ${sessionDir}\n\n`;

  if (summary.kimi_summary_available) {
    output += `${c.bright}📝 Kimi 总结已保存至${c.reset}\n`;
    output += `   ${join(sessionDir, 'summary.md')}\n`;
  }

  return output;
}

// 主函数
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help') {
    console.log(`
Model Compare Search v5.0 - 多模型对比搜索

Usage:
  search.mjs "你的问题"
  search.mjs "你的问题" --type search|code|reasoning
  search.mjs "你的问题" --models auto           # 自动从NewAPI获取
  search.mjs "你的问题" --models model1,model2  # 指定模型
  search.mjs "你的问题" --no-kimi

Options:
  --type      任务类型: search(搜索), code(代码), reasoning(推理), general(通用)
  --models    模型选择: auto(动态获取), 或逗号分隔的模型ID
  --no-kimi   禁用 kimi-cli 总结

数据存储: ~/.claude/skills/model-compare-search/data/
模型管理: ~/.claude/skills/model-compare-search/scripts/model-manager.mjs
`);
    return;
  }

  const query = args[0];
  const typeArg = args.find((arg, i) => args[i - 1] === '--type') || 'auto';
  const modelsArg = args.find((arg, i) => args[i - 1] === '--models') || 'default';
  const noKimi = args.includes('--no-kimi');

  console.log(`${colors.bright}🚀 Model Compare Search v5.0${colors.reset}`);
  console.log(`${colors.dim}📝 ${query}${colors.reset}\n`);

  const config = loadConfig();
  const taskType = typeArg === 'auto' ? classifyTask(query) : typeArg;

  // 获取模型列表
  console.log(`${colors.dim}📡 正在准备模型...${colors.reset}`);
  let modelList = [];

  if (modelsArg === 'default') {
    // 使用配置文件的默认模型
    const modelGroup = config.models[taskType] || config.models.general;
    modelList = modelGroup.models;
    console.log(`${colors.dim}📊 任务: ${modelGroup.description}${colors.reset}`);
  } else if (modelsArg === 'auto') {
    // 动态获取
    modelList = await getModelList(config, taskType, 'auto');
    console.log(`${colors.dim}📊 任务: ${taskType} (动态获取 ${modelList.length} 个模型)${colors.reset}`);
  } else {
    // 用户指定
    modelList = modelsArg.split(',').map(s => s.trim());
    console.log(`${colors.dim}📊 任务: ${taskType} (用户指定 ${modelList.length} 个模型)${colors.reset}`);
  }

  console.log(`${colors.dim}📡 模型列表:\n${modelList.map(m => `   - ${m}`).join('\n')}\n${colors.reset}`);

  // 创建会话目录
  const sessionId = generateSessionId();
  const sessionDir = join(DATA_DIR, sessionId);
  ensureDir(join(sessionDir, 'models'));

  // 并行请求
  const results = await parallelRequest(modelList, query, config, sessionDir);

  if (results.length === 0) {
    console.error(`${colors.red}❌ 所有模型请求失败${colors.reset}`);
    process.exit(1);
  }

  // 使用 kimi 总结
  let kimiSummary = null;
  if (!noKimi && results.some(r => r.success)) {
    try {
      kimiSummary = await summarizeWithKimi(results, query);
      writeFileSync(join(sessionDir, 'kimi_summary_raw.md'), kimiSummary, 'utf-8');
    } catch (error) {
      console.warn(`${colors.yellow}⚠️ Kimi 总结失败: ${error.message}${colors.reset}`);
    }
  }

  // 保存会话摘要
  const modelGroup = config.models[taskType] || config.models.general;
  const summary = saveSessionSummary(sessionDir, query, results, kimiSummary, { ...modelGroup, models: modelList });

  // 输出最小化结果
  console.log(formatMinimalOutput(summary, sessionDir));

  // 如果成功数少于预期，显示警告
  const minResults = config.models[taskType]?.min_results || 4;
  if (summary.stats.success < minResults) {
    console.log(`${colors.yellow}⚠️ 警告: 仅 ${summary.stats.success} 个模型成功，少于预期的 ${minResults} 个${colors.reset}\n`);
  }
}

main().catch(err => {
  console.error(`${colors.red}❌ Error: ${err.message}${colors.reset}`);
  process.exit(1);
});
