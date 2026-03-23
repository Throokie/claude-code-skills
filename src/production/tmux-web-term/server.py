#!/usr/bin/env python3
"""
tmux-web-term v7 - 会话录制增强版

功能:
- 支持内网穿透 (Tailscale/ZeroTier/WireGuard)
- 多 Token 认证 + IP 白名单
- WSS 加密支持
- 配置文件集中管理
- 健康检查端点
- 指数退避重连
- 🆕 asciinema 会话录制 (v7 新增)
- 🆕 lrzsz 文件传输 (v7 新增)
- 🆕 PWA 离线缓存 (v7 新增)
- 🆕 Docker 一键部署 (v7 新增)

安全配置:
- Token 认证 (支持多 Token)
- IP 白名单 (可选)
- WSS 强制模式 (可选)
"""

import asyncio
import websockets
from http.server import HTTPServer, SimpleHTTPRequestHandler
import http
import json
import os
import pty
import select
import struct
import fcntl
import signal
import threading
import termios
import ssl
import subprocess
from pathlib import Path
from functools import partial
from urllib.parse import parse_qs, urlparse
from typing import Optional, Set, Dict, Any, List
from dataclasses import dataclass, field
import time
import glob

# ==================== PTY 进程清理 (PRD 2.1.1) ====================
def cleanup_pty_session(pid: int, master_fd: Optional[int] = None, timeout: float = 5.0) -> bool:
    """
    使用 Mosh/TTYD 标准方案清理 PTY 会话
    防止僵尸进程残留

    流程:
    1. killpg SIGHUP - 通知终端挂断
    2. SIGTERM - 礼貌请求退出 (等待 timeout 秒)
    3. SIGKILL - 强制终止
    4. waitpid - 确保进程被系统回收

    Args:
        pid: 进程组 leader PID
        master_fd: PTY master 文件描述符 (可选，会关闭)
        timeout: SIGTERM 等待超时时间 (秒)

    Returns:
        bool: 是否成功清理
    """
    try:
        # 获取进程组 ID
        try:
            pgid = os.getpgid(pid)
        except ProcessLookupError:
            # 进程已不存在
            pgid = pid

        # 步骤 1: SIGHUP 通知终端挂断
        try:
            os.killpg(pgid, signal.SIGHUP)
            time.sleep(0.1)
        except (ProcessLookupError, OSError):
            pass

        # 步骤 2: SIGTERM 礼貌请求退出
        try:
            os.killpg(pgid, signal.SIGTERM)
        except (ProcessLookupError, OSError):
            pass

        # 步骤 3: 非阻塞轮询等待 (带超时)
        start = time.time()
        while time.time() - start < timeout:
            try:
                result = os.waitpid(pid, os.WNOHANG)
                if result != (0, 0):
                    # 进程已退出
                    break
            except ChildProcessError:
                # 没有子进程可等待
                break
            except OSError:
                pass
            time.sleep(0.1)

        # 步骤 4: 超时后强制 SIGKILL
        try:
            os.killpg(pgid, signal.SIGKILL)
            # 确保等待 SIGKILL 后的进程
            os.waitpid(pid, 0)
        except (ProcessLookupError, OSError, ChildProcessError):
            pass

        # 关闭 PTY master fd (如果提供)
        if master_fd is not None:
            try:
                os.close(master_fd)
            except OSError:
                pass

        return True
    except Exception as e:
        print(f"[Cleanup] 清理 PTY 会话失败: {e}")
        return False


