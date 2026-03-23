# -*- coding: utf-8 -*-
"""
管理后台 API
"""
import random
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Header, Query
from pydantic import BaseModel, Field
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.config import settings
from app.database import (
    get_session, Order, Cinema, TicketChannel,
    CodeWord, SystemConfig, Announcement, User
)
from app.services.order_service import order_service
from app.services.code_word_service import code_word_service

router = APIRouter()


# ==================== 认证 ====================

async def verify_admin(authorization: Optional[str] = Header(None)) -> bool:
    """验证管理员权限"""
    if not authorization:
        raise HTTPException(status_code=401, detail="未授权")

    token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization

    if token != settings.ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="无效的令牌")

    return True


# ==================== 请求模型 ====================

class AcceptOrderRequest(BaseModel):
    """接单请求"""
    channel_id: Optional[int] = Field(None, description="出票渠道ID")
    note: Optional[str] = Field(None, description="备注")


class TicketOrderRequest(BaseModel):
    """出票请求"""
    seats: str = Field(..., description="座位号，如 '5排6,7座'")
    code_word: str = Field(..., description="暗号")
    code_word_type: str = Field("blessing", description="暗号类型")
    ticket_code: Optional[str] = Field(None, description="票码")


class RejectOrderRequest(BaseModel):
    """拒绝订单请求"""
    reason: str = Field(..., description="退款原因")
    coupon_amount: float = Field(0, ge=0, description="补偿券金额")


class UpdateCinemaRequest(BaseModel):
    """更新影院请求"""
    priority: Optional[int] = None
    tags: Optional[List[str]] = None
    manager_contact: Optional[str] = None


class CreateCodeWordRequest(BaseModel):
    """创建暗号请求"""
    word: str
    type: str = "blessing"


class SetSystemStatusRequest(BaseModel):
    """设置系统状态请求"""
    status: str = Field(..., description="normal/overload/closed")
    announcement: Optional[str] = None


# ==================== 订单管理 ====================

@router.get("/orders")
async def get_orders(
    status: Optional[str] = None,
    date: Optional[str] = None,
    limit: int = 50,
    _: bool = Depends(verify_admin)
):
    """
    获取订单列表（管理后台）
    """
    async with await get_session() as session:
        query = select(Order)

        if status:
            query = query.where(Order.status == status)

        if date:
            query = query.where(Order.show_date == date)

        query = query.order_by(Order.created_at.desc()).limit(limit)

        result = await session.exec(query)
        orders = list(result.all())

        # 获取渠道名称映射
        channel_result = await session.exec(select(TicketChannel))
        channels = {c.id: c.name for c in channel_result.all()}

        return [
            {
                "order_no": o.order_no,
                "user_id": o.user_id,
                "cinema_name": o.cinema_name,
                "movie_name": o.movie_name,
                "show_date": o.show_date,
                "show_time": o.show_time,
                "hall_name": o.hall_name,
                "seat_count": o.seat_count,
                "seat_preference": o.seat_preference,
                "seats": o.seats,
                "unit_price": o.unit_price,
                "total_price": o.total_price,
                "status": o.status,
                "code_word": o.code_word,
                "ticket_channel_id": o.ticket_channel_id,
                "ticket_channel_name": channels.get(o.ticket_channel_id) if o.ticket_channel_id else None,
                "refund_reason": o.refund_reason,
                "coupon_compensation": o.coupon_compensation,
                "remark": o.remark,
                "admin_note": o.admin_note,
                "created_at": o.created_at.isoformat() if o.created_at else None,
                "paid_at": o.paid_at.isoformat() if o.paid_at else None,
                "accepted_at": o.accepted_at.isoformat() if o.accepted_at else None,
                "ticketed_at": o.ticketed_at.isoformat() if o.ticketed_at else None
            }
            for o in orders
        ]


@router.post("/orders/{order_no}/accept")
async def accept_order(
    order_no: str,
    request: AcceptOrderRequest,
    _: bool = Depends(verify_admin)
):
    """
    接单
    """
    async with await get_session() as session:
        order = await order_service.accept_order(
            session=session,
            order_no=order_no,
            channel_id=request.channel_id,
            admin_note=request.note
        )

        if not order:
            raise HTTPException(status_code=400, detail="接单失败")

        return {"success": True, "status": order.status}


