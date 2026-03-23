/**
 * Codex代理服务
 * PRD: prd-20260324-143000-a7b3-v2
 * Layer: services
 *
 * 将Codex接口转换为标准OpenAI API格式
 */

import type {
  Account,
  OpenAIChatCompletionRequest,
  OpenAICompletionRequest,
  OpenAIChatCompletionResponse,
  OpenAICompletionResponse,
  OpenAIModelsResponse,
} from '../types';
import { ExternalServiceError } from '../utils/errors';
import { createLogger } from '../utils/logger';
import * as loadBalancer from './loadBalancer.service';
import * as accountRepo from '../repositories/account.repository';

const logger = createLogger('proxy');

// Codex API配置
const CODEX_API_BASE = process.env.CODEX_API_BASE || 'https://api.openai.com/v1';

// 支持的模型
const SUPPORTED_MODELS = [
  { id: 'gpt-4', name: 'GPT-4', owned_by: 'openai' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', owned_by: 'openai' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', owned_by: 'openai' },
  { id: 'text-davinci-003', name: 'Text Davinci 003', owned_by: 'openai' },
];

/**
 * 聊天补全 - 代理到Codex
 */
export async function chatCompletion(
  request: OpenAIChatCompletionRequest,
  account?: Account
): Promise<OpenAIChatCompletionResponse> {
  const startTime = Date.now();
  const selectedAccount = account || await loadBalancer.getAvailableAccount();

  try {
    logger.debug({
      model: request.model,
      messagesCount: request.messages.length,
      accountId: selectedAccount.id,
    }, 'Proxying chat completion request');

    // TODO: 实际实现需要调用真实的Codex API
    // 这里是模拟实现
    const response = await simulateChatCompletion(request, selectedAccount);

    const responseTime = Date.now() - startTime;
    logger.debug({ accountId: selectedAccount.id, responseTime }, 'Chat completion successful');

    // 减少连接计数
    loadBalancer.decrementConnectionCount(selectedAccount.id);

    return response;

  } catch (error) {
    loadBalancer.decrementConnectionCount(selectedAccount.id);
    throw error;
  }
}

/**
 * 文本补全 - 代理到Codex
 */
export async function textCompletion(
  request: OpenAICompletionRequest,
  account?: Account
): Promise<OpenAICompletionResponse> {
  const startTime = Date.now();
  const selectedAccount = account || await loadBalancer.getAvailableAccount();

  try {
    logger.debug({
      model: request.model,
      accountId: selectedAccount.id,
    }, 'Proxying text completion request');

    // TODO: 实际实现需要调用真实的Codex API
    const response = await simulateTextCompletion(request, selectedAccount);

    const responseTime = Date.now() - startTime;
    logger.debug({ accountId: selectedAccount.id, responseTime }, 'Text completion successful');

    loadBalancer.decrementConnectionCount(selectedAccount.id);

    return response;

  } catch (error) {
    loadBalancer.decrementConnectionCount(selectedAccount.id);
    throw error;
  }
}

/**
 * 获取可用模型列表
 */
export async function listModels(): Promise<OpenAIModelsResponse> {
  return {
    object: 'list',
    data: SUPPORTED_MODELS.map((model) => ({
      ...model,
      object: 'model',
      created: Math.floor(Date.now() / 1000),
    })),
  };
}

/**
 * 模拟聊天补全（用于测试）
 */
async function simulateChatCompletion(
  request: OpenAIChatCompletionRequest,
  account: Account
): Promise<OpenAIChatCompletionResponse> {
  // 模拟处理延迟
  await new Promise((resolve) => setTimeout(resolve, 500));

  const lastMessage = request.messages[request.messages.length - 1];
  const promptTokens = estimateTokens(JSON.stringify(request.messages));
  const completionTokens = estimateTokens('This is a simulated response from Codex API.');

  return {
    id: `chatcmpl-${generateId()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: request.model,
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: `This is a simulated response from account ${account.email}. In production, this will be forwarded to the actual Codex API.`,
        },
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: promptTokens + completionTokens,
    },
  };
}

/**
 * 模拟文本补全
 */
async function simulateTextCompletion(
  request: OpenAICompletionRequest,
  account: Account
): Promise<OpenAICompletionResponse> {
  await new Promise((resolve) => setTimeout(resolve, 500));

  const prompt = Array.isArray(request.prompt) ? request.prompt[0] : request.prompt;
  const promptTokens = estimateTokens(prompt);
  const completionTokens = estimateTokens('This is a simulated completion.');

  return {
    id: `cmpl-${generateId()}`,
    object: 'text_completion',
    created: Math.floor(Date.now() / 1000),
    model: request.model,
    choices: [
      {
        text: `Simulated completion for account ${account.email}.`,
        index: 0,
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: promptTokens + completionTokens,
    },
  };
}

/**
 * 估算token数量（简化版）
 */
function estimateTokens(text: string): number {
  // 粗略估算：1 token ≈ 4个字符
  return Math.ceil(text.length / 4);
}

/**
 * 生成唯一ID
 */
function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

/**
 * 流式聊天补全（SSE）
 */
export async function* streamChatCompletion(
  request: OpenAIChatCompletionRequest,
  account?: Account
): AsyncGenerator<string> {
  const selectedAccount = account || await loadBalancer.getAvailableAccount();

  try {
    // 发送SSE事件
    yield `data: ${JSON.stringify({
      id: `chatcmpl-${generateId()}`,
      object: 'chat.completion.chunk',
      created: Math.floor(Date.now() / 1000),
      model: request.model,
      choices: [{
        index: 0,
        delta: { role: 'assistant' },
        finish_reason: null,
      }],
    })}\n\n`;

    // 模拟流式响应
    const words = ['Hello', ',', 'this', 'is', 'a', 'simulated', 'streaming', 'response', '.'];
    for (const word of words) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      yield `data: ${JSON.stringify({
        id: `chatcmpl-${generateId()}`,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: request.model,
        choices: [{
          index: 0,
          delta: { content: word + ' ' },
          finish_reason: null,
        }],
      })}\n\n`;
    }

    // 结束标记
    yield `data: ${JSON.stringify({
      id: `chatcmpl-${generateId()}`,
      object: 'chat.completion.chunk',
      created: Math.floor(Date.now() / 1000),
      model: request.model,
      choices: [{
        index: 0,
        delta: {},
        finish_reason: 'stop',
      }],
    })}\n\n`;

    yield 'data: [DONE]\n\n';

  } finally {
    loadBalancer.decrementConnectionCount(selectedAccount.id);
  }
}
