/**
 * 负载均衡服务
 * PRD: prd-20260324-143000-a7b3-v2
 * Layer: services
 *
 * 实现多账号负载均衡策略：轮询、随机、加权、最少连接
 */

import type { Account, LoadBalanceConfig } from '../types';
import { AccountStatus } from '../repositories/db';
import * as accountRepo from '../repositories/account.repository';
import { createLogger } from '../utils/logger';
import { AccountUnavailableError } from '../utils/errors';

const logger = createLogger('load-balancer');

// 轮询计数器
let roundRobinIndex = 0;

// 连接计数器（用于最少连接策略）
const connectionCounts = new Map<string, number>();

// 默认配置
const DEFAULT_CONFIG: LoadBalanceConfig = {
  strategy: 'round_robin',
  healthCheck: {
    enabled: true,
    interval: 60,
    timeout: 10,
  },
  retry: {
    maxAttempts: 3,
    backoff: 'exponential',
    delay: 1000,
  },
};

/**
 * 获取可用账号
 * 根据配置的负载均衡策略选择账号
 */
export async function getAvailableAccount(
  config: LoadBalanceConfig = DEFAULT_CONFIG
): Promise<Account> {
  // 获取所有活跃账号
  const accounts = await accountRepo.getActiveAccounts();

  if (accounts.length === 0) {
    logger.error('No active accounts available');
    throw new AccountUnavailableError();
  }

  // 根据策略选择账号
  let selectedAccount: Account;

  switch (config.strategy) {
    case 'random':
      selectedAccount = randomStrategy(accounts);
      break;
    case 'weighted':
      selectedAccount = weightedStrategy(accounts);
      break;
    case 'least_conn':
      selectedAccount = leastConnectionsStrategy(accounts);
      break;
    case 'round_robin':
    default:
      selectedAccount = roundRobinStrategy(accounts);
      break;
  }

  // 更新最后使用时间
  await accountRepo.updateLastUsedAt(selectedAccount.id);

  // 增加连接计数
  incrementConnectionCount(selectedAccount.id);

  logger.debug(
    { accountId: selectedAccount.id, strategy: config.strategy },
    'Account selected'
  );

  return selectedAccount;
}

/**
 * 轮询策略
 * 按顺序循环选择账号
 */
function roundRobinStrategy(accounts: Account[]): Account {
  if (accounts.length === 0) {
    throw new AccountUnavailableError();
  }

  const index = roundRobinIndex % accounts.length;
  roundRobinIndex = (roundRobinIndex + 1) % accounts.length;

  return accounts[index];
}

/**
 * 随机策略
 * 随机选择一个账号
 */
function randomStrategy(accounts: Account[]): Account {
  if (accounts.length === 0) {
    throw new AccountUnavailableError();
  }

  const index = Math.floor(Math.random() * accounts.length);
  return accounts[index];
}

/**
 * 加权策略
 * 根据账号权重选择，权重高的被选中的概率更大
 */
function weightedStrategy(accounts: Account[]): Account {
  if (accounts.length === 0) {
    throw new AccountUnavailableError();
  }

  // 计算总权重
  const totalWeight = accounts.reduce((sum, acc) => sum + acc.weight, 0);

  // 随机选择一个权重值
  let randomWeight = Math.random() * totalWeight;

  // 根据权重选择账号
  for (const account of accounts) {
    randomWeight -= account.weight;
    if (randomWeight <= 0) {
      return account;
    }
  }

  // 默认返回最后一个
  return accounts[accounts.length - 1];
}

/**
 * 最少连接策略
 * 选择当前连接数最少的账号
 */
function leastConnectionsStrategy(accounts: Account[]): Account {
  if (accounts.length === 0) {
    throw new AccountUnavailableError();
  }

  // 按连接数排序
  const sortedAccounts = [...accounts].sort((a, b) => {
    const countA = connectionCounts.get(a.id) || 0;
    const countB = connectionCounts.get(b.id) || 0;
    return countA - countB;
  });

  return sortedAccounts[0];
}

/**
 * 增加连接计数
 */
export function incrementConnectionCount(accountId: string): void {
  const current = connectionCounts.get(accountId) || 0;
  connectionCounts.set(accountId, current + 1);
}

/**
 * 减少连接计数
 */
export function decrementConnectionCount(accountId: string): void {
  const current = connectionCounts.get(accountId) || 0;
  if (current > 0) {
    connectionCounts.set(accountId, current - 1);
  }
}

/**
 * 获取连接计数
 */
export function getConnectionCount(accountId: string): number {
  return connectionCounts.get(accountId) || 0;
}

/**
 * 重置连接计数
 */
export function resetConnectionCount(accountId?: string): void {
  if (accountId) {
    connectionCounts.delete(accountId);
  } else {
    connectionCounts.clear();
  }
}

/**
 * 获取负载均衡统计
 */
export async function getLoadBalancerStats(): Promise<{
  totalAccounts: number;
  activeAccounts: number;
  strategy: string;
  connectionCounts: Record<string, number>;
}> {
  const stats = await accountRepo.getAccountStats();

  const connectionStats: Record<string, number> = {};
  connectionCounts.forEach((count, id) => {
    connectionStats[id] = count;
  });

  return {
    totalAccounts: stats.total,
    activeAccounts: stats.active,
    strategy: DEFAULT_CONFIG.strategy,
    connectionCounts: connectionStats,
  };
}

/**
 * 设置负载均衡策略
 */
export function setLoadBalanceStrategy(strategy: LoadBalanceConfig['strategy']): void {
  DEFAULT_CONFIG.strategy = strategy;
  logger.info({ strategy }, 'Load balance strategy updated');
}