@router.post("/orders/{order_no}/ticket")
async def ticket_order(
    order_no: str,
    request: TicketOrderRequest,
    _: bool = Depends(verify_admin)
):
    """
    出票
    """
    async with await get_session() as session:
        order = await order_service.ticket_order(
            session=session,
            order_no=order_no,
            seats=request.seats,
            code_word=request.code_word,
            code_word_type=request.code_word_type,
            ticket_code=request.ticket_code
        )

        if not order:
            raise HTTPException(status_code=400, detail="出票失败")

        return {
            "success": True,
            "status": order.status,
            "seats": order.seats,
            "code_word": order.code_word
        }


@router.post("/orders/{order_no}/reject")
async def reject_order(
    order_no: str,
    request: RejectOrderRequest,
    _: bool = Depends(verify_admin)
):
    """
    拒绝订单（退款）
    """
    async with await get_session() as session:
        order = await order_service.reject_order(
            session=session,
            order_no=order_no,
            reason=request.reason,
            coupon_amount=request.coupon_amount
        )

        if not order:
            raise HTTPException(status_code=400, detail="退款失败")

        # TODO: 调用微信支付退款接口

        return {
            "success": True,
            "status": order.status,
            "refund_amount": order.refund_amount,
            "coupon_compensation": order.coupon_compensation
        }


# ==================== 影院管理 ====================

@router.get("/cinemas")
async def get_cinemas(_: bool = Depends(verify_admin)):
    """
    获取影院列表
    """
    async with await get_session() as session:
        result = await session.exec(select(Cinema).order_by(Cinema.priority.desc()))
        cinemas = list(result.all())

        return [
            {
                "id": c.id,
                "code": c.code,
                "name": c.name,
                "maoyan_id": c.maoyan_id,
                "priority": c.priority,
                "tags": c.get_tags(),
                "manager_contact": c.manager_contact,
                "api_provider": c.api_provider,
                "is_active": c.is_active
            }
            for c in cinemas
        ]


@router.post("/cinemas/{cinema_id}")
async def update_cinema(
    cinema_id: int,
    request: UpdateCinemaRequest,
    _: bool = Depends(verify_admin)
):
    """
    更新影院信息
    """
    async with await get_session() as session:
        result = await session.exec(select(Cinema).where(Cinema.id == cinema_id))
        cinema = result.first()

        if not cinema:
            raise HTTPException(status_code=404, detail="影院不存在")

        if request.priority is not None:
            cinema.priority = request.priority

        if request.tags is not None:
            cinema.set_tags(request.tags)

        if request.manager_contact is not None:
            cinema.manager_contact = request.manager_contact

        cinema.updated_at = datetime.now()
        await session.commit()

        return {"success": True}


# ==================== 出票渠道管理 ====================

@router.get("/channels")
async def get_channels(_: bool = Depends(verify_admin)):
    """
    获取出票渠道列表
    """
    async with await get_session() as session:
        result = await session.exec(select(TicketChannel).where(TicketChannel.is_active == True))
        channels = list(result.all())

        return [
            {
                "id": c.id,
                "name": c.name,
                "type": c.type,
                "description": c.description
            }
            for c in channels
        ]


# ==================== 暗号管理 ====================

@router.get("/code-words")
async def get_code_words(
    type: Optional[str] = None,
    _: bool = Depends(verify_admin)
):
    """
    获取暗号库
    """
    async with await get_session() as session:
        query = select(CodeWord).where(CodeWord.is_active == True)

        if type:
            query = query.where(CodeWord.type == type)

        result = await session.exec(query)
        words = list(result.all())

        return [
            {
                "id": w.id,
                "word": w.word,
                "type": w.type
            }
            for w in words
        ]


@router.post("/code-words")
async def create_code_word(
    request: CreateCodeWordRequest,
    _: bool = Depends(verify_admin)
):
    """
    新增暗号
    """
    async with await get_session() as session:
        # 检查是否已存在
        result = await session.exec(select(CodeWord).where(CodeWord.word == request.word))
        if result.first():
            raise HTTPException(status_code=400, detail="暗号已存在")

        word = CodeWord(word=request.word, type=request.type)
        session.add(word)
        await session.commit()

        return {"success": True, "id": word.id}


