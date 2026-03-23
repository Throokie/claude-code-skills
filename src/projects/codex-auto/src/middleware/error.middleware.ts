/**
 * 错误处理中间件
 * PRD: prd-20260324-143000-a7b3-v2
 * Layer: middleware
 */

import type { FastifyError } from 'fastify';
import type { RouteGenericInterface } from 'fastify/types/route';
import type { IncomingMessage, ServerResponse } from 'http';
import { errorToResponse, AppError } from '../utils/errors';
import { createLogger } from '../utils/logger';

const logger = createLogger('error-handler');

/**
 * 全局错误处理器
 */
export async function errorHandler(
  error: FastifyError,
  request: IncomingMessage,
  reply: ServerResponse
): Promise<void> {
  const response = errorToResponse(error);

  // 记录错误
  if (error instanceof AppError && error.isOperational) {
    logger.warn({
      error: error.message,
      code: error.code,
      url: request.url,
    }, 'Operational error');
  } else {
    logger.error({
      error: error.message,
      stack: error.stack,
      url: request.url,
    }, 'Unexpected error');
  }

  // 设置响应
  reply.statusCode = response.statusCode;
  reply.setHeader('Content-Type', 'application/json');
  reply.end(JSON.stringify(response.body));
}
