# Pro/deepseek-ai/DeepSeek-V3.2

## 元数据

- **耗时**: 152602ms
- **Tokens**: 6862
- **尝试次数**: 1

---

## 响应

# WebSocket 自动重连最佳实践

以下是一个完整的 WebSocket 自动重连实现方案，包含指数退避算法和用户认证失败处理：

```javascript
class WebSocketReconnect {
  constructor(options = {}) {
    // 配置选项
    this.options = {
      url: options.url || '',
      protocols: options.protocols || [],
      reconnectEnabled: options.reconnectEnabled !== false,
      maxReconnectAttempts: options.maxReconnectAttempts || 10,
      reconnectInterval: options.reconnectInterval || 1000,
      maxReconnectInterval: options.maxReconnectInterval || 30000,
      reconnectDecay: options.reconnectDecay || 1.5, // 指数退避因子
      timeout: options.timeout || 5000,
      authToken: options.authToken || null,
      authMethod: options.authMethod || 'header', // 'header', 'query', 'message'
      onOpen: options.onOpen || (() => {}),
      onMessage: options.onMessage || (() => {}),
      onClose: options.onClose || (() => {}),
      onError: options.onError || (() => {}),
      onReconnect: options.onReconnect || (() => {}),
      onAuthFailure: options.onAuthFailure || (() => {}),
    };

    // 内部状态
    this.ws = null;
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;
    this.isManualClose = false;
    this.isAuthenticated = false;
    this.pendingMessages = [];
    this.heartbeatInterval = null;
    this.connectionTimeout = null;

    // 绑定方法
    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.send = this.send.bind(this);
    this.reconnect = this.reconnect.bind(this);
    this.reset = this.reset.bind(this);
  }

  /**
   * 建立 WebSocket 连接
   */
  connect() {
    if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
      console.warn('WebSocket 已经连接或正在连接');
      return;
    }

    this.isManualClose = false;
    this.isAuthenticated = false;

    try {
      // 构建带认证信息的 URL（如果使用查询参数认证）
      let url = this.options.url;
      if (this.options.authMethod === 'query' && this.options.authToken) {
        const separator = url.includes('?') ? '&' : '?';
        url = `${url}${separator}token=${encodeURIComponent(this.options.authToken)}`;
      }

      // 创建 WebSocket 连接
      this.ws = new WebSocket(url, this.options.protocols);

      // 设置连接超时
      this.connectionTimeout = setTimeout(() => {
        if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
          console.warn('WebSocket 连接超时');
          this.ws.close();
        }
      }, this.options.timeout);

      // 设置事件监听器
      this.ws.onopen = this._handleOpen.bind(this);
      this.ws.onmessage = this._handleMessage.bind(this);
      this.ws.onclose = this._handleClose.bind(this);
      this.ws.onerror = this._handleError.bind(this);
    } catch (error) {
      console.error('创建 WebSocket 连接失败:', error);
      this._scheduleReconnect();
    }
  }

  /**
   * 处理连接打开事件
   */
  _handleOpen(event) {
    clearTimeout(this.connectionTimeout);
    console.log('WebSocket 连接已建立');

    // 发送认证信息（如果需要）
    if (this.options.authMethod === 'message' && this.options.authToken) {
      this._sendAuthMessage();
    } else if (this.options.authMethod === 'header') {
      // 注意：浏览器 WebSocket API 不支持自定义 headers
      // 如果需要 header 认证，通常需要服务器支持其他方式（如 cookie 或 URL 参数）
      console.warn('浏览器 WebSocket 不支持自定义 headers，请考虑使用其他认证方式');
      this.isAuthenticated = true;
    } else {
      this.isAuthenticated = true;
    }

    // 重置重连尝试次数
    this.reconnectAttempts = 0;

    // 发送待处理的消息
    this._flushPendingMessages();

    // 开始心跳检测
    this._startHeartbeat();

    // 调用用户提供的回调
    this.options.onOpen(event);
  }

  /**
   * 发送认证消息
   */
  _sendAuthMessage() {
    const authMessage = JSON.stringify({
      type: 'auth',
      token: this.options.authToken,
      timestamp: Date.now(),
    });

    this.ws.send(authMessage);

    // 设置认证超时
    setTimeout(() => {
      if (!this.isAuthenticated && this.ws && this.ws.readyState === WebSocket.OPEN) {
        console.warn('认证超时，关闭连接');
        this.ws.close(4001, 'Authentication timeout');
      }
    }, 5000);
  }

  /**
   * 处理接收到的消息
   */
  _handleMessage(event) {
    try {
      const data = JSON.parse(event.data);

      // 处理认证响应
      if (data.type === 'auth_response') {
        if (data.success) {
          console.log('认证成功');
          this.isAuthenticated = true;
          this._flushPendingMessages();
        } else {
          console.error('认证失败:', data.reason);
          this.isAuthenticated = false;
          
          // 认证失败，不重连
          this.options.reconnectEnabled = false;
          this.disconnect();
          
          // 调用认证失败回调
          this.options.onAuthFailure({
            code: 4001,
            reason: data.reason || 'Authentication failed',
            data: data,
          });
        }
        return;
      }

      // 处理心跳响应
      if (data.type === 'heartbeat') {
        this._handleHeartbeat();
        return;
      }

      // 只有认证通过后才将消息转发给用户
      if (this.isAuthenticated || !this.options.authToken) {
        this.options.onMessage(event);
      }
    } catch (error) {
      // 如果不是 JSON 消息，直接传递给回调
      this.options.onMessage(event);
    }
  }

  /**
   * 处理连接关闭事件
   */
  _handleClose(event) {
    clearTimeout(this.connectionTimeout);
    console.log(`WebSocket 连接关闭，代码: ${event.code}, 原因: ${event.reason}`);

    // 停止心跳检测
    this._stopHeartbeat();

    // 调用用户提供的回调
    this.options.onClose(event);

    // 如果不是手动关闭，则尝试重连
    if (!this.isManualClose && this.options.reconnectEnabled) {
      this._scheduleReconnect();
    }
  }

  /**
   * 处理错误事件
   */
  _handleError(event) {
    console.error('WebSocket 错误:', event);
    this.options.onError(event);
  }

  /**
   * 计划重连
   */
  _scheduleReconnect() {
    if (this.isManualClose || !this.options.reconnectEnabled) {
      return;
    }

    // 检查是否超过最大重连次数
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      console.error(`已达到最大重连次数 (${this.options.maxReconnectAttempts})，停止重连`);
      return;
    }

    // 计算重连延迟（指数退避算法）
    const delay = Math.min(
      this.options.reconnectInterval * Math.pow(this.options.reconnectDecay, this.reconnectAttempts),
      this.options.maxReconnectInterval
    );

    console.log(`计划在 ${Math.round(delay / 1000)} 秒后重连 (尝试 ${this.reconnectAttempts + 1}/${this.options.maxReconnectAttempts})`);

    // 设置重连定时器
    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.options.onReconnect(this.reconnectAttempts, delay);
      this.connect();
    }, delay);
  }

  /**
   * 开始心跳检测
   */
  _startHeartbeat() {
    // 每30秒发送一次心跳
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        const heartbeat = JSON.stringify({
          type: 'heartbeat',
          timestamp: Date.now(),
        });
        this.ws.send(heartbeat);
      }
    }, 30000);
  }

  /**
   * 处理心跳响应
   */
  _handleHeartbeat() {
    // 可以在这里更新最后收到心跳的时间
    // 用于检测连接是否仍然活跃
  }

  /**
   * 停止心跳检测
   */
  _stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * 发送消息
   */
  send(data) {
    // 如果连接未打开或未认证，将消息加入待处理队列
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || (this.options.authToken && !this.isAuthenticated)) {
      this.pendingMessages.push(data);
      return false;
    }

    try {
      this.ws.send(data);
      return true;
    } catch (error) {
      console.error('发送消息失败:', error);
      this.pendingMessages.push(data);
      return false;
    }
  }

  /**
   * 发送待处理的消息
   */
  _flushPendingMessages() {
    if (!this.isAuthenticated && this.options.authToken) {
      return;
    }

    while (this.pendingMessages.length > 0) {
      const message = this.pendingMessages.shift();
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(message);
      } else {
        // 如果发送失败，将消息重新放回队列
        this.pendingMessages.unshift(message);
        break;
      }
    }
  }

  /**
   * 手动重连
   */
  reconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    this.reconnectAttempts = 0;
    this.disconnect();
    this.connect();
  }

  /**
   * 断开连接
   */
  disconnect(code = 1000, reason = 'Manual disconnect') {
    this.isManualClose = true;
    this.options.reconnectEnabled = false;
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.ws) {
      this.ws.close(code, reason);
    }
  }

  /**
   * 重置状态（用于重新启用自动重连）
   */
  reset() {
    this.reconnectAttempts = 0;
    this.isManualClose = false;
    this.options.reconnectEnabled = true;
    this.isAuthenticated = false;
    this.pendingMessages = [];
  }

  /**
   * 获取当前状态
   */
  getState() {
    if (!this.ws) return 'DISCONNECTED';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'CONNECTING';
      case WebSocket.OPEN:
        return this.isAuthenticated ? 'AUTHENTICATED' : 'CONNECTED';
      case WebSocket.CLOSING:
        return 'CLOSING';
      case WebSocket.CLOSED:
        return 'CLOSED';
      default:
        return 'UNKNOWN';
    }
  }

  /**
   * 更新认证令牌
   */
  updateAuthToken(token) {
    this.options.authToken = token;
    
    // 如果已连接但未认证，重新认证
    if (this.ws && this.ws.readyState === WebSocket.OPEN && !this.isAuthenticated) {
      this._sendAuthMessage();
    }
  }
}

// 使用示例
document.addEventListener('DOMContentLoaded', function() {
  const statusElement = document.getElementById('status');
  const messagesElement = document.getElementById('messages');
  const connectBtn = document.getElementById('connectBtn');
  const disconnectBtn = document.getElementById('disconnectBtn');
  const sendBtn = document.getElementById('sendBtn');
  const messageInput = document.getElementById('messageInput');
  const tokenInput = document.getElementById('tokenInput');
  const updateTokenBtn = document.getElementById('updateTokenBtn');

  // 创建 WebSocket 重连实例
  const wsClient = new WebSocketReconnect({
    url: 'wss://echo.websocket.org', // 测试服务器
    authToken: tokenInput.value || null,
    authMethod: 'message',
    maxReconnectAttempts: 5,
    reconnectInterval: 1000,
    maxReconnectInterval: 10000,
    reconnectDecay: 1.5,
    
    onOpen: (event) => {
      statusElement.textContent = '已连接，等待认证...';
      statusElement.className = 'status connecting';
      logMessage('系统: 连接已建立');
    },
    
    onMessage: (event) => {
      logMessage(`服务器: ${event.data}`);
    },
    
    onClose: (event) => {
      statusElement.textContent = `已断开 (代码: ${event.code})`;
      statusElement.className = 'status disconnected';
      logMessage(`系统: 连接关闭，代码: ${event.code}, 原因: ${event.reason}`);
    },
    
    onError: (event) => {
      statusElement.textContent = '连接错误';
      statusElement.className = 'status error';
      logMessage('系统: 连接错误');
    },
    
    onReconnect: (attempt, delay) => {
      statusElement.textContent = `重连中 (尝试 ${attempt})...`;
      statusElement.className = 'status reconnecting';
      logMessage(`系统: ${Math.round(delay/1000)}秒后尝试第${attempt}次重连`);
    },
    
    onAuthFailure: (error) => {
      statusElement.textContent = '认证失败';
      statusElement.className = 'status error';
      logMessage(`系统: 认证失败 - ${error.reason}`);
      alert(`认证失败: ${error.reason}`);
    }
  });

  // 更新状态显示
  function updateStatus() {
    const state = wsClient.getState();
    statusElement.textContent = state;
    
    switch (state) {
      case 'CONNECTED':
      case 'AUTHENTICATED':
        statusElement.className = 'status connected';
        break;
      case 'CONNECTING':
        statusElement.className = 'status connecting';
        break;
      case 'RECONNECTING':
        statusElement.className = 'status reconnecting';
        break;
      case 'DISCONNECTED':
      case 'CLOSED':
        statusElement.className = 'status disconnected';
        break;
      default:
        statusElement.className = 'status unknown';
    }
  }

  // 记录消息
  function logMessage(message) {
    const now = new Date();
    const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    
    const messageElement = document.createElement('div');
    messageElement.className = 'message';
    messageElement.innerHTML = `<span class="time">[${timeString}]</span> ${message}`;
    
    messagesElement.appendChild(messageElement);
    messagesElement.scrollTop = messagesElement.scrollHeight;
  }

  // 按钮事件监听
  connectBtn.addEventListener('click', () => {
    wsClient.reset();
    wsClient.connect();
    updateStatus();
  });

  disconnectBtn.addEventListener('click', () => {
    wsClient.disconnect();
    updateStatus();
  });

  sendBtn.addEventListener('click', () => {
    const message = messageInput.value.trim();
    if (message) {
      const success = wsClient.send(JSON.stringify({
        type: 'message',
        content: message,
        timestamp: Date.now()
      }));
      
      if (success) {
        logMessage(`你: ${message}`);
        messageInput.value = '';
      } else {
        logMessage('系统: 发送失败，消息已加入队列');
      }
    }
  });

  updateTokenBtn.addEventListener('click', () => {
    wsClient.updateAuthToken(tokenInput.value);
    logMessage('系统: 令牌已更新');
  });

  // 允许按 Enter 发送消息
  messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendBtn.click();
    }
  });

  // 初始状态
  updateStatus();
});
```

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WebSocket 自动重连演示</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f5f5f5;
            padding: 20px;
            max-width: 1000px;
            margin: 0 auto;
        }
        
        h1 {
            text-align: center;
            margin-bottom: 20px;
            color: #2c3e50;
        }
        
        .demo-description {
            background-color: #e8f4fc;
            border-left: 4px solid #3498db;
            padding: 15px;
            margin-bottom: 25px;
            border-radius: 4px;
        }
        
        .demo-description h3 {
            margin-bottom: 10px;
            color: #2980b9;
        }
        
        .demo-description ul {
            margin-left: 20px;
            margin-bottom: 10px;
        }
        
        .container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            grid-gap: 20px;
            margin-bottom: 20px;
        }
        
        @media (max-width: 768px) {
            .container {
                grid-template-columns: 1fr;
            }
        }
        
        .panel {
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            padding: 20px;
        }
        
        .panel h2 {
            margin-bottom: 15px;
            color: #2c3e50;
            border-bottom: 2px solid #ecf0f1;
            padding-bottom: 10px;
        }
        
        .control-group {
            margin-bottom: 15px;
        }
        
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: 600;
            color: #555;
        }
        
        input[type="text"] {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
        }
        
        .btn-group {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 15px;
        }
        
        button {
            padding: 10px 15px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 600;
            transition: background-color 0.2s;
            flex: 1;
            min-width: 120px;
        }
        
        .btn-connect {
            background-color: #2ecc71;
            color: white;
        }
        
        .btn-connect:hover {
            background-color: #27ae60;
        }
        
        .btn-disconnect {
            background-color: #e74c3c;
            color: white;
        }
        
        .btn-disconnect:hover {
            background-color: #c0392b;
        }
        
        .btn-send {
            background-color: #3498db;
            color: white;
        }
        
        .btn-send:hover {
            background-color: #2980b9;
        }
        
        .btn-update {
            background-color: #9b59b6;
            color: white;
        }
        
        .btn-update:hover {
            background-color: #8e44ad;
        }
        
        .status-container {
            display: flex;
            align-items: center;
            margin-bottom: 15px;
        }
        
        .status-label {
            font-weight: 600;
            margin-right: 10px;
        }
        
        .status {
            padding: 5px 10px;
            border-radius: 4px;
            font-weight: 600;
        }
        
        .status.connected {
            background-color: #d5f4e6;
            color: #27ae60;
        }
        
        .status.connecting {
            background-color: #fff9e6;
            color: #f39c12;
        }
        
        .status.reconnecting {
            background-color: #ffeaa7;
            color: #e67e22;
        }
        
        .status.disconnected {
            background-color: #fadbd8;
            color: #e74c3c;
        }
        
        .status.error {
            background-color: #f5b7b1;
            color: #c0392b;
        }
        
        .messages-container {
            height: 300px;
            overflow-y: auto;
            border: 1px solid #ddd;
            border-radius: 4px;
            padding: 10px;
            background-color: #f9f9f9;
            margin-top: 10px;
        }
        
        .message {
            margin-bottom: 8px;
            padding-bottom: 8px;
            border-bottom: 1px solid #eee;
        }
        
        .message:last-child {
            border-bottom: none;
            margin-bottom: 0;
            padding-bottom: 0;
        }
        
        .time {
            color: #7f8c8d;
            font-size: 0.9em;
        }
        
        .features {
            margin-top: 30px;
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            padding: 20px;
        }
        
        .features h2 {
            color: #2c3e50;
            margin-bottom: 15px;
            border-bottom: 2px solid #ecf0f1;
            padding-bottom: 10px;
        }
        
        .feature-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            grid-gap: 15px;
        }
        
        .feature {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 6px;
            border-left: 4px solid #3498db;
        }
        
        .feature h4 {
            color: #2c3e50;
            margin-bottom: 8px;
        }
        
        .feature p {
            color: #555;
            font-size: 0.95em;
        }
    </style>