@router.get("/code-words/assign")
async def assign_code_word(
    type: str = "blessing",
    _: bool = Depends(verify_admin)
):
    """
    智能分配暗号

    自动避开近期使用和未取票订单的暗号
    """
    async with await get_session() as session:
        code_word = await code_word_service.assign_code_word(
            session=session,
            code_word_type=type
        )

        if not code_word:
            raise HTTPException(status_code=400, detail="没有可用的暗号")

        return {"code_word": code_word, "type": type}


class GenerateNumbersRequest(BaseModel):
    """生成数字暗号请求"""
    count: int = Field(20, ge=1, le=100)
    digits: str = Field("3", description="3/4/mixed")


@router.post("/code-words/generate")
async def generate_code_words(
    request: GenerateNumbersRequest,
    _: bool = Depends(verify_admin)
):
    """
    生成随机数字暗号池

    自动排除：
    - 最近3天已分配的暗号
    - 当前未取票订单的暗号
    - 相似度过高的暗号
    """
    async with await get_session() as session:
        generated = await code_word_service.generate_number_pool(
            session=session,
            count=request.count,
            digits=request.digits
        )

        # 保存到数据库
        for word in generated:
            code_word = CodeWord(word=word, type="number")
            session.add(code_word)

        await session.commit()

        return {"success": True, "count": len(generated), "words": generated}


@router.get("/code-words/usage")
async def get_code_word_usage(_: bool = Depends(verify_admin)):
    """
    获取暗号使用统计
    """
    async with await get_session() as session:
        stats = await code_word_service.get_usage_stats(session)
        return stats


# ==================== 系统设置 ====================

@router.get("/system/status")
async def get_system_status(_: bool = Depends(verify_admin)):
    """
    获取运营状态
    """
    async with await get_session() as session:
        result = await session.exec(select(SystemConfig).where(SystemConfig.key == "operation_status"))
        status_config = result.first()

        result2 = await session.exec(select(SystemConfig).where(SystemConfig.key == "announcement"))
        announcement_config = result2.first()

        return {
            "status": status_config.value if status_config else "normal",
            "announcement": announcement_config.value if announcement_config else ""
        }


@router.post("/system/status")
async def set_system_status(
    request: SetSystemStatusRequest,
    _: bool = Depends(verify_admin)
):
    """
    设置运营状态
    """
    async with await get_session() as session:
        # 更新状态
        result = await session.exec(select(SystemConfig).where(SystemConfig.key == "operation_status"))
        status_config = result.first()

        if status_config:
            status_config.value = f'"{request.status}"'
        else:
            status_config = SystemConfig(key="operation_status", value=f'"{request.status}"')
            session.add(status_config)

        # 更新公告
        if request.announcement:
            result2 = await session.exec(select(SystemConfig).where(SystemConfig.key == "announcement"))
            announcement_config = result2.first()

            if announcement_config:
                announcement_config.value = f'"{request.announcement}"'
            else:
                announcement_config = SystemConfig(key="announcement", value=f'"{request.announcement}"')
                session.add(announcement_config)

        await session.commit()

        return {"success": True}


# ==================== 统计数据 ====================

@router.get("/stats")
async def get_stats(_: bool = Depends(verify_admin)):
    """
    获取统计数据

    按状态分类显示金额、单数、张数
    """
    async with await get_session() as session:
        today = datetime.now().strftime("%Y-%m-%d")

        # 初始化统计结构
        stats = {
            "paid": {"amount": 0.0, "count": 0, "seats": 0},      # 待接单
            "accepted": {"amount": 0.0, "count": 0, "seats": 0},  # 已接单
            "ticketed": {"amount": 0.0, "count": 0, "seats": 0},  # 已出票
            "refunded": {"amount": 0.0, "count": 0, "seats": 0},  # 已退款
        }

        # 按状态统计今日数据
        for status in ["paid", "accepted", "ticketed", "refunded"]:
            result = await session.exec(
                select(Order)
                .where(Order.show_date == today)
                .where(Order.status == status)
            )
            orders = list(result.all())
            stats[status]["count"] = len(orders)
            stats[status]["seats"] = sum(o.seat_count for o in orders)
            if status == "refunded":
                stats[status]["amount"] = sum(o.refund_amount or 0 for o in orders)
            else:
                stats[status]["amount"] = sum(o.total_price for o in orders)

        # 计算汇总
        total_income = sum(
            stats[s]["amount"] for s in ["paid", "accepted", "ticketed"]
        )
        pending_orders = stats["paid"]["count"]

        return {
            "by_status": stats,
            "today_orders": sum(s["count"] for s in stats.values()),
            "pending_orders": pending_orders,
            "today_income": total_income
        }


