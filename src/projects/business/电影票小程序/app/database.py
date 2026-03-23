# -*- coding: utf-8 -*-
"""
数据库模块
使用 SQLModel (SQLAlchemy) 实现异步数据库操作
支持 SQLite (开发) 和 PostgreSQL (生产)
"""
from datetime import datetime
from typing import Optional, List, Any
from sqlmodel import SQLModel, Field, Session, select
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine
from sqlalchemy import Column, Text
import asyncpg
import json

from app.config import settings


# ==================== 模型定义 ====================

class Cinema(SQLModel, table=True):
    """影院表"""
    __tablename__ = "cinemas"

    id: Optional[int] = Field(default=None, primary_key=True)
    code: str = Field(unique=True, index=True, description="影院代码 如 'jc', 'wanda'")
    name: str = Field(description="影院名称")
    maoyan_id: Optional[str] = Field(default=None, description="猫眼影院ID")

    # 推荐权重
    priority: int = Field(default=0, description="推荐优先级(越大越靠前)")
    tags: Optional[str] = Field(default=None, description="标签JSON 如['店长直供', '秒出票']")

    # 渠道信息
    manager_contact: Optional[str] = Field(default=None, description="经理联系方式")
    api_provider: Optional[str] = Field(default=None, description="API渠道商")

    # 状态
    is_active: bool = Field(default=True, description="是否启用")

    # 时间戳
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

    def get_tags(self) -> List[str]:
        """获取标签列表"""
        if self.tags:
            try:
                return json.loads(self.tags)
            except:
                return []
        return []

    def set_tags(self, tags: List[str]):
        """设置标签列表"""
        self.tags = json.dumps(tags, ensure_ascii=False)


class TicketChannel(SQLModel, table=True):
    """出票渠道表"""
    __tablename__ = "ticket_channels"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(description="渠道名称")
    type: str = Field(description="渠道类型: manager/api/self/other")
    description: Optional[str] = Field(default=None, description="渠道描述")
    is_active: bool = Field(default=True, description="是否启用")

    created_at: datetime = Field(default_factory=datetime.now)


class CodeWord(SQLModel, table=True):
    """暗号库表"""
    __tablename__ = "code_words"

    id: Optional[int] = Field(default=None, primary_key=True)
    word: str = Field(unique=True, description="暗号内容")
    type: str = Field(description="暗号类型: blessing/number/custom")
    is_active: bool = Field(default=True, description="是否启用")

    created_at: datetime = Field(default_factory=datetime.now)


class User(SQLModel, table=True):
    """用户表"""
    __tablename__ = "users"

    id: Optional[int] = Field(default=None, primary_key=True)
    openid: str = Field(unique=True, index=True, description="微信openid")
    nickname: Optional[str] = Field(default=None, description="昵称")
    phone: Optional[str] = Field(default=None, description="手机号")
    coupon_balance: float = Field(default=0.0, description="补偿券余额")

    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


