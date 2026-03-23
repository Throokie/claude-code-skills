# PRD: tmux-web-term - Web 终端与 tmux 会话管理器

**ID**: prd-tmux-web-term-v7
**版本**: v7.0
**状态**: 🟡 开发中
**最后更新**: 2026-03-23

---

## 1. 文档信息

### 1.1 版本历史
| 版本 | 日期 | 作者 | 变更内容 |
|------|------|------|---------|
| v7.0 | 2026-03-23 | AI | 初始版本 - 基于 feature_evolution_records.md 整理 |

### 1.2 相关人员
| 角色 | 人员 | 职责 |
|------|------|------|
| 产品负责人 | throokie | 需求确认、最终验收 |
| 开发 | AI | 代码实现 |

---

## 2. 产品概述

### 2.1 产品背景
用户需要在外地通过内网穿透工具（Tailscale/ZeroTier/WireGuard）远程访问家中/公司服务器上运行在 tmux 里的 Claude Code 会话，实现电脑和手机同屏管理终端会话。

### 2.2 产品定位
**"Mobile-First 的 tmux 会话 Web 管理器"**

与竞品对比的核心差异化：
| 特性 | tmux-web-term | ttyd | gotty | wetty |
|------|--------------|------|-------|-------|
| tmux 会话管理 | ✅ | ❌ | ❌ | ❌ |
| 内网穿透支持 | ✅ | ❌ | ❌ | ❌ |
| 多设备同屏 | ✅ | ❌ | ❌ | ❌ |
| 会话录制 | ✅ | ❌ | ❌ | ❌ |
| 文件传输 (rz/sz) | ✅ | ❌ | ❌ | ❌ |
| PWA 移动端优化 | ✅ | ⚠️ | ⚠️ | ⚠️ |

### 2.3 目标用户
| 用户类型 | 特征 | 核心需求 |
|---------|------|---------|
| 远程开发者 | 需要异地访问开发环境 | 稳定连接、多设备同屏、会话录制 |
| 服务器管理员 | 管理多个终端会话 | tmux 管理、移动端适配、内网穿透 |
| AI 工具用户 | 在 tmux 中运行 Claude Code | 长时间稳定连接、会话不丢失 |

---

## 3. 功能需求

### 3.1 核心功能清单

| ID | 功能 | 优先级 | 状态 | 备注 |
|----|------|--------|------|------|
| F-001 | WebSocket 终端连接 | P0 | ✅ 已完成 | PTY/tmux 双模式 |
| F-002 | **tmux 会话管理** | P0 | ✅ 已完成 | 多设备同屏 |
| F-003 | 模式回退策略 | P0 | ✅ 已实现 | 失败时降级到 PTY |
| F-004 | Token 认证 + IP 白名单 | P0 | ✅ 已完成 | 多 Token 支持 |
| F-005 | WSS 加密 | P0 | ✅ 已完成 | 可选强制模式 |
| F-006 | 内网穿透支持 | P1 | ✅ 已完成 | Tailscale/ZeroTier/WireGuard |
| F-007 | asciinema 会话录制 | P1 | ✅ 已完成 | v7 新增 |
| F-008 | lrzsz 文件传输 | P1 | ✅ 已完成 | v7 新增 |
| F-009 | PWA 离线缓存 | P1 | ✅ 已完成 | v7 新增 |
| F-010 | 指数退避重连 | P1 | ✅ 已完成 | 移动端弱网优化 |
| F-011 | Docker 一键部署 | P2 | ✅ 已完成 | v7 新增 |
| F-012 | Playwright E2E 测试 | P2 | 🔍 规划中 | 真人测试 |

---

### 3.2 详细功能描述

#### F-002: tmux 会话管理

**用户故事**: 作为远程开发者，我想要通过 Web 浏览器管理服务器上的 tmux 会话，以便随时随地访问我的开发环境。

**验收标准**:
- [x] 支持创建新的 tmux 会话
- [x] 支持连接现有 tmux 会话
- [x] **支持多设备同时连接同一会话（同屏）**
- [x] 支持在 Web 端切换 tmux 会话
- [x] 支持显示当前在线设备数量

**输入/输出**:
- 输入: 会话名称（可选，默认 ws1）
- 输出: 会话连接成功/失败状态、会话列表

**边界情况**:
| 场景 | 期望行为 | 实际状态 |
|------|---------|---------|
| 会话 ws1 不存在 | 自动创建 | ✅ 已实现 |
| 创建失败（权限/路径问题） | **降级到 PTY 模式** | 🚧 **Bug: 无降级逻辑** |
| 多设备连接同一会话 | 所有设备同步显示 | ✅ 已实现（-d 参数已移除） |
| 会话切换时 | 平滑过渡，不丢失状态 | 🚧 **Bug: 状态混乱** |

**已知 Bug 列表**:
1. **Bug-001**: 会话创建失败无 fallback → 应降级到 PTY 模式
2. **Bug-002**: 会话切换时状态混乱 → 旧连接误杀新会话
3. **Bug-003**: 前端 currentSession 状态漂移 → URL 参数与 localStorage 不同步

---

#### F-003: 模式回退策略 ⭐ 关键需求

**用户故事**: 作为用户，当 tmux 会话无法创建时，我希望系统自动回退到基础 PTY 模式，而不是直接报错断开。

**验收标准**:
- [ ] 配置 `mode: "tmux"` 时优先尝试 tmux 模式
- [ ] tmux 会话创建失败时，**自动降级到 PTY 模式**
- [ ] 降级时前端显示提示："PTY 模式（tmux 不可用）"
- [ ] 前端显示当前模式图标（tmux/pty）

