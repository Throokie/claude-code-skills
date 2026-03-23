# 权限配置审计报告

**审计日期**: 2026-03-22
**审计范围**: sudoers 配置、systemd 服务、文件权限

---

## 执行摘要

本次审计发现了以下问题：
- 🔴 严重问题：3 个
- 🟡 中等问题：2 个
- ✅ 已修复：4 个

---

## 发现的问题

### 🔴 严重问题

#### 1. sudoers 配置重复

**位置**: `/etc/sudoers.d/claude-code`

**问题**:
```
# 6. install 命令（用于安全复制配置文件）
throokie ALL=(ALL) NOPASSWD: /usr/bin/install -o root -g root -m 644 /tmp/opensnitch*.json /etc/opensnitchd/*
```
这段配置出现了**两次**，可能导致混淆。

**状态**: ✅ 已修复 - 清理了重复配置

#### 2. 过度授权

**位置**: `/etc/sudoers.d/throokie`

**问题**:
```
throokie ALL=(ALL:ALL) NOPASSWD: ALL
```
用户已有完全 sudo 权限，其他 sudoers 配置是多余的（但保留作为审计追踪）。

**状态**: ⚠️ 保留现状 - 作为明确意图的文档

#### 3. clash-verge-service 配置不一致

**位置**: `/etc/systemd/system/clash-verge-service.service`

**问题**:
```ini
Group=throokie  # 指定了组
# 但没有指定 User，默认为 root
```
用户/组不匹配可能导致权限问题。

**状态**: ✅ 已修复 - 移除了错误的 Group 配置

---

### 🟡 中等问题

#### 4. 脚本执行权限缺失

**位置**: `~/bin/`

**问题**: 多个脚本缺少执行权限：
- `askpass`
- `bilibili-video-mcp-server`
- `browser`
- `browser-use`
- `browseruse`
- 等等...

**状态**: ✅ 已修复 - 添加了执行权限

#### 5. claude-code-ui 服务找不到

**位置**: 用户 systemd

**问题**: 系统服务已配置，但用户服务未找到
```
Unit claude-code-ui.service could not be found
```

**状态**: ⚠️ 待处理 - 需要确认是否需要此服务

---

## 已修复的问题

| 问题 | 修复操作 | 状态 |
|------|----------|------|
| sudoers 重复配置 | 清理 `/etc/sudoers.d/claude-code` | ✅ |
| clash-verge-service | 移除错误的 Group 配置 | ✅ |
| 脚本执行权限 | `chmod +x ~/bin/*` | ✅ |
| OpenSnitch 配置 | 简化为不修改配置文件 | ✅ |

---

## 权限配置总览

### sudoers 配置

```
/etc/sudoers.d/
├── claude-code      # Claude Code 相关脚本 ✅
├── claude-dev       # claude-dev 用户 ✅
├── openclaw         # openclaw 用户 ✅
├── opensnitch-dev-mode # OpenSnitch 开发模式 ✅
├── throokie         # throokie 用户 (NOPASSWD: ALL) ✅
└── timeout          # 超时配置 ✅
```

### systemd 服务

| 服务 | 用户 | 状态 | 备注 |
|------|------|------|------|
| openclaw.service | openclaw | ✅ | 独立用户，安全隔离 |
| clash-verge-service | root | ✅ | 已修复配置 |
| claude-code-ui | throokie | ⚠️ | 服务未找到 |
| adaptive-workflow-mcp | throokie | ⚠️ | 已启用但未运行 |

---

## 建议

### 立即执行

1. ✅ 已完成：清理 sudoers 重复配置
2. ✅ 已完成：修复脚本执行权限
3. ✅ 已完成：修复 clash-verge-service 配置

### 后续跟进

1. 确认 `claude-code-ui` 服务是否需要
2. 检查 `adaptive-workflow-mcp` 为什么未运行
3. 考虑为 `openclaw` 用户配置适当的 sudo 权限（如果需要）

---

## 安全评估

### 良好的实践

- ✅ `openclaw` 使用独立用户账户
- ✅ 服务配置包含安全选项（`NoNewPrivileges`, `PrivateTmp`）
- ✅ OpenSnitch 配置已简化，减少权限操作

### 潜在风险

- ⚠️ `throokie` 用户有完全 sudo 权限（可能是预期的）
- ⚠️ 部分服务以 root 身份运行（clash-verge-service）

---

**审计完成时间**: 2026-03-22 17:45
**审计工具**: bash, systemctl, sudo visudo -c
