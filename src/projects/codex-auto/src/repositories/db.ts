/**
 * Prisma数据库客户端
 * PRD: prd-20260324-143000-a7b3-v2
 * Layer: data-layer
 */

import { PrismaClient, AccountStatus } from '@prisma/client';
import { createLogger } from '../utils/logger';

const logger = createLogger('prisma');

// 全局Prisma实例
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Prisma客户端配置
 */
const prismaClientSingleton = () => {
  return new PrismaClient({
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'warn' },
    ],
  });
};

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

// 开发环境下保持实例
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// 查询日志
prisma.$on('query', (e) => {
  logger.debug({
    query: e.query,
    params: e.params,
    duration: `${e.duration}ms`,
  }, 'Prisma query executed');
});

// 错误日志
prisma.$on('error', (e) => {
  logger.error({
    message: e.message,
  }, 'Prisma error');
});

// 警告日志
prisma.$on('warn', (e) => {
  logger.warn({
    message: e.message,
  }, 'Prisma warning');
});

/**
 * 连接数据库
 */
export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('Database connected successfully');
  } catch (error) {
    logger.error({ error }, 'Failed to connect to database');
    throw error;
  }
}

/**
 * 断开数据库连接
 */
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  logger.info('Database disconnected');
}

export { AccountStatus };
export default prisma;
