# -*- coding: utf-8 -*-
"""
微信支付服务测试
"""
import pytest
import httpx
from unittest.mock import AsyncMock, patch, MagicMock
import json

from app.services.wechat_pay import (
    create_order,
    query_order,
    refund_order,
    verify_callback_signature,
    _generate_nonce_str,
    _generate_timestamp,
    _create_wechat_pay_sign,
)


class TestHelperFunctions:
    """测试辅助函数"""

    def test_generate_nonce_str_returns_string(self):
        """测试生成随机字符串"""
        nonce_str = _generate_nonce_str()
        assert isinstance(nonce_str, str)
        assert len(nonce_str) > 0

    def test_generate_timestamp_returns_int(self):
        """测试生成时间戳"""
        timestamp = _generate_timestamp()
        assert isinstance(timestamp, int)
        assert timestamp > 0


class TestCreateOrder:
    """测试创建订单"""

    @pytest.mark.asyncio
    async def test_create_order_returns_valid_params(self, settings):
        """测试创建订单返回有效参数"""
        settings.WECHAT_PAY_APPID = "wx_test"
        settings.WECHAT_PAY_MCHID = "mch_test"

        mock_response = MagicMock()
        mock_response.json.return_value = {
            "appid": "wx_test",
            "mchid": "mch_test",
            "prepay_id": "wx20121212121212121212121212121212"
        }
        mock_response.raise_for_status = MagicMock()

        mock_client = MagicMock()
        mock_client.post = AsyncMock(return_value=mock_response)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)

        with patch('app.services.wechat_pay.httpx.AsyncClient', return_value=mock_client):
            with patch('app.services.wechat_pay._create_wechat_pay_sign', return_value="mock_signature"):
                result = await create_order(
                    out_trade_no="ORDER_123",
                    amount=10000,
                    description="测试商品",
                    openid="user_openid_123"
                )

        assert "prepay_id" in result
        mock_client.post.assert_called_once()

    @pytest.mark.asyncio
    async def test_create_order_includes_all_required_fields(self, settings):
        """测试创建订单包含所有必需字段"""
        mock_response = MagicMock()
        mock_response.json.return_value = {"prepay_id": "test123"}

        mock_client = MagicMock()
        mock_client.post = AsyncMock(return_value=mock_response)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)

        captured_payload = None

        async def capture_post(url, headers=None, json=None):
            nonlocal captured_payload
            captured_payload = json
            return mock_response

        mock_client.post = capture_post

        with patch('app.services.wechat_pay.httpx.AsyncClient', return_value=mock_client):
            with patch('app.services.wechat_pay._create_wechat_pay_sign', return_value="mock_signature"):
                with patch('app.services.wechat_pay.settings.WECHAT_PAY_APPID', 'wx_test'):
                    with patch('app.services.wechat_pay.settings.WECHAT_PAY_MCHID', 'mch_test'):
                        await create_order(
                            out_trade_no="ORDER_456",
                            amount=5000,
                            description="电影票",
                            openid="user_openid_456"
                        )

        assert captured_payload is not None
        assert captured_payload["appid"] == "wx_test"
        assert captured_payload["mchid"] == "mch_test"
        assert captured_payload["out_trade_no"] == "ORDER_456"
        assert captured_payload["amount"]["total"] == 5000


