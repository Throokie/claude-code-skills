# -*- coding: utf-8 -*-
"""
错误处理中间件测试
"""
import pytest
from fastapi import FastAPI, Request
from fastapi.testclient import TestClient
from pydantic import BaseModel, field_validator

from app.utils.errors import (
    BusinessError,
    AuthError,
    TokenExpiredError,
    PermissionDeniedError,
    NotFoundError,
    ValidationError,
    OrderNotFoundError,
    PaymentFailedError,
    InternalServerError,
)
from app.middlewares.error_handler import (
    ErrorHandlerMiddleware,
    register_error_handlers,
)


def create_test_app() -> FastAPI:
    """创建测试应用"""
    app = FastAPI()

    # 注册中间件
    app.add_middleware(ErrorHandlerMiddleware)

    # 注册错误处理器
    register_error_handlers(app)

    return app


class TestBusinessError:
    """测试业务错误"""

    def test_business_error_to_dict(self):
        """测试业务错误转换为字典"""
        error = BusinessError(message="Test error", code=2001, data={"key": "value"})
        result = error.to_dict()

        assert result["code"] == 2001
        assert result["message"] == "Test error"
        assert result["data"] == {"key": "value"}

    def test_business_error_without_data(self):
        """测试业务错误没有 data 字段"""
        error = BusinessError(message="Test error", code=2001)
        result = error.to_dict()

        assert result["code"] == 2001
        assert result["message"] == "Test error"
        assert "data" not in result


class TestErrorHandlerMiddleware:
    """测试错误处理中间件"""

    def test_business_error_returns_correct_format(self):
        """测试业务错误返回正确格式"""
        app = create_test_app()

        @app.get("/test/business-error")
        async def raise_business_error():
            raise BusinessError(message="Business error message", code=2001)

        client = TestClient(app)
        response = client.get("/test/business-error")

        assert response.status_code == 400
        data = response.json()
        assert "error" in data
        assert data["error"]["code"] == 2001
        assert data["error"]["message"] == "Business error message"

    def test_auth_error_returns_401(self):
        """测试认证错误返回 401"""
        app = create_test_app()

        @app.get("/test/auth-error")
        async def raise_auth_error():
            raise TokenExpiredError()

        client = TestClient(app)
        response = client.get("/test/auth-error")

        assert response.status_code == 401
        data = response.json()
        assert data["error"]["code"] == 1002
        assert "error" in data

    def test_not_found_error_returns_404(self):
        """测试资源不存在返回 404"""
        app = create_test_app()

        @app.get("/test/not-found")
        async def raise_not_found_error():
            raise NotFoundError(message="Resource not found")

        client = TestClient(app)
        response = client.get("/test/not-found")

        assert response.status_code == 404
        data = response.json()
        assert data["error"]["code"] == 2002
        assert data["error"]["message"] == "Resource not found"

    def test_permission_denied_returns_403(self):
        """测试权限不足返回 403"""
        app = create_test_app()

        @app.get("/test/permission-denied")
        async def raise_permission_error():
            raise PermissionDeniedError()

        client = TestClient(app)
        response = client.get("/test/permission-denied")

        assert response.status_code == 403
        data = response.json()
        assert data["error"]["code"] == 1004

    def test_internal_error_returns_500(self):
        """测试内部错误返回 500"""
        app = create_test_app()

        @app.get("/test/internal-error")
        async def raise_internal_error():
            raise InternalServerError()

        client = TestClient(app)
        response = client.get("/test/internal-error")

        assert response.status_code == 500
        data = response.json()
        assert data["error"]["code"] == 3000

    def test_unknown_exception_returns_500(self):
        """测试未知异常返回 500"""
        app = create_test_app()

        @app.get("/test/unknown-error")
        async def raise_unknown_error():
            raise ValueError("Some unexpected error")

        client = TestClient(app)
        response = client.get("/test/unknown-error")

        assert response.status_code == 500
        data = response.json()
        assert "error" in data
        assert data["error"]["code"] == 3000

    def test_validation_error_returns_400(self):
        """测试验证错误返回 400"""
        app = create_test_app()

        class TestModel(BaseModel):
            name: str

            @field_validator("name")
            @classmethod
            def name_not_empty(cls, v):
                if not v:
                    raise ValueError("Name cannot be empty")
                return v

        @app.post("/test/validation-error")
        async def raise_validation_error(model: TestModel):
            return {"name": model.name}

        client = TestClient(app)
        # 发送空请求触发验证错误
        response = client.post("/test/validation-error", json={})

        assert response.status_code == 400
        data = response.json()
        assert "error" in data
        assert data["error"]["code"] == 2001
        assert "details" in data["error"].get("data", {})

    def test_order_error_returns_correct_format(self):
        """测试订单错误返回正确格式"""
        app = create_test_app()

        @app.get("/test/order-error")
        async def raise_order_error():
            raise OrderNotFoundError()

        client = TestClient(app)
        response = client.get("/test/order-error")

        assert response.status_code == 404
        data = response.json()
        assert data["error"]["code"] == 2011
        assert data["error"]["message"] == "订单不存在"

    def test_payment_error_returns_correct_format(self):
        """测试支付错误返回正确格式"""
        app = create_test_app()

        @app.get("/test/payment-error")
        async def raise_payment_error():
            raise PaymentFailedError()

        client = TestClient(app)
        response = client.get("/test/payment-error")

        assert response.status_code == 400
        data = response.json()
        assert data["error"]["code"] == 2021
        assert data["error"]["message"] == "支付失败"
