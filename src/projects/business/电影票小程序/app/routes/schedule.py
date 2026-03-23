# -*- coding: utf-8 -*-
"""
排期展示 API
"""
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel

from app.services.schedule_service import schedule_service

router = APIRouter()


class CinemaResponse(BaseModel):
    """影院响应"""
    code: str
    name: str
    has_data: bool
    priority: int
    tags: List[str] = []


class MovieResponse(BaseModel):
    """电影响应"""
    name: str
    info: Optional[str] = None
    shows: List[dict]
    cinema_code: str


class ScheduleResponse(BaseModel):
    """排期响应"""
    cinema_code: str
    date: str
    date_label: str
    movies: List[MovieResponse]
    price_text: str
    update_time: str


@router.get("/cinemas", response_model=List[CinemaResponse])
async def get_cinemas():
    """
    获取影院列表（按优先级排序）

    返回所有影院，按 priority 降序排列
    """
    cinemas = schedule_service.get_all_cinemas()

    # 按优先级排序
    cinemas.sort(key=lambda x: x.get("priority", 0), reverse=True)

    return [
        CinemaResponse(
            code=c["code"],
            name=c["name"],
            has_data=c.get("has_data", False),
            priority=c.get("priority", 0),
            tags=c.get("tags", [])
        )
        for c in cinemas
    ]


@router.get("/cinemas/{cinema_code}/schedules", response_model=ScheduleResponse)
async def get_cinema_schedules(
    cinema_code: str,
    date: str = Query("today", description="日期: today/tomorrow/YYYY-MM-DD")
):
    """
    获取影院排期

    - cinema_code: 影院代码（如 jc, wanda）
    - date: 日期（today/tomorrow/具体日期）
    """
    schedules = schedule_service.get_cinema_schedules(cinema_code, date)

    if not schedules["movies"]:
        # 尝试返回空数据而不是报错
        pass

    return ScheduleResponse(**schedules)


@router.get("/schedules/today")
async def get_today_schedules():
    """
    获取今日所有影院排期概览
    """
    cinemas = schedule_service.get_all_cinemas()
    result = []

    for cinema in cinemas:
        if cinema.get("has_data"):
            schedules = schedule_service.get_cinema_schedules(cinema["code"], "today")
            result.append({
                "cinema_code": cinema["code"],
                "cinema_name": cinema["name"],
                "movie_count": len(schedules.get("movies", [])),
                "price_text": schedules.get("price_text", "")
            })

    return {
        "date": datetime.now().strftime("%Y-%m-%d"),
        "date_label": f"今天 {datetime.now().month}月{datetime.now().day}日",
        "cinemas": result
    }