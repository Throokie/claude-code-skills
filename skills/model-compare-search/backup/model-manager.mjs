#!/usr/bin/env node
/**
 * Model Manager - 模型管理器
 *
 * 功能:
 * - 从 NewAPI 动态获取可用模型列表
 * - 智能模型推荐
 * - 交互式模型选择
 * - 保存用户偏好
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';
import { spawn } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_DIR = join(__dirname, '..', 'config');
const DATA_DIR = join(homedir(), '.claude', 'skills', 'model-compare-search');

// 默认 NewAPI 配置
const DEFAULT_CONFIG = {
  baseUrl: process.env.NEWAPI_BASE_URL || 'http://localhost:4000/v1',
  apiKey: process.env.NEWAPI_KEY || 'sk-f7cc2315a7917c2a5bc577d28338eead2cc22cbb8717'
};

// 确保配置目录存在
function ensureConfigDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

// 加载用户偏好
function loadUserPreferences() {
  const prefPath = join(DATA_DIR, 'user-preferences.json');
  if (existsSync(prefPath)) {
    try {
      return JSON.parse(readFileSync(prefPath, 'utf-8'));
    } catch (e) {
      return {};
    }
  }
  return {};
}

// 保存用户偏好
function saveUserPreferences(prefs) {
  ensureConfigDir();
  const prefPath = join(DATA_DIR, 'user-preferences.json');
  writeFileSync(prefPath, JSON.stringify(prefs, null, 2), 'utf-8');
}

// 从 NewAPI 获取模型列表
async function fetchModelsFromNewAPI() {
  try {
    const response = await fetch(`${DEFAULT_CONFIG.baseUrl}/models`, {
      headers: {
        'Authorization': `Bearer ${DEFAULT_CONFIG.apiKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error(`❌ 获取模型列表失败: ${error.message}`);
    return null;
  }
}

// 解析模型信息
function parseModelInfo(model) {
  const id = model.id || model.model || '';
  const parts = id.split('/');

  return {
    id,
    name: model.name || parts[parts.length - 1] || id,
    provider: parts[0] || 'unknown',
    description: model.description || '',
    context_length: model.context_length || 0,
    pricing: model.pricing || {}
  };
}

// 模型分类规则
const MODEL_RULES = {
  // 推理/分析类
  reasoning: {
    keywords: ['reason', 'thinking', 'r1', 'deepseek', 'glm-4'],
    providers: ['deepseek-ai', 'zai-org', 'moonshotai'],
    models: ['Pro/deepseek-ai/DeepSeek-R1', 'Pro/zai-org/GLM-4.7']
  },
  // 代码类
  code: {
    keywords: ['coder', 'code', 'v3', 'deepseek'],
    providers: ['deepseek-ai', 'zai-org', 'moonshotai'],
    models: ['Pro/deepseek-ai/DeepSeek-V3.2', 'Pro/zai-org/GLM-5']
  },
  // 长文本
  longcontext: {
    keywords: ['kimi', '32k', '128k', '200k', '1m'],
    providers: ['moonshotai'],
    models: ['Pro/moonshotai/Kimi-K2.5']
  },
  // 快速响应
  fast: {
    keywords: ['flash', '7b', '14b', 'tiny', 'mini'],
    providers: ['deepseek-ai', 'Qwen'],
    models: ['Pro/Qwen/Qwen2.5-7B-Instruct']
  },
  // 创意/通用
  creative: {
    keywords: ['glm', 'gemini', 'claude'],
    providers: ['zai-org'],
    models: ['Pro/zai-org/GLM-5']
  }
};

// 模型回退映射 - 当主模型失败时使用
const MODEL_FALLBACKS = {
  // DeepSeek R1 系列
  'Pro/deepseek-ai/DeepSeek-R1': ['deepseek-ai/DeepSeek-R1', 'Pro/deepseek-ai/DeepSeek-V3.2'],
  'deepseek-ai/DeepSeek-R1': ['Pro/deepseek-ai/DeepSeek-R1', 'deepseek-ai/DeepSeek-R1-Distill-Qwen-32B'],
  'deepseek-ai/DeepSeek-R1-Distill-Qwen-32B': ['deepseek-ai/DeepSeek-R1-Distill-Qwen-14B', 'Pro/zai-org/GLM-4.7'],
  'deepseek-ai/DeepSeek-R1-Distill-Qwen-14B': ['deepseek-ai/DeepSeek-R1-Distill-Qwen-32B', 'Pro/zai-org/GLM-4.7'],
  // DeepSeek V3 系列
  'Pro/deepseek-ai/DeepSeek-V3.2': ['Pro/zai-org/GLM-5', 'Pro/moonshotai/Kimi-K2.5'],
  // GLM 系列
  'Pro/zai-org/GLM-5': ['Pro/zai-org/GLM-4.7', 'Pro/moonshotai/Kimi-K2.5'],
  'Pro/zai-org/GLM-4.7': ['Pro/zai-org/GLM-5', 'Pro/moonshotai/Kimi-K2.5'],
  // Kimi 系列
  'Pro/moonshotai/Kimi-K2.5': ['Pro/zai-org/GLM-5', 'Pro/deepseek-ai/DeepSeek-V3.2'],
  // Qwen 系列
  'LoRA/Qwen/Qwen2.5-72B-Instruct': ['Pro/Qwen/Qwen2.5-72B-Instruct', 'Pro/zai-org/GLM-5'],
  'Pro/Qwen/Qwen2.5-72B-Instruct': ['LoRA/Qwen/Qwen2.5-72B-Instruct', 'Pro/zai-org/GLM-5'],
  // MiniMax
  'Pro/MiniMaxAI/MiniMax-M2.5': ['Pro/zai-org/GLM-5', 'Doubao-Seed-2.0-pro'],
  // Doubao
  'Doubao-Seed-2.0-pro': ['Pro/zai-org/GLM-5', 'Pro/MiniMaxAI/MiniMax-M2.5']
};

// 模型参数大小评分调整
const MODEL_SIZE_PATTERNS = [
  { pattern: /(\d+)b/i, extractor: (m) => parseInt(m[1]) }
];

// 获取模型参数大小（从模型名推断）
function getModelSize(modelName) {
  for (const { pattern, extractor } of MODEL_SIZE_PATTERNS) {
    const match = modelName.match(pattern);
    if (match) {
      return extractor(match);
    }
  }
  return null;
}

// 根据大小计算评分调整
function getSizeScoreAdjustment(modelName) {
  const size = getModelSize(modelName);
  if (!size) return 0;

  // 惩罚小模型 (< 14B)
  if (size <= 7) return -50;
  if (size <= 8) return -40;
  if (size <= 14) return -20;

  // 奖励大模型 (>= 32B)
  if (size >= 100) return 25;
  if (size >= 72) return 20;
  if (size >= 32) return 15;

  return 0;
}

// 获取模型的回退候选
export function getFallbackCandidates(modelName) {
  // 直接匹配
  if (MODEL_FALLBACKS[modelName]) {
    return MODEL_FALLBACKS[modelName];
  }

  // 尝试部分匹配
  for (const [key, fallbacks] of Object.entries(MODEL_FALLBACKS)) {
    if (modelName.includes(key) || key.includes(modelName)) {
      return fallbacks;
    }
  }

  // 返回通用回退
  return ['Pro/zai-org/GLM-5', 'Pro/moonshotai/Kimi-K2.5'];
}

// 过滤掉小模型（< 14B）
export function filterSmallModels(models) {
  return models.filter(model => {
    const size = getModelSize(model.id || model);
    // 如果没有检测到大小，保留；如果 >= 14B，保留
    return size === null || size >= 14;
  });
}

// 智能模型排序（按能力和可靠性）
export function rankModelsByCapability(models, taskType = 'general') {
  const scored = models.map(model => {
    const id = model.id || model;
    const baseScore = calculateMatchScore(model, taskType);
    const sizeAdjustment = getSizeScoreAdjustment(id);

    return {
      model,
      score: baseScore + sizeAdjustment,
      baseScore,
      sizeAdjustment
    };
  });

  // 按分数降序排序
  scored.sort((a, b) => b.score - a.score);
  return scored;
}

// 计算模型匹配分数
function calculateMatchScore(model, taskType) {
  const info = parseModelInfo(model);
  const rules = MODEL_RULES[taskType] || MODEL_RULES.creative;
  let score = 0;

  // 匹配关键词
  for (const keyword of rules.keywords) {
    if (info.id.toLowerCase().includes(keyword.toLowerCase())) score += 10;
    if (info.name.toLowerCase().includes(keyword.toLowerCase())) score += 5;
  }

  // 匹配供应商
  if (rules.providers.includes(info.provider)) score += 15;

  // 优先选择已知模型
  if (rules.models.includes(info.id)) score += 20;

  // 上下文长度加分
  if (info.context_length > 100000) score += 5;

  return score;
}

// 智能推荐模型
function recommendModels(models, taskType, count = 8) {
  // 首先过滤掉小模型
  const filteredModels = filterSmallModels(models);

  // 按能力排序
  const ranked = rankModelsByCapability(filteredModels, taskType);

  // 取前 count 个
  return ranked.slice(0, count).map(s => s.model);
}

// 按供应商分组
function groupByProvider(models) {
  const groups = {};
  for (const model of models) {
    const info = parseModelInfo(model);
    if (!groups[info.provider]) {
      groups[info.provider] = [];
    }
    groups[info.provider].push(model);
  }
  return groups;
}

// 交互式模型选择
async function interactiveSelect(models, taskType) {
  const groups = groupByProvider(models);
  const providers = Object.keys(groups).sort();

  console.log('\n📋 可用模型（按供应商分组）\n');

  let index = 1;
  const modelMap = {};

  for (const provider of providers) {
    console.log(`\n${colors.cyan}${colors.bright}【${provider}】${colors.reset}`);
    for (const model of groups[provider]) {
      const info = parseModelInfo(model);
      const context = info.context_length ? `(${Math.round(info.context_length / 1000)}K上下文)` : '';
      console.log(`  ${colors.dim}${index}.${colors.reset} ${info.name} ${colors.dim}${context}${colors.reset}`);
      modelMap[index] = model;
      index++;
    }
  }

  // 显示推荐
  const recommended = recommendModels(models, taskType, 8);
  console.log(`\n${colors.green}${colors.bright}✨ 针对【${taskType}】任务推荐的模型：${colors.reset}`);
  recommended.forEach((m, i) => {
    const info = parseModelInfo(m);
    console.log(`  ${colors.green}${i + 1}.${colors.reset} ${info.id}`);
  });

  // 提示用户选择
  console.log(`\n${colors.yellow}💡 输入模型编号（多个用逗号分隔），或输入 'r' 使用推荐，或输入 'a' 使用所有：${colors.reset}`);

  // 这里简化处理，实际应该读取用户输入
  // 在实际使用中，可以通过参数传入选择
  return recommended;
}

// 选择模型（非交互式）
function selectModels(models, taskType, strategy = 'recommended') {
  if (strategy === 'all') {
    return models;
  }

  if (strategy === 'recommended') {
    return recommendModels(models, taskType, 8);
  }

  // 用户指定ID列表
  if (Array.isArray(strategy)) {
    return models.filter(m => strategy.includes(m.id));
  }

  return recommendModels(models, taskType, 8);
}

// 更新 models.json
function updateModelsJson(taskType, selectedModels) {
  const modelsPath = join(CONFIG_DIR, 'models.json');
  let config = {};

  if (existsSync(modelsPath)) {
    config = JSON.parse(readFileSync(modelsPath, 'utf-8'));
  }

  // 更新指定任务类型的模型列表
  if (config[taskType]) {
    config[taskType].models = selectedModels.map(m => m.id || m);
  }

  writeFileSync(modelsPath, JSON.stringify(config, null, 2), 'utf-8');
  console.log(`✅ 已更新 ${taskType} 任务的模型配置`);
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'list';

  switch (command) {
    case 'list':
    case 'ls': {
      console.log('📡 正在获取模型列表...\n');
      const models = await fetchModelsFromNewAPI();
      if (!models) {
        console.log('❌ 无法获取模型列表，请检查 NewAPI 配置');
        return;
      }

      const groups = groupByProvider(models);
      console.log(`\n✅ 共找到 ${models.length} 个模型\n`);

      for (const [provider, providerModels] of Object.entries(groups)) {
        console.log(`${colors.cyan}${colors.bright}${provider}${colors.reset} (${providerModels.length}个)`);
        providerModels.forEach(m => {
          const info = parseModelInfo(m);
          console.log(`  ${colors.dim}- ${info.id}${colors.reset}`);
        });
        console.log();
      }
      break;
    }

    case 'recommend': {
      const taskType = args[1] || 'general';
      console.log(`📡 正在获取模型列表并推荐【${taskType}】任务模型...\n`);

      const models = await fetchModelsFromNewAPI();
      if (!models) return;

      const recommended = recommendModels(models, taskType, 8);
      console.log(`\n✨ 推荐的 ${recommended.length} 个模型：\n`);
      recommended.forEach((m, i) => {
        const info = parseModelInfo(m);
        console.log(`${i + 1}. ${colors.bright}${info.id}${colors.reset}`);
        if (info.description) {
          console.log(`   ${colors.dim}${info.description}${colors.reset}`);
        }
      });

      // 保存推荐
      updateModelsJson(taskType, recommended);
      break;
    }

    case 'select': {
      const taskType = args[1] || 'general';
      const strategy = args[2] || 'recommended'; // 'recommended', 'all', or comma-separated IDs

      console.log(`📡 正在为【${taskType}】任务选择模型...\n`);

      const models = await fetchModelsFromNewAPI();
      if (!models) return;

      let selected;
      if (strategy === 'interactive') {
        selected = await interactiveSelect(models, taskType);
      } else if (strategy === 'all') {
        selected = models;
        console.log(`✅ 选择了所有 ${models.length} 个模型`);
      } else if (strategy === 'recommended') {
        selected = recommendModels(models, taskType, 8);
        console.log(`✅ 使用推荐模型 (${selected.length} 个)`);
      } else {
        // 解析用户指定的ID
        const ids = strategy.split(',').map(s => s.trim());
        selected = models.filter(m => ids.includes(m.id) || ids.some(id => m.id.includes(id)));
        console.log(`✅ 选择了 ${selected.length} 个指定模型`);
      }

      if (selected.length > 0) {
        updateModelsJson(taskType, selected);
        console.log('\n选中的模型：');
        selected.forEach((m, i) => console.log(`  ${i + 1}. ${m.id}`));
      } else {
        console.log('❌ 未选择任何模型');
      }
      break;
    }

    case 'config': {
      const taskType = args[1] || 'general';
      const pref = loadUserPreferences();

      if (args[2]) {
        // 设置偏好
        const modelIds = args[2].split(',').map(s => s.trim());
        if (!pref.customModels) pref.customModels = {};
        pref.customModels[taskType] = modelIds;
        saveUserPreferences(pref);
        console.log(`✅ 已保存【${taskType}】任务的模型偏好`);
      } else {
        // 显示偏好
        console.log('📋 当前模型偏好：\n');
        if (pref.customModels) {
          for (const [type, models] of Object.entries(pref.customModels)) {
            console.log(`${colors.bright}${type}${colors.reset}:`);
            models.forEach(m => console.log(`  - ${m}`));
          }
        } else {
          console.log('  暂无自定义配置');
        }
      }
      break;
    }

    case 'test': {
      const modelId = args[1];
      if (!modelId) {
        console.log('用法: model-manager.mjs test <model-id>');
        return;
      }

      console.log(`🧪 测试模型: ${modelId}\n`);
      try {
        const response = await fetch(`${DEFAULT_CONFIG.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DEFAULT_CONFIG.apiKey}`
          },
          body: JSON.stringify({
            model: modelId,
            messages: [{ role: 'user', content: 'Hi' }],
            max_tokens: 10
          })
        });

        if (response.ok) {
          console.log(`✅ 模型可用`);
        } else {
          const error = await response.json();
          console.log(`❌ 模型不可用: ${error.error?.message || response.statusText}`);
        }
      } catch (error) {
        console.log(`❌ 测试失败: ${error.message}`);
      }
      break;
    }

    case 'help':
    default:
      console.log(`
📋 Model Manager - 模型管理器

用法:
  model-manager.mjs list              列出所有可用模型
  model-manager.mjs recommend <type>  推荐模型 (search/code/reasoning/general)
  model-manager.mjs select <type> [strategy]  选择模型
    strategy: recommended (默认), all, interactive, 或逗号分隔的模型ID
  model-manager.mjs config <type> [models]  配置偏好模型
  model-manager.mjs test <model-id>   测试模型可用性
  model-manager.mjs help              显示帮助

示例:
  model-manager.mjs list
  model-manager.mjs recommend reasoning
  model-manager.mjs select code recommended
  model-manager.mjs select general all
  model-manager.mjs select search "Pro/deepseek-ai/DeepSeek-R1,Pro/zai-org/GLM-5"
  model-manager.mjs test Pro/deepseek-ai/DeepSeek-V3.2
`);
  }
}

// 颜色代码
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

// 只在直接运行时才执行 main
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });
}
