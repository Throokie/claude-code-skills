# -*- coding: utf-8 -*-
"""
电影票销售系统 - FastAPI 主入口
"""
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse

from app.config import settings
from app.database import init_db
from app.middlewares.error_handler import ErrorHandlerMiddleware, register_error_handlers

# 配置日志
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 模板引擎
templates = Jinja2Templates(directory=str(settings.TEMPLATES_DIR))


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动时
    logger.info("正在初始化数据库...")
    await init_db()
    logger.info("数据库初始化完成")

    yield

    # 关闭时
    logger.info("应用关闭")


# 创建 FastAPI 应用
app = FastAPI(
    title=settings.APP_NAME,
    description="电影票销售小程序后端服务",
    version="1.0.0",
    lifespan=lifespan
)

# CORS 中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 错误处理中间件
app.add_middleware(ErrorHandlerMiddleware)

# 注册全局错误处理器
register_error_handlers(app)

# 挂载静态文件
if settings.STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(settings.STATIC_DIR)), name="static")


# ==================== 路由注册 ====================

from app.routes import schedule, order, admin, wechat, websocket, seat

# 用户端 API
app.include_router(schedule.router, prefix="/api/v1", tags=["排期"])
app.include_router(order.router, prefix="/api/v1", tags=["订单"])
app.include_router(wechat.router, prefix="/api/v1/wechat", tags=["微信"])
app.include_router(websocket.router, prefix="/api/v1", tags=["WebSocket"])
app.include_router(seat.router, prefix="/api/v1", tags=["座位截图"])

# 管理后台 API
app.include_router(admin.router, prefix="/api/v1/admin", tags=["管理后台"])


# ==================== 页面路由 ====================

@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    """首页"""
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/health")
async def health_check():
    """健康检查"""
    return {"status": "ok", "app": settings.APP_NAME}


# ==================== 管理后台页面 ====================

@app.get("/admin", response_class=HTMLResponse)
@app.get("/admin/orders", response_class=HTMLResponse)
async def admin_orders(request: Request):
    """管理后台 - 订单管理"""
    return templates.TemplateResponse("admin/orders.html", {"request": request})


@app.get("/admin/cinemas", response_class=HTMLResponse)
async def admin_cinemas(request: Request):
    """管理后台 - 影院管理"""
    return templates.TemplateResponse("admin/cinemas.html", {"request": request})


@app.get("/admin/channels", response_class=HTMLResponse)
async def admin_channels(request: Request):
    """管理后台 - 出票渠道"""
    return templates.TemplateResponse("admin/channels.html", {"request": request})


@app.get("/admin/code-words", response_class=HTMLResponse)
async def admin_code_words(request: Request):
    """管理后台 - 暗号管理"""
    return templates.TemplateResponse("admin/code-words.html", {"request": request})


@app.get("/admin/settings", response_class=HTMLResponse)
async def admin_settings(request: Request):
    """管理后台 - 系统设置"""
    return templates.TemplateResponse("admin/settings.html", {"request": request})


# ==================== 异常处理 ====================

from fastapi import HTTPException
from fastapi.responses import JSONResponse

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """HTTP 异常处理"""
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail}
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """通用异常处理"""
    logger.error(f"未处理的异常: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": "服务器内部错误"}
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8021,
        reload=settings.DEBUG
    )