# -*- coding: utf-8 -*-
"""
JWT 认证模块测试
"""
import pytest
import jwt
from unittest.mock import AsyncMock, MagicMock, patch
from app.auth.jwt import (
    generate_access_token,
    generate_refresh_token,
    decode_token,
    verify_wechat_code,
)


class TestGenerateAccessToken:
    """测试生成访问令牌"""

    def test_generate_access_token_returns_valid_jwt(self, settings):
        """测试生成有效的 JWT 访问令牌"""
        user_id = 123
        token = generate_access_token(user_id, settings.SECRET_KEY)

        # 解码验证
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        assert payload["user_id"] == user_id
        assert "exp" in payload
        assert "iat" in payload

    def test_generate_access_token_expires_in_30_minutes_by_default(self, settings):
        """测试访问令牌默认 30 分钟过期"""
        user_id = 123
        token = generate_access_token(user_id, settings.SECRET_KEY)

        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        iat = payload["iat"]
        exp = payload["exp"]

        # 过期时间应该是 30 分钟（允许 1 秒误差）
        assert abs(exp - iat) == 30 * 60


class TestGenerateRefreshToken:
    """测试生成刷新令牌"""

    def test_generate_refresh_token(self, settings):
        """测试生成刷新令牌"""
        user_id = 123
        token = generate_refresh_token(user_id, settings.SECRET_KEY)

        # 解码验证
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        assert payload["user_id"] == user_id
        assert "exp" in payload


class TestDecodeToken:
    """测试解码令牌"""

    def test_decode_valid_token_returns_payload(self, settings):
        """测试解码有效的令牌"""
        user_id = 456
        token = generate_access_token(user_id, settings.SECRET_KEY)

        payload = decode_token(token, settings.SECRET_KEY)
        assert payload["user_id"] == user_id
        assert "exp" in payload

    def test_decode_expired_token_raises_error(self, settings):
        """测试解码过期的令牌抛出错误"""
        user_id = 789
        # 创建一个立即过期的令牌
        token = generate_access_token(user_id, settings.SECRET_KEY, expires_minutes=-1)

        with pytest.raises(jwt.ExpiredSignatureError):
            decode_token(token, settings.SECRET_KEY)

    def test_decode_invalid_token_raises_error(self, settings):
        """测试解码无效的令牌抛出错误"""
        invalid_token = "invalid.token.here"

        with pytest.raises(jwt.InvalidTokenError):
            decode_token(invalid_token, settings.SECRET_KEY)

    def test_decode_token_with_wrong_secret_raises_error(self, settings):
        """测试使用错误的密钥解码令牌抛出错误"""
        user_id = 123
        token = generate_access_token(user_id, settings.SECRET_KEY)

        wrong_secret = "wrong-secret-key"
        with pytest.raises(jwt.InvalidTokenError):
            decode_token(token, wrong_secret)


class TestVerifyWechatCode:
    """测试验证微信登录码"""

    @pytest.mark.asyncio
    async def test_verify_wechat_code_success(self, settings):
        """测试验证微信登录码成功"""
        settings.WECHAT_APPID = "test_appid"
        settings.WECHAT_SECRET = "test_secret"

        # Mock httpx.AsyncClient - json() is synchronous in httpx
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "openid": "test_openid_123",
            "session_key": "test_session_key",
            "unionid": "test_unionid"
        }
        mock_response.raise_for_status = MagicMock()  # synchronous

        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=mock_response)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)

        with patch('app.auth.jwt.httpx.AsyncClient', return_value=mock_client):
            result = await verify_wechat_code("test_code", settings)

        assert result["openid"] == "test_openid_123"
        assert result["session_key"] == "test_session_key"
        mock_client.get.assert_called_once()

    @pytest.mark.asyncio
    async def test_verify_wechat_code_failure_invalid_code(self, settings):
        """测试验证微信登录码失败（无效 code）"""
        settings.WECHAT_APPID = "test_appid"
        settings.WECHAT_SECRET = "test_secret"

        # Mock httpx.AsyncClient - json() is synchronous in httpx
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "errcode": 40029,
            "errmsg": "invalid code"
        }
        mock_response.raise_for_status = MagicMock()  # synchronous

        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=mock_response)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)

        with patch('app.auth.jwt.httpx.AsyncClient', return_value=mock_client):
            with pytest.raises(Exception) as exc_info:
                await verify_wechat_code("invalid_code", settings)

        assert "invalid code" in str(exc_info.value)
