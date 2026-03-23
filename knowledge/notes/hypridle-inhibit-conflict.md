# Hypridle D-Bus 抑制请求冲突排查经验

**日期**: 2026-03-19
**标签**: #hyprland #hypridle #dpms #screensaver

---

## 问题现象

用户报告"设置了抑制器停用，但没有自动熄屏"。

## 排查过程

### 1. 确认 hypridle 运行状态

```bash
pgrep -x hypridle
```

发现 hypridle 未运行 → 手动启动后恢复正常。

### 2. 检查冲突服务

```bash
# 检查其他锁屏服务
ps aux | grep -iE "(gnome-screensaver|xscreensaver|kscreenlocker|light-locker)"

# 检查 D-Bus 服务
dbus-send --session --print-reply --dest=org.freedesktop.DBus /org/freedesktop/DBus org.freedesktop.DBus.ListNames

# 检查 systemd 服务
systemctl --user list-units | grep -iE "(idle|lock|screen)"
```

**结果**: 无冲突服务，`org.freedesktop.ScreenSaver` 由 hypridle 正常占用。

### 3. 检查 D-Bus 抑制请求

```bash
# 测试应用是否可以发送抑制请求
dbus-send --session --print-reply --dest=org.freedesktop.ScreenSaver /org/freedesktop/ScreenSaver org.freedesktop.ScreenSaver.Inhibit string:"Firefox" string:"Video playback"
# 返回：uint32 1337 (抑制 cookie)
```

**发现**: Firefox 等应用可以成功发送 D-Bus 抑制请求，阻止系统进入空闲状态。

### 4. 检查 hypridle 配置

```bash
cat ~/.config/hypr/hypridle.conf | grep ignore_dbus_inhibit
# 输出：ignore_dbus_inhibit = false
```

**根因**: `ignore_dbus_inhibit = false` 导致 hypridle 尊重应用的 D-Bus 抑制请求。

---

## 解决方案

### 方案 A: 忽略所有 D-Bus 抑制请求（推荐）

修改 `~/.config/hypr/hypridle.conf`:

```conf
general {
    ignore_dbus_inhibit = true    # 忽略 dbus 空闲抑制请求，由用户通过 Waybar 手动控制
}
```

**优点**:
- 用户完全掌控熄屏行为
- Firefox/Chrome/视频播放器不会干扰
- 通过 Waybar 绿色眼睛手动切换抑制器状态

**缺点**:
- 视频播放时会按时锁屏（需要手动激活抑制器）

### 方案 B: 保持默认，手动管理

保持 `ignore_dbus_inhibit = false`，但注意：
- Firefox 播放视频时不会自动锁屏
- 需要手动关闭视频或激活抑制器

---

## 关键配置说明

### hypridle.conf general 段

```conf
general {
    lock_cmd = pidof hyprlock || hyprlock       # 锁屏时启动 hyprlock
    before_sleep_cmd = loginctl lock-session    # 睡眠前锁屏
    after_sleep_cmd = hyprctl dispatch dpms on  # 唤醒后打开屏幕
    ignore_dbus_inhibit = true                  # 是否忽略 dbus 空闲抑制请求
}
```

### listener 超时设置

```conf
# 5 分钟 (300 秒) - 发送提醒通知
listener { timeout = 300; on-timeout = notify-send ... }

# 5 分 30 秒 (330 秒) - 锁屏
listener { timeout = 330; on-timeout = loginctl lock-session }

# 6 分钟 (360 秒) - 熄屏
listener { timeout = 360; on-timeout = hyprctl dispatch dpms off }
```

---

## 相关命令速查

```bash
# 检查 hypridle 状态
pgrep -x hypridle

# 重启 hypridle
pkill hypridle && hypridle &

# 手动锁屏
loginctl lock-session

# 手动熄屏
hyprctl dispatch dpms off

# 检查 D-Bus ScreenSaver 所有者
dbus-send --session --print-reply --dest=org.freedesktop.DBus /org/freedesktop/DBus org.freedesktop.DBus.GetNameOwner string:"org.freedesktop.ScreenSaver"

# 获取进程 ID
dbus-send --session --print-reply --dest=org.freedesktop.DBus /org/freedesktop/DBus org.freedesktop.DBus.GetConnectionUnixProcessID string:":1.xxx"

# 发送抑制请求（测试用）
dbus-send --session --print-reply --dest=org.freedesktop.ScreenSaver /org/freedesktop/ScreenSaver org.freedesktop.ScreenSaver.Inhibit string:"Test" string:"Test"

# 释放抑制 cookie
dbus-send --session --print-reply --dest=org.freedesktop.ScreenSaver /org/freedesktop/ScreenSaver org.freedesktop.ScreenSaver.UnInhibit uint32:1337
```

---

## Waybar 抑制器逻辑

**Hypridle.sh 脚本状态**:

| hypridle 状态 | 抑制器状态 | Waybar 图标 class | 工具提示 |
|--------------|-----------|-------------------|----------|
| 运行中 | 未激活 | notactive | 系统将在无操作后自动锁屏 |
| 未运行 | 已激活 | active | 系统将保持常亮，不会自动锁屏 |

**切换逻辑**:
- 点击 Waybar 绿色眼睛 → 停止 hypridle → 抑制器激活 → 保持常亮
- 再次点击 → 启动 hypridle → 抑制器停用 → 自动熄屏恢复

---

## 常见冲突应用

以下应用会发送 D-Bus 抑制请求：

| 应用 | 场景 | 抑制行为 |
|------|------|----------|
| Firefox | 视频播放/全屏 | 阻止锁屏 |
| Chrome/Chromium | 视频播放/全屏 | 阻止锁屏 |
| VLC | 视频播放 | 阻止锁屏 |
| Spotify | 音频播放 | 可能阻止 |
| Steam | 游戏运行 | 阻止锁屏 |

**解决**: 设置 `ignore_dbus_inhibit = true` 后，所有应用的抑制请求都会被忽略。

---

## 经验教训

1. **hypridle 不运行时不会自动熄屏** - 需要先确认进程状态
2. **D-Bus 抑制请求可能干扰** - Firefox 等应用可以阻止空闲检测
3. **`ignore_dbus_inhibit` 是关键配置** - 决定是否尊重应用抑制请求
4. **Waybar 抑制器状态与 hypridle 运行状态相反** - hypridle 运行=抑制器未激活
5. **通知文案要准确** - 之前通知和实际状态相反，已修复

---

## 参考文档

- [Hypridle Wiki](https://wiki.hyprland.org/Hypr-Ecosystem/hypridle/)
- [ScreenSaver D-Bus 规范](https://specifications.freedesktop.org/screen-saver-spec/)
- 本地配置：`~/.config/hypr/hypridle.conf`
- 本地脚本：`~/.config/hypr/scripts/Hypridle.sh`
