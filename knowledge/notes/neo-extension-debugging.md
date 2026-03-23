# Neo Extension 修复记录 - Service Worker 保活机制

**日期**: 2026-03-15
**问题**: Neo 扩展服务 worker 频繁停止，需要手动重载
**状态**: ✅ 已修复

---

## 问题描述

用户反馈："这个插件特别容易中断服务。我经常要在插件中心点击重载服务"

**症状**：
- Neo 扩展需要频繁手动重载
- API 捕获间歇性失败
- 捕获请求时扩展服务 worker 已停止

---

## 根本原因

Manifest V3 Service Worker 设计机制：
- **无活动时 30 秒自动终止**
- 这是 Chrome 的设计，不是 bug
- 目的是节省资源

---

## 修复方案

添加 `chrome.alarms` 心跳机制，每 30 秒 ping 一次保持服务 worker 活跃。

### 1. 修改 manifest.json

```json
{
  "permissions": [
    "tabs",
    "alarms"  // 新增：需要此权限才能使用 alarms API
  ]
}
```

### 2. 添加保活代码 (background/index.ts)

```typescript
// ── Keep-Alive Mechanism ────────────────────────────────────────
// Manifest V3 Service Workers terminate after ~30s of inactivity
// Use chrome.alarms to keep the service worker alive

const HEARTBEAT_INTERVAL_MINUTES = 0.5; // 30 秒

// 创建闹钟（安装时）
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('neo-heartbeat', {
    periodInMinutes: HEARTBEAT_INTERVAL_MINUTES,
  });
  void hydrateCounts();
});

chrome.runtime.onStartup.addListener(() => {
  void hydrateCounts();
});

// 处理闹钟回调
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'neo-heartbeat') {
    // 执行最小操作保持服务 worker 活跃
    void db.capturedRequests.count().then((count) => {
      console.log(`[Neo] Heartbeat - ${count} captures in database`);
    });
  }
});

// 初始心跳
void (async () => {
  const count = await db.capturedRequests.count();
  console.log(`[Neo] Started - ${count} captures in database`);
})();
```

### 3. 重新构建扩展

```bash
cd ~/src/dev-projects/projects/neo/extension
npm run build
cp -r dist/* ~/.neo/extension/
```

---

## 验证结果

✅ 扩展持续运行，无需手动重载
✅ API 捕获正常
✅ 三平台测试通过（Gemini、Kimi、DeepSeek）

### 测试记录

| 平台 | 消息发送 | API 捕获 | 响应接收 |
|------|---------|---------|---------|
| Gemini | ✅ | ✅ | ✅ |
| Kimi | ✅ | ✅ | ✅ |
| DeepSeek | ✅ | ✅ | ✅ |

---

## 经验教训

### 1. Manifest V3 架构理解

- Service Worker 是**无状态的**，随时可能被终止
- 不能依赖内存状态持久化
- 必须使用 `chrome.storage` 或 IndexedDB
- 长任务需要特殊处理（如 alarms、keep-alive）

### 2. 调试技巧

```bash
# 查看扩展状态
neo status

# 查看扩展日志
# 打开 chrome://extensions → 点击 Service Worker → 查看控制台

# 手动触发心跳
# 在 Service Worker 控制台执行：
chrome.alarms.create('neo-heartbeat', {periodInMinutes: 0.5});
```

### 3. 未来改进

- 添加配置项调整心跳间隔
- 添加服务 worker 健康检查
- 捕获丢失时自动重新注入

---

## 相关文件

- `extension/src/manifest.json` - 添加 alarms 权限
- `extension/src/background/index.ts` - 心跳实现
- `~/.neo/extension/` - 构建输出目录

---

## 参考资源

- [Manifest V3 Service Worker 生命周期](https://developer.chrome.com/docs/extensions/mv3/service_workers/lifecycle/)
- [chrome.alarms API](https://developer.chrome.com/docs/extensions/reference/api/alarms)
- [Keeping your service worker alive](https://developer.chrome.com/docs/extensions/develop/migrate/mv3-updates#keep_service_worker_alive)

---

*修复完成时间：2026-03-15 | Neo v1.4.0*
