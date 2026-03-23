# -*- coding: utf-8 -*-
"""
座位截图上传 API
"""
import base64
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import asyncio

from app.services.seat_analyzer import seat_analyzer
from app.database import get_session
from sqlmodel import select

router = APIRouter()

# 临时存储 AI 分析结果（生产环境应该用 Redis）
# key: image_id, value: {"analysis": {...}, "expires_at": datetime}
_analysis_cache: Dict[str, Dict[str, Any]] = {}
_CACHE_TTL_SECONDS = 300  # 5 分钟超时


async def cleanup_expired_cache():
    """清理过期的缓存"""
    now = datetime.now()
    expired_keys = [
        k for k, v in _analysis_cache.items()
        if v.get("expires_at") and v["expires_at"] < now
    ]
    for k in expired_keys:
        del _analysis_cache[k]


class SeatAnalysisResult(BaseModel):
    """座位分析结果"""
    cinema_name: str
    movie_name: str
    show_date: str
    show_time: str
    hall: Optional[str] = None
    seats: List[dict]
    total_price: float
    seat_labels: List[str]


class UploadSeatImageResponse(BaseModel):
    """上传座位截图响应"""
    success: bool
    image_id: str
    analysis: Optional[SeatAnalysisResult] = None
    message: str = ""


@router.post("/upload-seat-image", response_model=UploadSeatImageResponse)
async def upload_seat_image(
    image: UploadFile = File(..., description="座位截图")
):
    """
    上传猫眼/淘票票选座截图，AI 自动解析座位信息

    返回解析结果用于确认订单
    """
    # 验证文件类型
    if not image.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="请上传图片文件")

    # 保存临时文件
    temp_dir = Path("/tmp/seat-images")
    temp_dir.mkdir(parents=True, exist_ok=True)

    image_id = str(uuid.uuid4())
    image_path = temp_dir / f"{image_id}.jpg"

    try:
        # 读取并保存图片
        content = await image.read()
        with open(image_path, 'wb') as f:
            f.write(content)

        # AI 分析座位
        result = await seat_analyzer.analyze_seat_image(str(image_path))

        if not result:
            # 清理临时文件
            image_path.unlink(missing_ok=True)
            return UploadSeatImageResponse(
                success=False,
                image_id=image_id,
                message="未能识别座位信息，请确保截图清晰完整"
            )

        # 缓存分析结果
        _analysis_cache[image_id] = {
            "analysis": result,
            "expires_at": datetime.now() + timedelta(seconds=_CACHE_TTL_SECONDS)
        }

        # 清理临时文件
        image_path.unlink(missing_ok=True)

        return UploadSeatImageResponse(
            success=True,
            image_id=image_id,
            analysis=SeatAnalysisResult(**result)
        )

    except Exception as e:
        # 清理临时文件
        image_path.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail=f"分析失败：{str(e)}")


class ConfirmSeatOrderRequest(BaseModel):
    """确认选座订单请求"""
    image_id: str
    cinema_code: str
    cinema_name: str
    movie_name: str
    show_date: str
    show_time: str
    seat_preference: Optional[str] = None  # 座位偏好
    hall_name: Optional[str] = None
    remark: Optional[str] = None


class ConfirmSeatOrderResponse(BaseModel):
    """确认选座订单响应"""
    success: bool
    order_no: str
    seats: List[str]
    total_price: float
    status: str


@router.post("/confirm-seat-order", response_model=ConfirmSeatOrderResponse)
async def confirm_seat_order(request: ConfirmSeatOrderRequest):
    """
    确认 AI 解析的座位信息并创建订单
    """
    # 清理过期缓存
    await cleanup_expired_cache()

    # 从缓存中获取 AI 分析结果
    if request.image_id not in _analysis_cache:
        raise HTTPException(status_code=400, detail="分析结果已过期，请重新上传截图")

    cached_data = _analysis_cache[request.image_id]
    analysis = cached_data["analysis"]

    # 验证分析结果
    if not analysis or not analysis.get("seats"):
        raise HTTPException(status_code=400, detail="无效的座位分析结果")

    # 从 app.services.order_service 导入
    from app.services.order_service import order_service

    async with await get_session() as session:
        # 创建订单
        order = await order_service.create_order(
            session=session,
            user_id=1,  # TODO: 从 JWT token 中获取实际用户 ID
            cinema_code=request.cinema_code,
            cinema_name=request.cinema_name,
            movie_name=request.movie_name or analysis.get("movie_name", "未知电影"),
            show_date=request.show_date or analysis.get("show_date", ""),
            show_time=request.show_time or analysis.get("show_time", ""),
            seat_count=len(analysis["seats"]),
            unit_price=analysis.get("total_price", 0) / len(analysis["seats"]) if analysis.get("seats") else 0,
            seat_preference=request.seat_preference,
            hall_name=request.hall_name or analysis.get("hall"),
            remark=request.remark
        )

        # 保存座位信息到订单
        seat_labels = analysis.get("seat_labels", [])
        order.seats = ", ".join(seat_labels)
        await session.commit()

        # 从缓存中移除
        del _analysis_cache[request.image_id]

        return ConfirmSeatOrderResponse(
            success=True,
            order_no=order.order_no,
            seats=seat_labels,
            total_price=order.total_price,
            status=order.status
        )
