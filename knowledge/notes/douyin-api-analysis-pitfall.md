# 抖音图文/视频解析 API 调用经验总结

**日期**: 2026-03-15
**测试链接**: https://v.douyin.com/_scLWSYeHOM/

---

## 📊 方案对比

| 方案 | 状态 | 需要登录 | 难度 | 推荐度 |
|------|------|----------|------|--------|
| **douyin-mcp-server** | ✅ pip 可用 | ❌ 不需要 | ⭐ | ⭐⭐⭐⭐⭐ |
| **WechatSogou** | ✅ pip 可用 | ❌ 不需要 | ⭐⭐ | ⭐⭐⭐⭐ |
| **Evil0ctal** | ⚠️ 依赖冲突 | ❌ 不需要 | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **browser-use + Cookie** | ✅ 可用 | ✅ 需要 | ⭐⭐⭐ | ⭐⭐⭐ |
| **公共 API** | ⚠️ 不稳定 | ❌ 不需要 | ⭐ | ⭐⭐ |

---

## 🎯 最佳方案：纯 Python 解析（无需 API Key）

### 核心流程

```python
import re, requests, json

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X)',
    'Referer': 'https://www.iesdouyin.com/'
}

def parse_douyin(share_url):
    """解析抖音分享链接，返回图文/视频信息"""
    
    # Step 1: 获取重定向后的真实链接
    r = requests.get(share_url, headers=HEADERS)
    video_id = r.url.split('?')[0].strip('/').split('/')[-1]
    
    # Step 2: 判断是图文还是视频
    is_note = 'note' in r.url
    t = 'note' if is_note else 'video'
    
    # Step 3: 构造 iesdouyin 链接
    share_url = f'https://www.iesdouyin.com/share/{t}/{video_id}'
    
    # Step 4: 获取页面内容
    r = requests.get(share_url, headers=HEADERS)
    
    # Step 5: 解析 JSON 数据
    pattern = re.compile(r'window\._ROUTER_DATA\s*=\s*(.*?)</script>', re.DOTALL)
    m = pattern.search(r.text)
    
    if not m:
        return {'error': '未找到视频数据，可能需要登录'}
    
    d = json.loads(m.group(1).strip())
    
    # Step 6: 提取信息
    for k in ['note_(id)/page', 'video_(id)/page']:
        if k in d.get('loaderData', {}):
            i = d['loaderData'][k]['videoInfoRes']['item_list'][0]
            
            result = {
                'type': '图文' if 'images' in i else '视频',
                'desc': i.get('desc', ''),
                'author': i.get('author', {}).get('nickname', ''),
            }
            
            # 提取图片/视频 URL
            if 'images' in i and i['images']:
                result['media'] = [
                    img['url_list'][0].split('~')[0] + '~tplv-dy-awemimage-origin.jpeg'
                    for img in i['images']
                ]
            else:
                video = i.get('video', {})
                play_addr = video.get('play_addr', {})
                url_list = play_addr.get('url_list', [])
                result['media'] = [url_list[0]] if url_list else []
            
            return result
    
    return {'error': '未找到有效数据'}
```

### 调用示例

```python
result = parse_douyin('https://v.douyin.com/_scLWSYeHOM/')
print(json.dumps(result, ensure_ascii=False, indent=2))
```

### 输出示例

```json
{
  "type": "图文",
  "desc": "OpenClaw 避坑指南 -1。多智能体环境下 openclaw 文件发送失败深度解析",
  "author": "你可以叫我 KK",
  "media": [
    "https://p11-sign.douyinpic.com/tos-cn-i-0813c001/...~tplv-dy-awemimage-origin.jpeg",
    "https://p26-sign.douyinpic.com/tos-cn-i-0813/...~tplv-dy-awemimage-origin.jpeg"
  ]
}
```

---

## 🔧 下载图片（带 Referer 绕过防盗链）

```python
def download_images(media_urls, save_dir):
    """下载图片，需要设置 Referer"""
    import os
    os.makedirs(save_dir, exist_ok=True)
    
    HEADERS = {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X)',
        'Referer': 'https://www.iesdouyin.com/'
    }
    
    for idx, img_url in enumerate(media_urls):
        try:
            r = requests.get(img_url, headers=HEADERS, timeout=30)
            if r.status_code == 200 and len(r.content) > 1000:
                filename = f'{idx+1:02d}.jpg'
                with open(os.path.join(save_dir, filename), 'wb') as f:
                    f.write(r.content)
                print(f'✅ {idx+1}. {filename}: {len(r.content)/1024:.1f} KB')
            else:
                print(f'❌ {idx+1}: HTTP {r.status_code}')
        except Exception as e:
            print(f'❌ {idx+1}: {e}')
```

---

## 🚫 踩坑记录

