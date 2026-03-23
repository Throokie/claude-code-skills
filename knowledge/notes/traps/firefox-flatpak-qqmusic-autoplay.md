# Firefox Flatpak QQ 音乐自动播放修复

> 问题：QQ 音乐无法自动播放，且没有弹出权限请求

---

## ✅ 已完成的修复

| 项目 | 状态 |
|------|------|
| 权限缓存清除 | ✅ 完成 |
| camera/mic 权限重置 | ✅ 完成 |
| 自动播放设置修改 | ✅ 完成 |
| xdg-desktop-portal 重启 | ✅ 完成 |

---

## 🔍 问题分析

QQ 音乐在 Firefox 和 Chrome 都无法自动播放，可能有以下原因：

### 1. 自动播放策略限制
现代浏览器默认阻止自动播放（尤其是带音频的视频/音乐）

### 2. 网站需要用户交互
QQ 音乐可能需要先点击页面才能开始播放

### 3. DRM 保护
QQ 音乐使用 DRM 加密，需要 Widevine CDM

---

## 🛠️ 解决方案

### 方案 1：启用 Widevine DRM

```bash
# Firefox Flatpak 中启用 Widevine
# 1. 打开 about:addons
# 2. 插件 → 找到 Widevine Content Decryption Module
# 3. 启用"允许在任何时候运行"
```

### 方案 2：修改 about:config 设置

在 Firefox 地址栏输入 `about:config`，修改以下：

```
media.autoplay.default = 0          # 0=允许自动播放
media.autoplay.blocking_policy = 0  # 不阻止
media.block-autoplay-until-in-foreground = false
```

### 方案 3：添加 QQ 音乐到自动播放例外

```bash
# 1. 访问 https://y.qq.com/
# 2. 点击地址栏左侧的锁图标
# 3. 找到"自动播放" → 选择"允许"
```

### 方案 4：使用用户脚本绕过限制

安装 Tampermonkey 扩展，添加以下脚本：

```javascript
// ==UserScript==
// @name         QQ 音乐自动播放
// @match        https://y.qq.com/*
// @run-at       document-end
// ==/UserScript==

// 自动点击播放按钮
setTimeout(() => {
    const playBtn = document.querySelector('button.playbtn');
    if (playBtn) playBtn.click();
}, 1000);
```

---

## 📋 检查清单

- [ ] Widevine DRM 已启用
- [ ] media.autoplay.default = 0
- [ ] QQ 音乐网站权限已设置为"允许"
- [ ] 浏览器音量未静音
- [ ] PulseAudio/PipeWire 服务运行正常

---

## 🧪 测试步骤

1. **测试摄像头权限弹窗**
   ```
   访问：https://webcamtests.com/
   预期：Hyprland 显示系统级权限弹窗
   ```

2. **测试麦克风权限弹窗**
   ```
   访问：https://mictests.com/
   预期：Hyprland 显示系统级权限弹窗
   ```

3. **测试 QQ 音乐播放**
   ```
   访问：https://y.qq.com/
   预期：可以正常播放（可能需要点击一次页面）
   ```

---

## ⚠️ 注意事项

1. **自动播放限制是安全特性**，不建议完全禁用
2. **QQ 音乐可能需要登录** 才能播放完整歌曲
3. **部分歌曲有地区限制**

---

## 🔗 相关资源

- [Firefox 自动播放策略](https://support.mozilla.org/zh-CN/kb/autoplay)
- [Widevine DRM 配置](https://support.mozilla.org/zh-CN/kb/drm)
- [QQ 音乐网页版](https://y.qq.com/)

---

*最后更新：2026-03-20*
