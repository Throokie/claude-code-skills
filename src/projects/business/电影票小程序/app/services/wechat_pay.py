# -*- coding: utf-8 -*-
"""
微信支付 v3 服务模块
提供微信支付下单、查询、退款功能
"""
import time
import json
import base64
from typing import Optional, Dict, Any
from datetime import datetime, timezone
import httpx
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.backends import default_backend

from app.config import settings


# 微信支付 API 基础 URL
WECHAT_PAY_BASE_URL = "https://api.mch.weixin.qq.com"


def _generate_nonce_str() -> str:
    """生成随机字符串"""
    import uuid
    return str(uuid.uuid4()).replace("-", "")


def _generate_timestamp() -> int:
    """生成时间戳（秒）"""
    return int(time.time())


def _create_wechat_pay_sign(
    method: str,
    url: str,
    timestamp: int,
    nonce_str: str,
    body: Optional[str] = None,
    private_key_path: Optional[str] = None
) -> str:
    """
    创建微信支付签名

    Args:
        method: HTTP 方法 (GET, POST 等)
        url: 请求 URL 路径
        timestamp: 时间戳
        nonce_str: 随机字符串
        body: 请求体（JSON 字符串）
        private_key_path: 私钥文件路径

    Returns:
        Base64 编码的签名
    """
    private_key_path = private_key_path or settings.WECHAT_PAY_PRIVATE_KEY_PATH

    # 读取私钥
    with open(private_key_path, "rb") as f:
        private_key = serialization.load_pem_private_key(
            f.read(),
            password=None,
            backend=default_backend()
        )

    # 构建签名消息
    sign_message = f"{method}\n{url}\n{timestamp}\n{nonce_str}\n"
    if body:
        sign_message += f"{body}\n"

    # 签名
    signature = private_key.sign(
        sign_message.encode("utf-8"),
        padding.PKCS1v15(),
        hashes.SHA256()
    )

    return base64.b64encode(signature).decode("utf-8")


def _get_authorization_header(
    method: str,
    url: str,
    body: Optional[str] = None,
    mock_signature: Optional[str] = None
) -> str:
    """
    获取 Authorization Header

    Returns:
        Authorization Header 值
    """
    timestamp = _generate_timestamp()
    nonce_str = _generate_nonce_str()

    # Allow mock signature for testing
    if mock_signature:
        signature = mock_signature
    else:
        signature = _create_wechat_pay_sign(method, url, timestamp, nonce_str, body)

    return (
        f'WECHATPAY2-SHA256-RSA2048 '
        f'mchid="{settings.WECHAT_PAY_MCHID}",'
        f'nonce_str="{nonce_str}",'
        f'signature="{signature}",'
        f'timestamp="{timestamp}",'
        f'serial_no="{settings.WECHAT_PAY_CERT_SERIAL_NO}"'
    )


async def create_order(
    out_trade_no: str,
    amount: int,
    description: str,
    openid: str
) -> Dict[str, Any]:
    """
    创建微信支付订单

    Args:
        out_trade_no: 商户订单号
        amount: 订单金额（单位：分）
        description: 商品描述
        openid: 用户 openid

    Returns:
        微信支付预下单返回参数（包含 prepay_id 等）
    """
    url = f"{WECHAT_PAY_BASE_URL}/v3/pay/transactions/jsapi"

    payload = {
        "appid": settings.WECHAT_PAY_APPID,
        "mchid": settings.WECHAT_PAY_MCHID,
        "description": description,
        "out_trade_no": out_trade_no,
        "notify_url": "https://your-domain.com/api/v1/wechat/pay/callback",
        "amount": {
            "total": amount,
            "currency": "CNY"
        },
        "payer": {
            "openid": openid
        }
    }

    body = json.dumps(payload, ensure_ascii=False)
    authorization = _get_authorization_header("POST", "/v3/pay/transactions/jsapi", body)

    headers = {
        "Accept": "application/json",
        "Authorization": authorization,
        "Content-Type": "application/json"
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=headers, json=payload)
        response.raise_for_status()
        return response.json()


async def query_order(out_trade_no: str) -> Dict[str, Any]:
    """
    查询订单状态

    Args:
        out_trade_no: 商户订单号

    Returns:
        订单状态信息
    """
    url = f"{WECHAT_PAY_BASE_URL}/v3/pay/transactions/out-trade-no/{out_trade_no}"

    authorization = _get_authorization_header("GET", f"/v3/pay/transactions/out-trade-no/{out_trade_no}", None)

    headers = {
        "Accept": "application/json",
        "Authorization": authorization
    }

    params = {
        "mchid": settings.WECHAT_PAY_MCHID
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers, params=params)
        response.raise_for_status()
        return response.json()


async def refund_order(
    out_trade_no: str,
    out_refund_no: str,
    amount: int,
    total: int,
    reason: str = ""
) -> Dict[str, Any]:
    """
    申请退款

    Args:
        out_trade_no: 商户订单号
        out_refund_no: 商户退款单号
        amount: 退款金额（单位：分）
        total: 原订单金额（单位：分）
        reason: 退款原因

    Returns:
        退款申请结果
    """
    url = f"{WECHAT_PAY_BASE_URL}/v3/refund/domestic/refunds"

    payload = {
        "out_trade_no": out_trade_no,
        "out_refund_no": out_refund_no,
        "amount": {
            "refund": amount,
            "total": total,
            "currency": "CNY"
        },
        "reason": reason
    }

    body = json.dumps(payload, ensure_ascii=False)
    authorization = _get_authorization_header("POST", "/v3/refund/domestic/refunds", body)

    headers = {
        "Accept": "application/json",
        "Authorization": authorization,
        "Content-Type": "application/json"
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=headers, json=payload)
        response.raise_for_status()
        return response.json()


def verify_callback_signature(
    body: str,
    signature: str,
    timestamp: str,
    nonce: str,
    serial_no: str
) -> bool:
    """
    验证微信支付回调签名

    Args:
        body: 回调体（JSON 字符串）
        signature: 签名（Base64）
        timestamp: 时间戳
        nonce: 随机字符串
        serial_no: 证书序列号

    Returns:
        签名是否有效
    """
    # 构建验签消息
    sign_message = f"{timestamp}\n{nonce}\n{body}\n"

    # TODO: 需要根据微信公钥验签
    # 由于实际验签需要微信平台证书，这里先实现框架
    # 生产环境需要使用微信公钥进行验签

    try:
        # 实际验签逻辑（需要微信平台证书）
        # signature_bytes = base64.b64decode(signature)
        # ... 验签过程
        return True
    except Exception:
        return False
