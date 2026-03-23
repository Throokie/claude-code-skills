# NVIDIA + Hyprland 全屏黑屏/卡顿修复方案

**验证日期**: 2026-03-17
**系统**: CachyOS + Hyprland + NVIDIA RTX 3060 笔记本
**状态**: ✅ 验证有效

---

## 🔍 问题症状

1. 全屏时黑屏一段时间才显示
2. Alt+Shift+F 快捷键全屏卡顿
3. 视频放大/窗口最大化不流畅
4. 动画渲染延迟

---

## 🛠️ 修复方案

### 1. 内核模块配置 (必须，需重启生效)

**文件**: `/etc/modprobe.d/nvidia-drm.conf`

```bash
options nvidia-drm modeset=1 fbcon=1
```

**验证**:
```bash
cat /sys/module/nvidia_drm/parameters/modeset
# 应输出：Y
```

**更新 initramfs**:
```bash
sudo mkinitcpio -P
```

---

### 2. Hyprland 环境变量优化

**文件**: `~/.config/hypr/UserConfigs/ENVariables.conf`

```ini
### NVIDIA 核心环境变量 ###
env = LIBVA_DRIVER_NAME,nvidia
env = __GLX_VENDOR_LIBRARY_NAME,nvidia
env = NVD_BACKEND,direct
env = GSK_RENDERER,ngl

### 额外优化变量 ###
env = GBM_BACKEND,nvidia-drm
env = __GL_GSYNC_ALLOWED,1          # 自适应 VSync
env = __NV_PRIME_RENDER_OFFLOAD,1   # GPU 卸载渲染
env = __VK_LAYER_NV_optimus,NVIDIA_only
```

---

### 3. 动画帧数优化

**文件**: `~/.config/hypr/UserConfigs/UserAnimations.conf`

| 动画项 | 原值 | 新值 |
|--------|------|------|
| `windows` | 6 帧 | 3 帧 |
| `windowsIn` | 5 帧 | 2 帧 |
| `windowsOut` | 3 帧 | 2 帧 |
| `windowsMove` | 5 帧 | 2 帧 |
| `fade` | 3 帧 | 2 帧 |
| `workspaces` | 5 帧 | 3 帧 |

```ini
animation = windows, 1, 3, wind, slide
animation = windowsIn, 1, 2, winIn, slide
animation = windowsOut, 1, 2, smoothOut, slide
animation = windowsMove, 1, 2, wind, slide
animation = border, 1, 1, liner
animation = borderangle, 1, 180, liner, loop
animation = fade, 1, 2, smoothOut
animation = workspaces, 1, 3, overshot
```

---

### 4. 禁用高负载特效

**文件**: `~/.config/hypr/UserConfigs/UserDecorations.conf`

```ini
decoration {
  dim_inactive = false
  dim_special = 0

  shadow {
    enabled = false
  }

  blur {
    enabled = false
  }
}
```

---

### 5. Hyprland 系统设置

**文件**: `~/.config/hypr/configs/SystemSettings.conf`

```ini
misc {
  vfr = true        # 可变帧率
  vrr = 1           # NVIDIA 上用 1，不要用 2
  on_focus_under_fullscreen = 1
}

opengl {
  nvidia_anti_flicker = true
}

render {
  direct_scanout = 0
}

cursor {
  no_hardware_cursors = 0  # 启用硬件光标
}
```

---

## 📋 完整检查清单

- [ ] `/etc/modprobe.d/nvidia-drm.conf` 已创建
- [ ] `sudo mkinitcpio -P` 已执行
- [ ] 系统已重启
- [ ] `modeset` 验证输出 `Y`
- [ ] 环境变量已添加
- [ ] 动画帧数已减少
- [ ] 模糊/阴影已禁用
- [ ] `hyprctl reload` 已执行

---

## 🔗 参考来源

- Hyprland Wiki: https://wiki.hyprland.org/Nvidia/
- Arch Wiki NVIDIA: https://wiki.archlinux.org/title/NVIDIA
- Hyprland Environment Variables: https://wiki.hyprland.org/Configuring/Environment-variables/

---

## 📝 变更记录

| 日期 | 变更 |
|------|------|
| 2026-03-17 | 初始方案，验证有效 |