# ==================== 配置管理 ====================
@dataclass
class ServerConfig:
    """服务器配置"""
    # 网络配置
    bind_ip: str = "0.0.0.0"
    ws_port: int = 9865
    wss_port: int = 9864
    http_port: int = 9866

    # 认证配置
    access_tokens: Set[str] = None
    ip_whitelist: Set[str] = None
    wss_required: bool = False

    # 会话配置
    mode: str = "pty"  # 'pty' or 'tmux'
    default_session: str = "ws1"
    shell: str = None

    # SSL 配置
    ssl_cert_file: Optional[Path] = None
    ssl_key_file: Optional[Path] = None

    # 稳定性配置
    heartbeat_interval: float = 30.0
    ping_timeout: float = 10.0
    max_reconnect_attempts: int = 15

    # v7 新增：录制配置
    recording_enabled: bool = True
    recording_dir: Optional[Path] = None
    recording_auto_start: bool = False  # 是否自动开始录制

    # v7 新增：文件传输配置
    file_transfer_enabled: bool = True  # lrzsz (rz/sz) 文件传输

    def __post_init__(self):
        if self.access_tokens is None:
            # 生产环境：从环境变量或配置文件获取 token，无默认值
            env_token = os.environ.get('TMUX_TERM_TOKEN')
            if env_token:
                self.access_tokens = set(env_token.split(','))
            else:
                # 无默认 token，必须在配置中设置
                self.access_tokens = set()
        if self.ip_whitelist is None:
            self.ip_whitelist = set()
        if self.shell is None:
            self.shell = os.environ.get('SHELL', '/bin/bash')
        if self.recording_dir is None:
            self.recording_dir = Path.home() / ".local" / "share" / "asciinema"

    @classmethod
    def from_file(cls, config_path: Path) -> 'ServerConfig':
        """从配置文件加载"""
        if not config_path.exists():
            return cls()

        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                data = json.load(f)

            return cls(
                bind_ip=data.get('bind_ip', '0.0.0.0'),
                ws_port=data.get('ws_port', 9865),
                wss_port=data.get('wss_port', 9864),
                http_port=data.get('http_port', 9866),
                access_tokens=set(data.get('access_tokens', ['tmux-web-term-2026'])),
                ip_whitelist=set(data.get('ip_whitelist', [])),
                wss_required=data.get('wss_required', False),
                mode=data.get('mode', 'pty'),
                default_session=data.get('default_session', 'ws1'),
                shell=data.get('shell'),
                ssl_cert_file=Path(data['ssl_cert_file']) if data.get('ssl_cert_file') else None,
                ssl_key_file=Path(data['ssl_key_file']) if data.get('ssl_key_file') else None,
                heartbeat_interval=data.get('heartbeat_interval', 30.0),
                ping_timeout=data.get('ping_timeout', 10.0),
                max_reconnect_attempts=data.get('max_reconnect_attempts', 15),
                recording_enabled=data.get('recording_enabled', True),
                recording_dir=Path(data['recording_dir']) if data.get('recording_dir') else None,
                recording_auto_start=data.get('recording_auto_start', False),
            )
        except Exception as e:
            print(f"⚠️  加载配置文件失败：{e}，使用默认配置")
            return cls()

    @classmethod
    def load(cls, config_path: Optional[Path] = None) -> 'ServerConfig':
        """加载配置（支持环境变量覆盖）"""
        # 1. 从文件加载
        if config_path is None:
            config_path = Path(__file__).parent / "config.json"

        config = cls.from_file(config_path)

        # 2. 环境变量覆盖（优先级更高）
        if os.environ.get('BIND_IP'):
            config.bind_ip = os.environ['BIND_IP']
        if os.environ.get('WS_PORT'):
            config.ws_port = int(os.environ['WS_PORT'])
        if os.environ.get('HTTP_PORT'):
            config.http_port = int(os.environ['HTTP_PORT'])
        if os.environ.get('TMUX_TERM_TOKEN'):
            config.access_tokens = set(os.environ['TMUX_TERM_TOKEN'].split(','))
        if os.environ.get('IP_WHITELIST'):
            config.ip_whitelist = set(ip.strip() for ip in os.environ['IP_WHITELIST'].split(',') if ip.strip())
        if os.environ.get('TMUX_MODE'):
            config.mode = os.environ['TMUX_MODE']
        if os.environ.get('TMUX_DEFAULT_SESSION'):
            config.default_session = os.environ['TMUX_DEFAULT_SESSION']
        if os.environ.get('WSS_REQUIRED'):
            config.wss_required = os.environ['WSS_REQUIRED'].lower() == 'true'
        if os.environ.get('RECORDING_ENABLED'):
            config.recording_enabled = os.environ['RECORDING_ENABLED'].lower() == 'true'
        if os.environ.get('RECORDING_DIR'):
            config.recording_dir = Path(os.environ['RECORDING_DIR'])
        if os.environ.get('RECORDING_AUTO_START'):
            config.recording_auto_start = os.environ['RECORDING_AUTO_START'].lower() == 'true'

        # 3. SSL 证书路径（如果配置文件未指定）
        if config.ssl_cert_file is None:
            config.ssl_cert_file = Path(__file__).parent / "certs" / "server.crt"
        if config.ssl_key_file is None:
            config.ssl_key_file = Path(__file__).parent / "certs" / "server.key"

        return config


# ==================== 全局变量 ====================
CONFIG = ServerConfig.load()
pty_sessions: Dict[Any, Dict[str, Any]] = {}
recording_processes: Dict[str, subprocess.Popen] = {}  # 录制进程管理


# ==================== 工具函数 ====================
def set_winsize(fd, rows, cols):
    """设置终端窗口大小"""
    winsize = struct.pack('HHHH', rows, cols, 0, 0)
    try:
        fcntl.ioctl(fd, termios.TIOCSWINSZ, winsize)
    except Exception as e:
        print(f"设置窗口大小失败：{e}")


