# -*- coding: utf-8 -*-
"""
订单超时处理 Worker
使用 Redis 延迟队列处理 30 分钟未支付订单自动取消
"""
import asyncio
import time
from typing import Optional
import redis.asyncio as redis
from sqlmodel import select

from app.database import get_session, Order
from app.config import settings


# Redis 客户端
redis_client: Optional[redis.Redis] = None

# 延迟队列键名
DELAYED_QUEUE_KEY = "delayed:order_timeout"


async def init_redis() -> redis.Redis:
    """初始化 Redis 连接"""
    global redis_client

    redis_client = redis.Redis(
        host=settings.REDIS_HOST or 'localhost',
        port=settings.REDIS_PORT or 6379,
        db=settings.REDIS_DB or 0,
        password=settings.REDIS_PASSWORD,
        decode_responses=True
    )

    return redis_client


async def get_redis() -> redis.Redis:
    """获取 Redis 客户端"""
    if redis_client is None:
        await init_redis()
    return redis_client


async def schedule_order_cancellation(order_id: int, delay_seconds: int = 1800):
    """
    调度订单取消任务

    Args:
        order_id: 订单 ID
        delay_seconds: 延迟时间（秒），默认 30 分钟 (1800 秒)
    """
    r = await get_redis()

    # 计算执行时间戳（秒）
    execute_at = int(time.time()) + delay_seconds

    # 将任务添加到有序集合（Redis 延迟队列）
    await r.zadd(DELAYED_QUEUE_KEY, {str(order_id): execute_at})


async def cancel_unpaid_order(order_id: int) -> bool:
    """
    取消未支付订单

    Args:
        order_id: 订单 ID

    Returns:
        是否成功取消
    """
    async with get_session() as session:
        # 查询订单
        result = await session.exec(select(Order).where(Order.id == order_id))
        order = result.first()

        if not order:
            return False

        # 只有 pending 状态的订单才能取消
        if order.status != "pending":
            return False

        # 更新订单状态为已取消
        order.status = "cancelled"
        session.add(order)
        await session.commit()

        return True


async def process_delayed_queue():
    """
    处理延迟队列
    检查并执行到期的订单取消任务
    """
    r = await get_redis()
    now = int(time.time())

    try:
        # 获取所有到期的任务
        tasks = await r.zrangebyscore(DELAYED_QUEUE_KEY, 0, now)
    except Exception as e:
        print(f"Error getting delayed queue: {e}")
        return

    for order_id_str in tasks:
        try:
            order_id = int(order_id_str)

            # 执行取消
            success = await cancel_unpaid_order(order_id)

            # 从队列中移除（无论成功与否）
            await r.zrem(DELAYED_QUEUE_KEY, order_id_str)

            if success:
                print(f"Order {order_id} cancelled due to timeout")
        except Exception as e:
            print(f"Error processing order {order_id_str}: {e}")


async def start_order_timeout_worker(check_interval: int = 60):
    """
    启动订单超时检查 Worker

    Args:
        check_interval: 检查间隔（秒），默认 60 秒
    """
    print(f"Starting order timeout worker (check interval: {check_interval}s)")

    while True:
        try:
            await process_delayed_queue()
        except Exception as e:
            print(f"Error processing delayed queue: {e}")

        await asyncio.sleep(check_interval)