class Order(SQLModel, table=True):
    """订单表"""
    __tablename__ = "orders"

    id: Optional[int] = Field(default=None, primary_key=True)
    order_no: str = Field(unique=True, index=True, description="订单号")
    user_id: int = Field(foreign_key="users.id", index=True, description="用户ID")

    # 影院场次信息
    cinema_id: Optional[int] = Field(default=None, foreign_key="cinemas.id", description="影院ID")
    cinema_name: str = Field(description="影院名称")
    cinema_code: str = Field(description="影院代码")
    movie_name: str = Field(description="电影名称")
    show_date: str = Field(description="放映日期 YYYY-MM-DD")
    show_time: str = Field(description="放映时间 HH:MM")
    hall_name: Optional[str] = Field(default=None, description="影厅名称")

    # 座位信息
    seat_count: int = Field(description="票数")
    seat_preference: Optional[str] = Field(default=None, description="座位偏好")
    seats: Optional[str] = Field(default=None, description="实际座位号")

    # 价格信息
    unit_price: float = Field(description="单价")
    total_price: float = Field(description="总价")

    # 状态
    status: str = Field(default="pending", description="订单状态: pending/paid/accepted/ticketed/completed/refunded/cancelled")

    # 出票信息
    ticket_channel_id: Optional[int] = Field(default=None, foreign_key="ticket_channels.id", description="出票渠道ID")
    ticket_code: Optional[str] = Field(default=None, description="票码")
    ticket_method: Optional[str] = Field(default=None, description="取票方式: qrcode/password/mixed")
    code_word: Optional[str] = Field(default=None, description="暗号")
    code_word_type: Optional[str] = Field(default=None, description="暗号类型")
    can_modify: bool = Field(default=False, description="是否可修改取票信息")
    modify_password: Optional[str] = Field(default=None, description="修改密码")

    # 支付信息
    transaction_id: Optional[str] = Field(default=None, description="微信支付交易号")
    paid_at: Optional[datetime] = Field(default=None, description="支付时间")

    # 退款信息
    refund_amount: Optional[float] = Field(default=None, description="退款金额")
    coupon_compensation: Optional[float] = Field(default=0.0, description="补偿券金额")
    refund_reason: Optional[str] = Field(default=None, description="退款原因")
    refunded_at: Optional[datetime] = Field(default=None, description="退款时间")

    # SLA
    expire_at: Optional[datetime] = Field(default=None, description="支付过期时间")
    accepted_at: Optional[datetime] = Field(default=None, description="接单时间")
    ticketed_at: Optional[datetime] = Field(default=None, description="出票时间")

    # 备注
    remark: Optional[str] = Field(default=None, description="用户备注")
    admin_note: Optional[str] = Field(default=None, description="管理员备注")

    # 时间戳
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


# Phase 4: 票码表 - 支持多二维码（可选功能，暂未实现）
# class TicketCode(SQLModel, table=True):
#     """票码表 - 支持多二维码"""
#     __tablename__ = "ticket_codes"
#
#     id: Optional[int] = Field(default=None, primary_key=True)
#     order_id: int = Field(foreign_key="orders.id", index=True, description="订单ID")
#     code_type: str = Field(default="qrcode", description="类型: qrcode/password/mixed")
#     code_value: Optional[str] = Field(default=None, description="二维码数据或取票号")
#     qr_image: Optional[str] = Field(default=None, description="二维码图片路径")
#     seat_info: Optional[str] = Field(default=None, description="对应座位")
#     is_primary: bool = Field(default=False, description="是否主码")
#     created_at: datetime = Field(default_factory=datetime.now)


class SystemConfig(SQLModel, table=True):
    """系统配置表"""
    __tablename__ = "system_configs"

    key: str = Field(primary_key=True, description="配置键")
    value: str = Field(description="配置值JSON")
    description: Optional[str] = Field(default=None, description="配置说明")

    updated_at: datetime = Field(default_factory=datetime.now)


class Announcement(SQLModel, table=True):
    """公告表"""
    __tablename__ = "announcements"

    id: Optional[int] = Field(default=None, primary_key=True)
    title: str = Field(description="公告标题")
    content: str = Field(description="公告内容")
    is_active: bool = Field(default=True, description="是否启用")
    popup: bool = Field(default=False, description="是否弹窗显示")

    start_at: Optional[datetime] = Field(default=None, description="开始时间")
    end_at: Optional[datetime] = Field(default=None, description="结束时间")

    created_at: datetime = Field(default_factory=datetime.now)


# ==================== 数据库引擎 ====================

# 异步引擎
engine: Optional[AsyncEngine] = None

# PostgreSQL 连接池
db_pool: Optional[asyncpg.Pool] = None


def is_postgresql() -> bool:
    """判断是否使用 PostgreSQL 数据库"""
    return settings.POSTGRES_HOST is not None