# ==================== Mock 数据生成 ====================

# Mock 数据配置
MOCK_MOVIES = [
    "热辣滚烫", "飞驰人生2", "第二十条", "熊出没·逆转时空",
    "年会不能停", "流浪地球3", "唐探4", "红海行动2"
]
MOCK_CINEMAS = [
    {"code": "jc", "name": "中影金城影院", "hall": "1号厅"},
    {"code": "meiying", "name": "中影魅影国际影城", "hall": "2号厅"},
    {"code": "hsy", "name": "好声音金逸", "hall": "杜比厅"},
    {"code": "drf", "name": "银丰金逸影城", "hall": "巨幕厅"},
    {"code": "nanxing", "name": "中影盛世影城", "hall": "VIP厅"},
    {"code": "huaxia", "name": "华夏巨幕影城", "hall": "巨幕厅"},
    {"code": "wanda", "name": "玉林万达IMAX影城", "hall": "IMAX厅"},
    {"code": "lingdong", "name": "领东国际影城", "hall": "4D厅"},
    {"code": "hengda", "name": "恒大嘉凯影城", "hall": "1号厅"},
    {"code": "biguiyuan", "name": "金逸院线（凤凰广场店）", "hall": "2号厅"},
    {"code": "xingfu", "name": "玉林幸福影城", "hall": "3号厅"},
    {"code": "xingmei", "name": "中影星美影院", "hall": "1号厅"},
]
MOCK_TIMES = ["10:30", "13:00", "14:30", "16:00", "18:30", "20:00", "21:30"]
MOCK_PREFERENCES = ["不限", "尽量中间", "尽量后排", "连坐"]

# Mock 按状态生成的数量
MOCK_STATUS_COUNTS = {
    "paid": 3,       # 待接单
    "accepted": 2,   # 已接单
    "ticketed": 3,   # 已出票
    "completed": 1,  # 已完成
    "refunded": 1    # 已退款
}


@router.post("/mock/generate")
async def generate_mock_data(
    count: int = 0,
    by_status: bool = True,
    _: bool = Depends(verify_admin)
):
    """
    生成测试订单数据

    默认按状态生成（by_status=True）：
    - paid: 3单
    - accepted: 2单
    - ticketed: 3单
    - completed: 1单
    - refunded: 1单

    或指定 count 随机生成
    """
    async with await get_session() as session:
        # 确保有测试用户
        result = await session.exec(select(User))
        user = result.first()

        if not user:
            user = User(openid="test_openid", nickname="测试用户", phone="13800138000")
            session.add(user)
            await session.commit()
            await session.refresh(user)

        # 确保有影院数据
        await ensure_cinemas_exist(session)

        created_orders = []
        today = datetime.now()
        today_str = today.strftime("%Y-%m-%d")

        # 按状态生成或随机生成
        if by_status and count == 0:
            status_list = []
            for status, cnt in MOCK_STATUS_COUNTS.items():
                status_list.extend([status] * cnt)
        else:
            status_list = [random.choice(["paid", "accepted", "ticketed", "completed", "refunded"]) for _ in range(count or 10)]

        for i, target_status in enumerate(status_list):
            cinema = random.choice(MOCK_CINEMAS)
            movie = random.choice(MOCK_MOVIES)
            show_time = random.choice(MOCK_TIMES)
            seat_count = random.randint(1, 4)
            unit_price = random.choice([28, 30, 35, 40, 45])

            order = await order_service.create_order(
                session=session,
                user_id=user.id,
                cinema_code=cinema["code"],
                cinema_name=cinema["name"],
                movie_name=movie,
                show_date=today_str,
                show_time=show_time,
                seat_count=seat_count,
                unit_price=unit_price,
                seat_preference=random.choice(MOCK_PREFERENCES),
                hall_name=cinema["hall"]
            )

            # 模拟支付
            if target_status in ["paid", "accepted", "ticketed", "completed", "refunded"]:
                order = await order_service.pay_order(
                    session=session,
                    order_no=order.order_no,
                    transaction_id=f"mock_{today.timestamp()}_{i}"
                )

            # 模拟接单
            if target_status in ["accepted", "ticketed", "completed", "refunded"]:
                order = await order_service.accept_order(
                    session=session,
                    order_no=order.order_no,
                    channel_id=random.randint(1, 4)
                )

            # 模拟出票
            if target_status in ["ticketed", "completed"]:
                seats = f"{random.randint(3, 10)}排{random.randint(1, 15)}"
                if seat_count > 1:
                    seats += f",{random.randint(1, 15)}座"

                code_word = await code_word_service.assign_code_word(session)
                await order_service.ticket_order(
                    session=session,
                    order_no=order.order_no,
                    seats=seats,
                    code_word=code_word or "测试暗号",
                    code_word_type="number"
                )

            # 模拟完成
            if target_status == "completed":
                await order_service.complete_order(session, order.order_no)

            # 模拟退款
            if target_status == "refunded":
                await order_service.reject_order(
                    session=session,
                    order_no=order.order_no,
                    reason="测试退款",
                    coupon_amount=random.choice([0, 2, 5])
                )

            created_orders.append({"order_no": order.order_no, "status": target_status})

        return {
            "success": True,
            "count": len(created_orders),
            "orders": created_orders,
            "by_status": MOCK_STATUS_COUNTS if by_status else None
        }


