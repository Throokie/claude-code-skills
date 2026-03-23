import Taro from '@tarojs/taro'
import { View, Text, Swiper, SwiperItem } from '@tarojs/components'
import { useState, useEffect } from 'react'
import './index.scss'

// API 地址
const API_BASE = process.env.TARO_ENV === 'h5' ? '/api/v1' : 'http://127.0.0.1:8021/api/v1'

export default function Index() {
  const [cinemas, set Cinemas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCinemas()
  }, [])

  const loadCinemas = async () => {
    try {
      const res = await Taro.request({
        url: `${API_BASE}/cinemas`,
        method: 'GET'
      })
      setCinemas(res.data || [])
    } catch (e) {
      console.error('加载影院失败', e)
    } finally {
      setLoading(false)
    }
  }

  const goToCinema = (code) => {
    Taro.navigateTo({
      url: `/pages/cinema/index?code=${code}`
    })
  }

  return (
    <View className='index-page'>
      {/* 头部 */}
      <View className='header'>
        <Text className='title'>今日排期</Text>
        <Text className='date'>{new Date().toLocaleDateString()}</Text>
      </View>

      {/* 影院列表 */}
      <View className='cinema-list'>
        {loading ? (
          <View className='loading'>加载中...</View>
        ) : cinemas.length === 0 ? (
          <View className='empty'>暂无影院数据</View>
        ) : (
          cinemas.map(cinema => (
            <View
              key={cinema.code}
              className='cinema-card'
              onClick={() => goToCinema(cinema.code)}
            >
              <View className='cinema-info'>
                <Text className='cinema-name'>{cinema.name}</Text>
                {cinema.tags?.length > 0 && (
                  <View className='tags'>
                    {cinema.tags.map((tag, i) => (
                      <Text key={i} className='tag'>{tag}</Text>
                    ))}
                  </View>
                )}
              </View>
              <Text className='arrow'>{'>'}</Text>
            </View>
          ))
        )}
      </View>
    </View>
  )
}