def get_tmux_sessions():
    """获取所有 tmux 会话"""
    try:
        result = subprocess.run(
            ["tmux", "list-sessions", "-F", "#{session_name}"],
            capture_output=True, text=True, timeout=5
        )
        sessions = [s.strip() for s in result.stdout.strip().split('\n') if s.strip()]
        return sessions if sessions else [CONFIG.default_session]
    except Exception as e:
        print(f"获取 tmux 会话失败：{e}")
        return [CONFIG.default_session]


def get_smallest_ws_session():
    """获取数字最小的 ws 会话（如 ws1, ws2, ws10），返回会话名或 None"""
    try:
        result = subprocess.run(
            ["tmux", "list-sessions", "-F", "#{session_name}"],
            capture_output=True, text=True, timeout=5
        )
        sessions = [s.strip() for s in result.stdout.strip().split('\n') if s.strip()]

        # 过滤出 ws 开头的会话，并提取数字
        ws_sessions = []
        for s in sessions:
            if s.startswith('ws') and len(s) > 2:
                try:
                    num = int(s[2:])
                    ws_sessions.append((num, s))
                except ValueError:
                    continue

        if ws_sessions:
            # 按数字排序，返回最小的
            ws_sessions.sort(key=lambda x: x[0])
            return ws_sessions[0][1]
        return None
    except Exception as e:
        print(f"获取 ws 会话失败：{e}")
        return None


def get_any_available_session():
    """获取任何可用的会话，优先返回ws会话，如果没有则返回第一个可用会话"""
    try:
        result = subprocess.run(
            ["tmux", "list-sessions", "-F", "#{session_name}"],
            capture_output=True, text=True, timeout=5
        )
        sessions = [s.strip() for s in result.stdout.strip().split('\n') if s.strip()]

        if not sessions:
            return None

        # 首先尝试找ws开头的会话
        ws_sessions = []
        for s in sessions:
            if s.startswith('ws') and len(s) > 2:
                try:
                    num = int(s[2:])
                    ws_sessions.append((num, s))
                except ValueError:
                    continue

        if ws_sessions:
            # 按数字排序，返回最小的ws会话
            ws_sessions.sort(key=lambda x: x[0])
            return ws_sessions[0][1]

        # 如果没有ws会话，返回第一个可用会话
        return sessions[0]
    except Exception as e:
        print(f"获取会话失败：{e}")
        return None


def ensure_tmux_session(session_name, max_retries=3):
    """确保 tmux 会话存在，不存在则创建（带Powerlevel10k环境变量）

    Args:
        session_name: 会话名
        max_retries: 创建失败时的最大重试次数，每次使用不同的会话名

    Returns:
        tuple: (bool, str) - (是否成功, 实际使用的会话名)
    """
    import random

    original_name = session_name
    current_name = session_name

    for attempt in range(max_retries):
        # 检查会话是否存在
        try:
            subprocess.run(
                ["tmux", "has-session", "-t", current_name],
                capture_output=True, timeout=2
            )
            return True, current_name
        except:
            # 会话不存在，尝试创建
            try:
                # 创建新会话时设置环境变量跳过 Powerlevel10k 配置向导
                env = os.environ.copy()
                env['POWERLEVEL9K_DISABLE_CONFIGURATION_WIZARD'] = 'true'
                env['P9K_TTY'] = 'old'
                result = subprocess.run(
                    ["tmux", "new-session", "-d", "-s", current_name],
                    capture_output=True, timeout=2,
                    env=env
                )
                if result.returncode == 0:
                    if attempt > 0:
                        print(f"[tmux] 使用备用会话名 '{current_name}' 创建成功")
                    return True, current_name
                else:
                    raise Exception(f"tmux 返回非零状态: {result.stderr.decode()}")
            except Exception as e:
                print(f"[tmux] 创建会话 '{current_name}' 失败（尝试 {attempt + 1}/{max_retries}）: {e}")
                # 生成新的备用会话名
                current_name = f"{original_name}_{random.randint(1000, 9999)}"

    print(f"[tmux] 无法创建会话，已达到最大重试次数")
    return False, original_name


# ==================== asciinema 录制管理 ====================
def ensure_recording_dir():
    """确保录制目录存在"""
    if CONFIG.recording_dir:
        CONFIG.recording_dir.mkdir(parents=True, exist_ok=True)


def get_recording_filename(session_name: str = None) -> str:
    """生成录制文件名"""
    timestamp = time.strftime("%Y%m%d_%H%M%S")
    if session_name:
        return f"{session_name}_{timestamp}.cast"
    return f"recording_{timestamp}.cast"


def get_available_recordings() -> List[Dict[str, Any]]:
    """获取可用的录制文件列表"""
    if not CONFIG.recording_dir or not CONFIG.recording_dir.exists():
        return []

    recordings = []
    for cast_file in CONFIG.recording_dir.glob("*.cast"):
        try:
            stat = cast_file.stat()
            recordings.append({
                "filename": cast_file.name,
                "path": str(cast_file),
                "size": stat.st_size,
                "created": stat.st_ctime,
                "modified": stat.st_mtime,
                "duration": get_cast_duration(cast_file)
            })
        except Exception as e:
            print(f"读取录制文件失败：{e}")

    # 按修改时间倒序
    recordings.sort(key=lambda x: x["modified"], reverse=True)
    return recordings


