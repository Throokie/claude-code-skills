/**
 * 错误定义模块
 * PRD: prd-20260324-143000-a7b3-v2
 * Layer: utils
 */

/**
 * 基础应用错误类
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 验证错误
 */
export class ValidationError extends AppError {
  constructor(message: string, field?: string) {
    super(message, 400, field ? `VALIDATION_ERROR_${field.toUpperCase()}` : 'VALIDATION_ERROR');
  }
}

/**
 * 未找到错误
 */
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(
      id ? `${resource} with id '${id}' not found` : `${resource} not found`,
      404,
      'NOT_FOUND'
    );
  }
}

/**
 * 认证错误
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

/**
 * 授权错误
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Permission denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

/**
 * 限流错误
 */
export class RateLimitError extends AppError {
  public readonly retryAfter: number;

  constructor(retryAfter: number = 60) {
    super('Rate limit exceeded', 429, 'RATE_LIMIT_EXCEEDED');
    this.retryAfter = retryAfter;
  }
}

/**
 * 服务不可用错误
 */
export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Service temporarily unavailable') {
    super(message, 503, 'SERVICE_UNAVAILABLE');
  }
}

/**
 * 账号不可用错误
 */
export class AccountUnavailableError extends AppError {
  constructor(message: string = 'No available accounts') {
    super(message, 503, 'ACCOUNT_UNAVAILABLE');
  }
}

/**
 * 外部服务错误
 */
export class ExternalServiceError extends AppError {
  constructor(service: string, message: string) {
    super(`${service} error: ${message}`, 502, 'EXTERNAL_SERVICE_ERROR');
  }
}

/**
 * 数据库错误
 */
export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed') {
    super(message, 500, 'DATABASE_ERROR', false);
  }
}

/**
 * 配置错误
 */
export class ConfigError extends AppError {
  constructor(key: string) {
    super(`Configuration error: ${key}`, 500, 'CONFIG_ERROR', false);
  }
}

/**
 * 将错误转换为API响应格式
 */
export function errorToResponse(error: Error): {
  statusCode: number;
  body: {
    error: {
      message: string;
      type: string;
      code?: string;
    };
  };
} {
  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      body: {
        error: {
          message: error.message,
          type: error.code,
          code: error.code,
        },
      },
    };
  }

  // 未知错误
  return {
    statusCode: 500,
    body: {
      error: {
        message: 'Internal server error',
        type: 'INTERNAL_ERROR',
        code: 'INTERNAL_ERROR',
      },
    },
  };
}

/**
 * 判断错误是否是操作性的（可以被预测和处理的）
 */
export function isOperationalError(error: Error): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}
