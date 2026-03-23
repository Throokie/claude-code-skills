# -*- coding: utf-8 -*-
"""
WebSocket 管理器测试
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
import asyncio

from app.websocket.manager import ConnectionManager


class TestConnectionManager:
    """测试连接管理器"""

    @pytest.mark.asyncio
    async def test_connect_adds_connection(self):
        """测试连接成功添加"""
        manager = ConnectionManager()

        mock_websocket = AsyncMock()
        mock_websocket.accept = AsyncMock()

        result = await manager.connect(mock_websocket, "admin_123")

        assert result is True
        assert len(manager.active_connections) == 1
        assert mock_websocket in manager.active_connections
        assert manager.connection_map[mock_websocket] == "admin_123"
        mock_websocket.accept.assert_called_once()

    @pytest.mark.asyncio
    async def test_disconnect_removes_connection(self):
        """测试断开连接移除"""
        manager = ConnectionManager()

        mock_websocket = AsyncMock()
        mock_websocket.accept = AsyncMock()

        # 先连接
        await manager.connect(mock_websocket, "admin_123")
        assert len(manager.active_connections) == 1

        # 再断开
        await manager.disconnect(mock_websocket)

        assert len(manager.active_connections) == 0
        assert mock_websocket not in manager.active_connections
        assert mock_websocket not in manager.connection_map

    @pytest.mark.asyncio
    async def test_broadcast_sends_to_all(self):
        """测试广播发送给所有连接"""
        manager = ConnectionManager()

        # 创建两个 mock 连接
        mock_ws1 = AsyncMock()
        mock_ws1.accept = AsyncMock()
        mock_ws2 = AsyncMock()
        mock_ws2.accept = AsyncMock()

        await manager.connect(mock_ws1, "admin_1")
        await manager.connect(mock_ws2, "admin_2")

        # 广播消息
        test_message = {"type": "notification", "data": "test"}
        await manager.broadcast(test_message)

        # 验证两个连接都收到了消息
        mock_ws1.send_json.assert_called_once_with(test_message)
        mock_ws2.send_json.assert_called_once_with(test_message)

    @pytest.mark.asyncio
    async def test_broadcast_removes_failed_connections(self):
        """测试广播移除失败的连接"""
        manager = ConnectionManager()

        mock_ws1 = AsyncMock()
        mock_ws1.accept = AsyncMock()
        mock_ws1.send_json = AsyncMock(side_effect=Exception("Connection lost"))

        mock_ws2 = AsyncMock()
        mock_ws2.accept = AsyncMock()

        await manager.connect(mock_ws1, "admin_1")
        await manager.connect(mock_ws2, "admin_2")

        test_message = {"type": "notification", "data": "test"}
        await manager.broadcast(test_message)

        # 失败的连接应该被移除
        assert mock_ws1 not in manager.active_connections
        # 成功的连接应该保留
        assert mock_ws2 in manager.active_connections

    @pytest.mark.asyncio
    async def test_send_personal_sends_to_one(self):
        """测试个人消息只发送给目标"""
        manager = ConnectionManager()

        mock_ws1 = AsyncMock()
        mock_ws1.accept = AsyncMock()
        mock_ws2 = AsyncMock()
        mock_ws2.accept = AsyncMock()

        await manager.connect(mock_ws1, "admin_1")
        await manager.connect(mock_ws2, "admin_2")

        test_message = {"type": "personal", "data": "for admin_1 only"}
        await manager.send_personal(test_message, "admin_1")

        # 只有 admin_1 收到消息
        mock_ws1.send_json.assert_called_once_with(test_message)
        mock_ws2.send_json.assert_not_called()

    @pytest.mark.asyncio
    async def test_send_personal_nonexistent_admin(self):
        """测试发送给不存在的管理员"""
        manager = ConnectionManager()

        mock_ws1 = AsyncMock()
        mock_ws1.accept = AsyncMock()

        await manager.connect(mock_ws1, "admin_1")

        test_message = {"type": "personal", "data": "for nobody"}
        await manager.send_personal(test_message, "nonexistent_admin")

        # 不应该发送任何消息
        mock_ws1.send_json.assert_not_called()

    def test_get_active_connections_count(self):
        """测试获取活跃连接数"""
        manager = ConnectionManager()
        assert manager.get_active_connections_count() == 0

        # 添加 mock 连接（不实际调用 connect，因为需要 async）
        mock_ws = MagicMock()
        manager.active_connections.add(mock_ws)
        manager.connection_map[mock_ws] = "admin_1"

        assert manager.get_active_connections_count() == 1