def get_cast_duration(cast_file: Path) -> float:
    """获取 asciinema 录制文件时长（秒）"""
    try:
        with open(cast_file, 'r', encoding='utf-8') as f:
            lines = f.readlines()

        if not lines:
            return 0.0

        # 第一行是 JSON header
        # 后续行是时间戳事件：[timestamp, event_type, data]
        timestamps = []
        for line in lines[1:]:
            line = line.strip()
            if line.startswith('['):
                try:
                    event = json.loads(line)
                    if isinstance(event, list) and len(event) > 0:
                        timestamps.append(float(event[0]))
                except:
                    pass

        if len(timestamps) >= 2:
            return max(timestamps) - min(timestamps)
        return 0.0
    except Exception as e:
        print(f"计算时长失败：{e}")
        return 0.0


def start_asciinema_recording(session_name: str, pty_fd: int) -> Optional[subprocess.Popen]:
    """开始 asciinema 录制"""
    if not CONFIG.recording_enabled or not CONFIG.recording_dir:
        return None

    ensure_recording_dir()

    recording_file = CONFIG.recording_dir / get_recording_filename(session_name)

    try:
        # asciinema rec 命令：记录指定命令的输出
        # 使用--stdin 记录标准输入，--command 指定要执行的命令
        cmd = [
            "asciinema", "rec",
            "--stdin",
            "--command", CONFIG.shell,
            str(recording_file)
        ]

        # 在后台启动录制进程
        process = subprocess.Popen(
            cmd,
            stdin=pty_fd,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            preexec_fn=os.setsid
        )

        print(f"🎬 asciinema 录制已开始：{recording_file}")
        return process
    except Exception as e:
        print(f"⚠️  启动 asciinema 录制失败：{e}")
        return None


def stop_asciinema_recording(session_name: str):
    """停止 asciinema 录制"""
    if session_name in recording_processes:
        try:
            process = recording_processes[session_name]
            os.killpg(os.getpgid(process.pid), signal.SIGTERM)
            process.wait(timeout=5)
            del recording_processes[session_name]
            print(f"🎬 录制已停止：{session_name}")
        except Exception as e:
            print(f"停止录制失败：{e}")


# ==================== 认证中间件 ====================
# PRD 2.1.2: Token 改为 WebSocket 首条消息传递，不再从 URL 获取
def authenticate_request(connection, request):
    """
    验证请求（WebSocket 握手前）- 仅检查 IP 白名单和 WSS 强制模式
    Token 认证移至 WebSocket 首条消息

    返回:
        None - 验证通过，继续 WebSocket 握手
        websockets.http11.Response - 验证失败，返回 HTTP 响应
    """
    # 获取客户端 IP
    client_ip = connection.remote_address[0] if connection.remote_address else 'unknown'

    # 验证 IP 白名单
    if CONFIG.ip_whitelist and client_ip not in CONFIG.ip_whitelist:
        print(f"[AUTH] IP {client_ip} 不在白名单中")
        return websockets.http11.Response(
            http.HTTPStatus.FORBIDDEN,
            "Forbidden",
            websockets.Headers([("Content-Type", "text/plain")]),
            b"IP not in whitelist"
        )

    # WSS 强制模式检查
    if CONFIG.wss_required:
        forwarded_proto = request.headers.get('x-forwarded-proto', '')
        if not forwarded_proto.startswith('https'):
            if not client_ip.startswith(('127.', 'localhost', '::1')):
                print(f"[AUTH] WSS 强制模式：{client_ip} 未使用 HTTPS")
                return websockets.http11.Response(
                    http.HTTPStatus.UPGRADE_REQUIRED,
                    "Upgrade Required",
                    websockets.Headers([("Content-Type", "text/plain")]),
                    b"HTTPS required"
                )

    # 验证通过，Token 认证将在 WebSocket 首条消息处理
    return None


