import Taro from '@tarojs/taro'
import { View, Text, Button, Input, Picker } from '@tarojs/components'
import { useState, useEffect } from 'react'
import './index.scss'

const API_BASE = process.env.TARO_ENV === 'h5' ? '/api/v1' : 'http://127.0.0.1:8021/api/v1'

const SEAT_PREFERENCES = ['不限', '尽量中间', '尽量后排', '连坐']

export default function OrderPage() {
  const router = Taro.getCurrentInstance().router?.params || {}
  const [count, setCount] = useState(1)
  const [preference, setPreference] = useState(0)
  const [remark, setRemark] = useState('')
  const [loading, setLoading] = useState(false)

  const createOrder = async () => {
    if (loading) return

    setLoading(true)
    try {
      const res = await Taro.request({
        url: `${API_BASE}/orders`,
        method: 'POST',
        data: {
          cinema_code: router.cinemaCode,
          cinema_name: router.cinemaName,
          movie_name: decodeURIComponent(router.movie || ''),
          show_date: new Date().toISOString().split('T')[0],
          show_time: router.time || '14:00',
          seat_count: count,
          unit_price: 35,
          seat_preference: SEAT_PREFERENCES[preference],
          remark: remark || null
        }
      })

      if (res.data?.order_no) {
        // 模拟支付
        await Taro.request({
          url: `${API_BASE}/orders/${res.data.order_no}/pay`,
          method: 'POST'
        })

        Taro.showToast({ title: '下单成功', icon: 'success' })
        setTimeout(() => {
          Taro.redirectTo({
            url: `/pages/orders/index`
          })
        }, 1500)
      }
    } catch (e) {
      Taro.showToast({ title: '下单失败', icon: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className='order-page'>
      {/* 电影信息 */}
      <View className='movie-info-card'>
        <Text className='movie-name'>{decodeURIComponent(router.movie || '未选择电影')}</Text>
        <Text className='cinema-name'>{router.cinemaName}</Text>
        <Text className='show-time'>{router.time || '请选择场次'}</Text>
      </View>

      {/* 座位选择 */}
      <View className='section'>
        <Text className='section-title'>票数</Text>
        <View className='count-selector'>
          {[1, 2, 3, 4].map(n => (
            <View
              key={n}
              className={`count-btn ${count === n ? 'active' : ''}`}
              onClick={() => setCount(n)}
            >
              {n}
            </View>
          ))}
        </View>
      </View>

      <View className='section'>
        <Text className='section-title'>座位偏好</Text>
        <Picker
          mode='selector'
          range={SEAT_PREFERENCES}
          value={preference}
          onChange={e => setPreference(e.detail.value)}
        >
          <View className='picker'>
            {SEAT_PREFERENCES[preference]} {'>'}
          </View>
        </Picker>
      </View>

      <View className='section'>
        <Text className='section-title'>备注（可选）</Text>
        <Input
          className='remark-input'
          placeholder='如: 带小孩，尽量靠过道'
          value={remark}
          onInput={e => setRemark(e.detail.value)}
        />
      </View>

      {/* 价格 */}
      <View className='price-section'>
        <Text className='price-label'>单价: ¥35</Text>
        <Text className='price-total'>总价: ¥{35 * count}</Text>
      </View>

      {/* 提交按钮 */}
      <Button
        className='submit-btn'
        loading={loading}
        onClick={createOrder}
      >
        确认支付 ¥{35 * count}
      </Button>
    </View>
  )
}