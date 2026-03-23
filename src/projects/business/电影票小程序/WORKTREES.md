# Worktree 开发计划 - 电影票小程序

**创建时间**: 2026-03-20
**项目**: 电影票小程序 (Movie Ticket Mini Program)
**目标**: 使用 Git Worktree 并行开发完成剩余 Phase 任务

---

## Worktree 之前 (pre-worktree)

在主仓库完成基础架构搭建。

**已完成**:
- [x] 数据库模型定义 (cinemas, orders, users, ticket_channels, code_words)
- [x] 基础路由框架 (schedule, order, admin, wechat)
- [x] 需求文档与 Phase 规划

**待完成**:
- [x] 阶段一核心功能 (基础架构)

---

## Worktree 1: auth-jwt

**任务描述**:
实现 JWT 认证模块与微信登录集成

**要求**:
- [ ] 创建 `app/auth/jwt.py` 模块
- [ ] 实现 `generate_access_token(user_id, secret, expires_minutes=30)`
- [ ] 实现 `generate_refresh_token(user_id, secret)`
- [ ] 实现 `decode_token(token, secret)`
- [ ] 实现 `verify_wechat_code(code, appid, secret)` 调用微信 jscode2session API
- [ ] 创建 `app/auth/__init__.py` 导出公共接口
- [ ] 编写完整单元测试覆盖所有函数
- [ ] 集成到 `app/routes/wechat.py` 登录接口

**分支名**: `feature/auth-jwt`

**预计完成**: 2026-03-21

---

## Worktree 2: payment-wechat

**任务描述**:
实现微信支付 v3 API 集成与退款功能

**要求**:
- [ ] 创建 `app/services/wechat_pay.py` 模块
- [ ] 实现 `create_order(out_trade_no, amount, description)`
- [ ] 实现 `query_order(out_trade_no)`
- [ ] 实现 `refund_order(out_trade_no, reason, amount)`
- [ ] 实现 `verify_callback_signature(body, signature)`
- [ ] 配置微信商户证书与密钥
- [ ] 编写 Mock 测试与沙箱验证
- [ ] 集成到订单支付/退款流程

**分支名**: `feature/payment-wechat`

**预计完成**: 2026-03-21

---

## Worktree 3: websocket-notify

**任务描述**:
实现 WebSocket 实时通知系统

**要求**:
- [ ] 创建 `app/websocket/manager.py` 连接管理器
- [ ] 实现 `connect(websocket)` 管理连接
- [ ] 实现 `disconnect(websocket)` 清理连接
- [ ] 实现 `broadcast_order_created(order)` 广播新订单
- [ ] 实现 `send_to_admin(message)` 发送给管理员
- [ ] 创建 `app/routes/websocket.py` 端点 `/ws/admin`
- [ ] 实现内存泄漏检测与自动清理
- [ ] 前端集成 WebSocket 客户端 (可选)

**分支名**: `feature/websocket-notify`

**预计完成**: 2026-03-21

---

## Worktree 4: error-handling

**任务描述**:
实现全局错误处理中间件与标准错误码

**要求**:
- [ ] 创建 `app/middlewares/error_handler.py`
- [ ] 定义 `BusinessError(code, message, detail)` 异常类
- [ ] 实现 `ErrorHandlerMiddleware` 中间件
- [ ] 定义标准错误码 (`app/utils/errors.py`):
  - 1001: 订单不存在
  - 1002: 订单已支付
  - 1003: 订单已过期
  - 2001: 支付失败
  - 2002: 退款失败
  - 3001: 微信 API 错误
- [ ] 统一错误响应格式 `{ error: { code, message, detail } }`
- [ ] 编写错误拦截测试

**分支名**: `feature/error-handling`

**预计完成**: 2026-03-21

---

## Worktree 合并后 (post-worktree)

**收尾工作**:
- [ ] 合并所有 worktree 到 main 分支
- [ ] 解决可能的合并冲突
- [ ] 运行完整集成测试
- [ ] 输出完成报告

**任务**:
- [ ] `throokie-ralph merge` - 合并所有 worktree
- [ ] `throokie-ralph clean` - 清理已合并的 worktree
- [ ] 最终测试验证

---

## 执行流程

```bash
# 1. 创建 worktree
throokie-ralph create

# 2. 打开多个 Claude 窗口，分别进入不同 worktree
# 窗口 1: cd .worktrees/auth-jwt && Claude Code
# 窗口 2: cd .worktrees/payment-wechat && Claude Code
# 窗口 3: cd .worktrees/websocket-notify && Claude Code
# 窗口 4: cd .worktrees/error-handling && Claude Code

# 3. 并行开发 (各窗口独立完成各自任务)

# 4. 合并
throokie-ralph merge

# 5. 清理
throokie-ralph clean
```

---

*文档版本：v1.0 | 最后更新：2026-03-20*
