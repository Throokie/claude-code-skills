# -*- coding: utf-8 -*-
"""
WebSocket 连接管理器
用于管理管理员实时通知的 WebSocket 连接
"""
import asyncio
from typing import Dict, List, Set
from fastapi import WebSocket


class ConnectionManager:
    """WebSocket 连接管理器"""

    def __init__(self):
        # 存储所有活跃的 WebSocket 连接
        self.active_connections: Set[WebSocket] = set()
        # 存储连接对应的管理员 ID
        self.connection_map: Dict[WebSocket, str] = {}
        # 锁，防止并发修改
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket, admin_id: str) -> bool:
        """
        接受 WebSocket 连接

        Args:
            websocket: WebSocket 连接对象
            admin_id: 管理员 ID

        Returns:
            是否连接成功
        """
        try:
            await websocket.accept()
            async with self._lock:
                self.active_connections.add(websocket)
                self.connection_map[websocket] = admin_id
            print(f"Admin {admin_id} connected via WebSocket")
            return True
        except Exception as e:
            print(f"Failed to connect WebSocket: {e}")
            return False

    async def disconnect(self, websocket: WebSocket):
        """
        断开 WebSocket 连接

        Args:
            websocket: WebSocket 连接对象
        """
        async with self._lock:
            if websocket in self.active_connections:
                admin_id = self.connection_map.pop(websocket, "unknown")
                self.active_connections.remove(websocket)
                print(f"Admin {admin_id} disconnected from WebSocket")

    async def broadcast(self, message: dict):
        """
        向所有连接广播消息

        Args:
            message: 要广播的消息字典
        """
        import json
        async with self._lock:
            connections = list(self.active_connections)

        for connection in connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                print(f"Failed to send broadcast to connection: {e}")
                # 连接失败，从列表中移除
                await self.disconnect(connection)

    async def send_personal(self, message: dict, admin_id: str):
        """
        向特定管理员发送消息

        Args:
            message: 要发送的消息字典
            admin_id: 目标管理员 ID
        """
        async with self._lock:
            # 找到对应的连接
            target_connection = None
            for conn, conn_admin_id in self.connection_map.items():
                if conn_admin_id == admin_id:
                    target_connection = conn
                    break

        if target_connection:
            try:
                await target_connection.send_json(message)
            except Exception as e:
                print(f"Failed to send personal message: {e}")
                await self.disconnect(target_connection)

    def get_active_connections_count(self) -> int:
        """获取当前活跃连接数"""
        return len(self.active_connections)


# 全局连接管理器实例
manager = ConnectionManager()