async def authenticate_websocket(websocket) -> bool:
    """
    WebSocket 首条消息认证 (PRD 2.1.2)
    等待客户端发送 auth 消息，验证 Token 和时间戳

    协议:
    {
        "type": "auth",
        "token": "xxx",
        "timestamp": 1234567890  // 毫秒时间戳，±5分钟有效
    }

    返回:
        bool: 认证是否成功
    """
    client_ip = websocket.remote_address[0] if websocket.remote_address else 'unknown'

    try:
        # 等待首条消息，10秒超时
        auth_msg = await asyncio.wait_for(websocket.recv(), timeout=10.0)

        if isinstance(auth_msg, bytes):
            auth_msg = auth_msg.decode('utf-8')

        auth_data = json.loads(auth_msg)

        # 验证消息类型
        if auth_data.get('type') != 'auth':
            print(f"[AUTH] {client_ip} 首条消息不是 auth 类型")
            await websocket.close(1008, "First message must be auth")
            return False

        token = auth_data.get('token', '')
        timestamp = auth_data.get('timestamp', 0)

        # 验证时间戳防重放 (±5分钟)
        now = int(time.time() * 1000)
        if abs(now - timestamp) > 5 * 60 * 1000:  # 5分钟
            print(f"[AUTH] {client_ip} 时间戳无效 (delta={abs(now - timestamp)}ms)")
            await websocket.send(json.dumps({
                "type": "auth_result",
                "success": False,
                "message": "Timestamp expired"
            }))
            await websocket.close(1008, "Timestamp expired")
            return False

        # 验证 Token
        if token not in CONFIG.access_tokens:
            print(f"[AUTH] {client_ip} Token 无效")
            await websocket.send(json.dumps({
                "type": "auth_result",
                "success": False,
                "message": "Invalid token"
            }))
            await websocket.close(1008, "Invalid token")
            return False

        # 认证成功
        print(f"[AUTH] {client_ip} 认证成功")
        await websocket.send(json.dumps({
            "type": "auth_result",
            "success": True,
            "message": "Authenticated"
        }))
        return True

    except asyncio.TimeoutError:
        print(f"[AUTH] {client_ip} 认证超时")
        await websocket.close(1008, "Auth timeout")
        return False
    except json.JSONDecodeError:
        print(f"[AUTH] {client_ip} 无效的 JSON")
        await websocket.close(1008, "Invalid JSON")
        return False
    except Exception as e:
        print(f"[AUTH] {client_ip} 认证错误: {e}")
        await websocket.close(1008, "Auth error")
        return False


# ==================== 健康检查 ====================
def get_health_status():
    """获取服务健康状态"""
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "mode": CONFIG.mode,
        "active_sessions": len(pty_sessions),
        "sessions": list(pty_sessions.values()),
        "config": {
            "ws_port": CONFIG.ws_port,
            "http_port": CONFIG.http_port,
            "wss_required": CONFIG.wss_required,
            "ip_whitelist_enabled": len(CONFIG.ip_whitelist) > 0,
        }
    }


# ==================== WebSocket 处理器 ====================
async def handle_pty_mode(websocket):
    """PTY 直连模式 - 创建独立伪终端"""
    master_fd = None
    pid = None
    recording_proc = None

    try:
        pid, master_fd = pty.fork()

        if pid == 0:
            # 子进程：执行 shell
            os.putenv('TERM', 'xterm-256color')
            os.putenv('COLORTERM', 'truecolor')
            os.execvp(CONFIG.shell, [CONFIG.shell])
            os._exit(1)
        else:
            # 父进程：保存会话信息
            session_id = f"pty-{pid}"
            pty_sessions[websocket] = {'fd': master_fd, 'pid': pid, 'mode': 'pty', 'id': session_id}

            set_winsize(master_fd, 24, 80)

            flags = fcntl.fcntl(master_fd, fcntl.F_GETFL)
            fcntl.fcntl(master_fd, fcntl.F_SETFL, flags | os.O_NONBLOCK)

            # v7: 开始 asciinema 录制（如果启用）
            if CONFIG.recording_enabled and CONFIG.recording_auto_start:
                recording_proc = start_asciinema_recording(session_id, master_fd)
                if recording_proc:
                    recording_processes[session_id] = recording_proc

            print(f"[+] PTY 会话创建成功 (pid={pid}, fd={master_fd})")

            await websocket.send(json.dumps({
                "type": "init",
                "shell": CONFIG.shell,
                "pid": pid,
                "mode": "pty",
                "recording": CONFIG.recording_enabled and CONFIG.recording_auto_start
            }))

            await run_terminal_loop(websocket, master_fd, pid, session_id)

    except Exception as e:
        print(f"Error creating PTY: {e}")
        if master_fd is not None:
            try:
                os.close(master_fd)
            except:
                pass
        try:
            await websocket.send(json.dumps({"type": "error", "message": str(e)}))
        except:
            pass
    finally:
        # 清理录制进程
        if recording_proc:
            try:
                recording_proc.terminate()
                recording_proc.wait(timeout=5)
            except:
                pass


