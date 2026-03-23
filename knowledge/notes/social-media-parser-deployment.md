# 2026-03-15 社交媒体解析工具部署总结

**日期**: 2026-03-15
**主题**: 抖音、小红书、Bilibili、微信视频号解析工具部署

---

## 部署概览

| 平台 | 工具 | 位置 | 状态 |
|------|------|------|------|
| 抖音 | douyin-parser (自研) | `~/src/user-scripts/skills/douyin-parser/` | ✅ 已部署 |
| 小红书 | XHS-Downloader | `~/src/XHS-Downloader/` | ✅ 已部署 |
| Bilibili | bilibili-auto + MCP | `~/src/user-scripts/skills/bilibili-auto/` | ✅ 已部署 |
| 微信视频号 | WeChatChannelsDownloader | `~/src/wx_channel/` | ✅ 已编译 |

---

## 抖音解析器

### 部署方式
**自研纯 Python 方案**，无需外部依赖。

### 安装步骤
```bash
# 已有 Skill，无需额外安装
位置：~/src/user-scripts/skills/douyin-parser/scripts/parse.py
```

### 使用方法
```bash
# 基础解析
python3 ~/src/user-scripts/skills/douyin-parser/scripts/parse.py "https://v.douyin.com/xxx"

# 下载媒体
python3 ~/src/user-scripts/skills/douyin-parser/scripts/parse.py "链接" ~/Downloads/douyin/

# 快捷命令
douyin "链接"
```

### 踩坑记录
1. **403 Forbidden** → 添加 Referer 头 `'https://www.iesdouyin.com/'`
2. **f-string 语法错误** → Python 3.14 不支持 f-string 内嵌条件表达式
3. **短链接重定向** → 必须跟随重定向获取真实 ID

---

## 小红书解析器

### 部署方式
**JoeanAmier/XHS-Downloader** - GitHub 10K+ stars 开源项目

### 安装步骤
```bash
# 1. 下载源码
cd /tmp && curl -sL -o xhs.zip "https://github.com/JoeanAmier/XHS-Downloader/archive/refs/heads/master.zip"
unzip xhs.zip && mv XHS-Downloader-master ~/src/XHS-Downloader

# 2. 安装依赖
cd ~/src/XHS-Downloader
pip install -r requirements.txt --break-system-packages

# 3. 运行
python3 main.py -u "小红书链接"
```

### 依赖安装遇到的问题
- **uvicorn 版本冲突**: 原有 uvicorn 0.41.0 → 降级到 0.40.0
- **fastapi 版本冲突**: 原有 fastapi 0.135.1 → 降级到 0.128.5

### 使用方法
```bash
# 基础下载
python3 ~/src/XHS-Downloader/main.py -u "https://www.xiaohongshu.com/explore/xxx"

# 指定保存目录
python3 ~/src/XHS-Downloader/main.py -u "链接" -w ~/Downloads/xhs/

# 使用 Cookie 获取高清画质
python3 ~/src/XHS-Downloader/main.py -u "链接" --cookie "your_cookie"
```

### 踩坑记录
1. **GitHub TLS 错误**: `git clone` 失败，改用 `curl -sL` 下载 zip
2. **pip 包不存在**: `xhs-downloader` 在 PyPI 上找不到，必须源码运行
3. **依赖版本冲突**: 项目要求特定版本，安装前查看 requirements.txt

---

## Bilibili 解析器

### 部署方式
**双方案**：
1. **bilibili-auto Skill** - 基于 Neo 捕获的真实 API
2. **bilibili-video-mcp** - PyPI 上的 MCP 服务

### 安装步骤
```bash
# 方案 1: bilibili-auto (已有)
位置：~/src/user-scripts/skills/bilibili-auto/

# 方案 2: bilibili-video-mcp
pip install bilibili-video-mcp --break-system-packages

# 方案 3: 下载源码
curl -sL -o bili.zip "https://github.com/Fymeda/bilibili-mcp/archive/refs/heads/main.zip"
```

### 使用方法
```bash
# 获取视频信息
neo exec "https://api.bilibili.com/x/web-interface/view?bvid=BV1xx" --tab bilibili

# 提取摘要
neo exec "https://api.bilibili.com/x/web-interface/view?bvid=BV1xx" --tab bilibili | \
  jq '{title: .data.title, views: .data.stat.view}'

# MCP 调用 (如已配置)
mcp run bilibili-video-mcp --url "https://www.bilibili.com/video/BV1xx"
```

