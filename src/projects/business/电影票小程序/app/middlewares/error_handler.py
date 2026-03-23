# -*- coding: utf-8 -*-
"""
全局错误处理中间件
捕获所有异常并返回统一的错误格式
"""
import logging
from typing import Union
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError
from starlette.middleware.base import BaseHTTPMiddleware

from app.utils.errors import BusinessError, InternalServerError


logger = logging.getLogger(__name__)


def create_error_response(error: BusinessError, status_code: int) -> JSONResponse:
    """创建错误响应"""
    return JSONResponse(
        status_code=status_code,
        content={
            "error": error.to_dict()
        }
    )


async def handle_business_error(request: Request, exc: BusinessError) -> JSONResponse:
    """处理业务错误"""
    # 根据错误类型映射 HTTP 状态码
    status_code = status.HTTP_400_BAD_REQUEST

    # 认证相关错误 -> 401
    from app.utils.errors import (
        AuthError,
        UnauthorizedError,
        TokenExpiredError,
        TokenInvalidError,
        PermissionDeniedError,
        NotFoundError,
        ConflictError,
        InternalServerError,
        OrderNotFoundError,
        OrderStatusError,
    )

    if isinstance(exc, (UnauthorizedError, TokenExpiredError, TokenInvalidError)):
        status_code = status.HTTP_401_UNAUTHORIZED
    elif isinstance(exc, PermissionDeniedError):
        status_code = status.HTTP_403_FORBIDDEN
    # 资源不存在 -> 404
    elif isinstance(exc, (NotFoundError, OrderNotFoundError)):
        status_code = status.HTTP_404_NOT_FOUND
    # 冲突 -> 409
    elif isinstance(exc, ConflictError):
        status_code = status.HTTP_409_CONFLICT
    # 服务器内部错误 -> 500
    elif isinstance(exc, InternalServerError):
        status_code = status.HTTP_500_INTERNAL_SERVER_ERROR

    logger.warning(f"Business error: {exc.code} - {exc.message} - URL: {request.url}")
    return create_error_response(exc, status_code)


async def handle_validation_error(request: Request, exc: Union[RequestValidationError, ValidationError]) -> JSONResponse:
    """处理验证错误"""
    from app.utils.errors import ValidationError

    error_details = []
    if isinstance(exc, RequestValidationError):
        for error in exc.errors():
            error_details.append({
                "field": ".".join(str(x) for x in error.get("loc", [])),
                "message": error.get("msg", "")
            })

    validation_error = ValidationError(
        message="请求参数验证失败",
        code=2001,
        data={"details": error_details}
    )

    logger.warning(f"Validation error: {request.url} - {error_details}")
    return create_error_response(validation_error, status.HTTP_400_BAD_REQUEST)


async def handle_internal_error(request: Request, exc: Exception) -> JSONResponse:
    """处理内部错误"""
    logger.error(f"Internal error: {str(exc)}", exc_info=True)

    # 生产环境不暴露详细错误信息
    error = InternalServerError(
        message="服务器内部错误"
    )
    return create_error_response(error, status.HTTP_500_INTERNAL_SERVER_ERROR)


class ErrorHandlerMiddleware(BaseHTTPMiddleware):
    """错误处理中间件"""

    async def dispatch(self, request: Request, call_next):
        try:
            response = await call_next(request)
            return response
        except BusinessError as exc:
            return await handle_business_error(request, exc)
        except (RequestValidationError, ValidationError) as exc:
            return await handle_validation_error(request, exc)
        except Exception as exc:
            return await handle_internal_error(request, exc)


def register_error_handlers(app: FastAPI):
    """注册全局错误处理器（作为中间件的补充）"""

    @app.exception_handler(BusinessError)
    async def business_error_handler(request: Request, exc: BusinessError):
        return await handle_business_error(request, exc)

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(request: Request, exc: RequestValidationError):
        return await handle_validation_error(request, exc)

    @app.exception_handler(ValidationError)
    async def pydantic_validation_error_handler(request: Request, exc: ValidationError):
        return await handle_validation_error(request, exc)

    @app.exception_handler(Exception)
    async def internal_error_handler(request: Request, exc: Exception):
        return await handle_internal_error(request, exc)