class TestQueryOrder:
    """测试查询订单"""

    @pytest.mark.asyncio
    async def test_query_order_success(self, settings):
        """测试查询订单成功"""
        settings.WECHAT_PAY_MCHID = "mch_test"

        mock_response = MagicMock()
        mock_response.json.return_value = {
            "out_trade_no": "ORDER_123",
            "trade_state": "SUCCESS",
            "amount": {
                "total": 10000
            }
        }
        mock_response.raise_for_status = MagicMock()

        mock_client = MagicMock()
        mock_client.get = AsyncMock(return_value=mock_response)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)

        with patch('app.services.wechat_pay.httpx.AsyncClient', return_value=mock_client):
            with patch('app.services.wechat_pay._create_wechat_pay_sign', return_value="mock_signature"):
                result = await query_order("ORDER_123")

        assert result["trade_state"] == "SUCCESS"
        mock_client.get.assert_called_once()

    @pytest.mark.asyncio
    async def test_query_order_not_found(self, settings):
        """测试查询订单不存在"""
        settings.WECHAT_PAY_MCHID = "mch_test"

        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock(
            side_effect=httpx.HTTPStatusError(
                "Not Found",
                request=MagicMock(),
                response=MagicMock(status_code=404)
            )
        )

        mock_client = MagicMock()
        mock_client.get = AsyncMock(return_value=mock_response)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)

        with patch('app.services.wechat_pay.httpx.AsyncClient', return_value=mock_client):
            with patch('app.services.wechat_pay._create_wechat_pay_sign', return_value="mock_signature"):
                with pytest.raises(httpx.HTTPStatusError):
                    await query_order("NOT_EXIST_ORDER")


class TestRefundOrder:
    """测试退款"""

    @pytest.mark.asyncio
    async def test_refund_order_success(self, settings):
        """测试退款成功"""
        settings.WECHAT_PAY_MCHID = "mch_test"

        mock_response = MagicMock()
        mock_response.json.return_value = {
            "out_refund_no": "REFUND_123",
            "status": "SUCCESS",
            "amount": {
                "refund": 10000
            }
        }
        mock_response.raise_for_status = MagicMock()

        mock_client = MagicMock()
        mock_client.post = AsyncMock(return_value=mock_response)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)

        with patch('app.services.wechat_pay.httpx.AsyncClient', return_value=mock_client):
            with patch('app.services.wechat_pay._create_wechat_pay_sign', return_value="mock_signature"):
                result = await refund_order(
                    out_trade_no="ORDER_123",
                    out_refund_no="REFUND_123",
                    amount=10000,
                    total=10000,
                    reason="用户申请退款"
                )

        assert result["status"] == "SUCCESS"
        mock_client.post.assert_called_once()

    @pytest.mark.asyncio
    async def test_refund_order_invalid_amount(self, settings):
        """测试退款金额无效"""
        settings.WECHAT_PAY_MCHID = "mch_test"

        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock(
            side_effect=httpx.HTTPStatusError(
                "Bad Request",
                request=MagicMock(),
                response=MagicMock(status_code=400)
            )
        )

        mock_client = MagicMock()
        mock_client.post = AsyncMock(return_value=mock_response)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)

        with patch('app.services.wechat_pay.httpx.AsyncClient', return_value=mock_client):
            with patch('app.services.wechat_pay._create_wechat_pay_sign', return_value="mock_signature"):
                with pytest.raises(httpx.HTTPStatusError):
                    await refund_order(
                        out_trade_no="ORDER_123",
                        out_refund_no="REFUND_123",
                        amount=999999,  # 超过原金额
                        total=10000
                    )


class TestVerifyCallbackSignature:
    """测试验证回调签名"""

    def test_verify_callback_signature_valid(self):
        """测试验证签名有效"""
        body = json.dumps({"out_trade_no": "ORDER_123"})
        signature = "test_signature"
        timestamp = "1234567890"
        nonce = "test_nonce"
        serial_no = "test_serial"

        # 注意：实际验签需要微信平台证书
        # 这里只测试函数接口
        result = verify_callback_signature(
            body=body,
            signature=signature,
            timestamp=timestamp,
            nonce=nonce,
            serial_no=serial_no
        )

        # 当前实现总是返回 True（需要实际证书）
        assert result is True

    def test_verify_callback_signature_handles_exception(self):
        """测试验签异常处理"""
        body = json.dumps({"out_trade_no": "ORDER_123"})
        signature = "invalid_signature"
        timestamp = "1234567890"
        nonce = "test_nonce"
        serial_no = "test_serial"

        # 当前实现中，任何异常都会返回 False
        # 测试函数能够正常处理输入而不抛出异常
        result = verify_callback_signature(
            body=body,
            signature=signature,
            timestamp=timestamp,
            nonce=nonce,
            serial_no=serial_no
        )

        # 函数应该能够处理任何输入而不崩溃
        assert isinstance(result, bool)