### 坑 1：公共 API 不稳定

```bash
# 测试过的公共 API（大多不可用）
curl http://api.douyin.wtf/parse        # ❌ 无响应
curl https://api.tikhub.io/...           # ❌ 404 Not Found
```

**原因**：免费 API 服务器成本高，容易关停

### 坑 2：直接下载图片 403 Forbidden

```python
# 错误：没有 Referer
requests.get(img_url)  # ❌ HTTP 403

# 正确：带 Referer
requests.get(img_url, headers={'Referer': 'https://www.iesdouyin.com/'})  # ✅
```

### 坑 3：GitHub 克隆失败（网络问题）

```bash
git clone https://github.com/Evil0ctal/Douyin_TikTok_Download_API.git
# ❌ TLS connect error: unexpected eof while reading

# 解决方案：用 zip 下载
curl -sL "http://codeload.github.com/Evil0ctal/Douyin_TikTok_Download_API/zip/refs/heads/main" -o evil0ctal.zip
```

### 坑 4：pydantic_core 编译失败

```bash
pip install -r requirements.txt
# ❌ Failed to build pydantic_core

# 原因：Python 3.14 没有预编译 wheel
# 解决方案：使用纯 Python 解析方案，无需依赖
```

---

## 📦 已部署工具

### 1. douyin-mcp-server（pip 安装）

```bash
pip install --break-system-packages douyin-mcp-server
```

**位置**: `~/.local/lib/python3.14/site-packages/douyin_mcp_server/`

**特点**：
- ✅ 无需 API Key 可解析
- ✅ 支持音视频下载
- ⚠️ 语音转写需要阿里云 API Key

### 2. WechatSogou（pip 安装）

```bash
pip install --break-system-packages wechatsogou
# 修复 werkzeug 导入
sed -i 's/werkzeug.contrib.cache/werkzeug.caching/g' $(python3 -c 'import sys; print(sys.path[1])')/wechatsogou/filecache.py
```

**特点**：
- ✅ 搜索微信公众号文章
- ⚠️ 需要处理验证码

### 3. Evil0ctal（源码）

**位置**: `~/src/Douyin_TikTok_Download_API/`

**特点**：
- ✅ 功能最全（抖音/TikTok/快手/B 站）
- ⚠️ 依赖有冲突，需要修复

### 4. weixin_crawler（源码）

**位置**: `~/src/weixin_crawler/`

**特点**：
- ✅ 支持历史文章爬取
- ⚠️ 需要配置 MongoDB/Redis/AnyProxy

---

## 🎯 推荐工作流

### 场景 1：快速解析单个链接

```python
# 使用纯 Python 方案（无需安装）
python3 -c "
import re, requests, json
H = {'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X)', 'Referer': 'https://www.iesdouyin.com/'}
url = '抖音链接'
r = requests.get(url, headers=H)
vid = r.url.split('?')[0].strip('/').split('/')[-1]
t = 'note' if 'note' in r.url else 'video'
r = requests.get(f'https://www.iesdouyin.com/share/{t}/{vid}', headers=H)
m = re.search(r'window\._ROUTER_DATA\s*=\s*(.*?)</script>', r.text, re.DOTALL)
if m:
    d = json.loads(m.group(1).strip())
    i = d['loaderData']['note_(id)/page']['videoInfoRes']['item_list'][0]
    print('图文' if 'images' in i else '视频')
    for img in i.get('images', [])[:3]:
        print(img['url_list'][0])
"
```

### 场景 2：批量下载图片

```bash
# 使用已保存的脚本
python3 ~/src/user-scripts/skills/douyin-auto/scripts/download.py "链接" ~/Downloads/douyin/
```

### 场景 3：MCP 集成（Claude Code）

```json
// ~/.claude/mcp.json
{
  "mcpServers": {
    "douyin": {
      "command": "douyin-mcp-server"
    }
  }
}
```

---

## 📚 参考资源

| 资源 | 链接 |
|------|------|
| Evil0ctal GitHub | https://github.com/Evil0ctal/Douyin_TikTok_Download_API |
| douyin-mcp-server PyPI | https://pypi.org/project/douyin-mcp-server/ |
| WechatSogou GitHub | https://github.com/chyroc/WechatSogou |
| weixin_crawler GitHub | https://github.com/wonderfulsuccess/weixin_crawler |

---

## 🔑 核心要点

1. **无需登录**：解析链接获取图片 URL 不需要登录
2. **防盗链**：下载图片必须带 `Referer: https://www.iesdouyin.com/`
3. **User-Agent**：模拟 iOS Safari 请求
4. **关键正则**：`window\._ROUTER_DATA\s*=\s*(.*?)</script>`
5. **图片高清**：URL 后加 `~tplv-dy-awemimage-origin.jpeg`

