/**
 * OpenAI兼容路由
 * PRD: prd-20260324-143000-a7b3-v2
 * Layer: api-layer
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authMiddleware } from '../../middleware/auth.middleware';
import * as proxyService from '../../services/proxy.service';
import { createLogger } from '../../utils/logger';

const logger = createLogger('openai-routes');

/**
 * 注册OpenAI兼容路由
 */
export default async function openaiRoutes(fastify: FastifyInstance): Promise<void> {
  // 添加认证钩子
  fastify.addHook('onRequest', authMiddleware);

  /**
   * GET /v1/models
   * 获取可用模型列表
   */
  fastify.get('/models', async (request: FastifyRequest, reply: FastifyReply) => {
    const models = await proxyService.listModels();
    return models;
  });

  /**
   * POST /v1/chat/completions
   * 聊天补全
   */
  fastify.post('/chat/completions', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as Record<string, unknown>;

    // 检查是否流式响应
    if (body.stream) {
      // 流式响应
      reply.header('Content-Type', 'text/event-stream');
      reply.header('Cache-Control', 'no-cache');
      reply.header('Connection', 'keep-alive');

      const stream = proxyService.streamChatCompletion(body as never);

      for await (const chunk of stream) {
        reply.raw.write(chunk);
      }

      reply.raw.end();
      return;
    }

    // 普通响应
    const response = await proxyService.chatCompletion(body as never);
    return response;
  });

  /**
   * POST /v1/completions
   * 文本补全
   */
  fastify.post('/completions', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as Record<string, unknown>;
    const response = await proxyService.textCompletion(body as never);
    return response;
  });

  /**
   * POST /v1/embeddings
   * 文本嵌入（预留接口）
   */
  fastify.post('/embeddings', async (request: FastifyRequest, reply: FastifyReply) => {
    // TODO: 实现嵌入接口
    reply.status(501);
    return {
      error: {
        message: 'Embeddings API not implemented yet',
        type: 'not_implemented',
      },
    };
  });
}
