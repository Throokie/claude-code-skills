# Pro/deepseek-ai/DeepSeek-R1

## 元数据

- **耗时**: 149142ms
- **Tokens**: 2561
- **尝试次数**: 1

---

## 响应


在WebSocket应用中，实现健壮的自动重连机制需要结合指数退避算法和认证失败处理。以下是详细的最佳实践方案：

---

### **1. 指数退避算法 (Exponential Backoff)**
**核心思想**：重连延迟时间随失败次数指数级增长，避免高频重连冲击服务器。
```javascript
let reconnectAttempts = 0;
const maxDelay = 30000; // 最大延迟时间 (30s)
const baseDelay = 1000;  // 基础延迟时间 (1s)

function reconnect() {
  // 计算延迟时间：2^重试次数 * 基础延迟，不超过最大值
  const delay = Math.min(baseDelay * Math.pow(2, reconnectAttempts), maxDelay);
  
  setTimeout(() => {
    initWebSocket();
    reconnectAttempts++;
  }, delay);
}
```

---

### **2. 完整重连流程**
```javascript
let ws = null;
let isManualClose = false; // 标记是否为用户主动关闭

function initWebSocket() {
  ws = new WebSocket("wss://your-api.com/socket");
  
  ws.onopen = () => {
    // 连接成功后发送认证数据
    ws.send(JSON.stringify({ type: "auth", token: "user_token" }));
    reconnectAttempts = 0; // 重置重连计数
  };
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    // 处理服务器返回的认证错误
    if (data.type === 'auth_error') {
      handleAuthFailure();
    }
  };
  
  ws.onclose = (event) => {
    // 非主动关闭且非认证失败时重连
    if (!isManualClose && event.code !== 1008) {
      reconnect();
    }
  };
  
  ws.onerror = (error) => {
    console.error("WebSocket error:", error);
  };
}

// 首次连接
initWebSocket();

// 手动关闭连接（不触发重连）
function closeConnection() {
  isManualClose = true;
  ws?.close(1000, "User closed");
}
```

---

### **3. 认证失败处理**
认证失败时应停止重连并通知用户重新登录：
```javascript
function handleAuthFailure() {
  // 1. 停止重连逻辑
  isManualClose = true;
  ws?.close();

  // 2. 清除本地无效的认证信息
  localStorage.removeItem("auth_token");

  // 3. 通知用户
  alert("认证过期，请重新登录");
  
  // 4. 跳转登录页
  window.location.href = "/login";
}
```

---

### **4. 完整最佳实践**
| **策略**               | **实现方式**                                                                 |
|------------------------|-----------------------------------------------------------------------------|
| **指数退避**           | 重连延迟 = `min(baseDelay * 2^attempts, maxDelay)`                         |
| **认证失败处理**       | 立即停止重连，清除Token，引导用户重新登录                                   |
| **连接关闭识别**       | 区分正常关闭(`1000`) 和认证失败(`1008`)                                    |
| **重连上限**           | 设置最大重试次数（如10次）或无限重连但限制最大延迟                          |
| **用户主动关闭**       | 设置标志位`isManualClose`跳过自动重连                                      |
| **网络恢复监听**       | 监听`navigator.onLine`变化，网络恢复时立即重连                              |
| **心跳保活**           | 定期发送心跳包，超时时主动断开触发重连                                      |

---

### **5. 增强策略代码示例**
```javascript
// 监听网络恢复
window.addEventListener('online', () => {
  if (!ws || ws.readyState === WebSocket.CLOSED) {
    reconnect();
  }
});

// 心跳检测
let heartbeatInterval;
ws.onopen = () => {
  // ...认证逻辑
  heartbeatInterval = setInterval(() => {
    ws.ping();
  }, 30000); // 每30秒一次
};

ws.onclose = () => {
  clearInterval(heartbeatInterval);
  // ...重连逻辑
};
```

---

### **关键错误码说明**
| **Code** | **含义**               | **处理建议**                     |
|----------|------------------------|----------------------------------|
| `1000`   | 正常关闭               | 不重连                           |
| `1006`   | 连接异常断开           | 触发指数退避重连                 |
| `1008`   | 认证失败/令牌过期      | 停止重连，引导用户重新认证       |
| `1013`   | 服务器不可用           | 触发指数退避重连                 |

---

### **总结最佳实践**
1. **分级处理错误**：区分网络错误（重连）和业务错误（如认证失败）
2. **退避上限控制**：设置`maxDelay`防止无限增长（通常30-60秒）
3. **资源释放**：重连前清理旧连接的定时器和事件监听
4. **用户感知**：在UI显示重连状态（如："断线重连中..."）
5. **密钥刷新**：认证失败时尝试用Refresh Token更新Access Token

通过结合指数退避和智能错误处理，可构建高可靠的WebSocket连接，平衡服务器压力和用户体验。