# -*- coding: utf-8 -*-
"""
用户订单 API
"""
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel, Field
from sqlmodel.ext.asyncio.session import AsyncSession

from app.database import get_session, Order
from app.services.order_service import order_service

router = APIRouter()


# ==================== 请求模型 ====================

class CreateOrderRequest(BaseModel):
    """创建订单请求"""
    cinema_code: str = Field(..., description="影院代码")
    cinema_name: str = Field(..., description="影院名称")
    movie_name: str = Field(..., description="电影名称")
    show_date: str = Field(..., description="放映日期 YYYY-MM-DD")
    show_time: str = Field(..., description="放映时间 HH:MM")
    seat_count: int = Field(..., ge=1, le=4, description="票数(1-4)")
    unit_price: float = Field(..., gt=0, description="单价")
    seat_preference: Optional[str] = Field(None, description="座位偏好")
    hall_name: Optional[str] = Field(None, description="影厅名称")
    remark: Optional[str] = Field(None, description="备注")


class PayOrderRequest(BaseModel):
    """支付订单请求"""
    # 实际微信支付需要的参数
    pass


class OrderResponse(BaseModel):
    """订单响应"""
    order_no: str
    cinema_name: str
    movie_name: str
    show_date: str
    show_time: str
    hall_name: Optional[str]
    seat_count: int
    seat_preference: Optional[str]
    seats: Optional[str]
    unit_price: float
    total_price: float
    status: str
    code_word: Optional[str]
    expire_at: Optional[datetime]
    created_at: datetime


# ==================== 辅助函数 ====================

async def get_current_user(
    authorization: Optional[str] = Header(None)
) -> int:
    """
    获取当前用户ID

    实际项目需要验证微信登录态
    这里简化处理，返回测试用户ID
    """
    # TODO: 实现微信登录验证
    return 1


# ==================== API 路由 ====================

@router.post("/orders", response_model=OrderResponse)
async def create_order(
    request: CreateOrderRequest,
    user_id: int = Depends(get_current_user)
):
    """
    创建订单

    - 验证用户
    - 创建订单记录
    - 返回订单信息用于支付
    """
    async with await get_session() as session:
        order = await order_service.create_order(
            session=session,
            user_id=user_id,
            cinema_code=request.cinema_code,
            cinema_name=request.cinema_name,
            movie_name=request.movie_name,
            show_date=request.show_date,
            show_time=request.show_time,
            seat_count=request.seat_count,
            unit_price=request.unit_price,
            seat_preference=request.seat_preference,
            hall_name=request.hall_name,
            remark=request.remark
        )

        return OrderResponse(
            order_no=order.order_no,
            cinema_name=order.cinema_name,
            movie_name=order.movie_name,
            show_date=order.show_date,
            show_time=order.show_time,
            hall_name=order.hall_name,
            seat_count=order.seat_count,
            seat_preference=order.seat_preference,
            seats=order.seats,
            unit_price=order.unit_price,
            total_price=order.total_price,
            status=order.status,
            code_word=order.code_word,
            expire_at=order.expire_at,
            created_at=order.created_at
        )


@router.post("/orders/{order_no}/pay")
async def pay_order(
    order_no: str,
    user_id: int = Depends(get_current_user)
):
    """
    发起支付

    返回微信支付需要的参数
    """
    # TODO: 接入微信支付
    # 这里模拟支付成功
    async with await get_session() as session:
        order = await order_service.pay_order(
            session=session,
            order_no=order_no,
            transaction_id=f"mock_{datetime.now().timestamp()}"
        )

        if not order:
            raise HTTPException(status_code=400, detail="支付失败")

        return {
            "success": True,
            "order_no": order.order_no,
            "status": order.status
        }


@router.get("/orders/{order_no}", response_model=OrderResponse)
async def get_order(
    order_no: str,
    user_id: int = Depends(get_current_user)
):
    """
    获取订单详情
    """
    async with await get_session() as session:
        order = await order_service.get_order(session, order_no)

        if not order:
            raise HTTPException(status_code=404, detail="订单不存在")

        if order.user_id != user_id:
            raise HTTPException(status_code=403, detail="无权访问")

        return OrderResponse(
            order_no=order.order_no,
            cinema_name=order.cinema_name,
            movie_name=order.movie_name,
            show_date=order.show_date,
            show_time=order.show_time,
            hall_name=order.hall_name,
            seat_count=order.seat_count,
            seat_preference=order.seat_preference,
            seats=order.seats,
            unit_price=order.unit_price,
            total_price=order.total_price,
            status=order.status,
            code_word=order.code_word,
            expire_at=order.expire_at,
            created_at=order.created_at
        )


@router.get("/orders", response_model=List[OrderResponse])
async def get_orders(
    status: Optional[str] = None,
    limit: int = 20,
    user_id: int = Depends(get_current_user)
):
    """
    获取我的订单列表
    """
    async with await get_session() as session:
        orders = await order_service.get_user_orders(
            session=session,
            user_id=user_id,
            status=status,
            limit=limit
        )

        return [
            OrderResponse(
                order_no=o.order_no,
                cinema_name=o.cinema_name,
                movie_name=o.movie_name,
                show_date=o.show_date,
                show_time=o.show_time,
                hall_name=o.hall_name,
                seat_count=o.seat_count,
                seat_preference=o.seat_preference,
                seats=o.seats,
                unit_price=o.unit_price,
                total_price=o.total_price,
                status=o.status,
                code_word=o.code_word,
                expire_at=o.expire_at,
                created_at=o.created_at
            )
            for o in orders
        ]


@router.post("/orders/{order_no}/cancel")
async def cancel_order(
    order_no: str,
    user_id: int = Depends(get_current_user)
):
    """
    取消订单（仅待支付状态可取消）
    """
    async with await get_session() as session:
        order = await order_service.get_order(session, order_no)

        if not order:
            raise HTTPException(status_code=404, detail="订单不存在")

        if order.user_id != user_id:
            raise HTTPException(status_code=403, detail="无权操作")

        order = await order_service.cancel_order(session, order_no)

        if not order:
            raise HTTPException(status_code=400, detail="无法取消")

        return {"success": True, "status": order.status}