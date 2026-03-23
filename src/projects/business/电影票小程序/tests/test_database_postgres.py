# -*- coding: utf-8 -*-
"""
PostgreSQL 迁移测试
"""
import pytest
import asyncpg
from unittest.mock import AsyncMock, patch, MagicMock
from app.config import Settings, settings


class TestIsPostgresql:
    """测试 PostgreSQL 检测函数"""

    def test_is_postgresql_returns_false_with_sqlite(self):
        """测试 SQLite 模式下返回 False"""
        original = settings.POSTGRES_HOST
        try:
            # 临时修改全局 settings
            settings.POSTGRES_HOST = None
            assert is_postgresql() is False
        finally:
            settings.POSTGRES_HOST = original

    def test_is_postgresql_returns_true_with_postgres_config(self):
        """测试 PostgreSQL 配置下返回 True"""
        original_host = settings.POSTGRES_HOST
        original_port = settings.POSTGRES_PORT
        original_user = settings.POSTGRES_USER
        original_password = settings.POSTGRES_PASSWORD
        original_db = settings.POSTGRES_DB
        try:
            # 临时修改全局 settings
            settings.POSTGRES_HOST = "localhost"
            settings.POSTGRES_PORT = 5432
            settings.POSTGRES_USER = "test"
            settings.POSTGRES_PASSWORD = "test"
            settings.POSTGRES_DB = "test_db"
            assert is_postgresql() is True
        finally:
            settings.POSTGRES_HOST = original_host
            settings.POSTGRES_PORT = original_port
            settings.POSTGRES_USER = original_user
            settings.POSTGRES_PASSWORD = original_password
            settings.POSTGRES_DB = original_db


# 需要导入 is_postgresql 在测试函数中
from app.database import is_postgresql, init_pg_pool, get_db_pool, execute, fetch_one, fetch_all


class TestPostgreSQLPool:
    """测试 PostgreSQL 连接池"""

    @pytest.mark.asyncio
    async def test_init_pg_pool_creates_pool(self):
        """测试初始化连接池"""
        # 临时修改全局 settings
        original_host = settings.POSTGRES_HOST
        original_port = settings.POSTGRES_PORT
        original_user = settings.POSTGRES_USER
        original_password = settings.POSTGRES_PASSWORD
        original_db = settings.POSTGRES_DB

        try:
            settings.POSTGRES_HOST = "localhost"
            settings.POSTGRES_PORT = 5432
            settings.POSTGRES_USER = "test"
            settings.POSTGRES_PASSWORD = "test"
            settings.POSTGRES_DB = "test_db"

            mock_pool = AsyncMock(spec=asyncpg.Pool)

            # Create an async mock for create_pool
            async def mock_create_pool(*args, **kwargs):
                return mock_pool

            with patch('app.database.asyncpg.create_pool', side_effect=mock_create_pool):
                await init_pg_pool()
                # Verify the function runs without error
        finally:
            settings.POSTGRES_HOST = original_host
            settings.POSTGRES_PORT = original_port
            settings.POSTGRES_USER = original_user
            settings.POSTGRES_PASSWORD = original_password
            settings.POSTGRES_DB = original_db

    @pytest.mark.asyncio
    async def test_init_pg_pool_skips_if_sqlite(self, settings):
        """测试 SQLite 模式下跳过连接池初始化"""
        settings.POSTGRES_HOST = None

        with patch('app.database.asyncpg.create_pool') as mock_create:
            await init_pg_pool()
            mock_create.assert_not_called()


