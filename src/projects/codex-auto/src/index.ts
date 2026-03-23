/**
 * 服务启动入口
 * PRD: prd-20260324-143000-a7b3-v2
 * Layer: api-layer
 */

import 'dotenv/config';
import { createApp } from './app';
import { connectDatabase, disconnectDatabase } from './repositories/db';
import { startHealthCheckService, stopHealthCheckService } from './services/healthCheck.service';
import { startRateLimitCleanup } from './utils/rateLimiter';
import { createLogger } from './utils/logger';

const logger = createLogger('server');

const PORT = parseInt(process.env.PORT || '3000');
const HOST = process.env.HOST || '0.0.0.0';

/**
 * 启动服务
 */
async function start(): Promise<void> {
  try {
    // 连接数据库
    await connectDatabase();

    // 创建Fastify应用
    const app = await createApp();

    // 启动健康检查服务
    startHealthCheckService();

    // 启动限流清理
    startRateLimitCleanup();

    // 启动服务
    await app.listen({ port: PORT, host: HOST });
    logger.info(`Server running on http://${HOST}:${PORT}`);
    logger.info(`API文档: http://${HOST}:${PORT}/docs`);

    // 优雅关闭
    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received, starting graceful shutdown...`);

      // 停止健康检查
      stopHealthCheckService();

      // 关闭服务
      await app.close();

      // 断开数据库
      await disconnectDatabase();

      logger.info('Graceful shutdown completed');
      process.exit(0);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
}

// 启动
start();