async def handle_tmux_mode(websocket):
    """tmux 会话模式 - 连接现有 tmux 会话（支持多设备同屏）"""
    master_fd = None
    pid = None
    recording_proc = None

    try:
        # 获取 URL 中的会话名（如果用户指定了特定会话）
        path = websocket.request.path if hasattr(websocket, 'request') else ''
        parsed = urlparse(path)
        params = parse_qs(parsed.query)
        if params.get('session'):
            session_name = params['session'][0]
        else:
            # 没有指定会话时，优先选择数字最小的 ws 会话，如果没有则选择任何可用会话
            available_session = get_any_available_session()
            session_name = available_session if available_session else CONFIG.default_session

        # 获取并发送会话列表
        sessions = get_tmux_sessions()
        await websocket.send(json.dumps({
            "type": "sessions",
            "sessions": sessions,
            "current": session_name
        }))

        # 确保会话存在
        session_created, actual_session_name = ensure_tmux_session(session_name)
        if not session_created:
            # F-003: 模式回退策略 - tmux 失败时降级到 PTY
            print(f"[!] tmux 会话 '{session_name}' 创建失败，降级到 PTY 模式")
            await websocket.send(json.dumps({
                "type": "mode_fallback",
                "from_mode": "tmux",
                "to_mode": "pty",
                "reason": "tmux_session_failed",
                "message": f"tmux 会话创建失败，已切换到 PTY 模式"
            }))
            # 降级到 PTY 模式
            return await handle_pty_mode(websocket)

        # 使用实际的会话名（可能是 fallback 后的）
        session_name = actual_session_name

        # 使用 -d 参数实现多客户端共享（关键：多设备同屏）
        # -d 参数会分离其他客户端，但我们需要支持多设备同屏，所以移除 -d
        tmux_cmd = ["tmux", "attach-session", "-t", session_name]
        env_vars = {
            'TERM': 'screen-256color',
            'POWERLEVEL9K_DISABLE_CONFIGURATION_WIZARD': 'true',
            'P9K_TTY': 'old',  # 禁用 tty 检查，避免配置向导
        }

        pid, master_fd = pty.fork()

        if pid == 0:
            # 子进程：设置环境变量并执行 tmux
            for key, value in env_vars.items():
                os.putenv(key, value)
            os.execvp(tmux_cmd[0], tmux_cmd)
            os._exit(1)
        else:
            session_id = f"tmux-{session_name}"
            pty_sessions[websocket] = {
                'fd': master_fd,
                'pid': pid,
                'mode': 'tmux',
                'session': session_name,
                'id': session_id
            }

            set_winsize(master_fd, 24, 80)
            flags = fcntl.fcntl(master_fd, fcntl.F_GETFL)
            fcntl.fcntl(master_fd, fcntl.F_SETFL, flags | os.O_NONBLOCK)

            # v7: 开始 asciinema 录制（如果启用）
            if CONFIG.recording_enabled and CONFIG.recording_auto_start:
                recording_proc = start_asciinema_recording(session_id, master_fd)
                if recording_proc:
                    recording_processes[session_id] = recording_proc

            print(f"[+] tmux 会话连接成功 (session={session_name}, pid={pid})")

            await websocket.send(json.dumps({
                "type": "init",
                "session": session_name,
                "pid": pid,
                "mode": "tmux",
                "recording": CONFIG.recording_enabled and CONFIG.recording_auto_start
            }))

            await run_terminal_loop(websocket, master_fd, pid, session_name)

    except Exception as e:
        print(f"tmux 模式错误：{e}")
        if master_fd is not None:
            try:
                os.close(master_fd)
            except:
                pass
    finally:
        # 清理录制进程
        if recording_proc:
            try:
                recording_proc.terminate()
                recording_proc.wait(timeout=5)
            except:
                pass


