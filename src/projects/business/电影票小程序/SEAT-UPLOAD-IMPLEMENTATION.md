# 座位截图上传功能 - 开发完成报告

## 功能概述

实现了基于 AI 视觉识别的座位截图上传功能，用户可以在猫眼/淘票票小程序选座后截图上传，系统自动解析座位信息并创建订单。

## 业务流程

```
1. 用户在影院详情页选择电影和场次
           ↓
2. 跳转到「上传座位」页面
           ↓
3. 点击「跳转猫眼选座」到第三方小程序选座
           ↓
4. 选座完成后截图并上传
           ↓
5. AI 自动分析截图，提取座位信息
           ↓
6. 用户确认 AI 识别结果
           ↓
7. 创建订单并跳转到订单列表
```

## 已完成功能

### 1. 后端 API

#### 1.1 座位分析服务
**文件**: `app/services/seat_analyzer.py`

```python
class SeatAnalyzer:
    async def analyze_seat_image(self, image_path: str) -> Optional[Dict[str, Any]]:
        """分析座位截图，提取座位信息"""
```

**功能**:
- 使用 Qwen-VL 多模态 API 分析座位截图
- 提取影院名称、电影名称、场次时间
- 识别座位标签（如"5 排 05 座"）
- 计算总价

**AI 提示词**:
```
请分析这张电影票选座截图，提取以下信息：
1. 影院名称 (cinema_name)
2. 电影名称 (movie_name)
3. 放映日期 (show_date)
4. 放映时间 (show_time)
5. 影厅名称 (hall, 可选)
6. 座位列表，每个座位包含：行号、列号、价格、座位标签
7. 总价

请返回 JSON 格式。
```

#### 1.2 座位路由
**文件**: `app/routes/seat.py`

**API 端点**:

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/v1/upload-seat-image` | POST | 上传座位截图进行 AI 分析 |
| `/api/v1/confirm-seat-order` | POST | 确认 AI 解析结果并创建订单 |

**上传座位截图响应**:
```json
{
  "success": true,
  "image_id": "uuid-string",
  "analysis": {
    "cinema_name": "万达影城",
    "movie_name": "电影名",
    "show_date": "2026-03-21",
    "show_time": "19:30",
    "hall": "IMAX 厅",
    "seats": [
      {"row": 5, "col": 5, "price": 33.0, "label": "5 排 05 座"}
    ],
    "total_price": 99.0,
    "seat_labels": ["5 排 05 座", "5 排 06 座"]
  }
}
```

**核心特性**:
- 临时存储 AI 分析结果（5 分钟 TTL）
- 自动清理过期缓存
- 验证图片文件类型
- 错误处理和日志记录

### 2. 前端页面

#### 2.1 上传座位页
**文件**: `miniapp/src/pages/upload-seat/index.tsx`

**页面结构**:
1. **电影信息卡片** - 展示当前选择的电影、影院、场次
2. **步骤 1: 跳转选座** - 按钮跳转到猫眼/淘票票小程序
3. **步骤 2: 截图上传** - 选择图片并上传到 AI 分析
4. **步骤 3: 确认订单** - 展示 AI 识别结果，用户确认后创建订单

**核心功能**:
```typescript
// 选择并上传图片
const chooseAndUpload = async () => {
  const res = await Taro.chooseImage({
    count: 1,
    sourceType: ['album', 'camera']
  })

  const uploadTask = Taro.uploadFile({
    url: `${API_BASE}/upload-seat-image`,
    filePath: tempFilePath,
    name: 'image'
  })
}

// 确认订单
const confirmOrder = async () => {
  const res = await Taro.request({
    url: `${API_BASE}/confirm-seat-order`,
    method: 'POST',
    data: {
      image_id: imageId,
      cinema_code: router.cinemaCode,
      cinema_name: router.cinemaName,
      movie_name: decodeURIComponent(router.movie),
      show_date: router.showDate,
      show_time: router.showTime,
      seat_preference: '不限'
    }
  })
}
```

#### 2.2 样式文件
**文件**: `miniapp/src/pages/upload-seat/index.scss`

**设计特点**:
- 渐变紫色主题色
- 圆角卡片布局
- 步骤编号图标
- 响应式按钮样式

#### 2.3 影院详情页更新
**文件**: `miniapp/src/pages/cinema/index.tsx`

**变更**:
```typescript
// 从跳转订单页改为跳转上传座位页
const goToUpload = (movie, show) => {
  Taro.navigateTo({
    url: `/pages/upload-seat/index?cinemaCode=${code}&...`
  })
}
```

### 3. 应用集成

**文件**: `app/main.py`

**路由注册**:
```python
from app.routes import seat
app.include_router(seat.router, prefix="/api/v1", tags=["座位截图"])
```

## 技术实现细节

### AI 分析流程

```python
# 1. 接收上传的图片
content = await image.read()

# 2. 保存临时文件
image_path = temp_dir / f"{image_id}.jpg"

# 3. 调用 Qwen-VL API
image_base64 = base64.b64encode(content).decode()
response = await dashscope.MultiModalConversation.acall(
    model='qwen-vl-max-0809',
    messages=[{
        "role": "user",
        "content": [
            {"image": f"data:image/jpeg;base64,{image_base64}"},
            {"text": PROMPT}
        ]
    }]
)

# 4. 解析 AI 返回的 JSON
result = json.loads(ai_response_text)