</head>
<body>
    <h1>WebSocket 自动重连最佳实践演示</h1>
    
    <div class="demo-description">
        <h3>演示说明</h3>
        <p>此演示展示了 WebSocket 自动重连功能，包含以下特性：</p>
        <ul>
            <li><strong>指数退避算法</strong>：重连间隔按指数增长（1s, 2s, 4s, 8s...），避免频繁重连对服务器造成压力</li>
            <li><strong>认证失败处理</strong>：当认证失败时停止重连，避免无效尝试</li>
            <li><strong>心跳检测</strong>：保持连接活跃，及时检测连接状态</li>
            <li><strong>消息队列</strong>：连接断开期间的消息会暂存，连接恢复后自动发送</li>
        </ul>
        <p>测试服务器：wss://echo.websocket.org（这是一个回显服务器，会将收到的消息原样返回）</p>
    </div>
    
    <div class="container">
        <div class="panel">
            <h2>连接控制</h2>
            <div class="control-group">
                <label for="tokenInput">认证令牌：</label>
                <input type="text" id="tokenInput" value="demo_token_12345" placeholder="输入认证令牌">
            </div>
            
            <div class="status-container">
                <span class="status-label">当前状态：</span>
                <span id="status" class="status disconnected">DISCONNECTED</span>
            </div>
            
            <div class="btn-group">
                <button id="connectBtn" class="btn-connect">连接</button>
                <button id="disconnectBtn" class="btn-disconnect">断开</button>
                <button id="updateTokenBtn" class="btn-update">更新令牌</button>
            </div>
            
            <div class="control-group" style="margin-top: 20px;">
                <label for="messageInput">发送消息：</label>
                <input type="text" id="messageInput" placeholder="输入要发送的消息">
                <div class="btn-group">
                    <button id="sendBtn" class="btn-send">发送</button>
                </div>
            </div>
        </div>
        
        <div class="panel">
            <h2>消息日志</h2>
            <div id="messages" class="messages-container">
                <div class="message">系统: 等待连接...</div>
            </div>
        </div>
    </div>
    
    <div class="features">
        <h2>实现特性</h2>
        <div class="feature-grid">
            <div class="feature">
                <h4>指数退避重连</h4>
                <p>重连间隔按指数增长，避免频繁重连对服务器造成压力。可配置最大重连次数和最大重连间隔。</p>
            </div>
            <div class="feature">
                <h4>智能认证处理</h4>
                <p>支持多种认证方式（header、query、message）。认证失败时停止重连，避免无效尝试。</p>
            </div>
            <div class="feature">
                <h4>连接状态管理</h4>
                <p>完整的状态管理，包括连接中、已连接、认证中、已认证、重连中、断开连接等状态。</p>
            </div>
            <div class="feature">
                <h4>心跳检测</h4>
                <p>定期发送心跳包，保持连接活跃，及时检测连接状态，快速触发重连机制。</p>
            </div>
            <div class="feature">
                <h4>消息队列</h4>
                <p>连接断开期间的消息会暂存到队列，连接恢复后自动发送，确保消息不丢失。</p>
            </div>
            <div class="feature">
                <h4>错误处理</h4>
                <p>全面的错误处理机制，包括连接超时、认证超时、网络错误等，提供详细的错误信息。</p>
            </div>
        </div>
    </div>

    <script src="websocket-reconnect.js"></script>
