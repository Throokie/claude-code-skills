# 电影票销售小程序 - 项目上下文手册

## 项目概述

这是一个将现有电影排期展示系统升级为完整电影票销售小程序的项目。

**核心理念**：这是一个"极度偏心、高度控场、懂人性的智能过滤器"，而非简单的买票软件。

## 关键路径

| 项目 | 路径 |
|------|------|
| 新项目（当前） | `/Users/yangaoran/files/电影票小程序/` |
| 老项目（参考） | `/Users/yangaoran/files/maoyan/` |

## 技术栈

### 后端
- **框架**: FastAPI >= 0.104.0
- **ORM**: SQLModel (SQLAlchemy + Pydantic)
- **数据库**: SQLite (异步 aiosqlite)
- **模板**: Jinja2
- **截图**: Playwright
- **解析**: lxml
- **HTTP**: httpx
- **调度**: APScheduler

### 前端
- **小程序**: 微信原生框架 + WeUI
- **管理后台**: Jinja2 + Bootstrap 5

## 开发规范

### 1. 使用 uv 管理 Python

```bash
# 安装依赖
uv venv
uv pip install -r requirements.txt
uv run playwright install chromium

# 运行项目
uv run python -m app.main
```

### 2. 数据库操作

使用 SQLModel 异步操作：

```python
from app.database import get_session, Order

async with get_session() as session:
    result = await session.exec(select(Order))
    orders = result.all()
```

### 3. 配置管理

配置通过 `app/config.py` 的 Settings 类管理，支持环境变量。

### 4. API 规范

- 用户端 API: `/api/v1/...`
- 管理后台 API: `/api/v1/admin/...`
- 响应格式: JSON

### 5. 订单状态流转

```
pending → paid → accepted → ticketed → completed
    ↓        ↓        ↓
cancelled  refunded  refunded
```

## 核心模块

### 数据模型 (app/database.py)
- Cinema - 影院表
- Order - 订单表
- User - 用户表
- TicketChannel - 出票渠道表
- CodeWord - 暗号库表
- SystemConfig - 系统配置表
- Announcement - 公告表

### 服务层 (app/services/)
- schedule_service.py - 排期服务
- order_service.py - 订单服务
- ticket_service.py - 出票服务（待实现）
- notify_service.py - 通知服务（待实现）

### 路由层 (app/routes/)
- schedule.py - 排期展示 API
- order.py - 用户订单 API
- admin.py - 管理后台 API
- wechat.py - 微信接口

## 业务规则

### 影院优先级
- priority 字段越大越靠前
- 标签系统：店长直供、今日特价、秒出票、外部调票

### 订单超时
- 待支付超时：30分钟
- 暗号降级：开场后2小时

### 补偿券
- 拒绝订单时可添加补偿券
- 用户 coupon_balance 字段记录余额

## 部署

### 开发环境
```bash
uv run python -m app.main
# 访问 http://127.0.0.1:8021
```

### 生产环境
```bash
uv run gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker
```

## 飞书推送配置

环境变量：
```bash
export FEISHU_APP_ID="your_app_id"
export FEISHU_APP_SECRET="your_secret"
export FEISHU_USER_ID="your_user_id"
```

## 注意事项

1. 所有新功能开发前必须查阅 REQUIREMENTS.md
2. 数据库模型修改需要更新 database.py
3. API 变更需要同步更新前端调用
4. 订单状态变更需要记录日志