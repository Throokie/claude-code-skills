# -*- coding: utf-8 -*-
"""
测试配置
"""
import asyncio
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.ext.asyncio import create_async_engine

from app.main import app
from app.database import get_session


async def init_test_db():
    """初始化测试数据库并返回 engine"""
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        echo=False,
        future=True
    )
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    return engine


# 全局 engine 用于 get_test_session
_engine = None


@pytest_asyncio.fixture(scope="function", autouse=True)
async def test_engine():
    """初始化测试数据库引擎"""
    global _engine
    _engine = await init_test_db()
    yield _engine


async def get_test_session():
    """获取测试数据库会话"""
    return AsyncSession(_engine)


@pytest_asyncio.fixture
async def client():
    """创建测试客户端"""
    # 覆盖数据库会话
    app.dependency_overrides[get_session] = get_test_session

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as client:
        yield client

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def session(test_engine):
    """获取测试数据库会话"""
    s = AsyncSession(test_engine)
    yield s
    await s.close()


@pytest.fixture
def settings():
    """获取应用配置"""
    from app.config import Settings

    class TestSettings(Settings):
        SECRET_KEY: str = "test-secret-key-for-unit-tests"
        WECHAT_APPID: str = "test_appid"
        WECHAT_SECRET: str = "test_secret"

    return TestSettings()
