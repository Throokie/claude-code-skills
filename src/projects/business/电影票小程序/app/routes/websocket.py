# -*- coding: utf-8 -*-
"""
WebSocket 路由
提供管理员实时通知的 WebSocket 端点
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from typing import Optional

from app.websocket.manager import manager
from app.auth.jwt import decode_token
from app.config import settings


router = APIRouter(prefix="/ws", tags=["websocket"])


@router.websocket("/admin")
async def websocket_admin_endpoint(
    websocket: WebSocket,
    token: Optional[str] = None
):
    """
    管理员 WebSocket 连接端点

    连接方式：
    - ws://host:port/api/v1/ws/admin?token=xxx
    - 或者在连接后发送认证消息

    Args:
        websocket: WebSocket 连接
        token: 认证 token（可选，支持 URL 参数或消息认证）
    """
    admin_id = None

    # 尝试从 URL 参数获取 token 并验证
    if token:
        try:
            payload = decode_token(token, settings.SECRET_KEY)
            admin_id = payload.get("user_id", "admin")
        except Exception:
            await websocket.close(code=4001, reason="Invalid token")
            return

    # 如果没有 URL token，等待认证消息
    if not admin_id:
        try:
            # 等待认证消息
            data = await websocket.receive_json()
            auth_token = data.get("token")
            if not auth_token:
                await websocket.close(code=4001, reason="Token required")
                return

            payload = decode_token(auth_token, settings.SECRET_KEY)
            admin_id = payload.get("user_id", "admin")
        except WebSocketDisconnect:
            return
        except Exception as e:
            await websocket.close(code=4002, reason=f"Authentication failed: {str(e)}")
            return

    # 建立连接
    connected = await manager.connect(websocket, admin_id)
    if not connected:
        return

    try:
        # 保持连接，接收消息（心跳等）
        while True:
            try:
                data = await websocket.receive_text()
                # 可以处理心跳或其他控制消息
                if data == "ping":
                    await websocket.send_text("pong")
            except WebSocketDisconnect:
                break
            except Exception:
                break
    finally:
        await manager.disconnect(websocket)
