import Taro from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import { useState, useEffect } from 'react'
import './index.scss'

const API_BASE = process.env.TARO_ENV === 'h5' ? '/api/v1' : 'http://127.0.0.1:8021/api/v1'

const STATUS_MAP = {
  'pending': { label: '待支付', class: 'status-pending' },
  'paid': { label: '待接单', class: 'status-paid' },
  'accepted': { label: '已接单', class: 'status-accepted' },
  'ticketed': { label: '已出票', class: 'status-ticketed' },
  'completed': { label: '已完成', class: 'status-completed' },
  'refunded': { label: '已退款', class: 'status-refunded' }
}

export default function OrdersPage() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [useMock, setUseMock] = useState(true)

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = async () => {
    try {
      const router = Taro.getCurrentInstance().router?.params
      // 检查是否有 Mock 订单数据从上传页面传来
      if (router?.mock_order) {
        const mockOrder = JSON.parse(decodeURIComponent(router.mock_order))
        setOrders([mockOrder])
        setLoading(false)
        return
      }

      if (useMock) {
        // 使用 Mock 数据
        const MOCK_ORDERS = [
          {
            order_no: 'T2603211200ABCD',
            status: 'pending',
            movie_name: '河狸变身计划',
            cinema_name: '中影魅影国际影城',
            show_date: '2026-03-21',
            show_time: '17:45',
            hall_name: '6 号厅',
            seat_count: 3,
            total_price: 99,
            seats: '5 排 05 座，4 排 06 座，5 排 07 座',
            created_at: new Date().toISOString()
          }
        ]
        setTimeout(() => {
          setOrders(MOCK_ORDERS)
          setLoading(false)
        }, 500)
        return
      }

      // 真实 API 调用
      const res = await Taro.request({
        url: `${API_BASE}/orders`,
        method: 'GET'
      })
      setOrders(res.data || [])
    } catch (e) {
      console.error('加载订单失败', e)
    } finally {
      setLoading(false)
    }
  }

  const goToDetail = (orderNo) => {
    Taro.navigateTo({
      url: `/pages/orders/detail?orderNo=${orderNo}`
    })
  }

  return (
    <View className='orders-page'>
      <View className='header'>
        <Text className='title'>我的订单</Text>
        <View
          className='mock-tag'
          onClick={() => {
            setUseMock(!useMock)
            Taro.showToast({
              title: useMock ? '切换到真实 API' : '切换到 Mock 模式',
              icon: 'none'
            })
          }}
        >
          {useMock ? 'Mock' : 'API'}
        </View>
      </View>

      {loading ? (
        <View className='loading'>加载中...</View>
      ) : orders.length === 0 ? (
        <View className='empty'>
          <Text>暂无订单</Text>
        </View>
      ) : (
        <View className='order-list'>
          {orders.map(order => (
            <View
              key={order.order_no}
              className='order-card'
              onClick={() => goToDetail(order.order_no)}
            >
              <View className='order-header'>
                <Text className='order-no'>{order.order_no}</Text>
                <Text className={`status ${STATUS_MAP[order.status]?.class}`}>
                  {STATUS_MAP[order.status]?.label || order.status}
                </Text>
              </View>

              <View className='order-body'>
                <Text className='movie-name'>{order.movie_name}</Text>
                <Text className='cinema-name'>{order.cinema_name}</Text>
                <Text className='show-info'>
                  {order.show_date} {order.show_time}
                </Text>
              </View>

              {order.status === 'ticketed' && (
                <View className='ticket-info'>
                  <Text className='seats'>座位: {order.seats}</Text>
                  <Text className='code-word'>取票暗号: {order.code_word}</Text>
                </View>
              )}

              <View className='order-footer'>
                <Text className='price'>¥{order.total_price}</Text>
                <Text className='count'>{order.seat_count}张</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}