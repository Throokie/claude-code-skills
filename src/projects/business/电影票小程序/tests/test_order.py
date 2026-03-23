# -*- coding: utf-8 -*-
"""
订单测试
"""
import pytest
from httpx import AsyncClient


class TestOrder:
    """订单 API 测试"""

    @pytest.mark.asyncio
    async def test_create_order(self, client: AsyncClient):
        """测试创建订单"""
        response = await client.post(
            "/api/v1/orders",
            json={
                "cinema_code": "jc",
                "cinema_name": "金城影院",
                "movie_name": "热辣滚烫",
                "show_date": "2026-03-06",
                "show_time": "14:30",
                "seat_count": 2,
                "unit_price": 35.0,
                "seat_preference": "尽量中间"
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert "order_no" in data
        assert data["cinema_name"] == "金城影院"
        assert data["status"] == "pending"

    @pytest.mark.asyncio
    async def test_get_order_not_found(self, client: AsyncClient):
        """测试获取不存在的订单"""
        response = await client.get("/api/v1/orders/T123456")
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_get_orders(self, client: AsyncClient):
        """测试获取订单列表"""
        response = await client.get("/api/v1/orders")
        assert response.status_code == 200
        assert isinstance(response.json(), list)


class TestAdminOrder:
    """管理后台订单测试"""

    @pytest.mark.asyncio
    async def test_get_orders_unauthorized(self, client: AsyncClient):
        """测试未授权访问"""
        response = await client.get("/api/v1/admin/orders")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_get_orders_authorized(self, client: AsyncClient):
        """测试授权访问"""
        response = await client.get(
            "/api/v1/admin/orders",
            headers={"Authorization": "Bearer admin888"}
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_get_stats(self, client: AsyncClient):
        """测试统计数据"""
        response = await client.get(
            "/api/v1/admin/stats",
            headers={"Authorization": "Bearer admin888"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "today_orders" in data
        assert "pending_orders" in data
        assert "today_income" in data