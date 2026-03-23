# 踩坑：权限配置导致 Discord 频道消息无法接收

**日期**: 2026-03-15
**主题**: openclaw 用户无权访问 throokie 用户目录

---

## 问题现象

- **私聊正常**，但**频道消息收不到**
- Bot 能发送消息到频道
- 日志显示 `logged in to discord` 正常

---

## 错误排查过程（❌ 走了弯路）

### 第一阶段：调试 Gateway 连接
1. 检查 Gateway intents ✅ 正常
2. 检查 WebSocket 连接 ✅ 正常
3. 检查 `gatewayConnected` 状态 ⚠️ false
4. 分析 GatewayPlugin 源码，找 READY 事件逻辑
5. 重启服务验证 ✅ 恢复正常

**结论**：Gateway 连接状态异常导致无法接收频道消息

### 第二阶段：权限问题暴露（但被忽略了！）

重启后日志明确显示：
```
2026-03-15T17:05:23.594+08:00 [boot] failed to read BOOT.md: EACCES: permission denied,
  open '/home/throokie/.openclaw/workspace-agent1/BOOT.md'
2026-03-15T17:05:23.602+08:00 [hooks/boot-md] boot-md failed for agent startup run
```

**但我居然没看到！** 继续调试 Discord Gateway，完全忽略了权限错误。

### 第三阶段：用户指出问题

用户明确指出：
> "你说得对！权限配置确实有问题"

然后检查发现：
- **openclaw 服务以 `openclaw` 用户运行**
- **agent 配置在 `/home/throokie/.openclaw/agents/`（throokie 用户目录）**
- **openclaw 用户无权访问 throokie 用户的目录**

---

## 根本原因

```
服务运行用户：openclaw
配置目录所有者：throokie
结果：EACCES permission denied
```

**为什么私聊正常**：
- 私聊消息处理不依赖 agent workspace 目录
- 只需要 Discord Bot token 和基本 Gateway 连接

**为什么频道消息失败**：
- 频道消息需要路由到 agent1/2/3
- agent 无法初始化（workspace 目录权限拒绝）
- 消息处理流程中断

---

## 解决方案

```bash
# 1. 复制 agent 配置到 openclaw 用户目录
sudo mkdir -p /home/openclaw/.openclaw/agents
sudo cp -r /home/throokie/.openclaw/agents/* /home/openclaw/.openclaw/agents/

# 2. 创建工作目录
sudo mkdir -p /home/openclaw/.openclaw/workspace-agent{1,2,3}

# 3. 设置权限
sudo chown -R openclaw:openclaw /home/openclaw/.openclaw/agents/
sudo chown -R openclaw:openclaw /home/openclaw/.openclaw/workspace-agent{1,2,3}

# 4. 重启服务
sudo systemctl restart openclaw
```

---

## 反思：为什么我没早点发现？

### 错误 1：没有仔细读日志
日志明确显示 `EACCES: permission denied`，但我：
- ❌ 看到了但没当回事
- ❌ 继续分析 Gateway 源码
- ❌ 把时间花在错误的方向上

### 错误 2：没有系统性排查
应该按优先级检查：
1. ✅ 服务是否运行 → `systemctl status`
2. ✅ 是否有错误日志 → `journalctl -u openclaw`
3. ❌ **权限检查** → 被跳过了！
4. ❌ 配置验证 → 只看了 openclaw.json，没看实际目录权限

### 错误 3：环境意识不足
- 用户系统是 CachyOS，多用户环境
- openclaw 是独立系统用户
- 但我默认当作单用户环境处理

### 错误 4：用户提示后还没立刻反应过来
用户说"权限配置确实有问题"后，应该：
1. 立刻检查所有 EACCES 错误
2. 检查目录所有权
3. 验证服务运行用户

---

## 教训总结

### 调试优先级
```
1. 权限错误 (EACCES) ← 最高优先级
2. 服务状态
3. 配置语法
4. 网络连接
5. 业务逻辑
```

### 多用户环境检查清单
- [ ] 服务运行用户是谁？`ps aux | grep <service>`
- [ ] 配置目录所有者？`ls -la <config-dir>`
- [ ] 工作目录权限？`namei -l <path>`
- [ ] 日志文件可写？`test -w <log-file>`

### 日志阅读原则
1. **先看错误级别**：ERROR > WARN > INFO
2. **先读 EACCES**：权限错误优先级最高
3. **先读启动阶段**：bootstrap 错误影响全局

---

## 验证命令

```bash
# 检查服务运行用户
ps aux | grep openclaw | grep -v grep

# 检查目录权限
ls -la /home/openclaw/.openclaw/
ls -la /home/throokie/.openclaw/

# 检查 agent 目录
sudo ls -la /home/openclaw/.openclaw/agents/

# 检查工作目录
sudo ls -la /home/openclaw/.openclaw/workspace-agent1/

# 查看权限错误日志
sudo journalctl -u openclaw | grep -iE "(EACCES|permission)"
```

---

*记录于 2026-03-15 17:45*
*教训：看到 EACCES 先解决权限，不要瞎分析！*
