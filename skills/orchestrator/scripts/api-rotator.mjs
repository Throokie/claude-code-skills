#!/usr/bin/env node

/**
 * API Key Rotator - API Key 轮换器
 *
 * 基于 Anthropic 工程团队的多 Key 并发调用模式
 *
 * 用法：
 *   import { getNextKey, markKeyBusy, markKeyFree } from './api-rotator.mjs';
 *
 *   const key = getNextKey('anthropic');
 *   // 使用 key.api_key 进行 API 调用
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HOME = process.env.HOME;
const CONFIG_FILE = `${HOME}/.claude/api-keys.json`;
const STATE_FILE = `${HOME}/.claude/api-keys-state.json`;

// 确保状态目录存在
mkdirSync(dirname(STATE_FILE), { recursive: true });

/**
 * 加载 API Key 配置
 */
function loadConfig() {
  try {
    const config = JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'));
    return config;
  } catch (error) {
    console.error('❌ 无法加载 API Key 配置:', error.message);
    console.error(`📁 配置文件：${CONFIG_FILE}`);
    process.exit(1);
  }
}

/**
 * 加载 API Key 状态（运行时状态）
 */
function loadState() {
  try {
    if (existsSync(STATE_FILE)) {
      return JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
    }
  } catch (error) {
    // 忽略错误，使用默认状态
  }

  // 默认状态
  return {
    current_index: 0,
    keys_status: {},
    last_rotation: null
  };
}

/**
 * 保存 API Key 状态
 */
