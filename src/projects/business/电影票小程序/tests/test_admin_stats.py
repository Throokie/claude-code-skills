"""
Admin Stats API 单元测试
测试数据统计接口是否正确返回 ECharts 图表所需数据
"""
import pytest
from datetime import datetime, timedelta


# ==================== Helper Functions ====================

def get_admin_headers():
    """获取管理员请求头"""
    from app.config import settings
    return {
        "Authorization": f"Bearer {settings.ADMIN_TOKEN}",
        "Content-Type": "application/json"
    }


# ==================== Tests ====================

@pytest.mark.asyncio
async def test_revenue_api_returns_correct_format(client):
    """测试营收 API 返回正确的数据格式"""
    # 调用 API
    response = await client.get(
        "/api/v1/admin/stats/revenue?days=7",
        headers=get_admin_headers()
    )

    assert response.status_code == 200
    result = response.json()

    # 验证返回格式
    assert isinstance(result, dict)
    assert "dates" in result
    assert "revenue" in result
    assert "order_count" in result
    assert "total" in result

    # 验证数据类型
    assert isinstance(result["dates"], list)
    assert isinstance(result["revenue"], list)
    assert isinstance(result["order_count"], list)
    assert isinstance(result["total"], (int, float))

    # 验证日期数量
    assert len(result["dates"]) == 7
    assert len(result["revenue"]) == 7
    assert len(result["order_count"]) == 7

    # 验证总金额计算
    assert result["total"] == sum(result["revenue"])


@pytest.mark.asyncio
async def test_conversion_api_format(client):
    """测试转化漏斗 API 返回正确格式"""
    # 调用 API
    response = await client.get(
        "/api/v1/admin/stats/conversion",
        headers=get_admin_headers()
    )

    assert response.status_code == 200
    result = response.json()

    # 验证返回格式
    assert isinstance(result, dict)
    assert "stages" in result
    assert isinstance(result["stages"], list)

    # 验证阶段数量
    assert len(result["stages"]) == 5

    # 验证阶段名称
    expected_names = ["待支付", "已支付", "已接单", "已出票", "已完成"]
    actual_names = [stage["name"] for stage in result["stages"]]
    assert actual_names == expected_names

    # 验证每个阶段有 count 和 rate
    for stage in result["stages"]:
        assert "count" in stage
        assert "rate" in stage
        assert isinstance(stage["count"], int)
        assert isinstance(stage["rate"], (int, float))


@pytest.mark.asyncio
async def test_cinema_ranking_api_format(client):
    """测试影院排行 API 返回正确格式"""
    # 调用 API
    response = await client.get(
        "/api/v1/admin/stats/cinema-ranking?limit=10",
        headers=get_admin_headers()
    )

    assert response.status_code == 200
    result = response.json()

    # 验证返回格式
    assert isinstance(result, dict)
    assert "cinemas" in result
    assert "order_counts" in result
    assert "revenues" in result

    # 验证数据类型
    assert isinstance(result["cinemas"], list)
    assert isinstance(result["order_counts"], list)
    assert isinstance(result["revenues"], list)

    # 验证数量一致
    assert len(result["cinemas"]) == len(result["order_counts"])
    assert len(result["cinemas"]) == len(result["revenues"])


@pytest.mark.asyncio
async def test_hourly_orders_api_format(client):
    """测试 24 小时订单分布 API 返回正确格式"""
    # 调用 API
    response = await client.get(
        "/api/v1/admin/stats/hourly-orders",
        headers=get_admin_headers()
    )

    assert response.status_code == 200
    result = response.json()

    # 验证返回格式
    assert isinstance(result, dict)
    assert "hours" in result
    assert "order_counts" in result
    assert "heatmap_data" in result

    # 验证 24 小时数据
    assert len(result["hours"]) == 24
    assert len(result["order_counts"]) == 24
    assert result["hours"] == list(range(24))

    # 验证热力图数据格式
    assert isinstance(result["heatmap_data"], list)
    for item in result["heatmap_data"]:
        assert len(item) == 2
        assert isinstance(item[0], int)  # hour
        assert isinstance(item[1], int)  # count


@pytest.mark.asyncio
async def test_stats_api_requires_auth(client):
    """测试统计 API 需要认证"""
    # 调用 API without auth
    response = await client.get("/api/v1/admin/stats/revenue?days=7")

    assert response.status_code in [401, 403]


@pytest.mark.asyncio
async def test_revenue_with_empty_database(client):
    """测试没有数据时营收统计返回空数据"""
    # 调用 API（数据库为空）
    response = await client.get(
        "/api/v1/admin/stats/revenue?days=7",
        headers=get_admin_headers()
    )

    assert response.status_code == 200
    result = response.json()

    # 验证返回格式正确但数据为空
    assert len(result["dates"]) == 7
    assert result["revenue"] == [0.0] * 7
    assert result["order_count"] == [0] * 7
    assert result["total"] == 0.0


@pytest.mark.asyncio
async def test_conversion_rate_logic(client):
    """测试转化率计算逻辑"""
    response = await client.get(
        "/api/v1/admin/stats/conversion",
        headers=get_admin_headers()
    )

    assert response.status_code == 200
    result = response.json()

    # 验证转化率在有效范围内
    for stage in result["stages"]:
        assert 0 <= stage["rate"] <= 100.0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