**回退策略流程**:
```
用户连接
    ↓
配置 mode = "tmux"?
    ├── 是 → 尝试 tmux 模式
    │           ↓
    │       会话 ws1 存在?
    │           ├── 是 → 直接连接
    │           └── 否 → 尝试创建 ws1
    │                       ↓
    │                   创建成功?
    │                       ├── 是 → 连接并显示 "tmux 模式"
    │                       └── 否 → **降级到 PTY 模式**
    │                                   ↓
    │                               显示 "PTY 模式（tmux 不可用）"
    │
    └── 否 → 直接使用 PTY 模式
                ↓
            显示 "PTY 模式"
```

**失败原因与处理**:
| 失败原因 | 降级行为 | 前端提示 |
|---------|---------|---------|
| tmux 未安装 | 降级 PTY | "PTY 模式（tmux 未安装）" |
| 权限不足 | 降级 PTY | "PTY 模式（权限不足）" |
| 会话名冲突 | 尝试备用名称 | "使用会话 ws1_1234" |

---

### 3.3 前端状态显示需求

**会话状态指示器**:
```
┌─────────────────────────────────────┐
│ 🔵 tmux 模式  |  ws1  |  👥 2 在线  │
└─────────────────────────────────────┘
```

| 图标 | 含义 |
|------|------|
| 🔵 | tmux 模式 |
| 🟢 | PTY 模式 |
| ⚠️ | 降级模式（tmux 失败） |

---

## 4. 技术方案

### 4.1 技术栈
| 层级 | 技术 | 说明 |
|------|------|------|
| 后端 | Python 3.11 + websockets | WebSocket 服务 |
| 前端 | Vanilla JS + xterm.js | 终端模拟器 |
| 协议 | WebSocket (ws/wss) | 实时通信 |
| 录制 | asciinema | 终端录制 |
| 传输 | lrzsz + zmodem.js | 文件传输 |

### 4.2 关键数据结构

**PTY 会话状态**:
```python
pty_sessions[websocket] = {
    'fd': master_fd,           # PTY master 文件描述符
    'pid': pid,                # 进程 ID
    'mode': 'tmux' | 'pty',    # 当前模式
    'session': session_name,   # tmux 会话名
    'id': session_id,          # 唯一标识
    'target_session': str,     # 切换目标会话（临时状态）
}
```

---

## 5. Bug 修复记录

### Bug-001: 会话创建失败无 fallback

**问题描述**: `ensure_tmux_session()` 失败时返回 `(False, name)`，但 `handle_tmux_mode()` 直接返回错误，没有降级到 PTY 模式。

**代码位置**: `server.py:745-751`

**修复方案**:
```python
# 修复前
session_created, actual_session_name = ensure_tmux_session(session_name)
if not session_created:
    await websocket.send(json.dumps({
        "type": "error",
        "message": f"无法创建 tmux 会话：{session_name}"
    }))
    return

# 修复后
session_created, actual_session_name = ensure_tmux_session(session_name)
if not session_created:
    # 降级到 PTY 模式
    print(f"[tmux] 会话创建失败，降级到 PTY 模式")
    await websocket.send(json.dumps({
        "type": "mode_fallback",
        "message": "tmux 不可用，已切换到 PTY 模式"
    }))
    return await handle_pty_mode(websocket)
```

**测试用例**:
1. 停止 tmux 服务，验证是否降级到 PTY
2. 验证前端显示 "PTY 模式（tmux 不可用）"

---

### Bug-002: 会话切换状态混乱

**问题描述**: 切换会话时设置 `target_session`，但 WebSocket 断开时直接杀掉旧会话 PTY，新会话可能被误杀。

**代码位置**: `server.py:873-899`

**修复方案**:
- 延迟断开旧连接
- 确保新会话稳定后再清理旧资源
- 添加会话切换状态锁

---

### Bug-003: 前端 currentSession 状态漂移

**问题描述**: `currentSession` 只从 `init` 消息更新一次，刷新页面时 URL 参数 session 与 localStorage 可能不同步。

**修复方案**:
- 优先从 URL 参数读取 session
- 其次从 localStorage 读取
- 最后使用默认值

---

## 6. 项目规划

### 6.1 里程碑

| 阶段 | 功能 | 状态 |
|------|------|------|
| v6 | 内网穿透、Token 认证、指数退避 | ✅ 已完成 |
| v7 | 录制、文件传输、PWA、Docker | ✅ 已完成 |
| v7.1 | **Bug 修复：模式回退、会话切换** | 🚧 进行中 |
| v7.2 | Playwright E2E 测试 | 🔍 规划中 |

---

## 7. 附录

### 7.1 配置文件示例

```json
{
  "mode": "tmux",           // 首选模式：tmux 或 pty
  "default_session": "ws1", // 默认会话名
  "fallback_to_pty": true,  // 是否允许降级到 PTY

  "access_tokens": ["token1"],
  "ip_whitelist": [],
  "wss_required": false
}
```

### 7.2 术语表

| 术语 | 定义 |
|------|------|
| PTY | 伪终端 (Pseudo Terminal)，基础终端模式 |
| tmux | 终端多路复用器，支持会话持久化 |
| 同屏 | 多个设备同时连接同一 tmux 会话，显示同步 |
| 降级 | 从 tmux 模式自动切换到 PTY 模式 |