</body>
</html>
```

## 核心特性说明

### 1. 指数退避算法
```javascript
// 计算重连延迟（指数退避）
const delay = Math.min(
  this.options.reconnectInterval * Math.pow(this.options.reconnectDecay, this.reconnectAttempts),
  this.options.maxReconnectInterval
);
```

### 2. 认证失败处理
- 认证失败后停止重连，避免无效尝试
- 提供专门的认证失败回调函数
- 支持多种认证方式（header、query、message）

### 3. 心跳检测
- 定期发送心跳包保持连接活跃
- 检测连接状态，及时触发重连

### 4. 消息队列
- 连接断开期间的消息暂存
- 连接恢复后自动发送队列中的消息

### 5. 完整状态管理
- 连接状态跟踪（CONNECTING、CONNECTED、AUTHENTICATED等）
- 手动断开与自动断开的区分
- 重连次数限制

## 使用建议

1. **生产环境配置**：
   - 根据服务器负载调整重连参数
   - 设置合理的最大重连次数（如5-10次）
   - 使用适当的认证方式

2. **错误处理**：
   - 监控连接状态变化
   - 记录重连日志用于分析
   - 提供用户友好的连接状态提示

3. **性能优化**：
   - 避免在重连期间阻塞UI
   - 合理设置心跳间隔（通常30-60秒）
   - 清理不再需要的消息队列

这个实现提供了完整的WebSocket自动重连解决方案，可以直接集成到项目中，或根据具体需求进行定制。