### 踩坑记录
1. **GitHub TLS 错误**: 同上，用 curl 代替 git clone
2. **需要登录**: 部分 API 需要登录状态，bilibili-auto 已处理
3. **WBI 签名**: 部分 API 需要签名，neo 工具自动处理

---

## 微信视频号解析器

### 部署方式
**KingsleyYau/WeChatChannelsDownloader** - C++ 实现

### 安装步骤
```bash
# 1. 下载源码
cd /tmp && curl -sL -o wx.zip "https://github.com/KingsleyYau/WeChatChannelsDownloader/archive/refs/heads/master.zip"
unzip wx.zip && mv WeChatChannelsDownloader-master ~/src/wx_channel

# 2. 编译 (需要 gcc/make)
cd ~/src/wx_channel
make
```

### 使用方法
```bash
# 下载视频 (需要先从浏览器抓包获取 URL)
~/src/wx_channel/main "http://wxapp.tc.qq.com/xxx"
```

### 踩坑记录
1. **需要抓包**: 必须先从浏览器获取视频 URL
2. **XOR 解密**: 视频文件前 20000 字节与 key 异或
3. **QUIC 协议**: 需要屏蔽 QUIC (UDP/443) 才能抓到 HTTP 请求
4. **编译错误**: C++17 兼容性问题，修复了 2 处错误
   - `strtoul(q, '\0', 16)` → `strtoul(q, NULL, 16)`
   - `ptr > 0` → `ptr != NULL` (指针比较)

### 编译修复

```bash
# 修复 Arithmetic.cpp
code[len++] = (char)strtoul(q, NULL, 16);  # 原为 '\0'

# 修复 StringHandle.h
if ((pC_Begin = strIstr(pData, pBegin)) != NULL) {  # 原为 > 0
```

---

## 统一 Skill 创建

创建 `social-media-parser` Skill，整合所有平台解析能力：

```bash
位置：~/src/user-scripts/skills/social-media-parser/SKILL.md
```

### 自动触发规则
| 用户输入包含 | 自动调用 |
|-------------|----------|
| "v.douyin.com" | douyin-parser |
| "xiaohongshu.com" | XHS-Downloader |
| "bilibili.com" | bilibili-auto |
| "解析抖音/小红书/B 站" | social-media-parser |

---

## 平台对比总结

| 平台 | 解析难度 | 是否需要登录 | 下载质量 | 推荐工具 |
|------|----------|-------------|----------|----------|
| 抖音 | ⭐⭐ | 否 | 高清 | douyin-parser |
| 小红书 | ⭐⭐⭐ | 否 (Cookie 后更好) | Cookie 后高清 | XHS-Downloader |
| Bilibili | ⭐⭐ | 否 | 高清 | bilibili-auto |
| 微信视频号 | ⭐⭐⭐⭐⭐ | 是 | 原画 | WeChatChannelsDownloader |

---

## 通用踩坑

### 1. GitHub TLS 连接失败
**问题**: `TLS connect error: error:0A000126:SSL routines::unexpected eof while reading`

**解决**: 使用 `curl -sL` 代替 `git clone`，下载 zip 文件

### 2. pip 包不存在
**问题**: 很多优秀工具没发布到 PyPI

**解决**: 直接下载源码，阅读 requirements.txt 安装依赖

### 3. 依赖版本冲突
**问题**: 项目要求的版本与系统已安装版本不同

**解决**: 使用虚拟环境或接受降级

### 4. 反爬虫机制
**问题**: 403 Forbidden、需要登录

**解决**: 添加 Referer 头、配置 Cookie

---

## 下一步计划

1. [ ] 测试各平台实际解析效果
2. [ ] 配置 Cookie 到相关工具
3. [ ] 创建统一的 Web UI（可选）
4. [ ] 添加更多平台支持（快手、YouTube 等）

---

## 参考资源

- [抖音 API 调用经验](~/.claude/insights/learnings/2026-03-15-douyin-api-pitfall.md)
- [XHS-Downloader GitHub](https://github.com/JoeanAmier/XHS-Downloader)
- [B 站 API 文档](~/.neo/schemas/api.bilibili.com.json)
- [微信视频号下载原理](~/src/wx_channel/README.md)

---
