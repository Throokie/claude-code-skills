# -*- coding: utf-8 -*-
"""
应用配置模块
"""
import os
from pathlib import Path
from typing import Optional
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """应用配置"""
    # 基础配置
    APP_NAME: str = "电影票销售系统"
    DEBUG: bool = True
    SECRET_KEY: str = "your-secret-key-change-in-production"

    # 数据库配置
    DATABASE_URL: str = "sqlite+aiosqlite:///./data/ticket.db"

    # PostgreSQL 配置（生产环境使用）
    POSTGRES_HOST: Optional[str] = None
    POSTGRES_PORT: Optional[int] = 5432
    POSTGRES_USER: Optional[str] = None
    POSTGRES_PASSWORD: Optional[str] = None
    POSTGRES_DB: Optional[str] = None

    # Redis 配置（订单超时处理）
    REDIS_HOST: Optional[str] = None
    REDIS_PORT: Optional[int] = 6379
    REDIS_DB: Optional[int] = 0
    REDIS_PASSWORD: Optional[str] = None

    # 微信支付 v3 配置
    WECHAT_PAY_APPID: Optional[str] = None
    WECHAT_PAY_MCHID: Optional[str] = None
    WECHAT_PAY_API_V3_KEY: Optional[str] = None
    WECHAT_PAY_PRIVATE_KEY_PATH: Optional[str] = None
    WECHAT_PAY_CERT_SERIAL_NO: Optional[str] = None

    # 微信小程序配置
    WECHAT_APPID: str = ""
    WECHAT_SECRET: str = ""
    WECHAT_MCH_ID: str = ""  # 商户号
    WECHAT_API_KEY: str = ""  # API密钥

    # 飞书配置（通知）
    FEISHU_APP_ID: Optional[str] = None
    FEISHU_APP_SECRET: Optional[str] = None
    FEISHU_USER_ID: Optional[str] = None

    # 管理员配置
    ADMIN_TOKEN: str = "admin888"

    # 业务配置
    ORDER_EXPIRE_MINUTES: int = 30  # 订单支付超时（分钟）
    TICKET_EXPIRE_HOURS: int = 2  # 暗号降级时间（开场后小时数）

    # 文件路径
    BASE_DIR: Path = Path(__file__).parent.parent
    DATA_DIR: Path = BASE_DIR / "data"
    STATIC_DIR: Path = BASE_DIR / "static"
    TEMPLATES_DIR: Path = BASE_DIR / "templates"

    # 排期数据（来自 maoyan 项目）
    MAOYAN_DIR: Path = BASE_DIR / "maoyan"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # 确保目录存在
        self.DATA_DIR.mkdir(parents=True, exist_ok=True)
        self.STATIC_DIR.mkdir(parents=True, exist_ok=True)
        self.TEMPLATES_DIR.mkdir(parents=True, exist_ok=True)


@lru_cache()
def get_settings() -> Settings:
    """获取配置单例"""
    return Settings()


# 便捷访问
settings = get_settings()