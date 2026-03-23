/**
 * 全局类型定义
 * PRD: prd-20260324-143000-a7b3-v2
 * Layer: types
 */

import { AccountStatus } from '@prisma/client';

// ==================== 账号相关类型 ====================

export interface Account {
  id: string;
  email: string;
  password: string;
  status: AccountStatus;
  quotaRemaining: number;
  weight: number;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  metadata?: AccountMetadata;
  healthCheck?: HealthCheckInfo;
}

export interface AccountMetadata {
  domain: string;
  proxy?: string;
  userAgent?: string;
}

export interface HealthCheckInfo {
  id: string;
  accountId: string;
  lastCheckedAt: Date;
  successCount: number;
  failCount: number;
  lastError?: string;
  averageResponse: number;
}

// 账号创建/更新输入
export interface CreateAccountInput {
  email: string;
  password: string;
  metadata?: AccountMetadata;
  quotaRemaining?: number;
  weight?: number;
}

export interface UpdateAccountInput {
  email?: string;
  password?: string;
  status?: AccountStatus;
  quotaRemaining?: number;
  weight?: number;
  metadata?: AccountMetadata;
}

// ==================== API用户相关类型 ====================

export interface ApiUser {
  id: string;
  name: string;
  apiKey: string;
  isActive: boolean;
  rateLimit: RateLimitConfig;
  quota: QuotaConfig;
  createdAt: Date;
  lastUsedAt: Date | null;
}

export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
}

export interface QuotaConfig {
  used: number;
  total: number;
}

export interface CreateApiUserInput {
  name: string;
  rateLimit?: RateLimitConfig;
  quota?: QuotaConfig;
}

export interface UpdateApiUserInput {
  name?: string;
  isActive?: boolean;
  rateLimit?: RateLimitConfig;
  quota?: QuotaConfig;
}

// ==================== 请求日志相关类型 ====================

export interface RequestLog {
  id: string;
  apiUserId?: string;
  accountId?: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  status: 'success' | 'error';
  errorMessage?: string;
  responseTime: number;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface CreateRequestLogInput {
  apiUserId?: string;
  accountId?: string;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  status: 'success' | 'error';
  errorMessage?: string;
  responseTime: number;
  ipAddress?: string;
  userAgent?: string;
}

// ==================== 系统配置类型 ====================

export interface SystemConfig {
  id: string;
  key: string;
  value: unknown;
  description?: string;
  updatedAt: Date;
}

// 负载均衡配置
export interface LoadBalanceConfig {
  strategy: 'round_robin' | 'random' | 'weighted' | 'least_conn';
  healthCheck: {
    enabled: boolean;
    interval: number; // seconds
    timeout: number;  // seconds
  };
  retry: {
    maxAttempts: number;
    backoff: 'fixed' | 'exponential';
    delay: number; // ms
  };
}

// ==================== OpenAI API 兼容类型 ====================

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string;
  name?: string;
  function_call?: {
    name: string;
    arguments: string;
  };
}

export interface OpenAIChatCompletionRequest {
  model: string;
  messages: OpenAIMessage[];
  temperature?: number;
  top_p?: number;
  n?: number;
  stream?: boolean;
  stop?: string | string[];
  max_tokens?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  logit_bias?: Record<string, number>;
  user?: string;
}

export interface OpenAICompletionRequest {
  model: string;
  prompt: string | string[];
  suffix?: string;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  n?: number;
  stream?: boolean;
  logprobs?: number;
  echo?: boolean;
  stop?: string | string[];
  presence_penalty?: number;
  frequency_penalty?: number;
  best_of?: number;
  logit_bias?: Record<string, number>;
  user?: string;
}

export interface OpenAIChatCompletionResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: OpenAIMessage;
    finish_reason: 'stop' | 'length' | 'function_call' | null;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface OpenAICompletionResponse {
  id: string;
  object: 'text_completion';
  created: number;
  model: string;
  choices: Array<{
    text: string;
    index: number;
    logprobs?: {
      tokens: string[];
      token_logprobs: number[];
      top_logprobs: Record<string, number>[];
      text_offset: number[];
    };
    finish_reason: 'stop' | 'length' | null;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface OpenAIModel {
  id: string;
  object: 'model';
  created: number;
  owned_by: string;
}

export interface OpenAIModelsResponse {
  object: 'list';
  data: OpenAIModel[];
}

export interface OpenAIErrorResponse {
  error: {
    message: string;
    type: string;
    param?: string;
    code?: string;
  };
}

// ==================== 统计相关类型 ====================

export interface ServiceStats {
  totalAccounts: number;
  activeAccounts: number;
  totalRequests: number;
  requestsToday: number;
  averageResponseTime: number;
  successRate: number;
}

export interface AccountStats {
  accountId: string;
  email: string;
  totalRequests: number;
  successCount: number;
  failCount: number;
  averageResponseTime: number;
  lastUsedAt: Date | null;
}

// ==================== API响应类型 ====================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