async def ensure_cinemas_exist(session: AsyncSession):
    """确保影院数据存在"""
    result = await session.exec(select(Cinema))
    if not result.first():
        # 从老项目同步影院
        cinemas_data = [
            Cinema(code="jc", name="中影金城影院", priority=10),
            Cinema(code="meiying", name="中影魅影国际影城", priority=9),
            Cinema(code="hsy", name="好声音金逸", priority=8),
            Cinema(code="drf", name="银丰金逸影城", priority=7),
            Cinema(code="nanxing", name="中影盛世影城", priority=6),
            Cinema(code="huaxia", name="华夏巨幕影城", priority=5),
            Cinema(code="wanda", name="玉林万达IMAX影城", priority=4),
            Cinema(code="lingdong", name="领东国际影城", priority=3),
            Cinema(code="hengda", name="恒大嘉凯影城", priority=2),
            Cinema(code="biguiyuan", name="金逸院线（凤凰广场店）", priority=1),
            Cinema(code="xingfu", name="玉林幸福影城", priority=0),
            Cinema(code="xingmei", name="中影星美影院", priority=0),
        ]
        for cinema in cinemas_data:
            session.add(cinema)
        await session.commit()


@router.post("/mock/clear")
async def clear_mock_data(_: bool = Depends(verify_admin)):
    """
    清除所有测试数据
    """
    async with await get_session() as session:
        # 删除所有订单
        result = await session.exec(select(Order))
        for order in result.all():
            await session.delete(order)

        # 删除测试用户
        result = await session.exec(select(User).where(User.openid == "test_openid"))
        user = result.first()
        if user:
            await session.delete(user)

        await session.commit()

        return {"success": True, "message": "测试数据已清除"}


# ==================== 数据统计 ====================

@router.get("/stats/revenue")
async def get_revenue_stats(
    days: int = Query(default=7, ge=1, le=30, description="查询天数"),
    _: bool = Depends(verify_admin)
):
    """
    获取营收趋势数据（折线图）

    Returns:
        {
            "dates": ["2026-03-13", "2026-03-14", ...],
            "revenue": [1200.5, 1500.0, ...],
            "order_count": [15, 20, ...],
            "total": 2700.5
        }
    """
    async with await get_session() as session:
        # 计算日期范围
        end_date = datetime.now().replace(hour=23, minute=59, second=59)
        start_date = end_date - timedelta(days=days - 1)
        start_date = start_date.replace(hour=0, minute=0, second=0)

        # 查询已支付订单
        result = await session.exec(
            select(Order)
            .where(Order.status == "paid")
            .where(Order.paid_at >= start_date)
            .where(Order.paid_at <= end_date)
        )
        orders = result.all()

        # 按日期分组统计
        daily_stats: dict = {}

        # 初始化所有日期
        current = start_date
        while current <= end_date:
            date_str = current.strftime("%Y-%m-%d")
            daily_stats[date_str] = {"revenue": 0.0, "order_count": 0}
            current += timedelta(days=1)

        # 统计订单数据
        for order in orders:
            if order.paid_at:
                date_str = order.paid_at.strftime("%Y-%m-%d")
                if date_str in daily_stats:
                    daily_stats[date_str]["revenue"] += order.total_price
                    daily_stats[date_str]["order_count"] += 1

        # 格式化返回数据
        dates = sorted(daily_stats.keys())
        revenue = [round(daily_stats[d]["revenue"], 2) for d in dates]
        order_count = [daily_stats[d]["order_count"] for d in dates]

        return {
            "dates": dates,
            "revenue": revenue,
            "order_count": order_count,
            "total": round(sum(revenue), 2)
        }


