/**
 * 日志工具模块
 * PRD: prd-20260324-143000-a7b3-v2
 * Layer: utils
 */

import pino from 'pino';

// 日志级别
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

/**
 * 创建Pino日志实例
 */
export const logger = pino({
  level: LOG_LEVEL,
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
      ignore: 'pid,hostname',
    },
  },
  base: {
    service: 'codex-api-pool',
  },
});

/**
 * 创建子日志记录器
 */
export function createLogger(module: string) {
  return logger.child({ module });
}

/**
 * 请求日志记录
 */
export function logRequest(
  method: string,
  url: string,
  statusCode: number,
  responseTime: number,
  userAgent?: string
) {
  const logData = {
    method,
    url,
    statusCode,
    responseTime: `${responseTime}ms`,
    userAgent,
  };

  if (statusCode >= 500) {
    logger.error(logData, 'Request failed with server error');
  } else if (statusCode >= 400) {
    logger.warn(logData, 'Request failed with client error');
  } else if (responseTime > 5000) {
    logger.warn(logData, 'Slow request detected');
  } else {
    logger.info(logData, 'Request completed');
  }
}

/**
 * API调用日志
 */
export function logApiCall(
  accountId: string,
  model: string,
  success: boolean,
  responseTime: number,
  error?: string
) {
  const logData = {
    accountId,
    model,
    success,
    responseTime: `${responseTime}ms`,
    error,
  };

  if (success) {
    logger.info(logData, 'API call completed');
  } else {
    logger.error(logData, 'API call failed');
  }
}

/**
 * 账号状态变更日志
 */
export function logAccountStatusChange(
  accountId: string,
  oldStatus: string,
  newStatus: string,
  reason?: string
) {
  logger.info(
    {
      accountId,
      oldStatus,
      newStatus,
      reason,
    },
    'Account status changed'
  );
}

/**
 * 健康检查结果日志
 */
export function logHealthCheck(accountId: string, healthy: boolean, responseTime: number, error?: string) {
  const logData = {
    accountId,
    healthy,
    responseTime: `${responseTime}ms`,
    error,
  };

  if (healthy) {
    logger.debug(logData, 'Health check passed');
  } else {
    logger.warn(logData, 'Health check failed');
  }
}

/**
 * 限流触发日志
 */
export function logRateLimit(apiKeyId: string, limit: string, retryAfter: number) {
  logger.warn(
    {
      apiKeyId,
      limit,
      retryAfter: `${retryAfter}s`,
    },
    'Rate limit triggered'
  );
}
