# -*- coding: utf-8 -*-
"""
自定义错误类
提供统一的业务错误码和错误类型
"""
from typing import Any, Optional


# 错误码范围定义
# 1001-1999: 认证授权相关
# 2001-2999: 业务逻辑相关
# 3001-3999: 系统/数据库相关


class BusinessError(Exception):
    """业务错误基类"""

    def __init__(self, message: str, code: int = 2001, data: Optional[Any] = None):
        self.message = message
        self.code = code
        self.data = data
        super().__init__(self.message)

    def to_dict(self) -> dict:
        """转换为字典格式"""
        result = {
            "code": self.code,
            "message": self.message
        }
        if self.data is not None:
            result["data"] = self.data
        return result


# ============ 认证授权错误 (1001-1999) ============

class AuthError(BusinessError):
    """认证错误"""
    def __init__(self, message: str = "认证失败", code: int = 1001, data: Optional[Any] = None):
        super().__init__(message=message, code=code, data=data)


class TokenExpiredError(AuthError):
    """Token 过期"""
    def __init__(self, message: str = "Token 已过期", code: int = 1002):
        super().__init__(message=message, code=code)


class TokenInvalidError(AuthError):
    """Token 无效"""
    def __init__(self, message: str = "Token 无效", code: int = 1003):
        super().__init__(message=message, code=code)


class PermissionDeniedError(AuthError):
    """权限不足"""
    def __init__(self, message: str = "权限不足", code: int = 1004):
        super().__init__(message=message, code=code)


class UnauthorizedError(AuthError):
    """未授权"""
    def __init__(self, message: str = "未授权访问", code: int = 1005):
        super().__init__(message=message, code=code)


# ============ 业务逻辑错误 (2001-2999) ============

class ValidationError(BusinessError):
    """参数验证错误"""
    def __init__(self, message: str = "参数验证失败", code: int = 2001, data: Optional[Any] = None):
        super().__init__(message=message, code=code, data=data)


class NotFoundError(BusinessError):
    """资源不存在"""
    def __init__(self, message: str = "资源不存在", code: int = 2002, data: Optional[Any] = None):
        super().__init__(message=message, code=code, data=data)


class ConflictError(BusinessError):
    """资源冲突"""
    def __init__(self, message: str = "资源冲突", code: int = 2003, data: Optional[Any] = None):
        super().__init__(message=message, code=code, data=data)


class OrderError(BusinessError):
    """订单相关错误"""
    def __init__(self, message: str = "订单操作失败", code: int = 2010, data: Optional[Any] = None):
        super().__init__(message=message, code=code, data=data)


class OrderNotFoundError(OrderError):
    """订单不存在"""
    def __init__(self, message: str = "订单不存在", code: int = 2011):
        super().__init__(message=message, code=code)


class OrderStatusError(OrderError):
    """订单状态错误"""
    def __init__(self, message: str = "订单状态不允许此操作", code: int = 2012):
        super().__init__(message=message, code=code)


class PaymentError(BusinessError):
    """支付相关错误"""
    def __init__(self, message: str = "支付操作失败", code: int = 2020, data: Optional[Any] = None):
        super().__init__(message=message, code=code, data=data)


class PaymentFailedError(PaymentError):
    """支付失败"""
    def __init__(self, message: str = "支付失败", code: int = 2021):
        super().__init__(message=message, code=code)


class RefundError(BusinessError):
    """退款相关错误"""
    def __init__(self, message: str = "退款操作失败", code: int = 2030, data: Optional[Any] = None):
        super().__init__(message=message, code=code, data=data)


class ScheduleError(BusinessError):
    """排期相关错误"""
    def __init__(self, message: str = "排期操作失败", code: int = 2040, data: Optional[Any] = None):
        super().__init__(message=message, code=code, data=data)


# ============ 系统/数据库错误 (3001-3999) ============

class DatabaseError(BusinessError):
    """数据库错误"""
    def __init__(self, message: str = "数据库操作失败", code: int = 3001, data: Optional[Any] = None):
        super().__init__(message=message, code=code, data=data)


class ExternalServiceError(BusinessError):
    """外部服务错误"""
    def __init__(self, message: str = "外部服务调用失败", code: int = 3002, data: Optional[Any] = None):
        super().__init__(message=message, code=code, data=data)


class InternalServerError(BusinessError):
    """服务器内部错误"""
    def __init__(self, message: str = "服务器内部错误", code: int = 3000):
        super().__init__(message=message, code=code)