async def init_db():
    """初始化数据库"""
    global engine, db_pool

    if is_postgresql():
        # PostgreSQL 模式
        db_url = (
            f"postgresql+asyncpg://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}"
            f"@{settings.POSTGRES_HOST}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}"
        )
        engine = create_async_engine(db_url, echo=settings.DEBUG, future=True)

        # 创建连接池
        await init_pg_pool()

        # 创建表
        async with engine.begin() as conn:
            await conn.run_sync(SQLModel.metadata.create_all)
    else:
        # SQLite 模式 (开发)
        settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
        db_path = settings.DATA_DIR / "ticket.db"
        engine = create_async_engine(
            f"sqlite+aiosqlite:///{db_path}",
            echo=settings.DEBUG,
            future=True
        )

        # 创建表
        async with engine.begin() as conn:
            await conn.run_sync(SQLModel.metadata.create_all)

    # 初始化默认数据
    await init_default_data()


async def init_pg_pool():
    """初始化 PostgreSQL 连接池"""
    global db_pool

    if not is_postgresql():
        return

    db_pool = await asyncpg.create_pool(
        host=settings.POSTGRES_HOST,
        port=settings.POSTGRES_PORT,
        user=settings.POSTGRES_USER,
        password=settings.POSTGRES_PASSWORD,
        database=settings.POSTGRES_DB,
        min_size=5,
        max_size=20,
        command_timeout=60
    )


async def get_db_pool() -> Optional[asyncpg.Pool]:
    """获取 PostgreSQL 连接池"""
    return db_pool


async def execute(query: str, *args: Any) -> Any:
    """
    执行 SQL 查询（PostgreSQL 模式）

    Args:
        query: SQL 查询语句
        *args: 查询参数

    Returns:
        查询结果
    """
    if not db_pool:
        raise RuntimeError("Database pool not initialized")

    async with db_pool.acquire() as conn:
        return await conn.execute(query, *args)


async def fetch_one(query: str, *args: Any) -> Optional[asyncpg.Record]:
    """
    获取单条记录（PostgreSQL 模式）

    Args:
        query: SQL 查询语句
        *args: 查询参数

    Returns:
        单条记录或 None
    """
    if not db_pool:
        raise RuntimeError("Database pool not initialized")

    async with db_pool.acquire() as conn:
        return await conn.fetchrow(query, *args)


async def fetch_all(query: str, *args: Any) -> List[asyncpg.Record]:
    """
    获取多条记录（PostgreSQL 模式）

    Args:
        query: SQL 查询语句
        *args: 查询参数

    Returns:
        记录列表
    """
    if not db_pool:
        raise RuntimeError("Database pool not initialized")

    async with db_pool.acquire() as conn:
        return await conn.fetch(query, *args)


async def init_default_data():
    """初始化默认数据"""
    from app.config import settings

    async with AsyncSession(engine) as session:
        # 检查出票渠道
        result = await session.exec(select(TicketChannel))
        if not result.first():
            channels = [
                TicketChannel(name="联系影院经理", type="manager", description="一键复制话术发给微信"),
                TicketChannel(name="API渠道下单", type="api", description="麻花/聚视等API自动下单"),
                TicketChannel(name="自己找券", type="self", description="闲鱼/淘宝/羊毛群"),
                TicketChannel(name="其他渠道", type="other", description="自由备注"),
            ]
            for channel in channels:
                session.add(channel)
            await session.commit()

        # 检查暗号库
        result = await session.exec(select(CodeWord))
        if not result.first():
            blessings = ["财源广进", "平安喜乐", "万事如意", "恭喜发财", "大吉大利", "心想事成", "步步高升", "吉祥如意"]
            numbers = ["888", "666", "520", "168", "999", "518", "618", "886"]
            for word in blessings:
                session.add(CodeWord(word=word, type="blessing"))
            for word in numbers:
                session.add(CodeWord(word=word, type="number"))
            await session.commit()

        # 检查系统配置
        result = await session.exec(select(SystemConfig))
        if not result.first():
            configs = [
                SystemConfig(key="operation_status", value='"normal"', description="运营状态: normal/overload/closed"),
                SystemConfig(key="announcement", value='""', description="公告内容"),
            ]
            for config in configs:
                session.add(config)
            await session.commit()


async def get_session() -> AsyncSession:
    """获取数据库会话"""
    if engine is None:
        await init_db()
    return AsyncSession(engine)