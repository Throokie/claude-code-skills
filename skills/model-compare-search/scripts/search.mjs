#!/usr/bin/env node
/**
 * Model Compare Search - 简化版 v6.0
 * 核心功能: 并行调用多模型 → 保存结果 → Kimi总结
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { spawn } from 'child_process';

// 颜色
const c = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

// 配置
const CONFIG = {
  baseUrl: process.env.NEWAPI_BASE_URL || 'http://localhost:4000/v1',
  apiKey: process.env.NEWAPI_KEY || '',
  dataDir: join(homedir(), '.claude', 'skills', 'model-compare-search', 'data'),
  maxParallel: 4,
  maxRetries: 2,
  retryDelay: 1000
};

// 检查必要的环境变量
if (!CONFIG.apiKey) {
  console.error(`${c.red}❌ 错误: 未设置 NEWAPI_KEY 环境变量${c.reset}`);
  console.error(`\n请在运行前设置环境变量:`);
  console.error(`  export NEWAPI_KEY="your-api-key"`);
  console.error(`  export NEWAPI_BASE_URL="http://localhost:4000/v1"`);
  console.error(`\n或在 ~/.bashrc / ~/.zshrc 中永久添加`);
  process.exit(1);
}

// 模型回退映射
const FALLBACKS = {
  'Pro/deepseek-ai/DeepSeek-R1': ['deepseek-ai/DeepSeek-R1', 'Pro/deepseek-ai/DeepSeek-V3.2'],
  'deepseek-ai/DeepSeek-R1': ['Pro/deepseek-ai/DeepSeek-R1', 'deepseek-ai/DeepSeek-R1-Distill-Qwen-32B'],
  'Pro/deepseek-ai/DeepSeek-V3.2': ['Pro/zai-org/GLM-5', 'Pro/moonshotai/Kimi-K2.5'],
  'Pro/zai-org/GLM-5': ['Pro/zai-org/GLM-4.7', 'Pro/moonshotai/Kimi-K2.5'],
  'Pro/moonshotai/Kimi-K2.5': ['Pro/zai-org/GLM-5', 'Pro/deepseek-ai/DeepSeek-V3.2']
};

// 延迟
const delay = ms => new Promise(r => setTimeout(r, ms));

// 确保目录存在
function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

// 安全的文件名
function safeName(name) {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_');
}

// 从模型名提取大小
function getModelSize(name) {
  const match = name.match(/(\d+)b/i);
  return match ? parseInt(match[1]) : null;
}

// 动态获取模型列表
async function fetchModels() {
  try {
    const res = await fetch(`${CONFIG.baseUrl}/models`, {
      headers: { 'Authorization': `Bearer ${CONFIG.apiKey}` }
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data?.map(m => m.id || m.model).filter(Boolean) || null;
  } catch {
    return null;
  }
}

// 智能选择模型
async function selectModels() {
  console.log(`${c.dim}📡 获取可用模型...${c.reset}`);

  const allModels = await fetchModels();
  if (!allModels || allModels.length === 0) {
    console.log(`${c.yellow}⚠️ 无法获取模型列表，使用默认配置${c.reset}`);
    return defaultModels();
  }

  // 去重：按长度降序排序（长的优先），然后排除被包含的
  const sortedModels = [...allModels].sort((a, b) => b.length - a.length);
  const uniqueModels = [];
  for (const m of sortedModels) {
    // 检查是否已被包含（短名称在前，长名称在后，所以短的会被包含在长的里）
    const isDuplicate = uniqueModels.some(existing =>
      existing.includes(m) || m.includes(existing)
    );
    if (!isDuplicate) {
      uniqueModels.push(m);
    }
  }

  // 过滤: 排除小模型(<14B)，保留知名模型
  let filtered = uniqueModels.filter(m => {
    const size = getModelSize(m);
    if (size && size < 14) return false;
    // 优先保留这些供应商的模型
    return /deepseek|glm|kimi|qwen|gemini|minimax|doubao/i.test(m);
  });

  // 保底：如果过滤后少于3个，使用原始列表（不过滤大小）
  if (filtered.length < 3) {
    console.log(`${c.yellow}⚠️ 可用大模型不足，放宽过滤条件${c.reset}`);
    filtered = uniqueModels.filter(m =>
      /deepseek|glm|kimi|qwen|gemini|minimax|doubao/i.test(m)
    );
  }

  // 如果还不足，使用全部
  if (filtered.length === 0) {
    filtered = uniqueModels;
  }

  // 排序: 大模型优先，Pro版本优先
  const scored = filtered.map(m => {
    let score = 0;
    const size = getModelSize(m);
    if (size) score += size; // 越大越好
    if (m.includes('Pro/')) score += 50; // Pro版本加分
    if (/r1|reasoning|thinking/i.test(m)) score += 30; // 推理模型加分
    if (/v3|coder/i.test(m)) score += 20; // 代码模型加分
    return { model: m, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const selected = scored.slice(0, 8).map(s => s.model);

  console.log(`${c.dim}📊 选择 ${selected.length} 个模型:${c.reset}`);
  selected.forEach(m => console.log(`   ${c.dim}•${c.reset} ${m}`));

  return selected;
}

// 默认模型（当API不可用时）
function defaultModels() {
  return [
    'Pro/zai-org/GLM-5',
    'Pro/moonshotai/Kimi-K2.5',
    'Pro/deepseek-ai/DeepSeek-V3.2',
    'Pro/deepseek-ai/DeepSeek-R1',
    'LoRA/Qwen/Qwen2.5-72B-Instruct'
  ];
}

// 进度跟踪
class Tracker {
  constructor(total) {
    this.total = total;
    this.pending = total;
    this.success = 0;
    this.failed = 0;
  }

  update(status) {
    if (status === 'success') this.success++;
    if (status === 'failed') this.failed++;
    this.pending--;

    const bar = `${c.green}${'█'.repeat(this.success)}${c.red}${'░'.repeat(this.failed)}${c.dim}${'▒'.repeat(this.pending)}${c.reset}`;
    process.stdout.write(`\r${bar} ${c.bright}${this.success + this.failed}/${this.total}${c.reset} `);
  }
}

// 调用模型
async function callModel(model, query, tracker) {
  const start = Date.now();

  // 尝试主模型
  for (let i = 0; i <= CONFIG.maxRetries; i++) {
    if (i > 0) await delay(CONFIG.retryDelay * Math.pow(2, i - 1));

    try {
      const res = await fetch(`${CONFIG.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CONFIG.apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: query }],
          temperature: 0.7
        })
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      tracker.update('success');
      return {
        model,
        content: data.choices[0].message.content,
        tokens: data.usage?.total_tokens || 0,
        duration: Date.now() - start,
        success: true
      };
    } catch (err) {
      if (i === CONFIG.maxRetries) break;
    }
  }

  // 尝试回退
  const fallbacks = FALLBACKS[model] || [];
  for (const fb of fallbacks) {
    try {
      const res = await fetch(`${CONFIG.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CONFIG.apiKey}`
        },
        body: JSON.stringify({
          model: fb,
          messages: [{ role: 'user', content: query }],
          temperature: 0.7
        })
      });

      if (!res.ok) continue;

      const data = await res.json();
      tracker.update('success');
      return {
        model: fb,
        originalModel: model,
        content: data.choices[0].message.content,
        tokens: data.usage?.total_tokens || 0,
        duration: Date.now() - start,
        success: true
      };
    } catch {}
  }

  tracker.update('failed');
  return {
    model,
    content: '',
    tokens: 0,
    duration: Date.now() - start,
    success: false
  };
}

// 并行请求
async function parallelRequest(models, query) {
  console.log(`\n${c.cyan}📡 正在请求 ${models.length} 个模型...${c.reset}\n`);

  const tracker = new Tracker(models.length);
  const results = [];

  for (let i = 0; i < models.length; i += CONFIG.maxParallel) {
    const batch = models.slice(i, i + CONFIG.maxParallel);
    const batchResults = await Promise.all(
      batch.map(m => callModel(m, query, tracker))
    );
    results.push(...batchResults);
  }

  console.log('\n');
  return results;
}

// 保存结果
function saveResults(sessionDir, query, results) {
  ensureDir(join(sessionDir, 'models'));

  const success = results.filter(r => r.success);
  const meta = {
    session_id: sessionDir.split('/').pop(),
    timestamp: new Date().toISOString(),
    query,
    stats: {
      total: results.length,
      success: success.length,
      failed: results.length - success.length,
      total_tokens: success.reduce((s, r) => s + r.tokens, 0),
      avg_duration: Math.round(success.reduce((s, r) => s + r.duration, 0) / success.length) || 0
    },
    models: results.map(r => ({
      name: r.model,
      success: r.success,
      duration: r.duration,
      tokens: r.tokens,
      original: r.originalModel || null
    }))
  };

  writeFileSync(join(sessionDir, 'meta.json'), JSON.stringify(meta, null, 2));

  results.forEach(r => {
    const dir = join(sessionDir, 'models', safeName(r.model));
    ensureDir(dir);

    if (r.success) {
      const note = r.originalModel ? `\n> 回退替代: ${r.originalModel}\n` : '';
      writeFileSync(
        join(dir, 'response.md'),
        `# ${r.model}${note}\n\n**耗时**: ${r.duration}ms | **Tokens**: ${r.tokens}\n\n---\n\n${r.content}`,
        'utf-8'
      );
    } else {
      writeFileSync(join(dir, 'error.md'), `# ${r.model}\n\n调用失败`, 'utf-8');
    }
  });

  return meta;
}

// Kimi总结
async function summarize(query, results) {
  const success = results.filter(r => r.success);
  if (success.length === 0) return null;

  console.log(`${c.cyan}🧠 Kimi 正在整合分析...${c.reset}\n`);

  const prompt = `# 多模型对比总结\n\n**问题**: ${query}\n\n**各模型回答**:\n\n${success.map((r, i) =>
    `### ${i + 1}. ${r.model}${r.originalModel ? ` (替代 ${r.originalModel})` : ''}\n${r.content.substring(0, 3000)}${r.content.length > 3000 ? '...' : ''}`
  ).join('\n\n---\n\n')}\n\n**总结要求**:\n1. 提取各模型的共识观点\n2. 对比不同模型的差异\n3. 给出综合结论和建议\n4. 使用中文输出`;

  return new Promise((resolve) => {
    const proc = spawn('kimi-cli', ['-p', prompt], { stdio: ['inherit', 'pipe', 'pipe'] });
    let out = '';
    proc.stdout.on('data', d => out += d);
    proc.on('close', () => resolve(out || '总结完成'));
    setTimeout(() => { proc.kill(); resolve(out || '总结超时'); }, 300000);
  });
}

// 显示结果
function showResult(meta, sessionDir) {
  console.log(`${c.bright}${c.cyan}╔══════════════════════════════════════╗${c.reset}`);
  console.log(`${c.bright}${c.cyan}║      多模型搜索完成                 ║${c.reset}`);
  console.log(`${c.bright}${c.cyan}╚═════════════════════════════════════════════════════════════╝${c.reset}\n`);

  console.log(`${c.bright}📊 结果${c.reset}`);
  console.log(`   成功率: ${c.green}${meta.stats.success}/${meta.stats.total}${c.reset}`);
  console.log(`   Tokens: ${meta.stats.total_tokens}`);
  console.log(`   耗时: ${meta.stats.avg_duration}ms\n`);

  const successModels = meta.models.filter(m => m.success);
  if (successModels.length > 0) {
    console.log(`${c.green}✅ 成功${c.reset}`);
    successModels.forEach(m => {
      const fb = m.original ? ` ${c.yellow}(替代${m.original})${c.reset}` : '';
      console.log(`   • ${m.name}${fb}`);
    });
    console.log();
  }

  const failed = meta.models.filter(m => !m.success);
  if (failed.length > 0) {
    console.log(`${c.red}❌ 失败${c.reset}`);
    failed.forEach(m => console.log(`   • ${m.name}`));
    console.log();
  }

  console.log(`${c.bright}📁 数据${c.reset}`);
  console.log(`   ${sessionDir}\n`);
}

// 主函数
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help') {
    console.log(`
多模型对比搜索 - 简化版 v6.0

用法:
  search.mjs "你的问题"           # 自动选择可用模型
  search.mjs "你的问题" --no-kimi # 禁用Kimi总结

说明:
  自动从NewAPI获取可用模型，选择最可靠的8个进行并行搜索。
  结果保存到: ~/.claude/skills/model-compare-search/data/
`);
    return;
  }

  const query = args[0];
  const noKimi = args.includes('--no-kimi');

  console.log(`${c.bright}🚀 Model Compare Search v6.0${c.reset}`);
  console.log(`${c.dim}📝 ${query}${c.reset}\n`);

  // 选择模型
  const models = await selectModels();
  if (models.length === 0) {
    console.error(`${c.red}❌ 没有可用模型${c.reset}`);
    process.exit(1);
  }

  // 创建会话目录
  const sessionId = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const sessionDir = join(CONFIG.dataDir, sessionId);
  ensureDir(sessionDir);

  // 并行请求
  const results = await parallelRequest(models, query);

  // 保存结果
  const meta = saveResults(sessionDir, query, results);

  // Kimi总结
  if (!noKimi && meta.stats.success > 0) {
    const summary = await summarize(query, results);
    if (summary) {
      writeFileSync(join(sessionDir, 'summary.md'), `# 多模型搜索总结\n\n**问题**: ${query}\n\n---\n\n${summary}`);
      console.log(`${c.bright}📝 总结${c.reset}`);
      console.log(`   ${join(sessionDir, 'summary.md')}\n`);
    }
  }

  // 显示结果
  showResult(meta, sessionDir);
}

main().catch(err => {
  console.error(`${c.red}❌ 错误: ${err.message}${c.reset}`);
  process.exit(1);
});
