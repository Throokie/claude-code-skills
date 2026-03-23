# Pro/moonshotai/Kimi-K2.5

## 元数据

- **耗时**: 193377ms
- **Tokens**: 3504
- **尝试次数**: 1

---

## 响应

WebSocket 自动重连的最佳实践需要平衡**实时性**、**服务器压力**和**用户体验**。以下是完整的架构设计和实现方案：

## 1. 核心架构设计

### 错误分类策略
```typescript
enum ReconnectPolicy {
  IMMEDIATE,    // 立即重连（如：服务器重启）
  EXPONENTIAL,  // 指数退避（网络抖动）
  STOP          // 停止重连（认证失败）
}
```

### 指数退避算法（Exponential Backoff with Jitter）
```typescript
class ExponentialBackoff {
  private attempt = 0;
  private readonly baseDelay = 1000;      // 初始1秒
  private readonly maxDelay = 30000;      // 最大30秒
  private readonly multiplier = 2;        // 指数基数
  
  getNextDelay(): number {
    // 计算指数延迟: base * 2^attempt
    const exponential = this.baseDelay * Math.pow(this.multiplier, this.attempt);
    const capped = Math.min(exponential, this.maxDelay);
    
    // 添加全抖动（Full Jitter）避免惊群效应
    const jitter = Math.random() * capped;
    const delay = Math.floor(jitter);
    
    this.attempt++;
    return delay;
  }
  
  reset() {
    this.attempt = 0;
  }
}
```

**为什么需要 Jitter？**
- 防止所有客户端同时重连导致服务器雪崩
- 全抖动（0-delay）比等比抖动（delay/2 + jitter）更分散负载

## 2. 认证失败处理机制

### 关键区分：网络错误 vs 认证错误

```typescript
interface CloseEvent {
  code: number;
  reason: string;
  wasClean: boolean;
}

class AuthHandler {
  // WebSocket Close Code 分类
  static isAuthError(event: CloseEvent): boolean {
    // 标准Code
    if (event.code === 1008) return true; // Policy Violation
    
    // 自定义Code (4000-4999 保留给应用层)
    if (event.code >= 4000 && event.code < 4500) {
      return true; // 40xx 表示认证相关错误
    }
    
    // 通过reason判断（备用方案）
    const authErrors = ['UNAUTHORIZED', 'TOKEN_EXPIRED', 'AUTH_FAILED'];
    return authErrors.some(e => event.reason?.includes(e));
  }
  
  static async refreshToken(): Promise<string | null> {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Refresh failed');
      const { token } = await response.json();
      return token;
    } catch (error) {
      return null;
    }
  }
}
```

### 认证失败处理流程
1. **首次连接失败**：尝试刷新 Token → 重连一次 → 仍失败则停止
2. **连接中 Token 过期**：服务端发送特定消息 → 客户端静默刷新 → 无缝重连
3. **多设备登录被踢**：立即停止重连，提示用户

## 3. 完整生产级实现

