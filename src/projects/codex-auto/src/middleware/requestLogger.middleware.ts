/**
 * 请求日志中间件
 * PRD: prd-20260324-143000-a7b3-v2
 * Layer: middleware
 */

import type { onResponseHookHandler } from 'fastify';
import { logRequest } from '../utils/logger';

/**
 * 请求日志钩子
 */
export const requestLogger: onResponseHookHandler = async (request, reply) => {
  const responseTime = reply.elapsedTime;

  logRequest(
    request.method,
    request.url,
    reply.statusCode,
    responseTime,
    request.headers['user-agent']
  );
};
