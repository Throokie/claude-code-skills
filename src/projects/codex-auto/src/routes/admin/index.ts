/**
 * 管理路由
 * PRD: prd-20260324-143000-a7b3-v2
 * Layer: api-layer
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authMiddleware } from '../../middleware/auth.middleware';
import * as accountRepo from '../../repositories/account.repository';
import * as apiUserRepo from '../../repositories/apiUser.repository';
import * as loadBalancer from '../../services/loadBalancer.service';
import * as healthCheck from '../../services/healthCheck.service';
import { createLogger } from '../../utils/logger';
import { generateApiKey, hashApiKey } from '../../utils/crypto';

const logger = createLogger('admin-routes');

/**
 * 注册管理路由
 */
export default async function adminRoutes(fastify: FastifyInstance): Promise<void> {
  // 添加认证钩子
  fastify.addHook('onRequest', authMiddleware);

  // ==================== 账号管理 ====================

  /**
   * GET /admin/accounts
   * 获取账号列表
   */
  fastify.get('/accounts', async (request: FastifyRequest) => {
    const query = request.query as { page?: string; limit?: string };
    const page = parseInt(query.page || '1');
    const limit = parseInt(query.limit || '20');

    const { accounts, total } = await accountRepo.getAllAccounts(page, limit);

    return {
      data: accounts,
      total,
      page,
      limit,
      hasMore: page * limit < total,
    };
  });

  /**
   * GET /admin/accounts/:id
   * 获取单个账号
   */
  fastify.get('/accounts/:id', async (request: FastifyRequest) => {
    const { id } = request.params as { id: string };
    const account = await accountRepo.getAccountById(id);

    if (!account) {
      return { error: 'Account not found' };
    }

    return account;
  });

  /**
   * POST /admin/accounts
   * 创建账号
   */
  fastify.post('/accounts', async (request: FastifyRequest) => {
    const body = request.body as {
      email: string;
      password: string;
      quotaRemaining?: number;
      weight?: number;
    };

    const account = await accountRepo.createAccount({
      email: body.email,
      password: body.password,
      quotaRemaining: body.quotaRemaining,
      weight: body.weight,
    });

    return account;
  });

  /**
   * PUT /admin/accounts/:id
   * 更新账号
   */
  fastify.put('/accounts/:id', async (request: FastifyRequest) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;

    const account = await accountRepo.updateAccount(id, body);
    return account;
  });

  /**
   * DELETE /admin/accounts/:id
   * 删除账号
   */
  fastify.delete('/accounts/:id', async (request: FastifyRequest) => {
    const { id } = request.params as { id: string };
    await accountRepo.deleteAccount(id);
    return { success: true };
  });

  // ==================== 用户管理 ====================

  /**
   * GET /admin/users
   * 获取用户列表
   */
  fastify.get('/users', async (request: FastifyRequest) => {
    const query = request.query as { page?: string; limit?: string };
    const page = parseInt(query.page || '1');
    const limit = parseInt(query.limit || '20');

    const { users, total } = await apiUserRepo.getAllApiUsers(page, limit);

    return {
      data: users,
      total,
      page,
      limit,
      hasMore: page * limit < total,
    };
  });

  /**
   * POST /admin/users
   * 创建用户
   */
  fastify.post('/users', async (request: FastifyRequest) => {
    const body = request.body as {
      name: string;
      rateLimit?: { requestsPerMinute: number; requestsPerHour: number; requestsPerDay: number };
      quota?: { used: number; total: number };
    };

    // 生成API Key
    const rawKey = generateApiKey();
    const hashedKey = await hashApiKey(rawKey);

    const user = await apiUserRepo.createApiUser(body, hashedKey);

    // 返回原始API Key（仅创建时）
    return {
      ...user,
      apiKey: rawKey, // 这是唯一一次能看到完整key的机会
    };
  });

  /**
   * PUT /admin/users/:id
   * 更新用户
   */
  fastify.put('/users/:id', async (request: FastifyRequest) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;

    const user = await apiUserRepo.updateApiUser(id, body);
    return user;
  });

  /**
   * DELETE /admin/users/:id
   * 删除用户
   */
  fastify.delete('/users/:id', async (request: FastifyRequest) => {
    const { id } = request.params as { id: string };
    await apiUserRepo.deleteApiUser(id);
    return { success: true };
  });

  // ==================== 统计 ====================

  /**
   * GET /admin/stats
   * 服务统计
   */
  fastify.get('/stats', async () => {
    const accountStats = await accountRepo.getAccountStats();
    const loadStats = await loadBalancer.getLoadBalancerStats();
    const healthStats = await healthCheck.getHealthCheckStats();

    return {
      accounts: accountStats,
      loadBalancer: loadStats,
      health: healthStats,
      timestamp: new Date().toISOString(),
    };
  });
}
