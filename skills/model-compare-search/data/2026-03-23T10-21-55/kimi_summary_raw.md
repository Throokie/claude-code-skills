• 用户要求我整合6个不同AI模型关于"WebSocket自动重连最佳实践、指数退避算法、用户
  认证失败处理"的回答，并进行多维度分析总结。

  让我先分析各模型的回答特点：

  1. DeepSeek-V3.2: 提供了非常完整的JavaScript类实现，包含完整的HTML演示页面，代
     量大且详细，覆盖了指数退避、认证失败处理、心跳检测、消息队列等所有方面。
  2. DeepSeek-R1: 提供了结构化的最佳实践方案，包含代码示例、错误码说明表格、策略
     比表格，强调分级处理错误和密钥刷新。
  3. DeepSeek-R1-Distill-Qwen-32B: 以思考过程形式呈现，提供了Node.js环境的实现，
     用ws库，包含UUID等细节。
  4. GLM-5: 提供了TypeScript风格的实现，强调抖动(Jitter)的重要性，详细区分握手阶
     认证和连接后鉴权两种场景，包含Token刷新逻辑。
  5. Kimi-K2.5: 提供了完整的TypeScript类实现，包含详细的类型定义、枚举、状态管理
     强调全抖动(Full Jitter)避免惊群效应，提供了服务端配合建议。
  6. Qwen2.5-72B: 回答相对简洁，提供了基础的JavaScript示例，强调抖动(Jitter)和随
     化，认证处理部分较简单。

  现在我来整合这些回答：
