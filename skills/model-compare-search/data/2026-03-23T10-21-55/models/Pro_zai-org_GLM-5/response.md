# Pro/zai-org/GLM-5

## 元数据

- **耗时**: 78213ms
- **Tokens**: 3447
- **尝试次数**: 1

---

## 响应

在开发 WebSocket 应用时，实现一个健壮的自动重连机制至关重要。以下是结合**指数退避算法**与**用户认证失败处理**的最佳实践方案。

---

### 核心架构设计

一个成熟的 WebSocket 客户端通常包含以下状态管理：
1.  **连接中**
2.  **已连接**
3.  **正在重连**
4.  **认证失败/永久断开**

---

### 一、 指数退避算法

**为什么需要它？**
如果服务器宕机或网络抖动，客户端如果以固定频率（如每秒 1 次）疯狂重连，会导致“惊群效应”，加剧服务器负载，甚至导致服务无法恢复。

**算法原理：**
重连间隔随失败次数指数增长，通常公式为：
$$ delay = \min(cap, baseDelay \times 2^{\text{attempt}}) + \text{jitter} $$

*   **baseDelay**: 初始延迟（如 1秒）。
*   **cap**: 最大延迟上限（如 30秒），防止等待时间过长。
*   **jitter (抖动/随机值)**: 防止多个客户端同时重连造成服务洪峰。

**代码实现：**

```javascript
class WebSocketClient {
  constructor(url) {
    this.url = url;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10; // 最大重试次数
    this.baseDelay = 1000; // 1秒
    this.maxDelay = 30000; // 30秒
    this.ws = null;
    this.forceClose = false; // 用户手动断开标志
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.ws = new WebSocket(this.url);
    this.setupEventListeners();
  }

  // 计算退避时间
  getReconnectDelay() {
    // 指数增长: 1, 2, 4, 8, 16, 30(cap)...
    let delay = this.baseDelay * Math.pow(2, this.reconnectAttempts);
    
    // 限制最大值
    delay = Math.min(delay, this.maxDelay);
    
    // 添加抖动 (随机增加 0% ~ 20% 的时间)
    delay = delay + Math.random() * delay * 0.2;
    
    return delay;
  }

  scheduleReconnect() {
    if (this.forceClose) return;

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached. Please refresh.');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.getReconnectDelay();
    console.log(`Attempting reconnect in ${delay}ms (Attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connect();
    }, delay);
  }
  
  // ... 其他方法见下文
}
```

---

### 二、 用户认证失败处理

这是重连逻辑中最容易被忽视的陷阱。

**常见问题：**
如果 Token 过期，客户端发起 WebSocket 握手（或连接后发送 Auth 帧），服务端拒绝。如果没有特殊处理，客户端会触发 `onclose`，然后进入死循环重连 -> 失败 -> 重连，不断刷爆日志和服务器接口。

**解决方案：**
必须区分 **“网络/服务异常”**（需要重连）和 **“认证/权限异常”**（需要停止重连并引导用户重新登录）。

#### 场景 A：握手阶段认证 (Query Parameter / Sub-protocol)
浏览器原生 WebSocket 不支持自定义 Header，通常将 Token 放在 URL 中。

**服务端处理：** 认证失败直接拒绝握手，返回 HTTP 401/403。
**客户端处理：** `onerror` 或 `onclose` 需要根据状态码判断。

#### 场景 B：连接后鉴权 (Message-based)
连接建立后，客户端发送一条 Auth 消息。

**服务端处理：** 验证失败，发送特定错误码（如 `401` 或 `{"type": "error", "code": 4001}`）并主动断开连接。

**代码实现 (综合两种场景)：**

```javascript
class WebSocketClient {
  // ... 构造函数略

  setupEventListeners() {
    this.ws.onopen = () => {
      console.log('WebSocket Connected');
      // 连接成功，重置重连计数器
      this.reconnectAttempts = 0;
      
      // 场景 B: 连接后鉴权
      // this.send({ type: 'auth', token: getToken() });
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      // 场景 B: 处理服务端返回的认证失败消息
      if (data.type === 'error' && data.code === 4001) {
        this.handleAuthFailure('Token invalid or expired');
        return;
      }
      // 正常业务逻辑...
    };

    this.ws.onclose = (event) => {
      // 场景 A: 握手阶段被拒 (HTTP 401/403 通常会触发 close)
      // 注意：浏览器 WebSocket API 对 HTTP 错误码屏蔽严重，
      // 通常只能看到 code 1006 (Abnormal Closure)，或者有时是 1008 (Policy Violation)
      if (event.code === 1008 || event.code === 1006) { 
        // 这里需要结合你的业务，可能需要尝试一次刷新 Token 逻辑
        console.warn('Connection closed by server, possibly auth error.');
      }

      // 如果不是用户手动关闭，且不是认证失败，则尝试重连
      if (!this.forceClose && !this.isAuthError(event)) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket Error:', error);
      // 错误通常伴随 close 事件，重连逻辑放在 onclose 中
    };
  }

  // 判断是否为认证错误
  isAuthError(closeEvent) {
    // 示例：如果服务端在握手时返回 1008 (Policy Violation) 或自定义 4000+ 代码
    // 具体代码需与后端对齐
    return closeEvent.code === 1008; 
  }

  // 统一处理认证失败
  async handleAuthFailure(reason) {
    console.error('Auth failed:', reason);
    this.forceClose = true; // 停止自动重连
    
    // 最佳实践：尝试静默刷新 Token
    const newToken = await this.refreshToken();
    
    if (newToken) {
      console.log('Token refreshed, reconnecting...');
      this.forceClose = false; // 恢复开关
      this.reconnectAttempts = 0; // 重置计数
      this.connect(); // 立即重连
    } else {
      // 刷新失败，跳转登录页
      console.error('Session expired. Redirecting to login.');
      // window.location.href = '/login';
    }
  }
  
  // 模拟刷新 Token
  async refreshToken() {
    // 调用你的 refresh token API
    // return await fetch('/api/refresh-token')...
    return null; // 此处返回 null 模拟失败
  }
}
```

---

### 三、 完整最佳实践 Checklist

1.  **心跳机制**：
    *   客户端定时发送 `ping`，服务端回复 `pong`。
    *   如果超时未收到回复，客户端应主动断开并触发重连（认为连接已僵死）。

2.  **断线重连时的 Token 更新**：
    *   **URL 携带 Token 方式**：在 `connect()` 方法中动态获取最新 Token，而不是使用构造函数时的旧 Token。
    *   **代码示例**：
        ```javascript
        connect() {
            // 每次连接时获取最新的 token
            const currentToken = localStorage.getItem('token');
            const urlWithToken = `${this.baseUrl}?token=${currentToken}`;
            this.ws = new WebSocket(urlWithToken);
            // ...
        }
        ```

3.  **状态同步**：
    *   重连成功后，需要重新订阅之前的 Topic 或发送状态同步消息，确保业务不中断。

4.  **手动断开处理**：
    *   提供显式的 `close()` 方法。当用户主动退出页面或点击“断开”时，设置 `this.forceClose = true`，停止自动重连逻辑。

### 四、 总结

处理 WebSocket 重连的核心在于**“不要盲目重连”**。

1.  **指数退避**保护服务端，防止雪崩。
2.  **认证失败拦截**保护用户体验，防止无效循环。
3.  **Token 动态更新**确保重连后鉴权有效。

将上述代码封装成一个 Class，即可满足绝大多数生产环境的需求。