class TestPostgreSQLQueries:
    """测试 PostgreSQL 查询函数"""

    @pytest.mark.asyncio
    async def test_execute_runs_query(self, settings):
        """测试执行 SQL 查询"""
        settings.POSTGRES_HOST = "localhost"
        settings.POSTGRES_USER = "test"
        settings.POSTGRES_PASSWORD = "test"
        settings.POSTGRES_DB = "test_db"

        # Mock connection and pool
        mock_conn = AsyncMock()
        mock_conn.execute = AsyncMock(return_value="SELECT 1")

        mock_pool = AsyncMock(spec=asyncpg.Pool)
        mock_pool.acquire = MagicMock()
        mock_pool.acquire.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
        mock_pool.acquire.return_value.__aexit__ = AsyncMock(return_value=None)

        with patch('app.database.db_pool', mock_pool):
            result = await execute("SELECT 1")
            assert result == "SELECT 1"
            mock_conn.execute.assert_called_once_with("SELECT 1")

    @pytest.mark.asyncio
    async def test_fetch_one_returns_single_record(self, settings):
        """测试获取单条记录"""
        settings.POSTGRES_HOST = "localhost"
        settings.POSTGRES_USER = "test"
        settings.POSTGRES_PASSWORD = "test"
        settings.POSTGRES_DB = "test_db"

        # Mock connection and pool
        mock_record = {"id": 1, "name": "test"}
        mock_conn = AsyncMock()
        mock_conn.fetchrow = AsyncMock(return_value=mock_record)

        mock_pool = AsyncMock(spec=asyncpg.Pool)
        mock_pool.acquire = MagicMock()
        mock_pool.acquire.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
        mock_pool.acquire.return_value.__aexit__ = AsyncMock(return_value=None)

        with patch('app.database.db_pool', mock_pool):
            result = await fetch_one("SELECT * FROM users WHERE id = $1", 1)
            assert result == mock_record
            mock_conn.fetchrow.assert_called_once_with("SELECT * FROM users WHERE id = $1", 1)

    @pytest.mark.asyncio
    async def test_fetch_all_returns_multiple_records(self, settings):
        """测试获取多条记录"""
        settings.POSTGRES_HOST = "localhost"
        settings.POSTGRES_USER = "test"
        settings.POSTGRES_PASSWORD = "test"
        settings.POSTGRES_DB = "test_db"

        # Mock connection and pool
        mock_records = [
            {"id": 1, "name": "user1"},
            {"id": 2, "name": "user2"}
        ]
        mock_conn = AsyncMock()
        mock_conn.fetch = AsyncMock(return_value=mock_records)

        mock_pool = AsyncMock(spec=asyncpg.Pool)
        mock_pool.acquire = MagicMock()
        mock_pool.acquire.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
        mock_pool.acquire.return_value.__aexit__ = AsyncMock(return_value=None)

        with patch('app.database.db_pool', mock_pool):
            result = await fetch_all("SELECT * FROM users")
            assert result == mock_records
            assert len(result) == 2
            mock_conn.fetch.assert_called_once_with("SELECT * FROM users")

    @pytest.mark.asyncio
    async def test_fetch_one_returns_none_when_not_found(self, settings):
        """测试查询不存在时返回 None"""
        settings.POSTGRES_HOST = "localhost"
        settings.POSTGRES_USER = "test"
        settings.POSTGRES_PASSWORD = "test"
        settings.POSTGRES_DB = "test_db"

        mock_conn = AsyncMock()
        mock_conn.fetchrow = AsyncMock(return_value=None)

        mock_pool = AsyncMock(spec=asyncpg.Pool)
        mock_pool.acquire = MagicMock()
        mock_pool.acquire.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
        mock_pool.acquire.return_value.__aexit__ = AsyncMock(return_value=None)

        with patch('app.database.db_pool', mock_pool):
            result = await fetch_one("SELECT * FROM users WHERE id = $1", 999)
            assert result is None

    @pytest.mark.asyncio
    async def test_execute_raises_if_pool_not_initialized(self, settings):
        """测试连接池未初始化时抛出异常"""
        with patch('app.database.db_pool', None):
            with pytest.raises(RuntimeError, match="Database pool not initialized"):
                await execute("SELECT 1")

    @pytest.mark.asyncio
    async def test_fetch_raises_if_pool_not_initialized(self, settings):
        """测试连接池未初始化时抛出异常"""
        with patch('app.database.db_pool', None):
            with pytest.raises(RuntimeError, match="Database pool not initialized"):
                await fetch_one("SELECT 1")

        with patch('app.database.db_pool', None):
            with pytest.raises(RuntimeError, match="Database pool not initialized"):
                await fetch_all("SELECT 1")
