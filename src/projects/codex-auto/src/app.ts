/**
 * Fastify应用主文件
 * PRD: prd-20260324-143000-a7b3-v2
 * Layer: api-layer
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import type { FastifyInstance } from 'fastify';

import { createLogger } from './utils/logger';
import { errorHandler } from './middleware/error.middleware';
import { requestLogger } from './middleware/requestLogger.middleware';
import { authMiddleware } from './middleware/auth.middleware';

// 路由
import openaiRoutes from './routes/openai';
import adminRoutes from './routes/admin';

const logger = createLogger('app');

/**
 * 创建Fastify应用实例
 */
export async function createApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: false, // 使用自定义logger
    trustProxy: true,
    connectionTimeout: 60000, // 60秒连接超时
    keepAliveTimeout: 72000,  // 72秒保活超时
  });

  // 注册错误处理
  app.setErrorHandler(errorHandler);

  // 请求日志
  app.addHook('onResponse', requestLogger);

  // CORS
  await app.register(cors, {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  });

  // Swagger文档
  await app.register(swagger, {
    swagger: {
      info: {
        title: 'Codex Free API Pool',
        description: '多账号管理的Codex反代服务',
        version: '1.0.0',
      },
      tags: [
        { name: 'OpenAI', description: 'OpenAI兼容API' },
        { name: 'Admin', description: '管理接口' },
      ],
      schemes: ['http', 'https'],
      consumes: ['application/json'],
      produces: ['application/json'],
      securityDefinitions: {
        apiKey: {
          type: 'apiKey',
          name: 'Authorization',
          in: 'header',
          description: 'API Key格式: Bearer cfap_<key>',
        },
      },
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
  });

  // 健康检查端点
  app.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // OpenAI兼容路由（需要认证）
  await app.register(openaiRoutes, {
    prefix: '/v1',
  });

  // 管理路由
  await app.register(adminRoutes, {
    prefix: '/admin',
  });

  // 根路由
  app.get('/', async () => {
    return {
      name: 'Codex Free API Pool',
      version: '1.0.0',
      docs: '/docs',
      health: '/health',
    };
  });

  logger.info('Fastify app created');
  return app;
}
