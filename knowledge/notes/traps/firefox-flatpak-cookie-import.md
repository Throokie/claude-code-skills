# Firefox Flatpak Cookie 导入问题修复

> 问题：`Permission denied to set cookie`

---

## ✅ 已完成的修复

### 1. 数据迁移
- 已将主配置文件 `gbk7t5tr.default-release` 迁移到 Flatpak
- Cookie 文件 `cookies.sqlite` 已存在
- 所有扩展、书签、密码已迁移

### 2. 权限扩展
```bash
# 已添加的权限
--filesystem=home
--socket=session-bus
--socket=system-bus
```

---

## 🔧 Cookie 导入问题解决方案

### 方案 1：使用兼容的 Cookie 导入扩展（推荐）

安装以下扩展之一：

**Cookie Editor** (最兼容)
```
https://addons.mozilla.org/firefox/addon/cookie-editor/
```

**EditThisCookie**
```
https://addons.mozilla.org/firefox/addon/editthiscookie/
```

### 方案 2：直接复制 cookies.sqlite 文件

```bash
# 1. 关闭 Firefox
pkill firefox

# 2. 复制 Cookie 数据库
cp ~/.mozilla/firefox/gbk7t5tr.default-release/cookies.sqlite \
   ~/.var/app/org.mozilla.firefox/.mozilla/firefox/f1iddzyh.default/cookies.sqlite

cp ~/.mozilla/firefox/gbk7t5tr.default-release/cookies.sqlite-wal \
   ~/.var/app/org.mozilla.firefox/.mozilla/firefox/f1iddzyh.default/cookies.sqlite-wal

# 3. 启动 Firefox
firefox-flatpak
```

### 方案 3：使用 about:config 修改 Cookie 策略

1. 打开 `about:config`
2. 修改以下设置：

```
network.cookie.sameSite.laxByDefault = false
network.cookie.sameSite.noneRequiresSecure = false
network.cookie.import-export.enabled = true
```

### 方案 4：使用 WebExtensions API 导入

如果你在使用自定义脚本导入 Cookie，确保：

1. 使用 `browser.cookies.Permission` API
2. 在 manifest.json 中声明权限：
```json
{
  "permissions": [
    "cookies",
    "*://*.tailscale.com/*",
    "*://*.github.com/*"
  ]
}
```

---

## ⚠️ 关于错误中的 Cookie

```json
{
  "domain": ".tailscale.com",
  "name": "rl_page_init_referrer",
  "value": "RS_ENC_v3_..."
}
```

这个 Cookie 导入失败可能是因为：

1. **SameSite 属性** - Firefox 90+ 默认启用 SameSite=lax
2. **Secure 属性** - 跨站 Cookie 需要 Secure 标志
3. **扩展权限不足** - 导入扩展没有 `tailscale.com` 的权限

---

## 🛠️ 调试步骤

### 1. 检查 Cookie 权限
```
about:preferences#privacy
→ 权限 → Cookie 和数据 → 管理例外
```

### 2. 查看 Cookie 导入日志
```
about:devtools
→ 浏览器控制台 (Ctrl+Shift+J)
→ 筛选 "cookie"
```

### 3. 测试导入
```
about:config
→ 搜索 "cookie"
→ 检查导入相关设置
```

---

## 📋 快速修复命令

```bash
# 重置 Firefox Flatpak 权限
flatpak override --user --reset org.mozilla.firefox

# 重新添加必要权限
flatpak override --user \
    --filesystem=home \
    --socket=session-bus \
    --socket=system-bus \
    org.mozilla.firefox

# 重启 Firefox
pkill firefox
sleep 2
firefox-flatpak
```

---

## 🔗 相关资源

- [Firefox Cookie API 文档](https://developer.mozilla.org/zh-CN/docs/Mozilla/Add-ons/WebExtensions/API/cookies)
- [SameSite Cookie 说明](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Headers/Set-Cookie/SameSite)
- [Flatpak 权限管理](https://docs.flatpak.org/en/latest/flatpak-command-reference.html#flatpak-override)

---

*最后更新：2026-03-20*