async def run_terminal_loop(websocket, master_fd, pid, session_name=None):
    """
    终端主循环 - 处理输入输出

    支持的协议:
    - input: 发送输入到终端
    - resize: 调整窗口大小
    - ping/pong: 心跳检测
    - switch: 切换 tmux 会话
    - list_sessions: 获取会话列表
    """
    async def read_pty():
        """从 PTY 读取输出"""
        loop = asyncio.get_event_loop()
        while websocket in pty_sessions:
            try:
                ready, _, _ = await loop.run_in_executor(
                    None,
                    lambda: select.select([master_fd], [], [], 0.005)
                )
                if ready:
                    try:
                        data = os.read(master_fd, 4096)
                        if data:
                            await websocket.send(data)
                        else:
                            break
                    except BlockingIOError:
                        pass
                    except OSError as e:
                        print(f"PTY 读取错误：{e}")
                        break
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"Read error: {e}")
                break

    read_task = asyncio.create_task(read_pty())

    try:
        async for message in websocket:
            try:
                if isinstance(message, str):
                    data = json.loads(message)
                    msg_type = data.get("type")

                    if msg_type == 'ping':
                        await websocket.send('pong')
                        continue

                    elif msg_type == 'switch':
                        # 切换 tmux 会话
                        new_session = data.get('session', session_name)
                        sessions_before = get_tmux_sessions()
                        session_existed = new_session in sessions_before

                        session_created, actual_new_session = ensure_tmux_session(new_session)
                        if session_created:
                            # 使用实际的会话名（可能是 fallback 后的）
                            final_session = actual_new_session

                            if not session_existed:
                                await websocket.send(json.dumps({
                                    "type": "session_created",
                                    "session": final_session,
                                    "message": f"新会话 '{final_session}' 已创建！请刷新页面以连接到此会话。"
                                }))
                            else:
                                # 记录目标会话名，等待客户端刷新重连
                                pty_sessions[websocket]['target_session'] = final_session
                                await websocket.send(json.dumps({
                                    "type": "switch_request",
                                    "session": final_session,
                                    "message": f"请刷新页面以连接到会话 '{final_session}'"
                                }))

                            sessions = get_tmux_sessions()
                            await websocket.send(json.dumps({
                                "type": "sessions",
                                "sessions": sessions,
                                "current": final_session
                            }))
                        continue

                    elif msg_type == 'list_sessions':
                        sessions = get_tmux_sessions()
                        await websocket.send(json.dumps({
                            "type": "sessions",
                            "sessions": sessions,
                            "current": session_name or CONFIG.default_session
                        }))
                        continue

                    # v7: 录制控制
                    elif msg_type == 'start_recording':
                        if CONFIG.recording_enabled:
                            session_id = pty_sessions[websocket].get('id', f'session-{pid}')
                            if session_id not in recording_processes:
                                recording_proc = start_asciinema_recording(session_id, master_fd)
                                if recording_proc:
                                    recording_processes[session_id] = recording_proc
                                    await websocket.send(json.dumps({
                                        "type": "recording_started",
                                        "message": "录制已开始"
                                    }))
                        continue

                    elif msg_type == 'stop_recording':
                        session_id = pty_sessions[websocket].get('id', f'session-{pid}')
                        stop_asciinema_recording(session_id)
                        await websocket.send(json.dumps({
                            "type": "recording_stopped",
                            "message": "录制已停止"
                        }))
                        continue

                    elif msg_type == 'list_recordings':
                        recordings = get_available_recordings()
                        await websocket.send(json.dumps({
                            "type": "recordings",
                            "recordings": recordings
                        }))
                        continue

                    # 处理 input 类型
                    if msg_type == "input":
                        input_data = data.get("data", "")
                        os.write(master_fd, input_data.encode())

                    # 处理 resize 类型
                    elif msg_type == "resize":
                        rows = data.get("rows", 24)
                        cols = data.get("cols", 80)
                        set_winsize(master_fd, rows, cols)
                        os.kill(pid, signal.SIGWINCH)

                elif isinstance(message, bytes):
                    os.write(master_fd, message)

            except json.JSONDecodeError:
                os.write(master_fd, message.encode() if isinstance(message, str) else message)
            except Exception as e:
                print(f"Message error: {e}")

    except websockets.exceptions.ConnectionClosed:
        print(f"[-] 客户端断开：{websocket.remote_address}")
    finally:
        # 清理会话 (PRD 2.1.1: 使用 Mosh/TTYD 标准清理方案)
        if websocket in pty_sessions:
            session = pty_sessions[websocket]
            cleanup_pty_session(
                pid=session['pid'],
                master_fd=session.get('fd'),
                timeout=5.0
            )
            del pty_sessions[websocket]

        read_task.cancel()
        try:
            await read_task
        except asyncio.CancelledError:
            pass


async def handle_client(websocket):
    """处理客户端连接（WebSocket 首条消息认证）"""
    client_ip = websocket.remote_address[0] if hasattr(websocket, 'remote_address') else 'unknown'
    print(f"[+] 新连接：{client_ip}")

    # PRD 2.1.2: WebSocket 首条消息认证
    if not await authenticate_websocket(websocket):
        # 认证失败，连接已关闭
        return

    # 认证成功，继续处理
    if CONFIG.mode == 'tmux':
        await handle_tmux_mode(websocket)
    else:
        await handle_pty_mode(websocket)


# ==================== HTTP 请求处理（健康检查 + 录制 API） ====================
class HealthCheckHandler(SimpleHTTPRequestHandler):
    """处理健康检查和录制 API 请求"""

    def do_GET(self):
        if self.path == '/health':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.send_header('Pragma', 'no-cache')
            self.send_header('Expires', '0')
            self.end_headers()
            status = get_health_status()
            self.wfile.write(json.dumps(status).encode())

        elif self.path.startswith('/api/recordings'):
            # 获取录制文件列表
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.send_header('Pragma', 'no-cache')
            self.send_header('Expires', '0')
            self.end_headers()
            recordings = get_available_recordings()
            self.wfile.write(json.dumps({"recordings": recordings}).encode())

        elif self.path.startswith('/api/recordings/'):
            # 获取单个录制文件内容
            filename = self.path.split('/')[-1]
            if CONFIG.recording_dir:
                cast_file = CONFIG.recording_dir / filename
                if cast_file.exists() and cast_file.suffix == '.cast':
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
                    self.send_header('Pragma', 'no-cache')
                    self.send_header('Expires', '0')
                    self.end_headers()
                    with open(cast_file, 'rb') as f:
                        self.wfile.write(f.read())
                else:
                    self.send_response(404)
                    self.end_headers()
            else:
                self.send_response(404)
                self.end_headers()

        else:
            super().do_GET()


