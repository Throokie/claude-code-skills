# -*- coding: utf-8 -*-
"""
影院测试
"""
import pytest
from httpx import AsyncClient


class TestCinema:
    """影院 API 测试"""

    @pytest.mark.asyncio
    async def test_get_cinemas(self, client: AsyncClient):
        """测试获取影院列表"""
        response = await client.get("/api/v1/cinemas")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    @pytest.mark.asyncio
    async def test_get_cinema_schedules(self, client: AsyncClient):
        """测试获取影院排期"""
        response = await client.get("/api/v1/cinemas/jc/schedules")
        # 可能没有数据，但不应该报错
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_get_today_schedules(self, client: AsyncClient):
        """测试获取今日排期"""
        response = await client.get("/api/v1/schedules/today")
        assert response.status_code == 200
        data = response.json()
        assert "date" in data
        assert "date_label" in data
        assert "cinemas" in data


class TestAdminCinema:
    """管理后台影院测试"""

    @pytest.mark.asyncio
    async def test_get_cinemas(self, client: AsyncClient):
        """测试获取影院列表"""
        response = await client.get(
            "/api/v1/admin/cinemas",
            headers={"Authorization": "Bearer admin888"}
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_get_channels(self, client: AsyncClient):
        """测试获取出票渠道"""
        response = await client.get(
            "/api/v1/admin/channels",
            headers={"Authorization": "Bearer admin888"}
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_get_code_words(self, client: AsyncClient):
        """测试获取暗号库"""
        response = await client.get(
            "/api/v1/admin/code-words",
            headers={"Authorization": "Bearer admin888"}
        )
        assert response.status_code == 200

    @pytest.mark.skip("pytest-asyncio fixture scope issue - tracked separately")
    @pytest.mark.asyncio
    async def test_create_code_word(self, client: AsyncClient):
        """测试创建暗号"""
        import random
        import time
        unique_word = f"测试暗号_{int(time.time() * 1000)}_{random.randint(100, 999)}"
        response = await client.post(
            "/api/v1/admin/code-words",
            headers={"Authorization": "Bearer admin888"},
            json={"word": unique_word, "type": "blessing"}
        )
        assert response.status_code == 200
        assert response.json()["success"] is True

    @pytest.mark.asyncio
    async def test_get_system_status(self, client: AsyncClient):
        """测试获取系统状态"""
        response = await client.get(
            "/api/v1/admin/system/status",
            headers={"Authorization": "Bearer admin888"}
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_set_system_status(self, client: AsyncClient):
        """测试设置系统状态"""
        response = await client.post(
            "/api/v1/admin/system/status",
            headers={"Authorization": "Bearer admin888"},
            json={"status": "normal", "announcement": "测试公告"}
        )
        assert response.status_code == 200