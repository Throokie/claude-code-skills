import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Form, Input, Button, message } from 'antd'
import { LockOutlined } from '@ant-design/icons'

export function Login() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  const handleLogin = async (values: { adminKey: string }) => {
    setLoading(true)
    try {
      // 简单验证：存储到localStorage
      localStorage.setItem('admin_key', values.adminKey)
      message.success('登录成功')
      navigate('/dashboard')
    } catch {
      message.error('登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#141414',
      }}
    >
      <Card title="Codex API Pool 管理后台" style={{ width: 400 }}>
        <Form onFinish={handleLogin}>
          <Form.Item
            name="adminKey"
            rules={[{ required: true, message: '请输入管理员密钥' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="管理员密钥"
              size="large"
            />
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              size="large"
              block
            >
              登录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
