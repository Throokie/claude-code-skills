# -*- coding: utf-8 -*-
"""
JWT 认证模块
提供 JWT 令牌生成、解码和微信登录验证功能
"""
import time
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
import jwt
import httpx

from app.config import Settings


def generate_access_token(
    user_id: int,
    secret: str,
    expires_minutes: int = 30
) -> str:
    """
    生成访问令牌

    Args:
        user_id: 用户 ID
        secret: JWT 密钥
        expires_minutes: 过期时间（分钟），默认 30 分钟

    Returns:
        JWT 访问令牌字符串
    """
    now = datetime.now(timezone.utc)
    exp = now + timedelta(minutes=expires_minutes)

    payload = {
        "user_id": user_id,
        "iat": now,
        "exp": exp,
        "type": "access"
    }

    token = jwt.encode(payload, secret, algorithm="HS256")
    return token


def generate_refresh_token(user_id: int, secret: str) -> str:
    """
    生成刷新令牌

    Args:
        user_id: 用户 ID
        secret: JWT 密钥

    Returns:
        JWT 刷新令牌字符串
    """
    now = datetime.now(timezone.utc)
    # 刷新令牌 7 天过期
    exp = now + timedelta(days=7)

    payload = {
        "user_id": user_id,
        "iat": now,
        "exp": exp,
        "type": "refresh"
    }

    token = jwt.encode(payload, secret, algorithm="HS256")
    return token


def decode_token(token: str, secret: str) -> Dict[str, Any]:
    """
    解码 JWT 令牌

    Args:
        token: JWT 令牌字符串
        secret: JWT 密钥

    Returns:
        解码后的载荷字典

    Raises:
        jwt.ExpiredSignatureError: 令牌已过期
        jwt.InvalidTokenError: 令牌无效
    """
    payload = jwt.decode(token, secret, algorithms=["HS256"])
    return payload


async def verify_wechat_code(code: str, settings: Settings) -> Dict[str, str]:
    """
    验证微信登录码，调用微信 jscode2session API

    Args:
        code: 微信小程序登录 code
        settings: 应用配置

    Returns:
        微信 API 返回的用户信息，包含 openid、session_key 等

    Raises:
        Exception: 验证失败时抛出异常
    """
    url = "https://api.weixin.qq.com/sns/jscode2session"
    params = {
        "appid": settings.WECHAT_APPID,
        "secret": settings.WECHAT_SECRET,
        "js_code": code,
        "grant_type": "authorization_code"
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params)
        response.raise_for_status()
        data = response.json()

    # 检查错误
    if "errcode" in data and data["errcode"] != 0:
        raise Exception(f"WeChat API error: {data.get('errmsg', 'unknown error')}")

    return {
        "openid": data["openid"],
        "session_key": data["session_key"],
        "unionid": data.get("unionid")
    }