@router.get("/stats/conversion")
async def get_conversion_stats(_: bool = Depends(verify_admin)):
    """
    获取订单转化漏斗数据

    Returns:
        {
            "stages": [
                {"name": "待支付", "count": 10, "rate": 100},
                {"name": "已支付", "count": 8, "rate": 80},
                {"name": "已接单", "count": 7, "rate": 70},
                {"name": "已出票", "count": 6, "rate": 60},
                {"name": "已完成", "count": 5, "rate": 50}
            ]
        }
    """
    async with await get_session() as session:
        # 统计各状态订单数
        statuses = ["pending", "paid", "accepted", "ticketed", "completed"]
        stage_names = ["待支付", "已支付", "已接单", "已出票", "已完成"]

        counts = []
        for status in statuses:
            result = await session.exec(
                select(Order).where(Order.status == status)
            )
            counts.append(len(result.all()))

        # 计算转化率（相对于待支付）
        base = counts[0] if counts[0] > 0 else 1
        stages = []
        for i, (name, count) in enumerate(zip(stage_names, counts)):
            rate = round((count / base) * 100, 1) if counts[0] > 0 else 0
            stages.append({
                "name": name,
                "count": count,
                "rate": rate
            })

        return {"stages": stages}


@router.get("/stats/cinema-ranking")
async def get_cinema_ranking(
    limit: int = Query(default=10, ge=1, le=50, description="返回数量"),
    _: bool = Depends(verify_admin)
):
    """
    获取影院订单排行（条形图）

    Returns:
        {
            "cinemas": ["万达影城", "CGV 影城", ...],
            "order_counts": [25, 20, ...],
            "revenues": [3000.5, 2500.0, ...]
        }
    """
    async with await get_session() as session:
        # 统计各影院订单数和营收
        cinema_stats: dict = {}

        result = await session.exec(select(Order))
        orders = result.all()

        for order in orders:
            cinema_name = order.cinema_name
            if cinema_name not in cinema_stats:
                cinema_stats[cinema_name] = {"order_count": 0, "revenue": 0.0}

            cinema_stats[cinema_name]["order_count"] += 1
            cinema_stats[cinema_name]["revenue"] += order.total_price

        # 按订单数排序
        sorted_cinemas = sorted(
            cinema_stats.items(),
            key=lambda x: x[1]["order_count"],
            reverse=True
        )[:limit]

        cinemas = [name for name, _ in sorted_cinemas]
        order_counts = [data["order_count"] for _, data in sorted_cinemas]
        revenues = [round(data["revenue"], 2) for _, data in sorted_cinemas]

        return {
            "cinemas": cinemas,
            "order_counts": order_counts,
            "revenues": revenues
        }


@router.get("/stats/hourly-orders")
async def get_hourly_orders(_: bool = Depends(verify_admin)):
    """
    获取 24 小时订单分布（热力图）

    Returns:
        {
            "hours": [0, 1, 2, ..., 23],
            "order_counts": [5, 3, 2, ..., 10],
            "heatmap_data": [[0, 5], [1, 3], [2, 2], ...]
        }
    """
    async with await get_session() as session:
        # 初始化 24 小时统计
        hourly_counts = [0] * 24

        result = await session.exec(select(Order))
        orders = result.all()

        # 统计各小时订单数
        for order in orders:
            # 优先使用 paid_at，如果没有则用 created_at
            order_time = order.paid_at or order.created_at
            if order_time:
                hour = order_time.hour
                hourly_counts[hour] += 1

        # 生成热力图数据 [[hour, count], ...]
        heatmap_data = [[hour, count] for hour, count in enumerate(hourly_counts)]

        return {
            "hours": list(range(24)),
            "order_counts": hourly_counts,
            "heatmap_data": heatmap_data
        }