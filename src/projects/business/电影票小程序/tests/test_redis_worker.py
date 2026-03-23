# -*- coding: utf-8 -*-
"""
Redis 订单超时 Worker 测试
"""
import pytest
import time
from unittest.mock import AsyncMock, patch, MagicMock

from app.workers.order_timeout import (
    init_redis,
    get_redis,
    schedule_order_cancellation,
    process_delayed_queue,
    DELAYED_QUEUE_KEY,
)


class TestInitRedis:
    """测试 Redis 初始化"""

    @pytest.mark.asyncio
    async def test_init_redis_creates_connection(self, settings):
        """测试初始化 Redis 连接"""
        settings.REDIS_HOST = "localhost"
        settings.REDIS_PORT = 6379
        settings.REDIS_DB = 0

        mock_redis = AsyncMock()

        with patch('app.workers.order_timeout.redis.Redis', return_value=mock_redis):
            redis_client = await init_redis()
            assert redis_client is not None


class TestGetRedis:
    """测试获取 Redis 客户端"""

    @pytest.mark.asyncio
    async def test_get_redis_returns_client(self):
        """测试获取 Redis 客户端"""
        mock_redis = AsyncMock()

        with patch('app.workers.order_timeout.redis_client', mock_redis):
            result = await get_redis()
            assert result == mock_redis


class TestScheduleOrderCancellation:
    """测试调度订单取消"""

    @pytest.mark.asyncio
    async def test_schedule_order_cancellation_adds_to_queue(self):
        """测试将订单添加到延迟队列"""
        order_id = 123
        delay_seconds = 1800

        mock_redis = AsyncMock()
        mock_redis.zadd = AsyncMock()

        with patch('app.workers.order_timeout.redis_client', mock_redis):
            await schedule_order_cancellation(order_id, delay_seconds)

        # 验证 zadd 被调用
        mock_redis.zadd.assert_called_once()


class TestProcessDelayedQueue:
    """测试处理延迟队列"""

    @pytest.mark.asyncio
    async def test_process_delayed_queue_cancels_orders(self):
        """测试处理延迟队列中的订单"""
        order_ids = ["123", "456"]

        mock_redis = AsyncMock()
        mock_redis.zrangebyscore = AsyncMock(return_value=order_ids)
        mock_redis.zrem = AsyncMock()

        with patch('app.workers.order_timeout.redis_client', mock_redis):
            with patch('app.workers.order_timeout.cancel_unpaid_order', AsyncMock(return_value=True)) as mock_cancel:
                await process_delayed_queue()

        # 验证取消了两个订单
        assert mock_cancel.call_count == 2

    @pytest.mark.asyncio
    async def test_process_delayed_queue_empty_queue(self):
        """测试空队列"""
        mock_redis = AsyncMock()
        mock_redis.zrangebyscore = AsyncMock(return_value=[])

        with patch('app.workers.order_timeout.redis_client', mock_redis):
            with patch('app.workers.order_timeout.cancel_unpaid_order') as mock_cancel:
                await process_delayed_queue()

        # 验证没有调用取消
        mock_cancel.assert_not_called()

    @pytest.mark.asyncio
    async def test_process_delayed_queue_handles_errors(self):
        """测试错误处理"""
        mock_redis = AsyncMock()
        mock_redis.zrangebyscore = AsyncMock(side_effect=Exception("Redis error"))

        with patch('app.workers.order_timeout.redis_client', mock_redis):
            # 应该不会抛出异常
            try:
                await process_delayed_queue()
                assert True  # 测试通过如果没有抛出异常
            except Exception:
                pytest.fail("process_delayed_queue raised exception unexpectedly")
