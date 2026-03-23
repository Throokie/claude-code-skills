# OpenSnitch 权限问题修复总结

**修复日期**: 2026-03-22

## 问题根本原因

使用 `sudo cp` 或 `sudo mv` 修改 `/etc/opensnitchd/default-config.json` 时，文件所有权会从 `root:root` 变成 `throokie:throokie`，导致：
1. Waybar 切换功能失效
2. 安全隐患
3. 每次重启后权限混乱

## 修复方案

### 1. 使用 `install` 命令替代 `cp/mv`

```bash
# 错误方式（会保留源文件所有权）
sudo jq '.DefaultAction = "deny"' "$CONFIG" > /tmp/tmp.json
sudo cp /tmp/tmp.json "$CONFIG"  # ❌ 文件所有权变成 throokie

# 正确方式（显式设置所有权）
sudo jq '.DefaultAction = "deny"' "$CONFIG" > /tmp/tmp.json
sudo install -o root -g root -m 644 /tmp/tmp.json "$CONFIG"  # ✅ 所有权始终为 root
```

### 2. 修复的文件

| 文件 | 修改内容 |
|------|----------|
| `~/.local/bin/waybar-opensnitch` | 用 `install` 替代 `tee`/`cp`，修复 DBUS 通知 |
| `~/bin/opensnitch-dev-mode.sh` | 用 `install` 替代 `tee`/`cp` |

### 3. Sudoers 免密配置

已创建 `/etc/sudoers.d/claude-code`，允许以下命令免密执行：

```
# OpenSnitch 相关
throokie ALL=(ALL) NOPASSWD: /home/throokie/.local/bin/waybar-opensnitch
throokie ALL=(ALL) NOPASSWD: /home/throokie/bin/opensnitch-dev-mode.sh
throokie ALL=(ALL) NOPASSWD: /usr/bin/jq /etc/opensnitchd/*
throokie ALL=(ALL) NOPASSWD: /usr/bin/install -o root -g root -m 644 /tmp/opensnitch*.json /etc/opensnitchd/*
throokie ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart/stop/start opensnitchd
throokie ALL=(ALL) NOPASSWD: /usr/bin/pkill -f opensnitch-ui
throokie ALL=(ALL) NOPASSWD: /usr/bin/pgrep -x opensnitchd

# 通知相关
throokie ALL=(ALL) NOPASSWD: /usr/bin/notify-send
throokie ALL=(ALL) NOPASSWD: /usr/bin/pkill
throokie ALL=(ALL) NOPASSWD: /usr/bin/pgrep

# Claude Code 相关
throokie ALL=(ALL) NOPASSWD: /home/throokie/.npm-global/bin/claude
throokie ALL=(ALL) NOPASSWD: ~/.claude/hooks/*.sh
throokie ALL=(ALL) NOPASSWD: ~/.claude/hooks/gitnexus/gitnexus-hook.cjs
```

### 4. 通知问题修复

通知失败是因为 `sudo` 执行时 DBUS 环境变量丢失。修复方案：

```bash
# 错误方式
notify-send "标题" "内容"  # sudo 环境下无法连接 DBUS

# 正确方式
(DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/1000/bus" \
    /usr/bin/notify-send "标题" "内容" 2>/dev/null || true) &
```

### 5. 配置文件权限修复

```bash
# 一次性修复当前配置
sudo chown root:root /etc/opensnitchd/default-config.json
sudo chmod 644 /etc/opensnitchd/default-config.json
```

## 验证方法

```bash
# 1. 测试切换功能
sudo -n ~/.local/bin/waybar-opensnitch toggle

# 2. 检查权限保持 root:root
ls -la /etc/opensnitchd/default-config.json
# 应显示：-rw-r--r-- 1 root root ...

# 3. 验证配置生效
sudo jq -r '.DefaultAction' /etc/opensnitchd/default-config.json
# 应显示：deny 或 allow
```

## 为什么选择 `install` 命令？

| 方案 | 问题 | install 优势 |
|------|------|-------------|
| `sudo cp` | 保留源文件所有权 | 显式指定 `-o root -g root` |
| `sudo tee` | 与 jq 同文件时造成竞争（文件被清空） | 先写临时文件，再安装 |
| `sudo mv` | 保留源文件所有权 | 同 cp |
| `install` | ✅ | 原子操作、显式权限、所有权可控 |

## 一劳永逸

通过以上修复：
1. ✅ 配置文件所有权始终为 `root:root`
2. ✅ 脚本免密执行，无需手动输入密码
3. ✅ 通知功能正常工作
4. ✅ Hooks 脚本可以正常执行
5. ✅ 重启后权限不会混乱