```typescript
type WebSocketStatus = 'CONNECTING' | 'OPEN' | 'CLOSING' | 'CLOSED' | 'RECONNECTING';

interface WebSocketOptions {
  url: string;
  protocols?: string | string[];
  heartbeatInterval?: number;      // 心跳间隔（默认30秒）
  heartbeatMsg?: string;           // 心跳消息
  maxReconnectAttempts?: number;   // 最大重试次数（0为无限）
  authToken?: string;              // 初始Token
  onMessage?: (data: any) => void;
  onAuthFailure?: () => void;      // 认证失败回调（跳转登录）
  onStatusChange?: (status: WebSocketStatus) => void;
}

class ResilientWebSocket {
  private ws: WebSocket | null = null;
  private status: WebSocketStatus = 'CLOSED';
  private backoff = new ExponentialBackoff();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectAttempts = 0;
  private isManualClose = false;    // 标记是否主动关闭
  private currentToken: string | undefined;
  
  constructor(private options: WebSocketOptions) {
    this.currentToken = options.authToken;
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.CONNECTING) return;
    
    this.updateStatus('CONNECTING');
    this.isManualClose = false;
    
    try {
      // 支持子协议传递Token（更安全）或Query参数
      const protocols = this.buildProtocols();
      this.ws = new WebSocket(this.options.url, protocols);
      
      this.setupEventHandlers();
    } catch (error) {
      this.handleError(error);
    }
  }

  private buildProtocols(): string[] {
    const protocols: string[] = [];
    if (this.options.protocols) {
      protocols.push(...(Array.isArray(this.options.protocols) 
        ? this.options.protocols 
        : [this.options.protocols]));
    }
    // 通过子协议传递Token（避免URL暴露）
    if (this.currentToken) {
      protocols.push(`token.${this.currentToken}`);
    }
    return protocols;
  }

  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = (event) => {
      this.updateStatus('OPEN');
      this.backoff.reset();
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      console.log('[WebSocket] Connected');
    };

    this.ws.onmessage = (event) => {
      // 处理服务端下发的Token刷新指令
      if (this.isTokenRefreshMessage(event.data)) {
        this.handleServerTokenRefresh(event.data);
        return;
      }
      
      this.options.onMessage?.(event.data);
    };

    this.ws.onclose = (event) => {
      this.cleanup();
      
      if (this.isManualClose) {
        this.updateStatus('CLOSED');
        return;
      }

      // 关键：判断是否为认证错误
      if (AuthHandler.isAuthError(event)) {
        console.error('[WebSocket] Auth failed:', event.reason);
        this.handleAuthFailure();
        return;
      }

      // 正常关闭码（1000正常关闭，1001服务端重启）
      const shouldReconnect = event.code === 1000 || event.code === 1001 || 
                             event.code === 1006 || !event.wasClean;
      
      if (shouldReconnect) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error('[WebSocket] Error:', error);
      // onerror后一定会触发onclose，在onclose中处理重连
    };
  }

  private async scheduleReconnect(): Promise<void> {
    const maxAttempts = this.options.maxReconnectAttempts ?? Infinity;
    
    if (this.reconnectAttempts >= maxAttempts) {
      console.error('[WebSocket] Max reconnect attempts reached');
      this.updateStatus('CLOSED');
      return;
    }

    this.updateStatus('RECONNECTING');
    
    // 指数退避计算延迟
    const delay = this.backoff.getNextDelay();
    console.log(`[WebSocket] Reconnecting in ${delay}ms... (attempt ${this.reconnectAttempts + 1})`);
    
    this.reconnectTimer = setTimeout(async () => {
      // 重连前尝试刷新Token（如果有过期机制）
      if (this.shouldRefreshTokenBeforeReconnect()) {
        const newToken = await AuthHandler.refreshToken();
        if (newToken) {
          this.currentToken = newToken;
        } else {
          // Token刷新失败，直接触发认证失败
          this.handleAuthFailure();
          return;
        }
      }
      
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  private handleAuthFailure(): void {
    this.updateStatus('CLOSED');
    this.options.onAuthFailure?.();
    // 清理状态，防止后续重连
    this.destroy();
  }

  private startHeartbeat(): void {
    const interval = this.options.heartbeatInterval ?? 30000;
    const msg = this.options.heartbeatMsg ?? '{"type":"ping"}';
    
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(msg);
      }
    }, interval);
  }

  private cleanup(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    this.ws = null;
  }

  disconnect(): void {
    this.isManualClose = true;
    this.cleanup();
    this.ws?.close(1000, 'Client disconnect');
    this.updateStatus('CLOSING');
  }

  destroy(): void {
    this.disconnect();
    this.backoff.reset();
    this.reconnectAttempts = 0;
  }

  send(data: string | ArrayBufferLike | Blob | ArrayBufferView): boolean {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(data);
      return true;
    }
    console.warn('[WebSocket] Cannot send, connection not open');
    return false;
  }

  private updateStatus(status: WebSocketStatus): void {
    this.status = status;
    this.options.onStatusChange?.(status);
  }

  // 辅助方法
  private isTokenRefreshMessage(data: any): boolean {
    try {
      const msg = JSON.parse(data);
      return msg.type === 'TOKEN_REFRESH_REQUIRED';
    } catch {
      return false;
    }
  }

  private async handleServerTokenRefresh(data: any): Promise<void> {
    const newToken = await AuthHandler.refreshToken();
    if (newToken) {
      this.currentToken = newToken;
      // 发送新Token确认
      this.send(JSON.stringify({ type: 'TOKEN_REFRESH', token: newToken }));
    } else {
      this.handleAuthFailure();
    }
  }

  private shouldRefreshTokenBeforeReconnect(): boolean {
    // 根据Token过期时间判断，简化示例
    return false; // 实际实现需要检查JWT exp
  }

  getStatus(): WebSocketStatus {
    return this.status;
  }
}
```

## 4. 使用示例

```typescript
const ws = new ResilientWebSocket({
  url: 'wss://api.example.com/ws',
  authToken: localStorage.getItem('token') || undefined,
  maxReconnectAttempts: 10,
  heartbeatInterval: 25000,
  
  onMessage: (data) => {
    console.log('Received:', data);
    // 业务逻辑处理
  },
  
  onAuthFailure: () => {
    // 认证失败，清理本地状态并跳转
    localStorage.removeItem('token');
    window.location.href = '/login?reason=session_expired';
  },
  
  onStatusChange: (status) => {
    // 更新UI状态指示器
    document.getElementById('ws-status')!.textContent = status;
  }
});

// 连接
ws.connect();

// 页面卸载时清理
window.addEventListener('beforeunload', () => {
  ws.destroy();
});
```

## 5. 服务端配合建议

### 关闭码规范
```javascript
// Node.js (ws library) 示例
const WebSocket = require('ws');

function closeWithAuthError(ws, reason) {
  // 使用4000-4999自定义code
  ws.close(4001, `UNAUTHORIZED:${reason}`);
}

// 心跳检测
function heartbeat(ws) {
  ws.isAlive = true;
}

const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws, req) => {
  // 认证检查
  const token = extractToken(req);
  if (!verifyToken(token)) {
    closeWithAuthError(ws, 'Invalid token');
    return;
  }
  
  ws.isAlive = true;
  ws.on('pong', () => heartbeat(ws));
  
  // 定期心跳检测
  const interval = setInterval(() => {
    if (!ws.isAlive) {
      ws.terminate();
      clearInterval(interval);
      return;
    }
    ws.isAlive = false;
    ws.ping();
  }, 30000);
});
```

## 6. 关键优化点总结

1. **指数退避**：基础延迟1s，最大30s，全抖动随机化
2. **认证隔离**：认证错误立即停止，避免无效请求风暴
3. **Token刷新**：支持连接前刷新和连接中静默刷新
4. **状态机管理**：区分`CLOSED`（可重连）和`CLOSING`（主动关闭）
5. **心跳机制**：防止NAT超时和检测半开连接
6. **关闭码语义**：
   - 1000/1001：正常关闭，立即重连
   - 1006：异常断开，指数退避重连
   - 1008/4000+：认证错误，停止重连

这套方案能有效应对网络抖动、服务器重启、Token过期等多种生产环境场景。