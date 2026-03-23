import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout as AntLayout, Menu, Button, theme } from 'antd'
import {
  DashboardOutlined,
  TeamOutlined,
  ApiOutlined,
  FileTextOutlined,
  SettingOutlined,
  LogoutOutlined,
} from '@ant-design/icons'
import { useEffect } from 'react'

const { Header, Sider, Content } = AntLayout

const menuItems = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '仪表盘' },
  { key: '/accounts', icon: <TeamOutlined />, label: '账号管理' },
  { key: '/users', icon: <ApiOutlined />, label: 'API用户' },
  { key: '/logs', icon: <FileTextOutlined />, label: '请求日志' },
  { key: '/settings', icon: <SettingOutlined />, label: '系统设置' },
]

export function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { token } = theme.useToken()

  useEffect(() => {
    // 检查登录状态
    const adminKey = localStorage.getItem('admin_key')
    if (!adminKey && location.pathname !== '/login') {
      navigate('/login')
    }
  }, [location.pathname, navigate])

  const handleLogout = () => {
    localStorage.removeItem('admin_key')
    navigate('/login')
  }

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Sider
        theme="dark"
        width={200}
        style={{
          background: token.colorBgContainer,
        }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: token.colorPrimary,
            fontSize: 18,
            fontWeight: 'bold',
          }}
        >
          Codex API Pool
        </div>
        <Menu
          mode="inline"
          theme="dark"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 0 }}
        />
      </Sider>
      <AntLayout>
        <Header
          style={{
            background: token.colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
          }}
        >
          <h2 style={{ margin: 0, color: token.colorText }}>
            {menuItems.find((item) => item.key === location.pathname)?.label || '管理后台'}
          </h2>
          <Button
            type="primary"
            danger
            icon={<LogoutOutlined />}
            onClick={handleLogout}
          >
            退出登录
          </Button>
        </Header>
        <Content
          style={{
            margin: 24,
            padding: 24,
            background: token.colorBgContainer,
            borderRadius: token.borderRadius,
            minHeight: 280,
          }}
        >
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  )
}
