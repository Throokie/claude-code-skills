/**
 * 账号数据访问层
 * PRD: prd-20260324-143000-a7b3-v2
 * Layer: repositories
 */

import prisma, { AccountStatus } from './db';
import type {
  Account,
  CreateAccountInput,
  UpdateAccountInput,
  HealthCheckInfo,
} from '../types';
import { createLogger } from '../utils/logger';

const logger = createLogger('account-repository');

/**
 * 创建账号
 */
export async function createAccount(data: CreateAccountInput): Promise<Account> {
  try {
    const account = await prisma.account.create({
      data: {
        email: data.email,
        password: data.password,
        quotaRemaining: data.quotaRemaining ?? 0,
        weight: data.weight ?? 1,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      },
    });

    logger.info({ accountId: account.id }, 'Account created');
    return mapAccountFromDb(account);
  } catch (error) {
    logger.error({ error, email: data.email }, 'Failed to create account');
    throw error;
  }
}

/**
 * 获取账号（通过ID）
 */
export async function getAccountById(id: string): Promise<Account | null> {
  const account = await prisma.account.findUnique({
    where: { id },
    include: { healthCheck: true },
  });

  return account ? mapAccountFromDb(account) : null;
}

/**
 * 获取账号（通过邮箱）
 */
export async function getAccountByEmail(email: string): Promise<Account | null> {
  const account = await prisma.account.findUnique({
    where: { email },
    include: { healthCheck: true },
  });

  return account ? mapAccountFromDb(account) : null;
}

/**
 * 获取所有活跃账号
 */
export async function getActiveAccounts(): Promise<Account[]> {
  const accounts = await prisma.account.findMany({
    where: { status: AccountStatus.ACTIVE },
    include: { healthCheck: true },
    orderBy: { lastUsedAt: 'asc' },
  });

  return accounts.map(mapAccountFromDb);
}

/**
 * 获取所有账号（分页）
 */
export async function getAllAccounts(
  page: number = 1,
  limit: number = 20
): Promise<{ accounts: Account[]; total: number }> {
  const skip = (page - 1) * limit;

  const [accounts, total] = await Promise.all([
    prisma.account.findMany({
      include: { healthCheck: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.account.count(),
  ]);

  return {
    accounts: accounts.map(mapAccountFromDb),
    total,
  };
}

/**
 * 获取指定状态的账号
 */
export async function getAccountsByStatus(status: AccountStatus): Promise<Account[]> {
  const accounts = await prisma.account.findMany({
    where: { status },
    include: { healthCheck: true },
  });

  return accounts.map(mapAccountFromDb);
}

/**
 * 更新账号
 */
export async function updateAccount(id: string, data: UpdateAccountInput): Promise<Account> {
  const account = await prisma.account.update({
    where: { id },
    data: {
      ...(data.email && { email: data.email }),
      ...(data.password && { password: data.password }),
      ...(data.status && { status: data.status }),
      ...(data.quotaRemaining !== undefined && { quotaRemaining: data.quotaRemaining }),
      ...(data.weight !== undefined && { weight: data.weight }),
      ...(data.metadata && { metadata: JSON.stringify(data.metadata) }),
      updatedAt: new Date(),
    },
    include: { healthCheck: true },
  });

  logger.info({ accountId: id, updates: Object.keys(data) }, 'Account updated');
  return mapAccountFromDb(account);
}

/**
 * 更新账号状态
 */
export async function updateAccountStatus(
  id: string,
  status: AccountStatus,
  reason?: string
): Promise<void> {
  await prisma.account.update({
    where: { id },
    data: { status, updatedAt: new Date() },
  });

  logger.info({ accountId: id, status, reason }, 'Account status updated');
}

/**
 * 更新账号最后使用时间
 */
export async function updateLastUsedAt(id: string): Promise<void> {
  await prisma.account.update({
    where: { id },
    data: { lastUsedAt: new Date() },
  });
}

/**
 * 删除账号
 */
export async function deleteAccount(id: string): Promise<void> {
  await prisma.account.delete({
    where: { id },
  });

  logger.info({ accountId: id }, 'Account deleted');
}

/**
 * 批量创建账号
 */
export async function createAccountsBatch(data: CreateAccountInput[]): Promise<Account[]> {
  const accounts = await prisma.$transaction(
    data.map((item) =>
      prisma.account.create({
        data: {
          email: item.email,
          password: item.password,
          quotaRemaining: item.quotaRemaining ?? 0,
          weight: item.weight ?? 1,
          metadata: item.metadata ? JSON.stringify(item.metadata) : null,
        },
      })
    )
  );

  logger.info({ count: accounts.length }, 'Accounts created in batch');
  return accounts.map(mapAccountFromDb);
}

/**
 * 获取账号统计数据
 */
export async function getAccountStats(): Promise<{
  total: number;
  active: number;
  rateLimited: number;
  suspended: number;
  expired: number;
  error: number;
}> {
  const [
    total,
    active,
    rateLimited,
    suspended,
    expired,
    error,
  ] = await Promise.all([
    prisma.account.count(),
    prisma.account.count({ where: { status: AccountStatus.ACTIVE } }),
    prisma.account.count({ where: { status: AccountStatus.RATE_LIMITED } }),
    prisma.account.count({ where: { status: AccountStatus.SUSPENDED } }),
    prisma.account.count({ where: { status: AccountStatus.EXPIRED } }),
    prisma.account.count({ where: { status: AccountStatus.ERROR } }),
  ]);

  return { total, active, rateLimited, suspended, expired, error };
}

/**
 * 数据库模型映射
 */
function mapAccountFromDb(
  dbAccount: Record<string, unknown> & { healthCheck?: Record<string, unknown> | null }
): Account {
  const healthCheck: HealthCheckInfo | undefined = dbAccount.healthCheck
    ? {
        id: String(dbAccount.healthCheck.id),
        accountId: String(dbAccount.healthCheck.accountId),
        lastCheckedAt: new Date(String(dbAccount.healthCheck.lastCheckedAt)),
        successCount: Number(dbAccount.healthCheck.successCount),
        failCount: Number(dbAccount.healthCheck.failCount),
        lastError: dbAccount.healthCheck.lastError
          ? String(dbAccount.healthCheck.lastError)
          : undefined,
        averageResponse: Number(dbAccount.healthCheck.averageResponse),
      }
    : undefined;

  return {
    id: String(dbAccount.id),
    email: String(dbAccount.email),
    password: String(dbAccount.password),
    status: dbAccount.status as AccountStatus,
    quotaRemaining: Number(dbAccount.quotaRemaining),
    weight: Number(dbAccount.weight),
    lastUsedAt: dbAccount.lastUsedAt ? new Date(String(dbAccount.lastUsedAt)) : null,
    createdAt: new Date(String(dbAccount.createdAt)),
    updatedAt: new Date(String(dbAccount.updatedAt)),
    metadata: dbAccount.metadata ? JSON.parse(String(dbAccount.metadata)) : undefined,
    healthCheck,
  };
}

export { AccountStatus };
