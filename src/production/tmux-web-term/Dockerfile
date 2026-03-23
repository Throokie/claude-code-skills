# tmux-web-term v7 - Docker 镜像
FROM python:3.11-slim

# 设置工作目录
WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    tmux \
    asciinema \
    lrzsz \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 复制应用代码
COPY server.py index.html manifest.json sw.js offline.html icon.svg config.json.example ./
COPY certs/ ./certs/

# 创建虚拟环境
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# 安装 Python 依赖
RUN pip install --no-cache-dir websockets

# 创建非 root 用户
RUN useradd -m -u 1000 tmuxterm && \
    chown -R tmuxterm:tmuxterm /app
USER tmuxterm

# 暴露端口
EXPOSE 9865 9866

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:9866/health || exit 1

# 启动命令
CMD ["python", "server.py"]