• WebSocket 自动重连最佳实践 - 多模型对比总结

  ──────────────────────────────────────────────────────────────────────────────
  1. 综合结论（各模型共识）

  🔹 核心架构原则

   原则           说明
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   指数退避算法   所有模型一致认同使用指数退避（非固定间隔）来避免服务器压力，
                  公式：delay = min(maxDelay, baseDelay × 2^attempt)
   认证失败拦截   必须区分网络错误（可重连）和认证错误（应停止），防止无效循环
   最大重试限制   需设置最大重连次数或最大延迟上限，避免无限重连
   手动关闭标记   使用 isManualClose 标志区分用户主动断开与异常断开
   心跳保活机制   定期发送心跳包检测连接活性，及时触发重连

  🔹 指数退避算法共识

  基础延迟: 1000ms (1秒)
  最大延迟: 30000ms (30秒)
  指数因子: 2 (或 1.5)
  抖动(Jitter): 添加随机值避免惊群效应

  🔹 认证失败处理共识

  • 握手阶段认证失败：HTTP 401/403，关闭码通常为 1008 或 1006
  • 连接后认证失败：服务端发送特定错误消息或关闭码（4000-4999 区间）
  • 处理策略：立即停止重连 → 尝试刷新 Token → 失败则跳转登录页

  ──────────────────────────────────────────────────────────────────────────────
  2. 观点对比

  相同点

   方面       共识内容
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   算法核心   指数退避 + 抖动是标准方案
   状态管理   需要维护连接状态（CONNECTING/OPEN/CLOSED/RECONNECTING）
   错误分类   必须区分可恢复错误和认证错误
   资源清理   重连前需清理定时器和旧连接

  不同点

                DeepSeek-V   DeepSeek-R
   特性         3.2          1            GLM-5        Kimi-K2.5     Qwen2.5
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   语言/环境    浏览器 JS    浏览器 JS    TypeScript   TypeScript    浏览器 JS
   抖动策略     未明确提及   未明确提及   20% 等比抖   全抖动 (Ful   50% 随机抖
                                          动           l Jitter)     动
   Token传递    三种方式支   URL Query    URL Query    子协议传递    未详细说明
                持                        + 子协议     （更安全）
   心跳方向     客户端发送   客户端 pin   未详细说明   客户端 ping   未详细说明
                             g
   消息队列     ✅ 完整实    ❌ 未提及    ❌ 未提及    ❌ 未提及     ❌ 未提及
                现
   Token刷新    基础支持     提及         详细实现     详细实现      基础提及
   关闭码规范   基础         详细表格     提及         详细规范      基础
   演示代码     HTML+JS完    代码片段     代码片段     完整类实现    基础示例
                整页面

  ──────────────────────────────────────────────────────────────────────────────
  3. 独特见解

  DeepSeek-V3.2

  • ✅ 最完整的演示实现：提供了可直接运行的 HTML 页面 + JavaScript 类
  • ✅ 消息队列机制：连接断开期间消息暂存，恢复后自动发送
  • ✅ 多认证方式支持：header/query/message 三种方式
  • ✅ 认证超时处理：设置5秒认证超时，超时自动关闭连接

  DeepSeek-R1

  • ✅ 错误码对照表：整理了 1000/1006/1008/1013 等关键关闭码的处理建议
  • ✅ 网络恢复监听：建议监听 navigator.onLine 变化，网络恢复时立即重连
  • ✅ 策略总结表格：以表格形式清晰呈现不同策略的实现方式

  DeepSeek-R1-Distill-Qwen-32B

  • ✅ Node.js 环境支持：使用 ws 库，适合服务端 WebSocket 客户端
  • ✅ UUID 客户端标识：生成唯一 clientId 用于追踪
  • ✅ 思考过程透明：以第一人称展示问题分析过程

  GLM-5

  • ✅ 认证场景细分：详细区分"握手阶段认证"和"连接后鉴权"两种场景
  • ✅ 动态 Token 获取：每次 connect() 时从 localStorage 获取最新 Token
  • ✅ 状态同步提醒：重连后需要重新订阅 Topic 或同步状态

  Kimi-K2.5

  • ✅ 全抖动算法 (Full Jitter)：Math.random() × capped，比等比抖动更能分散负载
  • ✅ 子协议传递 Token：token.xxx 通过子协议传递，避免 URL 暴露
  • ✅ 服务端配合建议：提供了 Node.js 服务端实现参考
  • ✅ 枚举类型设计：使用 TypeScript 枚举定义策略类型

  Qwen2.5-72B

  • ✅ 简洁明了：用最少的代码展示核心逻辑，易于理解
  • ✅ 抖动公式：2^n + random(0, 2^n) × 0.5，提供具体计算方式

  ──────────────────────────────────────────────────────────────────────────────
  4. 置信度评估

   模型                           置信度       评估依据
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Kimi-K2.5                      ⭐⭐⭐⭐⭐   最完整的生产级实现，包含类型定义
                                               、状态机、服务端配合建议
   DeepSeek-V3.2                  ⭐⭐⭐⭐⭐   代码量最大，功能最完整，可直接运
                                               行验证
   GLM-5                          ⭐⭐⭐⭐☆    架构清晰，场景分析细致，Token 刷
                                               新逻辑完善
   DeepSeek-R1                    ⭐⭐⭐⭐☆    结构化程度高，错误码梳理清晰，但
                                               代码完整度稍欠
   DeepSeek-R1-Distill-Qwen-32B   ⭐⭐⭐☆☆     思考过程有价值，但实现偏向 Node.
                                               js 服务端场景
   Qwen2.5-72B                    ⭐⭐⭐☆☆     基础概念正确，但深度和完整度不足

  一致性分析

  • 高一致性区域：指数退避算法原理、认证失败停止重连、心跳机制必要性
  • 分歧区域：
    • 抖动策略（20% vs 50% vs Full Jitter）
    • Token 传递方式（URL vs 子协议）
    • 最大延迟上限（部分模型未明确）

  ──────────────────────────────────────────────────────────────────────────────
  5. 推荐方案

  🏆 综合最佳实践代码

  /**
   * WebSocket 自动重连客户端 - 综合各模型优点
   * 特性：指数退避 + 全抖动 + 认证失败拦截 + 心跳保活 + 消息队列
   */
  type WSStatus = 'CONNECTING' | 'OPEN' | 'CLOSING' | 'CLOSED' | 'RECONNECTING';

  interface WSOptions {
    url: string;
    protocols?: string[];
    authToken?: string;
    baseDelay?: number;           // 默认 1000ms
    maxDelay?: number;            // 默认 30000ms
    maxAttempts?: number;         // 默认 10，0 表示无限
    heartbeatInterval?: number;   // 默认 30000ms
    heartbeatMsg?: string;
    jitter?: 'full' | 'equal' | 'none';  // 默认 'full'

    onMessage?: (data: any) => void;
    onStatusChange?: (status: WSStatus) => void;
    onAuthFailure?: (reason: string) => void;
    onReconnect?: (attempt: number, delay: number) => void;
  }

  class ResilientWebSocket {
    private ws: WebSocket | null = null;
    private status: WSStatus = 'CLOSED';
    private reconnectAttempts = 0;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
    private isManualClose = false;
    private isAuthenticated = false;
    private pendingMessages: any[] = [];
    private currentToken: string | undefined;

    constructor(private options: WSOptions) {
      this.currentToken = options.authToken;
    }

    // ========== 指数退避算法（全抖动） ==========
    private getReconnectDelay(): number {
      const base = this.options.baseDelay || 1000;
      const max = this.options.maxDelay || 30000;
      const attempt = this.reconnectAttempts;
      const jitter = this.options.jitter || 'full';

      // 指数增长
      const exponential = base * Math.pow(2, attempt);
      const capped = Math.min(exponential, max);

      // 抖动策略
      switch (jitter) {
        case 'full':      // Kimi-K2.5 推荐：0 ~ capped
          return Math.floor(Math.random() * capped);
        case 'equal':     // GLM-5 推荐：capped/2 ~ capped*1.2
          return Math.floor(capped / 2 + Math.random() * capped * 0.7);
        default:
          return capped;
      }
    }

    // ========== 连接管理 ==========
    connect(): void {
      if (this.ws?.readyState === WebSocket.CONNECTING) return;

      this.updateStatus('CONNECTING');
      this.isManualClose = false;
      this.isAuthenticated = !this.currentToken; // 无token则视为已认证

      try {
        // 每次连接获取最新 Token（GLM-5 推荐）
        this.currentToken = this.options.authToken || localStorage.getItem('toke
  n') || undefined;

        // 构建 URL 和协议（Kimi-K2.5 推荐子协议传递）
        const url = this.buildUrl();
        const protocols = this.buildProtocols();

        this.ws = new WebSocket(url, protocols);
        this.setupEventHandlers();
      } catch (error) {
        this.scheduleReconnect();
      }
    }

    private buildUrl(): string {
      let url = this.options.url;
      // 如需 URL 传递 token，可在此添加
      return url;
    }

    private buildProtocols(): string[] {
      const protocols: string[] = [...(this.options.protocols || [])];
      if (this.currentToken) {
        protocols.push(`token.${this.currentToken}`); // 子协议传递
      }
      return protocols;
    }

    // ========== 事件处理 ==========
    private setupEventHandlers(): void {
      if (!this.ws) return;

      this.ws.onopen = () => {
        this.updateStatus('OPEN');
        this.reconnectAttempts = 0;
        this.startHeartbeat();

        // 发送认证消息（DeepSeek-V3.2 推荐）
        if (this.currentToken && !this.options.protocols?.length) {
          this.sendAuthMessage();
        }

        // 刷新待发送消息队列（DeepSeek-V3.2 推荐）
        this.flushPendingMessages();
      };

      this.ws.onmessage = (event) => {
        const data = this.parseMessage(event.data);

        // 认证响应处理
        if (data?.type === 'auth_response') {
          if (data.success) {
            this.isAuthenticated = true;
            this.flushPendingMessages();
          } else {
            this.handleAuthFailure(data.reason || 'Authentication failed');
          }
          return;
        }

        // 心跳响应
        if (data?.type === 'heartbeat') return;

        this.options.onMessage?.(event.data);
      };

      this.ws.onclose = (event) => {
        this.cleanup();

        if (this.isManualClose) {
          this.updateStatus('CLOSED');
          return;
        }

        // 认证错误检测（DeepSeek-R1 + Kimi-K2.5）
        if (this.isAuthError(event)) {
          this.handleAuthFailure(event.reason || 'Auth error');
          return;
        }

        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
      };
    }

    // ========== 认证失败处理 ==========
    private isAuthError(event: CloseEvent): boolean {
      // 标准错误码（DeepSeek-R1 推荐）
      if (event.code === 1008) return true;  // Policy Violation

      // 自定义错误码 4000-4999（Kimi-K2.5 推荐）
      if (event.code >= 4000 && event.code < 4500) return true;

      // 通过 reason 判断
      const authKeywords = ['UNAUTHORIZED', 'TOKEN_EXPIRED', 'AUTH_FAILED', '认
  证失败'];
      return authKeywords.some(k => event.reason?.includes(k));
    }

    private async handleAuthFailure(reason: string): Promise<void> {
      console.error('[WebSocket] Auth failed:', reason);
      this.updateStatus('CLOSED');

      // 尝试刷新 Token（GLM-5 + Kimi-K2.5 推荐）
      const newToken = await this.refreshToken();

      if (newToken) {
        this.currentToken = newToken;
        this.reconnectAttempts = 0;
        this.connect();
      } else {
        // 刷新失败，停止重连并通知
        this.options.onAuthFailure?.(reason);
        this.destroy();
      }
    }

    private async refreshToken(): Promise<string | null> {
      try {
        const res = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include'
        });
        if (!res.ok) return null;
        const { token } = await res.json();
        localStorage.setItem('token', token);
        return token;
      } catch {
        return null;
      }
    }

    private sendAuthMessage(): void {
      this.send(JSON.stringify({
        type: 'auth',
        token: this.currentToken,
        timestamp: Date.now()
      }));

      // 认证超时（DeepSeek-V3.2 推荐）
      setTimeout(() => {
        if (!this.isAuthenticated && this.ws?.readyState === WebSocket.OPEN) {
          this.ws.close(4001, 'Authentication timeout');
        }
      }, 5000);
    }

    // ========== 重连调度 ==========
    private scheduleReconnect(): void {
      const maxAttempts = this.options.maxAttempts ?? 10;
      if (maxAttempts > 0 && this.reconnectAttempts >= maxAttempts) {
        console.error('[WebSocket] Max attempts reached');
        this.updateStatus('CLOSED');
        return;
      }

      this.updateStatus('RECONNECTING');
      const delay = this.getReconnectDelay();

      console.log(`[WebSocket] Reconnect in ${delay}ms (attempt ${this.reconnect
  Attempts + 1})`);
      this.options.onReconnect?.(this.reconnectAttempts + 1, delay);

      this.reconnectTimer = setTimeout(() => {
        this.reconnectAttempts++;
        this.connect();
      }, delay);
    }

    // ========== 心跳机制 ==========
    private startHeartbeat(): void {
      const interval = this.options.heartbeatInterval || 30000;
      const msg = this.options.heartbeatMsg || '{"type":"ping"}';

      this.heartbeatTimer = setInterval(() => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(msg);
        }
      }, interval);
    }

    // ========== 消息队列（DeepSeek-V3.2 推荐） ==========
    send(data: any): boolean {
      const message = typeof data === 'string' ? data : JSON.stringify(data);

      if (this.ws?.readyState === WebSocket.OPEN && this.isAuthenticated) {
        this.ws.send(message);
        return true;
      }

      // 连接未就绪，加入队列
      this.pendingMessages.push(message);
      return false;
    }

    private flushPendingMessages(): void {
      if (!this.isAuthenticated) return;

      while (this.pendingMessages.length > 0) {
        const msg = this.pendingMessages.shift();
        this.ws?.send(msg);
      }
    }

    // ========== 工具方法 ==========
    private parseMessage(data: any): any {
      try {
        return JSON.parse(data);
      } catch {
        return null;
      }
    }

    private updateStatus(status: WSStatus): void {
      this.status = status;
      this.options.onStatusChange?.(status);
    }

    private cleanup(): void {
      this.reconnectTimer && clearTimeout(this.reconnectTimer);
      this.heartbeatTimer && clearInterval(this.heartbeatTimer);
      this.reconnectTimer = null;
      this.heartbeatTimer = null;
      this.ws = null;
    }

    disconnect(): void {
      this.isManualClose = true;
      this.cleanup();
      this.ws?.close(1000, 'Manual disconnect');
      this.updateStatus('CLOSING');
    }

    destroy(): void {
      this.disconnect();
      this.reconnectAttempts = 0;
      this.pendingMessages = [];
    }

    getStatus(): WSStatus {
      return this.status;
    }
  }

  // 使用示例
  const ws = new ResilientWebSocket({
    url: 'wss://api.example.com/ws',
    authToken: localStorage.getItem('token') || undefined,
    jitter: 'full',           // Kimi-K2.5 推荐全抖动
    maxAttempts: 10,
    heartbeatInterval: 30000,

    onMessage: (data) => console.log('Received:', data),
    onStatusChange: (status) => console.log('Status:', status),
    onAuthFailure: (reason) => {
      alert(`认证失败: ${reason}，请重新登录`);
      window.location.href = '/login';
    },
    onReconnect: (attempt, delay) => {
      console.log(`重连中... 第${attempt}次，${delay}ms后`);
    }
  });

  ws.connect();

  📋 关键配置建议

   参数                推荐值          说明
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   baseDelay           1000ms          初始重连间隔
   maxDelay            30000ms         避免用户等待过久
   jitter              'full'          最能分散服务器压力
   maxAttempts         10 (或 0无限)   根据业务场景调整
   heartbeatInterval   30000ms         防止 NAT 超时
   认证错误码          4000-4999       WebSocket 规范保留给应用层

  🔐 服务端配合要点

  1. 关闭码规范：认证失败使用 4001，正常关闭使用 1000
  2. 心跳响应：收到 ping 及时回复 pong
  3. Token 刷新端点：提供 /api/auth/refresh 支持静默刷新

  ──────────────────────────────────────────────────────────────────────────────
  总结：WebSocket 自动重连的核心是**"智能退避 + 精准错误分类"**，通过指数退避保
  护服务器，通过认证拦截保护用户体验，配合心跳和消息队列实现真正的"弹性连接"。