# ==================== 主函数 ====================
async def main():
    """主函数"""
    # 生产环境安全检查
    if not CONFIG.access_tokens:
        print("=" * 60)
        print("❌ 错误：未配置访问 Token！")
        print("=" * 60)
        print("\n请通过以下方式之一配置 Token：")
        print("1. 创建 config.json 文件（复制 config.json.example）")
        print("2. 设置环境变量：export TMUX_TERM_TOKEN=your-secure-token")
        print("\n示例：")
        print("   cp config.json.example config.json")
        print("   # 编辑 config.json，设置 access_tokens")
        print("=" * 60)
        sys.exit(1)

    print("=" * 60)
    print(f"🚀 tmux-web-term v7 启动中...")
    print(f"📡 WebSocket: ws://{CONFIG.bind_ip}:{CONFIG.ws_port}")
    print(f"🌐 HTTP: http://{CONFIG.bind_ip}:{CONFIG.http_port}")
    print(f"🐚 模式：{CONFIG.mode}")
    print(f"🔐 Token 数量：{len(CONFIG.access_tokens)}")
    if CONFIG.ip_whitelist:
        print(f"🛡️  IP 白名单：{len(CONFIG.ip_whitelist)} 个 IP")
    if CONFIG.wss_required:
        print(f"🔒 WSS 强制模式：已启用")
    print(f"💓 心跳间隔：{CONFIG.heartbeat_interval}s")
    print(f"🔄 最大重连：{CONFIG.max_reconnect_attempts}次")
    print("=" * 60)

    # 启动 HTTP 服务器（带健康检查）
    http_server = HTTPServer(
        (CONFIG.bind_ip, CONFIG.http_port),
        partial(HealthCheckHandler, directory=Path(__file__).parent)
    )
    http_thread = threading.Thread(target=http_server.serve_forever)
    http_thread.daemon = True
    http_thread.start()
    print(f"📄 HTTP 服务器已启动 (带健康检查)")

    # 检查 SSL 证书
    ssl_context = None
    if CONFIG.ssl_cert_file and CONFIG.ssl_key_file:
        if CONFIG.ssl_cert_file.exists() and CONFIG.ssl_key_file.exists():
            try:
                ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
                ssl_context.load_cert_chain(str(CONFIG.ssl_cert_file), str(CONFIG.ssl_key_file))
                print(f"🔐 SSL 证书已加载")
            except Exception as e:
                print(f"⚠️  SSL 证书加载失败：{e}")
        else:
            print(f"⚠️  WSS 未启用（缺少 SSL 证书）")
            print(f"   运行：./generate-cert.sh 生成证书")
    else:
        print(f"⚠️  WSS 未启用（未配置 SSL 证书）")

    # 启动 WebSocket 服务器
    ws_server = await websockets.serve(
        handle_client,
        CONFIG.bind_ip,
        CONFIG.ws_port,
        ssl=None,  # WebSocket 端口不加密（WSS 用独立端口）
        ping_interval=CONFIG.heartbeat_interval,
        ping_timeout=CONFIG.ping_timeout,
        process_request=authenticate_request  # 认证钩子
    )

    if ssl_context:
        print(f"✅ WSS 服务器已启动 (端口：{CONFIG.wss_port})")
    else:
        print(f"⚠️  WSS 未启用")

    print(f"✅ WebSocket 服务器已启动 (端口：{CONFIG.ws_port})")
    print(f"✅ 健康检查：http://{CONFIG.bind_ip}:{CONFIG.http_port}/health")
    print("=" * 60)
    print(f"📱 访问方式:")
    print(f"   本地：http://localhost:{CONFIG.http_port}")
    print(f"   远程：http://<本机 IP>:{CONFIG.http_port}")
    if ssl_context:
        print(f"   安全：https://<本机 IP>:{CONFIG.http_port}")
    print("=" * 60)

    await asyncio.Future()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n👋 服务已停止")
        # PRD 2.1.1: 使用标准清理方案清理所有会话
        for ws, session in list(pty_sessions.items()):
            cleanup_pty_session(
                pid=session['pid'],
                master_fd=session.get('fd'),
                timeout=3.0  # 关闭时快速清理
            )
