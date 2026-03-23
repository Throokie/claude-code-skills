import { useQuery } from '@tanstack/react-query'
import { Card, Row, Col, Statistic, Spin } from 'antd'
import {
  TeamOutlined,
  CheckCircleOutlined,
  ApiOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons'
import apiClient from '../api/client'

interface StatsData {
  accounts: {
    total: number
    active: number
    rateLimited: number
    suspended: number
  }
  loadBalancer: {
    totalAccounts: number
    activeAccounts: number
  }
  health: {
    totalChecked: number
    healthyCount: number
    averageResponseTime: number
  }
}

export function Dashboard() {
  const { data: stats, isLoading } = useQuery<StatsData>({
    queryKey: ['stats'],
    queryFn: async () => {
      const { data } = await apiClient.get('/admin/stats')
      return data
    },
    refetchInterval: 30000, // 30秒刷新一次
  })

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="总账号数"
              value={stats?.accounts?.total || 0}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="活跃账号"
              value={stats?.accounts?.active || 0}
              valueStyle={{ color: '#3f8600' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="健康账号"
              value={stats?.health?.healthyCount || 0}
              suffix={`/ ${stats?.health?.totalChecked || 0}`}
              prefix={<ApiOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="平均响应时间"
              value={stats?.health?.averageResponseTime || 0}
              suffix="ms"
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="账号状态分布">
            <div style={{ padding: 20 }}>
              <p>活跃: {stats?.accounts?.active || 0}</p>
              <p>限流: {stats?.accounts?.rateLimited || 0}</p>
              <p>暂停: {stats?.accounts?.suspended || 0}</p>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="系统状态">
            <div style={{ padding: 20 }}>
              <p>状态: <span style={{ color: '#3f8600' }}>运行中</span></p>
              <p>最后更新: {new Date().toLocaleString()}</p>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