# 5. 缓存结果（5 分钟过期）
_analysis_cache[image_id] = {
    "analysis": result,
    "expires_at": datetime.now() + timedelta(seconds=300)
}
```

### 缓存管理

```python
# 内存缓存结构
_analysis_cache: Dict[str, Dict[str, Any]] = {}

# 清理过期缓存
async def cleanup_expired_cache():
    now = datetime.now()
    expired_keys = [
        k for k, v in _analysis_cache.items()
        if v.get("expires_at") and v["expires_at"] < now
    ]
    for k in expired_keys:
        del _analysis_cache[k]
```

### 订单创建集成

```python
# 从缓存获取 AI 分析结果
cached_data = _analysis_cache[request.image_id]
analysis = cached_data["analysis"]

# 调用订单服务创建订单
order = await order_service.create_order(
    session=session,
    user_id=1,  # TODO: 从 JWT 获取
    cinema_code=request.cinema_code,
    cinema_name=request.cinema_name,
    movie_name=request.movie_name or analysis["movie_name"],
    show_date=request.show_date or analysis["show_date"],
    show_time=request.show_time or analysis["show_time"],
    seat_count=len(analysis["seats"]),
    unit_price=analysis["total_price"] / len(analysis["seats"]),
    seat_preference=request.seat_preference,
    hall_name=request.hall_name or analysis["hall"]
)

# 保存座位信息
order.seats = ", ".join(analysis["seat_labels"])
await session.commit()
```

## API 测试

### 测试命令

```bash
# 1. 启动后端服务
.venv/bin/python -m app.main

# 2. 测试影院列表 API
curl -s http://127.0.0.1:8021/api/v1/cinemas

# 3. 测试座位上传 API（需要真实图片）
curl -X POST http://127.0.0.1:8021/api/v1/upload-seat-image \
  -F "image=@test_seat.jpg"

# 4. 测试订单确认 API
curl -X POST http://127.0.0.1:8021/api/v1/confirm-seat-order \
  -H "Content-Type: application/json" \
  -d '{
    "image_id": "xxx",
    "cinema_code": "jc",
    "cinema_name": "晋城万达影城",
    "movie_name": "测试电影",
    "show_date": "2026-03-21",
    "show_time": "19:30"
  }'
```

### 预期响应

**影院列表**:
```json
[
  {"code":"jc","name":"晋城万达影城","has_data":true},
  {"code":"wanda","name":"万达广场 IMAX 店","has_data":true},
  {"code":"datum","name":"大润发影院","has_data":true}
]
```

**上传成功**:
```json
{
  "success": true,
  "image_id": "550e8400-e29b-41d4-a716-446655440000",
  "analysis": {
    "cinema_name": "万达影城",
    "movie_name": "热辣滚烫",
    "show_date": "2026-03-21",
    "show_time": "19:30",
    "hall": "IMAX 厅",
    "seats": [
      {"row": 5, "col": 5, "price": 33.0, "label": "5 排 05 座"}
    ],
    "total_price": 99.0,
    "seat_labels": ["5 排 05 座", "5 排 06 座"]
  }
}
```

## 下一步工作

### 1. 待实现功能

- [ ] **JWT 用户认证**: 从 token 中获取真实用户 ID
- [ ] **跳转猫眼小程序**: 实现微信小程序跳转逻辑
- [ ] **订单状态推送**: WebSocket 实时通知订单状态变更
- [ ] **历史订单**: 用户订单列表页集成新订单
- [ ] **错误重试**: 上传失败后的重试机制

### 2. 优化建议

- [ ] **Redis 缓存**: 生产环境使用 Redis 替代内存缓存
- [ ] **图片压缩**: 上传前压缩图片减少流量
- [ ] **CDN 加速**: 使用 CDN 存储临时图片
- [ ] **限流保护**: 防止恶意上传攻击
- [ ] **日志审计**: 记录所有 AI 分析请求和结果

### 3. 测试计划

- [ ] 使用真实座位截图测试 AI 识别准确率
- [ ] 测试不同光线、角度、分辨率的截图
- [ ] 压力测试：并发上传场景
- [ ] 端到端测试：完整用户流程

## 文件清单

### 新增文件
- `app/services/seat_analyzer.py` - AI 座位分析服务
- `app/routes/seat.py` - 座位上传 API 路由
- `miniapp/src/pages/upload-seat/index.tsx` - 上传座位页面
- `miniapp/src/pages/upload-seat/index.scss` - 上传座位样式
- `test_seat_upload.py` - API 测试脚本

### 修改文件
- `app/main.py` - 注册座位路由
- `miniapp/src/pages/cinema/index.tsx` - 更新导航逻辑
- `miniapp-preview.html` - 更新预览页面流程

## 依赖项

### Python 依赖
```
dashscope>=1.14.0  # Qwen-VL API
aiohttp>=3.9.0     # 异步 HTTP 客户端
```

### 前端依赖
已在 `package.json` 中配置

## 环境变量

需要在 `.env` 或环境变量中配置：

```bash
# AI API 配置
export DASHSCOPE_API_KEY="sk-xxx"

# 应用配置
export DEBUG=true
export ORDER_EXPIRE_MINUTES=30
```

## 总结

座位截图上传功能已完整实现，包括：
- ✅ 后端 AI 分析服务
- ✅ 文件上传和缓存管理
- ✅ 订单创建集成
- ✅ 前端上传页面
- ✅ 用户确认流程

下一步需要进行真实截图测试和端到端联调。

---

**开发时间**: 2026-03-21
**开发者**: AI Assistant
**状态**: 开发完成，待测试
