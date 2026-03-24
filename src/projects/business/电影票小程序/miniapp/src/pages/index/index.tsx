import Taro from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import { useState, useEffect } from 'react'
import './index.scss'

// API 地址
const API_BASE = process.env.TARO_ENV === 'h5' ? '/api/v1' : 'http://127.0.0.1:8021/api/v1'

// 标签映射
const TAG_STYLES: Record<string, string> = {
  '店长直供': 'tag-owner',
  '今日特价': 'tag-discount',
  '秒出票': 'tag-fast',
  '外部调票': 'tag-external'
}

// 获取影院图标
const getCinemaIcon = (name: string): string => {
  if (name.includes('万达')) return '🏢'
  if (name.includes('金逸')) return '🎭'
  if (name.includes('CGV')) return '🎪'
  if (name.includes('百老汇')) return '🎬'
  if (name.includes('UME')) return '🎫'
  if (name.includes('博纳')) return '🎤'
  return '🎦'
}

// 判断是否外部调票
const isExternal = (tags: string[]): boolean => {
  return tags.includes('外部调票')
}

// 判断是否推荐
const isFeatured = (tags: string[]): boolean => {
  return tags.includes('店长直供') || tags.includes('今日特价')
}

export default function Index() {
  const [cinemas, setCinemas] = useState([])
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
      Taro.showToast({ title: '加载失败', icon: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const goToCinema = (code: string) => {
    Taro.navigateTo({
      url: `/pages/cinema/index?code=${code}`
    })
  }

  return (
    <View className='index-page'>
      {/* 头部 */}
      <View className='header'>
        <Text className='title'>今日排期</Text>
        <Text className='date'>{new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</Text>
      </View>

      {/* 搜索栏 */}
      <View className='search-bar'>
        <View className='search-input'>
          <Text className='search-icon'>🔍</Text>
          <Text className='placeholder'>搜索影院名称</Text>
        </View>
      </View>

      {/* 影院列表 */}
      <View className='cinema-list'>
        {loading ? (
          <View className='loading-state'>
            <View className='loading-spinner'></View>
            <Text className='loading-text'>正在加载影院...</Text>
          </View>
        ) : cinemas.length === 0 ? (
          <View className='empty-state'>
            <Text className='empty-icon'>🎬</Text>
            <Text className='empty-text'>暂无影院数据</Text>
            <Text className='empty-desc'>请稍后刷新重试</Text>
          </View>
        ) : (
          cinemas.map(cinema => (
            <View
              key={cinema.code}
              className={`cinema-card ${isFeatured(cinema.tags || []) ? 'featured' : ''} ${isExternal(cinema.tags || []) ? 'external' : ''}`}
              onClick={() => goToCinema(cinema.code)}
            >
              {/* 卡片头部 */}
              <View className='card-header'>
                <View className='cinema-icon'>
                  <Text>{getCinemaIcon(cinema.name)}</Text>
                </View>
                <View className='cinema-info'>
                  <Text className='cinema-name'>{cinema.name}</Text>
                  {cinema.address && (
                    <Text className='cinema-address'>{cinema.address}</Text>
                  )}
                </View>
              </View>

              {/* 标签区域 */}
              {cinema.tags?.length > 0 && (
                <View className='tags'>
                  {cinema.tags.map((tag: string, i: number) => (
                    <Text key={i} className={`tag ${TAG_STYLES[tag] || 'tag'}`}>{tag}</Text>
                  ))}
                </View>
              )}

              {/* 价格和操作区 */}
              <View className='card-footer'>
                <View className='price-section'>
                  <Text className='price-label'>起价</Text>
                  <Text className='price-value'>{cinema.min_price || 35}</Text>
                  <Text className='price-unit'>元起</Text>
                </View>
                <View className='buy-btn'>
                  <Text>选座购票</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  )
}