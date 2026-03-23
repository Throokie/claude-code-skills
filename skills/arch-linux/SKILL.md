---
name: arch-linux
description: Arch Linux 系统特性（PEP 668、AUR Helpers）
---

# Arch Linux 系统特性

## Python 包管理

### PEP 668 限制
Arch Linux 从 2023 年开始实施 PEP 668，禁止直接用 pip 安装到系统 Python：

```bash
# ❌ 会报错：externally-managed-environment
pip install --user xxx

# ✅ 方案一：虚拟环境（推荐）
python -m venv .venv
.venv/bin/pip install xxx

# ✅ 方案二：AUR 包
paru -S python-xxx

# ⚠️ 方案三：强制安装（不推荐，可能破坏系统）
pip install --break-system-packages xxx
```

### 检查已安装的包
```bash
# 系统 Python 包
pacman -Qs python-xxx

# pip 包（如果有的话）
pip list --user
```

---

## AUR Helpers
```bash
# 检查是否有 AUR helper
which yay paru

# 搜索 AUR 包
paru -Ss xxx

# 安装 AUR 包
paru -S xxx
```

---

## 系统信息

```bash
# 检查发行版
cat /etc/os-release

# 检查内核版本
uname -r

# 检查 GPU
nvidia-smi 2>/dev/null || lspci | grep -i vga
```

---

## 常见陷阱

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| pip install 报错 | PEP 668 | 使用 venv 或 AUR |
| 某些包找不到 | 不在官方仓库 | 搜索 AUR |
| 内核模块问题 | 内核更新未重启 | 重启或重新加载模块 |