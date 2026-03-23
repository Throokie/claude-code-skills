/**
 * API Key认证中间件
 * PRD: prd-20260324-143000-a7b3-v2
 * Layer: middleware
 */

import type { FastifyReply, FastifyRequest, HookHandlerDoneFunction } from 'fastify';
import { AuthenticationError, RateLimitError } from '../utils/errors';
import { verifyApiKey } from '../utils/crypto';
import { checkRateLimit, getRateLimitStatus } from '../utils/rateLimiter';
import * as apiUserRepo from '../repositories/apiUser.repository';
import { createLogger } from '../utils/logger';

const logger = createLogger('auth');

// 公开路由（不需要认证）
const PUBLIC_ROUTES = ['/health', '/docs', '/docs/*', '/admin/login'];

/**
 * 检查是否是公开路由
 */
function isPublicRoute(url: string): boolean {
  return PUBLIC_ROUTES.some((route) => {
    if (route.endsWith('*')) {
      return url.startsWith(route.slice(0, -1));
    }
    return url === route;
  });
}

/**
 * 认证中间件
 */
export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const url = request.url;

  // 跳过公开路由
  if (isPublicRoute(url)) {
    return;
  }

  // 管理路由使用基本认证
  if (url.startsWith('/admin')) {
    return await handleAdminAuth(request, reply);
  }

  // OpenAI API使用API Key认证
  return await handleApiKeyAuth(request, reply);
}

/**
 * API Key认证
 */
async function handleApiKeyAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthenticationError('Missing or invalid Authorization header. Format: Bearer <api_key>');
  }

  const apiKey = authHeader.slice(7);

  // 查找用户
  const user = await apiUserRepo.getApiUserByKey(apiKey);

  if (!user) {
    throw new AuthenticationError('Invalid API key');
  }

  if (!user.isActive) {
    throw new AuthenticationError('API key is disabled');
  }

  // 检查限流
  try {
    await checkRateLimit(user.id, user.rateLimit);
  } catch (error) {
    if (error instanceof RateLimitError) {
      reply.header('Retry-After', String(error.retryAfter));
      reply.header('X-RateLimit-Limit', String(user.rateLimit.requestsPerMinute));
      reply.header('X-RateLimit-Remaining', '0');
      reply.header('X-RateLimit-Reset', String(Math.floor(Date.now() / 1000) + error.retryAfter));
    }
    throw error;
  }

  // 添加限流头信息
  const rateLimitStatus = getRateLimitStatus(user.id, user.rateLimit);
  reply.header('X-RateLimit-Limit', String(user.rateLimit.requestsPerMinute));
  reply.header('X-RateLimit-Remaining', String(rateLimitStatus.minute.remaining));

  // 将用户信息附加到请求
  (request as unknown as Record<string, unknown>).user = user;

  // 更新最后使用时间
  await apiUserRepo.updateApiUserLastUsed(user.id);

  logger.debug({ userId: user.id }, 'API key authenticated');
}

/**
 * 管理员认证
 */
async function handleAdminAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // 简化版：使用环境变量中的管理员密钥
  // 生产环境应该使用JWT或Session
  const adminKey = request.headers['x-admin-key'] as string | undefined;

  if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
    throw new AuthenticationError('Invalid admin key');
  }

  logger.debug('Admin authenticated');
}

/**
 * 可选认证中间件（不强制要求认证）
 */
export async function optionalAuthMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    await handleApiKeyAuth(request, reply);
  } catch {
    // 认证失败但不阻止请求
  }
}
