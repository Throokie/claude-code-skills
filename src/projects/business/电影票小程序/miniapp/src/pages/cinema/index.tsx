import Taro from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import { useState, useEffect } from 'react'
import './index.scss'

const API_BASE = process.env.TARO_ENV === 'h5' ? '/api/v1' : 'http://127.0.0.1:8021/api/v1'

export default function CinemaPage() {
  const [schedules, setSchedules] = useState(null)
  const [loading, setLoading] = useState(true)
  const code = Taro.getCurrentInstance().router?.params?.code

  useEffect(() => {
    if (code) {
      loadSchedules()
    }
  }, [code])

  const loadSchedules = async () => {
    try {
      const res = await Taro.request({
        url: `${API_BASE}/cinemas/${code}/schedules`,
        method: 'GET'
      })
      setSchedules(res.data)
    } catch (e) {
      console.error('加载排期失败', e)
    } finally {
      setLoading(false)
    }
  }

  const goToUpload = (movie, show) => {
    Taro.navigateTo({
      url: `/pages/upload-seat/index?cinemaCode=${code}&cinemaName=${schedules?.cinema_name || code}&movie=${encodeURIComponent(movie.name)}&showTime=${show.time}&showDate=${schedules?.date || ''}`
    })
  }

  if (loading) {
    return <View className='loading'>加载中...</View>
  }

  return (
    <View className='cinema-page'>
      {/* 影院信息 */}
      <View className='cinema-header'>
        <Text className='cinema-name'>{schedules?.cinema_name || code}</Text>
        <Text className='date-label'>{schedules?.date_label}</Text>
        {schedules?.price_text && (
          <Text className='price-text'>{schedules.price_text}</Text>
        )}
      </View>

      {/* 电影列表 */}
      <View className='movie-list'>
        {schedules?.movies?.length === 0 ? (
          <View className='empty'>暂无排期</View>
        ) : (
          schedules?.movies?.map((movie, index) => (
            <View key={index} className='movie-card'>
              <View className='movie-info'>
                <Text className='movie-name'>{movie.name}</Text>
                {movie.info && <Text className='movie-info-text'>{movie.info}</Text>}
              </View>

              {/* 场次列表 */}
              <View className='show-list'>
                {movie.shows?.map((show, i) => (
                  <View
                    key={i}
                    className='show-item'
                    onClick={() => goToUpload(movie, show)}
                  >
                    <Text className='show-time'>{show.time}</Text>
                    <Text className='show-hall'>{show.hall || '普通厅'}</Text>
                    {show.price && <Text className='show-price'>{show.price}</Text>}
                  </View>
                ))}
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  )
}