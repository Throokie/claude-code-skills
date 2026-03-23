# -*- coding: utf-8 -*-
"""
订单服务模块
处理订单创建、状态流转、支付等
"""
import logging
import secrets
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.database import Order, User, Cinema, TicketChannel, CodeWord, SystemConfig
from app.config import settings

logger = logging.getLogger(__name__)


class OrderService:
    """订单服务"""

    def generate_order_no(self) -> str:
        """生成订单号: T + 年月日 + 时分 + 4位随机字符"""
        now = datetime.now()
        date_part = now.strftime("%y%m%d")
        time_part = now.strftime("%H%M")
        random_part = secrets.token_hex(2).upper()  # 4位随机
        return f"T{date_part}{time_part}{random_part}"

    async def create_order(
        self,
        session: AsyncSession,
        user_id: int,
        cinema_code: str,
        cinema_name: str,
        movie_name: str,
        show_date: str,
        show_time: str,
        seat_count: int,
        unit_price: float,
        seat_preference: Optional[str] = None,
        hall_name: Optional[str] = None,
        remark: Optional[str] = None
    ) -> Order:
        """创建订单"""
        order_no = self.generate_order_no()
        total_price = unit_price * seat_count

        order = Order(
            order_no=order_no,
            user_id=user_id,
            cinema_code=cinema_code,
            cinema_name=cinema_name,
            movie_name=movie_name,
            show_date=show_date,
            show_time=show_time,
            seat_count=seat_count,
            seat_preference=seat_preference,
            hall_name=hall_name,
            unit_price=unit_price,
            total_price=total_price,
            status="pending",
            remark=remark,
            expire_at=datetime.now() + timedelta(minutes=settings.ORDER_EXPIRE_MINUTES)
        )

        session.add(order)
        await session.commit()
        await session.refresh(order)

        logger.info(f"创建订单: {order_no}, 用户: {user_id}, 电影: {movie_name}")
        return order

    async def get_order(self, session: AsyncSession, order_no: str) -> Optional[Order]:
        """获取订单"""
        result = await session.exec(
            select(Order).where(Order.order_no == order_no)
        )
        return result.first()

    async def get_user_orders(
        self,
        session: AsyncSession,
        user_id: int,
        status: Optional[str] = None,
        limit: int = 20
    ) -> List[Order]:
        """获取用户订单列表"""
        query = select(Order).where(Order.user_id == user_id)

        if status:
            query = query.where(Order.status == status)

        query = query.order_by(Order.created_at.desc()).limit(limit)

        result = await session.exec(query)
        return list(result.all())

    async def pay_order(
        self,
        session: AsyncSession,
        order_no: str,
        transaction_id: str
    ) -> Optional[Order]:
        """支付订单"""
        order = await self.get_order(session, order_no)
        if not order:
            return None

        if order.status != "pending":
            logger.warning(f"订单状态不正确: {order_no}, 状态: {order.status}")
            return None

        if order.expire_at and datetime.now() > order.expire_at:
            order.status = "cancelled"
            await session.commit()
            logger.warning(f"订单已过期: {order_no}")
            return None

        order.status = "paid"
        order.transaction_id = transaction_id
        order.paid_at = datetime.now()
        order.updated_at = datetime.now()

        await session.commit()
        await session.refresh(order)

        logger.info(f"订单支付成功: {order_no}")
        return order

    async def accept_order(
        self,
        session: AsyncSession,
        order_no: str,
        channel_id: Optional[int] = None,
        admin_note: Optional[str] = None
    ) -> Optional[Order]:
        """接单"""
        order = await self.get_order(session, order_no)
        if not order:
            return None

        if order.status != "paid":
            logger.warning(f"订单状态不正确: {order_no}, 状态: {order.status}")
            return None

        order.status = "accepted"
        order.ticket_channel_id = channel_id
        order.admin_note = admin_note
        order.accepted_at = datetime.now()
        order.updated_at = datetime.now()

        await session.commit()
        await session.refresh(order)

        logger.info(f"订单已接单: {order_no}, 渠道: {channel_id}")
        return order

    async def ticket_order(
        self,
        session: AsyncSession,
        order_no: str,
        seats: str,
        code_word: str,
        code_word_type: str = "blessing",
        ticket_code: Optional[str] = None
    ) -> Optional[Order]:
        """出票"""
        order = await self.get_order(session, order_no)
        if not order:
            return None

        if order.status != "accepted":
            logger.warning(f"订单状态不正确: {order_no}, 状态: {order.status}")
            return None

        order.status = "ticketed"
        order.seats = seats
        order.code_word = code_word
        order.code_word_type = code_word_type
        order.ticket_code = ticket_code
        order.ticketed_at = datetime.now()
        order.updated_at = datetime.now()

        await session.commit()
        await session.refresh(order)

        logger.info(f"订单已出票: {order_no}, 座位: {seats}, 暗号: {code_word}")
        return order

    async def reject_order(
        self,
        session: AsyncSession,
        order_no: str,
        reason: str,
        coupon_amount: float = 0.0
    ) -> Optional[Order]:
        """拒绝订单（退款）"""
        order = await self.get_order(session, order_no)
        if not order:
            return None

        if order.status not in ["paid", "accepted"]:
            logger.warning(f"订单状态不正确: {order_no}, 状态: {order.status}")
            return None

        order.status = "refunded"
        order.refund_reason = reason
        order.refund_amount = order.total_price
        order.coupon_compensation = coupon_amount
        order.refunded_at = datetime.now()
        order.updated_at = datetime.now()

        # 增加用户补偿券
        if coupon_amount > 0:
            user_result = await session.exec(
                select(User).where(User.id == order.user_id)
            )
            user = user_result.first()
            if user:
                user.coupon_balance += coupon_amount
                user.updated_at = datetime.now()

        await session.commit()
        await session.refresh(order)

        logger.info(f"订单已退款: {order_no}, 原因: {reason}, 补偿券: {coupon_amount}")
        return order

    async def cancel_order(self, session: AsyncSession, order_no: str) -> Optional[Order]:
        """取消订单（用户取消）"""
        order = await self.get_order(session, order_no)
        if not order:
            return None

        if order.status != "pending":
            logger.warning(f"只能取消待支付订单: {order_no}, 状态: {order.status}")
            return None

        order.status = "cancelled"
        order.updated_at = datetime.now()

        await session.commit()
        await session.refresh(order)

        logger.info(f"订单已取消: {order_no}")
        return order

    async def complete_order(self, session: AsyncSession, order_no: str) -> Optional[Order]:
        """完成订单（观影结束）"""
        order = await self.get_order(session, order_no)
        if not order:
            return None

        if order.status != "ticketed":
            return None

        order.status = "completed"
        order.updated_at = datetime.now()

        await session.commit()
        await session.refresh(order)

        logger.info(f"订单已完成: {order_no}")
        return order

    async def get_pending_orders(
        self,
        session: AsyncSession,
        limit: int = 50
    ) -> List[Order]:
        """获取待处理订单"""
        query = (
            select(Order)
            .where(Order.status.in_(["paid", "accepted"]))
            .order_by(Order.created_at.asc())
            .limit(limit)
        )
        result = await session.exec(query)
        return list(result.all())

    async def expire_orders(self, session: AsyncSession) -> int:
        """过期订单处理"""
        now = datetime.now()
        query = (
            select(Order)
            .where(Order.status == "pending")
            .where(Order.expire_at < now)
        )
        result = await session.exec(query)
        expired_orders = list(result.all())

        count = 0
        for order in expired_orders:
            order.status = "cancelled"
            order.updated_at = now
            count += 1

        if count > 0:
            await session.commit()
            logger.info(f"已过期 {count} 个订单")

        return count


# 全局实例
order_service = OrderService()