function saveState(state) {
  try {
    writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (error) {
    console.error('⚠️ 无法保存 API Key 状态:', error.message);
  }
}

/**
 * 获取下一个可用的 API Key
 *
 * @param {string} provider - 提供商名称 (anthropic, gemini, kimi, deepseek)
 * @param {string} agentId - 代理 ID (可选，用于追踪哪个代理在使用)
 * @returns {{ id: string, api_key: string, status: string } | null}
 */
export function getNextKey(provider = 'anthropic', agentId = null) {
  const config = loadConfig();
  const state = loadState();

  const providerConfig = config.providers?.[provider];
  if (!providerConfig) {
    console.error(`❌ 未找到提供商配置：${provider}`);
    return null;
  }

  const keys = providerConfig.keys || [];
  if (keys.length === 0) {
    console.error(`❌ ${provider} 没有配置任何 API Key`);
    return null;
  }

  // 过滤出可用的 Key（active 状态）
  const activeKeys = keys.filter(k => k._status === 'active');

  // 如果没有 active 的 Key，尝试使用 placeholder
  const usableKeys = activeKeys.length > 0 ? activeKeys : keys.filter(k => k._status !== 'revoked');

  if (usableKeys.length === 0) {
    console.error(`❌ ${provider} 没有可用的 API Key`);
    return null;
  }

  // 单 Key 模式：直接返回
  if (usableKeys.length === 1) {
    const key = usableKeys[0];
    console.log(`🔑 使用 API Key: ${key.id} (单 Key 模式)`);
    return { id: key.id, api_key: key.api_key, status: key._status, _note: key._note };
  }

  // 多 Key 模式：轮询
  const currentIndex = state.current_index || 0;
  const nextIndex = currentIndex % usableKeys.length;
  const selectedKey = usableKeys[nextIndex];

  // 更新索引
  state.current_index = (currentIndex + 1) % usableKeys.length;
  state.last_rotation = new Date().toISOString();

  if (agentId) {
    state.keys_status[selectedKey.id] = {
      in_use_by: agentId,
      acquired_at: new Date().toISOString()
    };
  }

  saveState(state);

  console.log(`🔑 使用 API Key: ${selectedKey.id} (轮询索引：${nextIndex + 1}/${usableKeys.length})`);

  return {
    id: selectedKey.id,
    api_key: selectedKey.api_key,
    status: selectedKey._status,
    _note: selectedKey._note,
    _rate_limit: selectedKey._rate_limit
  };
}

/**
 * 标记 Key 为忙碌状态
 *
 * @param {string} provider - 提供商名称
 * @param {string} keyId - Key ID
 * @param {string} agentId - 代理 ID
 */
export function markKeyBusy(provider, keyId, agentId) {
  const state = loadState();

  state.keys_status[keyId] = {
    status: 'busy',
    in_use_by: agentId,
    acquired_at: new Date().toISOString()
  };

  saveState(state);
}

/**
 * 标记 Key 为空闲状态
 *
 * @param {string} provider - 提供商名称
 * @param {string} keyId - Key ID
 */
export function markKeyFree(provider, keyId) {
  const state = loadState();

  if (state.keys_status[keyId]) {
    state.keys_status[keyId] = {
      status: 'free',
      released_at: new Date().toISOString()
    };
  }

  saveState(state);
}

/**
 * 检查 Key 是否可用
 *
 * @param {string} provider - 提供商名称
 * @param {string} keyId - Key ID
 * @returns {boolean}
 */
export function isKeyAvailable(provider, keyId) {
  const state = loadState();
  const status = state.keys_status[keyId];

  // 没有记录表示可用
  if (!status) return true;

  // 检查是否超时（5 分钟自动释放）
  if (status.in_use_by) {
    const acquiredTime = new Date(status.acquired_at).getTime();
    const now = Date.now();
    const timeout = 5 * 60 * 1000; // 5 分钟

    if (now - acquiredTime > timeout) {
      console.log(`⚠️ Key ${keyId} 超时，自动释放`);
      markKeyFree(provider, keyId);
      return true;
    }
  }

  return status.status !== 'busy';
}

/**
 * 获取所有 API Key 的状态
 *
 * @returns {object}
 */
export function getAllKeysStatus(provider = 'anthropic') {
  const config = loadConfig();
  const state = loadState();

  const providerConfig = config.providers?.[provider];
  if (!providerConfig) return {};

  const keys = providerConfig.keys || [];

  return keys.map(key => ({
    id: key.id,
    status: key._status,
    runtime_status: state.keys_status[key.id]?.status || 'free',
    in_use_by: state.keys_status[key.id]?.in_use_by,
    _note: key._note
  }));
}

/**
 * CLI 模式：直接运行命令查看状态
 */
function cli() {
  const args = process.argv.slice(2);
  const command = args[0] || 'status';
  const provider = args[1] || 'anthropic';

  if (command === 'status') {
    console.log(`\n📊 API Key 状态 - ${provider}\n`);
    const status = getAllKeysStatus(provider);

    if (Object.keys(status).length === 0) {
      console.log('没有配置 API Keys');
      return;
    }

    console.log('| ID | 配置状态 | 运行时状态 | 使用者 | 说明 |');
    console.log('|-----|----------|-----------|--------|------|');

    for (const key of status) {
      const icon = {
        'active': '🟢',
        'placeholder': '🟡',
        'revoked': '🔴',
        'free': '🟢',
        'busy': '🔴'
      };

      const configIcon = icon[key.status] || '⚪';
      const runtimeIcon = icon[key.runtime_status] || '⚪';

      console.log(
        `| ${key.id} | ${configIcon} ${key.status} | ${runtimeIcon} ${key.runtime_status} | ${key.in_use_by || '-'} | ${key._note || '-'} |`
      );
    }

    console.log();
  } else if (command === 'reset') {
    // 重置所有状态
    writeFileSync(STATE_FILE, JSON.stringify({}, null, 2), 'utf-8');
    console.log('✅ API Key 状态已重置');
  } else if (command === 'help') {
    console.log(`
API Key Rotator - CLI 用法：

  node api-rotator.mjs status [provider]  - 查看 Key 状态
  node api-rotator.mjs reset              - 重置所有状态

示例：
  node api-rotator.mjs status anthropic
  node api-rotator.mjs status gemini
  node api-rotator.mjs reset
`);
  }
}

// 如果是直接运行（不是 import）
if (import.meta.url === `file://${process.argv[1]}`) {
  cli();
}
