# Kitty 右键菜单失灵修复

**日期**: 2026-03-15
**问题**: 右键点击报错 `Unknown action: press`

---

## 问题描述

用户报告 kitty 终端右键菜单失灵，错误提示：
```
Failed to parse action
press grabbed show_context_menu
'Unknown action: press'
```

---

## 根本原因

配置文件 `~/.config/kitty/kitty.conf` 第 137 行语法错误：

```conf
# ❌ 错误写法
mouse_map right press grabbed show_context_menu
```

**问题**：`grabbed` 模式不支持 `show_context_menu` 动作，导致 kitty 解析失败。

---

## 修复方案

```conf
# ✅ 正确写法
mouse_map right press ungrabbed show_context_menu
```

---

## 修改文件

| 文件 | 变更 |
|------|------|
| `~/.config/kitty/kitty.conf` | 第 137 行 `grabbed` → `ungrabbed` |
| `~/dotfiles/.config/kitty/kitty.conf` | 同步修复 |

---

## 验证

1. 配置语法检查通过
2. 重启 kitty 后右键菜单正常工作

---

## 相关记录

- 错误截图：用户已提供
- 修复时间：2026-03-15
