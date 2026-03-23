/**
 * API用户数据访问层
 * PRD: prd-20260324-143000-a7b3-v2
 * Layer: repositories
 */

import prisma from './db';
import type { ApiUser, CreateApiUserInput, UpdateApiUserInput, RateLimitConfig, QuotaConfig } from '../types';
import { createLogger } from '../utils/logger';

const logger = createLogger('apiUser-repository');

const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  requestsPerMinute: 60,
  requestsPerHour: 1000,
  requestsPerDay: 10000,
};

const DEFAULT_QUOTA: QuotaConfig = {
  used: 0,
  total: 100000,
};

/**
 * 创建API用户
 */
export async function createApiUser(data: CreateApiUserInput, apiKey: string): Promise<ApiUser> {
  const user = await prisma.apiUser.create({
    data: {
      name: data.name,
      apiKey,
      rateLimit: JSON.stringify(data.rateLimit ?? DEFAULT_RATE_LIMIT),
      quota: JSON.stringify(data.quota ?? DEFAULT_QUOTA),
    },
  });

  logger.info({ userId: user.id, name: user.name }, 'API user created');
  return mapApiUserFromDb(user);
}

/**
 * 获取用户（通过ID）
 */
export async function getApiUserById(id: string): Promise<ApiUser | null> {
  const user = await prisma.apiUser.findUnique({
    where: { id },
  });

  return user ? mapApiUserFromDb(user) : null;
}

/**
 * 获取用户（通过API Key）
 */
export async function getApiUserByKey(apiKey: string): Promise<ApiUser | null> {
  const user = await prisma.apiUser.findUnique({
    where: { apiKey },
  });

  return user ? mapApiUserFromDb(user) : null;
}

/**
 * 获取所有活跃用户
 */
export async function getActiveApiUsers(): Promise<ApiUser[]> {
  const users = await prisma.apiUser.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  });

  return users.map(mapApiUserFromDb);
}

/**
 * 获取所有用户（分页）
 */
export async function getAllApiUsers(
  page: number = 1,
  limit: number = 20
): Promise<{ users: ApiUser[]; total: number }> {
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    prisma.apiUser.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.apiUser.count(),
  ]);

  return {
    users: users.map(mapApiUserFromDb),
    total,
  };
}

/**
 * 更新用户
 */
export async function updateApiUser(id: string, data: UpdateApiUserInput): Promise<ApiUser> {
  const user = await prisma.apiUser.update({
    where: { id },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...(data.rateLimit && { rateLimit: JSON.stringify(data.rateLimit) }),
      ...(data.quota && { quota: JSON.stringify(data.quota) }),
    },
  });

  logger.info({ userId: id, updates: Object.keys(data) }, 'API user updated');
  return mapApiUserFromDb(user);
}

/**
 * 更新用户最后使用时间
 */
export async function updateApiUserLastUsed(id: string): Promise<void> {
  await prisma.apiUser.update({
    where: { id },
    data: { lastUsedAt: new Date() },
  });
}

/**
 * 增加配额使用量
 */
export async function incrementQuotaUsed(id: string, amount: number): Promise<void> {
  const user = await prisma.apiUser.findUnique({
    where: { id },
  });

  if (!user) return;

  const quota: QuotaConfig = JSON.parse(user.quota);
  quota.used += amount;

  await prisma.apiUser.update({
    where: { id },
    data: { quota: JSON.stringify(quota) },
  });
}

/**
 * 删除用户
 */
export async function deleteApiUser(id: string): Promise<void> {
  await prisma.apiUser.delete({
    where: { id },
  });

  logger.info({ userId: id }, 'API user deleted');
}

/**
 * 数据库模型映射
 */
function mapApiUserFromDb(dbUser: Record<string, unknown>): ApiUser {
  return {
    id: String(dbUser.id),
    name: String(dbUser.name),
    apiKey: String(dbUser.apiKey),
    isActive: Boolean(dbUser.isActive),
    rateLimit: JSON.parse(String(dbUser.rateLimit)) as RateLimitConfig,
    quota: JSON.parse(String(dbUser.quota)) as QuotaConfig,
    createdAt: new Date(String(dbUser.createdAt)),
    lastUsedAt: dbUser.lastUsedAt ? new Date(String(dbUser.lastUsedAt)) : null,
  };
}
