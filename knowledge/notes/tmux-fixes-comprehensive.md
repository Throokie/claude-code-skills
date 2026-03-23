---
note: 由 2 个文件合并而成
---

# Tmux Fixes Comprehensive.Md

> 本文件由 2 个独立文件合并而成

---
## tmux-buffer-utf8-pitfall

# tmux 缓冲区积累导致 UTF-8 编码截断

**日期**: 2026-03-18
**场景**: Claude Smart Drive v4 长时间运行后出现乱码
**相关文件**: `/home/throokie/claude-drive-smart-v4.sh`

---

## 问题描述

**现象**:
- ws1 会话屏幕上出现 `` 样式的乱码字符
- 用户反馈"输入过一次这些乱七八糟的乱码"
- tmux 缓冲区积累 57 个旧缓冲区

**乱码示例**:
```
buffer37: ...没有正...  (应为"没有正常")
buffer36: ...项目定位分...  (应为"项目定位分析")
```

---

## 根本原因

**UTF-8 编码截断**:
1. tmux `clear-history` 未定期清理
2. 滚动缓冲区积累过多数据（57 个缓冲区，数 KB 旧内容）
3. 长 prompt（2500+ 字节）粘贴时，缓冲区过大导致编码边界对齐问题
4. UTF-8 多字节字符（中文 3 字节）被截断后显示为 ``

**tmux 缓冲区状态**（问题发生时）:
```
buffer57: 16 bytes
buffer56: 22 bytes
buffer55: 797 bytes
...
buffer0: 37 bytes
```

---

## 解决方案

**在 process_session() 函数开头添加清理**:

```bash
process_session() {
    log "=========================================="
    log "  process_session 开始执行"
    log "  会话：$SESSION"
    local cycle=$(inc_cycle)
    log "  轮次：$cycle"
    log "=========================================="

    # 清理旧的 tmux 缓冲区，防止编码混乱
    tmux clear-history -t "$SESSION" 2>/dev/null || true

    # 捕获当前屏幕内容
    local content=$(tmux capture-pane -t "$SESSION" -p -S -50)
    # ... 其他逻辑
}
```

**手动清理命令**:
```bash
tmux clear-history -t ws1
tmux clear-history -t ws2
```

---

## 验证方法

```bash
# 检查缓冲区数量
tmux list-buffers | wc -l

# 检查当前屏幕是否有乱码
tmux capture-pane -t "$SESSION" -p | grep -o '' | wc -l
# 应该返回 0

# 清理后验证
tmux clear-history -t "$SESSION"
tmux list-buffers | wc -l
```

---

## 设计原则

**tmux 自动化最佳实践**:
1. ✅ 定期清理滚动历史（`clear-history`）
2. ✅ 缓冲区大小适中（2500 字节以下安全）
3. ✅ 粘贴前确保缓冲区干净
4. ✅ 使用 `C-m` 而非 `Enter` 发送回车
5. ✅ 添加延迟等待粘贴完成（0.3s + 0.8s）

**UTF-8 编码保护**:
- 避免在大型缓冲区中粘贴多字节字符
- 定期清理 tmux 历史缓冲区
- 使用 `tmux clear-history` 而非重新创建窗口

---

## 相关文件

- 错误模式：`~/.claude/insights/pitfalls.md` (EP-024)
- 脚本位置：`/home/throokie/claude-drive-smart-v4.sh` process_session() 函数
- tmux 手册：`man tmux` (clear-history 命令)

---

## 关联问题

此问题与以下问题并列：
- EP-021: tmux paste-buffer 后回车不生效
- EP-022: 波浪号路径展开失败
- EP-023: AI 空闲检测误判后台命令

**共同点**: 都是 tmux 自动化细节问题，需要精确处理时序和状态管理。


---

## tmux-paste-buffer-enter-fix

# tmux paste-buffer 后回车不生效问题

**日期**: 2026-03-18
**场景**: Claude Smart Drive v4 自动化脚本
**相关文件**: `/home/throokie/claude-drive-smart-v4.sh`

---

## 问题描述

在使用 tmux automation 向会话发送长文本 prompt 时，发现 paste-buffer 后 Claude 没有执行命令。

**现象**:
- prompt 内容成功粘贴到 tmux 会话
- 但 Claude 没有响应执行（没有开始思考/输出）
- 日志显示"已发送驱动提示词"但实际未触发

---

## 根本原因

1. **`Enter` 键码问题**: tmux 中 `send-keys Enter` 可能不被识别为有效的回车键
2. **时序问题**: paste-buffer 后没有等待内容完全粘贴就发送回车

---

## 解决方案

```bash
# ❌ 错误写法（可能不生效）
tmux paste-buffer -t "$SESSION"
tmux send-keys -t "$SESSION" Enter
rm -f "$prompt_file"

# ✅ 正确写法
tmux paste-buffer -t "$SESSION"
sleep 0.5                              # 等待粘贴完成
tmux send-keys -t "$SESSION" C-m       # 使用 C-m (Ctrl+M) 标准回车键码
sleep 0.5                              # 确保回车被处理
rm -f "$prompt_file"
```

**关键点**:
1. 使用 `C-m` 代替 `Enter` - 这是 tmux 标准的回车键码
2. 在 paste 和 send-keys 之间添加延迟 - 确保内容粘贴完成
3. 在 send-keys 后添加延迟 - 确保回车被正确处理

---

## 代码位置

`/home/throokie/claude-drive-smart-v4.sh` 第 276-283 行：

```bash
log "→ 执行：tmux paste-buffer"
tmux paste-buffer -t "$SESSION" && log "✓ load-buffer 成功" || log "❌ load-buffer 失败"

log "→ 执行：发送 Enter"
sleep 0.5
tmux send-keys -t "$SESSION" C-m
sleep 0.5
rm -f "$prompt_file"
log "✓ 已发送驱动提示词"
```

---

## 相关 tmux 键码参考

| 键名 | tmux 写法 | 说明 |
|------|----------|------|
| 回车 | `C-m` | Ctrl+M，标准回车键码 |
| 换行 | `C-j` | Ctrl+J，Line Feed |
| 制表符 | `Tab` | Tab 键 |
|  escape | `Escape` | ESC 键 |
| 功能键 | `F1` - `F12` | F1-F12 |
| 方向键 | `Up`/`Down`/`Left`/`Right` | 方向键 |
| 组合键 | `C-c`/`C-d` | Ctrl+C, Ctrl+D |

**注**: tmux 中 `C-` 表示 Ctrl，`M-` 表示 Alt/Meta，`S-` 表示 Shift

---

## 验证方法

```bash
# 手动测试 paste + enter
tmux new-session -d -s test
echo "echo hello" | tmux load-buffer -
tmux paste-buffer -t test
sleep 0.5
tmux send-keys -t test C-m
sleep 1
tmux capture-pane -t test -p  # 应该输出 "hello"
tmux kill-session -t test
```

---

## 参考资料

- tmux send-keys 文档：`man tmux` (SEND-KEYS 部分)
- tmux 键码表：https://github.com/tmux/tmux/wiki/Getting-Started#keys


---

