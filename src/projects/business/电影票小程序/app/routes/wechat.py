# -*- coding: utf-8 -*-
"""
微信接口 API
"""
import hashlib
import logging
from typing import Optional
from fastapi import APIRouter, Request, HTTPException, Body
from pydantic import BaseModel, Field
from xml.etree import ElementTree

from app.config import settings
from app.database import get_session, User
from app.services.order_service import order_service

router = APIRouter()
logger = logging.getLogger(__name__)


# ==================== 微信登录 ====================

class LoginRequest(BaseModel):
    """登录请求"""
    code: str = Field(..., description="微信登录code")


class LoginResponse(BaseModel):
    """登录响应"""
    openid: str
    token: str


@router.post("/login", response_model=LoginResponse)
async def wechat_login(request: LoginRequest):
    """
    微信小程序登录

    1. 通过 code 换取 openid
    2. 创建或获取用户
    3. 返回 token
    """
    import httpx

    # 调用微信接口获取 openid
    url = "https://api.weixin.qq.com/sns/jscode2session"
    params = {
        "appid": settings.WECHAT_APPID,
        "secret": settings.WECHAT_SECRET,
        "js_code": request.code,
        "grant_type": "authorization_code"
    }

    # 开发环境模拟
    if not settings.WECHAT_APPID:
        return LoginResponse(
            openid="test_openid",
            token="test_token"
        )

    async with httpx.AsyncClient() as client:
        resp = await client.get(url, params=params)
        data = resp.json()

        if "errcode" in data and data["errcode"] != 0:
            raise HTTPException(status_code=400, detail=data.get("errmsg", "登录失败"))

        openid = data["openid"]

    # 创建或获取用户
    async with await get_session() as session:
        from sqlmodel import select
        result = await session.exec(select(User).where(User.openid == openid))
        user = result.first()

        if not user:
            user = User(openid=openid)
            session.add(user)
            await session.commit()
            await session.refresh(user)

    # TODO: 生成 JWT token

    return LoginResponse(
        openid=openid,
        token=f"token_{openid}"
    )


# ==================== 微信支付回调 ====================

@router.post("/pay/notify")
async def wechat_pay_notify(request: Request):
    """
    微信支付结果通知回调

    处理支付成功/失败通知
    """
    body = await request.body()

    try:
        # 解析 XML
        root = ElementTree.fromstring(body)

        return_code = root.findtext("return_code")
        result_code = root.findtext("result_code")
        out_trade_no = root.findtext("out_trade_no")  # 商户订单号
        transaction_id = root.findtext("transaction_id")  # 微信支付订单号

        if return_code == "SUCCESS" and result_code == "SUCCESS":
            # 支付成功，更新订单状态
            async with await get_session() as session:
                order = await order_service.pay_order(
                    session=session,
                    order_no=out_trade_no,
                    transaction_id=transaction_id
                )

                if order:
                    logger.info(f"订单支付成功: {out_trade_no}")
                else:
                    logger.warning(f"订单支付处理失败: {out_trade_no}")

            # 返回成功响应
            return "<xml><return_code><![CDATA[SUCCESS]]></return_code></xml>"
        else:
            logger.error(f"支付失败: {body}")
            return "<xml><return_code><![CDATA[FAIL]]></return_code></xml>"

    except Exception as e:
        logger.error(f"支付回调处理异常: {e}")
        return "<xml><return_code><![CDATA[FAIL]]></return_code></xml>"


# ==================== 用户信息 ====================

class ProfileResponse(BaseModel):
    """用户信息响应"""
    id: int
    nickname: Optional[str]
    phone: Optional[str]
    coupon_balance: float


@router.get("/profile", response_model=ProfileResponse)
async def get_profile(token: str):
    """
    获取用户信息
    """
    # TODO: 验证 token
    async with await get_session() as session:
        from sqlmodel import select
        result = await session.exec(select(User).where(User.id == 1))
        user = result.first()

        if not user:
            raise HTTPException(status_code=404, detail="用户不存在")

        return ProfileResponse(
            id=user.id,
            nickname=user.nickname,
            phone=user.phone,
            coupon_balance=user.coupon_balance
        )


@router.get("/coupons")
async def get_coupons(token: str):
    """
    获取我的补偿券
    """
    # TODO: 验证 token
    async with await get_session() as session:
        from sqlmodel import select
        result = await session.exec(select(User).where(User.id == 1))
        user = result.first()

        return {
            "balance": user.coupon_balance if user else 0
        }