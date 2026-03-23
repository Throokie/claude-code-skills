/**
 * 健康检查服务
 * PRD: prd-20260324-143000-a7b3-v2
 * Layer: services
 *
 * 定期检查账号可用性，自动更新账号状态
 */

import type { Account, HealthCheckInfo } from '../types';
import { AccountStatus } from '../repositories/db';
import prisma from '../repositories/db';
import * as accountRepo from '../repositories/account.repository';
import { createLogger } from '../utils/logger';

const logger = createLogger('health-check');

// 健康检查配置
const CHECK_INTERVAL = 60000; // 60秒
const CHECK_TIMEOUT = 10000; // 10秒
const MAX_FAIL_COUNT = 3; // 最大失败次数

// 检查状态
let isRunning = false;
let checkTimer: NodeJS.Timeout | null = null;

/**
 * 启动健康检查服务
 */
export function startHealthCheckService(): void {
  if (isRunning) {
    logger.warn('Health check service is already running');
    return;
  }

  isRunning = true;
  logger.info('Health check service started');

  // 立即执行一次检查
  runHealthChecks();

  // 定时执行
  checkTimer = setInterval(runHealthChecks, CHECK_INTERVAL);
}

/**
 * 停止健康检查服务
 */
export function stopHealthCheckService(): void {
  if (!isRunning) {
    return;
  }

  isRunning = false;
  if (checkTimer) {
    clearInterval(checkTimer);
    checkTimer = null;
  }

  logger.info('Health check service stopped');
}

/**
 * 执行健康检查
 */
async function runHealthChecks(): Promise<void> {
  try {
    // 获取所有需要检查的账号（排除已暂停的）
    const accounts = await prisma.account.findMany({
      where: {
        status: {
          not: AccountStatus.SUSPENDED,
        },
      },
      include: { healthCheck: true },
    });

    logger.debug(`Running health checks for ${accounts.length} accounts`);

    // 并行检查所有账号
    const checkPromises = accounts.map((account) => checkAccountHealth(account));
    await Promise.all(checkPromises);

  } catch (error) {
    logger.error({ error }, 'Health check run failed');
  }
}

/**
 * 检查单个账号健康状态
 */
async function checkAccountHealth(
  account: Record<string, unknown> & { healthCheck?: Record<string, unknown> | null }
): Promise<void> {
  const accountId = String(account.id);
  const email = String(account.email);

  const startTime = Date.now();
  let success = false;
  let error: string | undefined;

  try {
    // 模拟健康检查 - 实际实现需要调用Codex API验证账号可用性
    // TODO: 实现实际的Codex API检查
    success = await simulateHealthCheck(email, String(account.password));

  } catch (err) {
    success = false;
    error = err instanceof Error ? err.message : 'Unknown error';
  }

  const responseTime = Date.now() - startTime;

  // 更新健康检查记录
  await updateHealthCheckRecord(accountId, success, responseTime, error);

  // 更新账号状态
  await updateAccountStatusBasedOnHealth(accountId, success, error);

  // 记录日志
  if (success) {
    logger.debug({ accountId, responseTime }, 'Health check passed');
  } else {
    logger.warn({ accountId, error, responseTime }, 'Health check failed');
  }
}

/**
 * 模拟健康检查
 * 实际部署时需要替换为真实的Codex API调用
 */
async function simulateHealthCheck(email: string, password: string): Promise<boolean> {
  // 模拟随机失败（10%概率）
  return Math.random() > 0.1;
}

/**
 * 更新健康检查记录
 */
async function updateHealthCheckRecord(
  accountId: string,
  success: boolean,
  responseTime: number,
  error?: string
): Promise<void> {
  const existing = await prisma.healthCheck.findUnique({
    where: { accountId },
  });

  if (existing) {
    // 更新现有记录
    await prisma.healthCheck.update({
      where: { accountId },
      data: {
        lastCheckedAt: new Date(),
        successCount: success ? existing.successCount + 1 : existing.successCount,
        failCount: success ? existing.failCount : existing.failCount + 1,
        lastError: error || existing.lastError,
        averageResponse: calculateAverageResponse(existing.averageResponse, responseTime),
      },
    });
  } else {
    // 创建新记录
    await prisma.healthCheck.create({
      data: {
        accountId,
        lastCheckedAt: new Date(),
        successCount: success ? 1 : 0,
        failCount: success ? 0 : 1,
        lastError: error,
        averageResponse: responseTime,
      },
    });
  }
}

/**
 * 基于健康状态更新账号状态
 */
async function updateAccountStatusBasedOnHealth(
  accountId: string,
  success: boolean,
  error?: string
): Promise<void> {
  const healthCheck = await prisma.healthCheck.findUnique({
    where: { accountId },
  });

  if (!healthCheck) return;

  const currentStatus = await prisma.account.findUnique({
    where: { id: accountId },
    select: { status: true },
  });

  if (!currentStatus) return;

  let newStatus: AccountStatus | null = null;

  if (success) {
    // 检查通过，如果之前是错误状态，恢复为活跃
    if (currentStatus.status === AccountStatus.ERROR) {
      newStatus = AccountStatus.ACTIVE;
    }
  } else {
    // 检查失败
    if (healthCheck.failCount >= MAX_FAIL_COUNT) {
      // 连续失败超过阈值，标记为错误
      if (currentStatus.status !== AccountStatus.ERROR) {
        newStatus = AccountStatus.ERROR;
      }
    } else if (error?.includes('rate limit')) {
      // 触发限流
      newStatus = AccountStatus.RATE_LIMITED;
    }
  }

  if (newStatus) {
    await prisma.account.update({
      where: { id: accountId },
      data: { status: newStatus, updatedAt: new Date() },
    });

    logger.info(
      { accountId, oldStatus: currentStatus.status, newStatus },
      'Account status updated based on health check'
    );
  }
}

/**
 * 计算平均响应时间
 */
function calculateAverageResponse(current: number, newValue: number): number {
  // 使用指数移动平均
  const alpha = 0.3;
  return Math.round(current * (1 - alpha) + newValue * alpha);
}

/**
 * 手动触发账号健康检查
 */
export async function manualHealthCheck(accountId: string): Promise<{
  success: boolean;
  responseTime: number;
  error?: string;
}> {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    include: { healthCheck: true },
  });

  if (!account) {
    throw new Error(`Account ${accountId} not found`);
  }

  const startTime = Date.now();
  let success = false;
  let error: string | undefined;

  try {
    success = await simulateHealthCheck(account.email, account.password);
  } catch (err) {
    error = err instanceof Error ? err.message : 'Unknown error';
  }

  const responseTime = Date.now() - startTime;

  await updateHealthCheckRecord(accountId, success, responseTime, error);
  await updateAccountStatusBasedOnHealth(accountId, success, error);

  return { success, responseTime, error };
}

/**
 * 获取健康检查统计
 */
export async function getHealthCheckStats(): Promise<{
  totalChecked: number;
  healthyCount: number;
  unhealthyCount: number;
  averageResponseTime: number;
}> {
  const checks = await prisma.healthCheck.findMany();

  const totalChecked = checks.length;
  const healthyCount = checks.filter((c) => c.failCount === 0).length;
  const unhealthyCount = totalChecked - healthyCount;
  const averageResponseTime =
    totalChecked > 0
      ? Math.round(checks.reduce((sum, c) => sum + c.averageResponse, 0) / totalChecked)
      : 0;

  return {
    totalChecked,
    healthyCount,
    unhealthyCount,
    averageResponseTime,
  };
}
