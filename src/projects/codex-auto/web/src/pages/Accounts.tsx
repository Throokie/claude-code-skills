import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  InputNumber,
  message,
  Popconfirm,
} from 'antd'
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons'
import { accountsApi, type Account } from '../api/accounts'

const statusColors: Record<string, string> = {
  ACTIVE: 'success',
  RATE_LIMITED: 'warning',
  SUSPENDED: 'error',
  EXPIRED: 'default',
  ERROR: 'error',
}

const statusLabels: Record<string, string> = {
  ACTIVE: '活跃',
  RATE_LIMITED: '限流',
  SUSPENDED: '暂停',
  EXPIRED: '过期',
  ERROR: '错误',
}

export function Accounts() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [form] = Form.useForm()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.getAll(),
  })

  const createMutation = useMutation({
    mutationFn: accountsApi.create,
    onSuccess: () => {
      message.success('创建成功')
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      setIsModalOpen(false)
      form.resetFields()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: accountsApi.delete,
    onSuccess: () => {
      message.success('删除成功')
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
    },
  })

  const columns = [
    { title: '邮箱', dataIndex: 'email', key: 'email' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={statusColors[status]}>{statusLabels[status]}</Tag>
      ),
    },
    {
      title: '剩余额度',
      dataIndex: 'quotaRemaining',
      key: 'quotaRemaining',
    },
    {
      title: '权重',
      dataIndex: 'weight',
      key: 'weight',
    },
    {
      title: '最后使用',
      dataIndex: 'lastUsedAt',
      key: 'lastUsedAt',
      render: (date: string | null) => date ? new Date(date).toLocaleString() : '从未使用',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: Account) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            onClick={() => {
              setEditingAccount(record)
              form.setFieldsValue(record)
              setIsModalOpen(true)
            }}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除"
            description="删除后无法恢复，是否继续？"
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="确认"
            cancelText="取消"
          >
            <Button danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const handleSubmit = (values: { email: string; password: string; quotaRemaining?: number; weight?: number }) => {
    createMutation.mutate(values)
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingAccount(null)
            form.resetFields()
            setIsModalOpen(true)
          }}
        >
          添加账号
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={data?.data}
        loading={isLoading}
        rowKey="id"
        pagination={{
          total: data?.total,
          pageSize: 20,
        }}
      />

      <Modal
        title={editingAccount ? '编辑账号' : '添加账号'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
      >
        <Form form={form} onFinish={handleSubmit} layout="vertical">
          <Form.Item
            name="email"
            label="邮箱"
            rules={[{ required: true, message: '请输入邮箱' }]}
          >
            <Input placeholder="codex@example.com" />
          </Form.Item>
          <Form.Item
            name="password"
            label="密码"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password placeholder="密码" />
          </Form.Item>
          <Form.Item name="quotaRemaining" label="剩余额度">
            <InputNumber style={{ width: '100%' }} placeholder="0" />
          </Form.Item>
          <Form.Item name="weight" label="权重">
            <InputNumber style={{ width: '100%' }} placeholder="1" min={1} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={createMutation.isPending} block>
              {editingAccount ? '保存' : '创建'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
