/**
 * 限流器实现
 * PRD: prd-20260324-143000-a7b3-v2
 * Layer: utils
 *
 * 支持内存限流（单实例）和Redis限流（分布式）
 */

import { RateLimitError } from './errors';
import { createLogger } from './logger';

const logger = createLogger('rate-limiter');

// 限流存储
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// 清理间隔
const CLEANUP_INTERVAL = 60000; // 60秒

/**
 * 限流器配置
 */
export interface RateLimiterConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
}

/**
 * 检查并记录请求
 */
export async function checkRateLimit(
  key: string,
  config: RateLimiterConfig
): Promise<void> {
  const now = Date.now();

  // 检查每分钟限制
  const minuteKey = `${key}:minute`;
  const minuteEntry = getRateLimitEntry(minuteKey, 60000); // 1分钟窗口

  if (minuteEntry.count >= config.requestsPerMinute) {
    const retryAfter = Math.ceil((minuteEntry.resetTime - now) / 1000);
    logger.warn({ key, limit: 'per_minute', retryAfter }, 'Rate limit exceeded');
    throw new RateLimitError(retryAfter);
  }

  // 检查每小时限制
  const hourKey = `${key}:hour`;
  const hourEntry = getRateLimitEntry(hourKey, 3600000); // 1小时窗口

  if (hourEntry.count >= config.requestsPerHour) {
    const retryAfter = Math.ceil((hourEntry.resetTime - now) / 1000);
    logger.warn({ key, limit: 'per_hour', retryAfter }, 'Rate limit exceeded');
    throw new RateLimitError(retryAfter);
  }

  // 检查每日限制
  const dayKey = `${key}:day`;
  const dayEntry = getRateLimitEntry(dayKey, 86400000); // 24小时窗口

  if (dayEntry.count >= config.requestsPerDay) {
    const retryAfter = Math.ceil((dayEntry.resetTime - now) / 1000);
    logger.warn({ key, limit: 'per_day', retryAfter }, 'Rate limit exceeded');
    throw new RateLimitError(retryAfter);
  }

  // 增加计数
  incrementRateLimit(minuteKey, 60000);
  incrementRateLimit(hourKey, 3600000);
  incrementRateLimit(dayKey, 86400000);
}

/**
 * 获取限流条目
 */
function getRateLimitEntry(key: string, windowMs: number): RateLimitEntry {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetTime <= now) {
    // 创建新条目
    const newEntry: RateLimitEntry = {
      count: 0,
      resetTime: now + windowMs,
    };
    rateLimitStore.set(key, newEntry);
    return newEntry;
  }

  return entry;
}

/**
 * 增加限流计数
 */
function incrementRateLimit(key: string, windowMs: number): void {
  const entry = getRateLimitEntry(key, windowMs);
  entry.count++;
}

/**
 * 获取当前限流状态
 */
export function getRateLimitStatus(
  key: string,
  config: RateLimiterConfig
): {
  minute: { count: number; limit: number; remaining: number };
  hour: { count: number; limit: number; remaining: number };
  day: { count: number; limit: number; remaining: number };
} {
  const minuteEntry = getRateLimitEntry(`${key}:minute`, 60000);
  const hourEntry = getRateLimitEntry(`${key}:hour`, 3600000);
  const dayEntry = getRateLimitEntry(`${key}:day`, 86400000);

  return {
    minute: {
      count: minuteEntry.count,
      limit: config.requestsPerMinute,
      remaining: Math.max(0, config.requestsPerMinute - minuteEntry.count),
    },
    hour: {
      count: hourEntry.count,
      limit: config.requestsPerHour,
      remaining: Math.max(0, config.requestsPerHour - hourEntry.count),
    },
    day: {
      count: dayEntry.count,
      limit: config.requestsPerDay,
      remaining: Math.max(0, config.requestsPerDay - dayEntry.count),
    },
  };
}

/**
 * 清理过期的限流条目
 */
export function cleanupRateLimits(): void {
  const now = Date.now();
  let cleanedCount = 0;

  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime <= now) {
      rateLimitStore.delete(key);
      cleanedCount++;
    }
  }

  if (cleanedCount > 0) {
    logger.debug({ cleanedCount }, 'Cleaned up expired rate limit entries');
  }
}

/**
 * 启动定期清理
 */
export function startRateLimitCleanup(): void {
  setInterval(cleanupRateLimits, CLEANUP_INTERVAL);
  logger.info('Rate limit cleanup scheduled');
}

/**
 * 重置指定key的限流
 */
export function resetRateLimit(key: string): void {
  rateLimitStore.delete(`${key}:minute`);
  rateLimitStore.delete(`${key}:hour`);
  rateLimitStore.delete(`${key}:day`);
  logger.debug({ key }, 'Rate limit reset');
}
