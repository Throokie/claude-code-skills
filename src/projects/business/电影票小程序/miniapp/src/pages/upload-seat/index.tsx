import Taro from '@tarojs/taro'
import { View, Text, Button, Image } from '@tarojs/components'
import { useState } from 'react'
import './index.scss'

// Mock 数据 - 模拟 AI 识别结果
const MOCK_ANALYSIS = {
  cinema_name: '中影魅影国际影城',
  movie_name: '河狸变身计划',
  show_date: '2026-03-21',
  show_time: '17:45',
  hall: '6 号厅',
  seats: [
    { row: 5, col: 5, price: 33, label: '5 排 05 座' },
    { row: 4, col: 6, price: 33, label: '4 排 06 座' },
    { row: 5, col: 7, price: 33, label: '5 排 07 座' }
  ],
  total_price: 99,
  seat_labels: ['5 排 05 座', '4 排 06 座', '5 排 07 座']
}

// Mock 订单响应
const MOCK_ORDER_RESPONSE = {
  success: true,
  order_no: `T${new Date().getFullYear().toString().slice(-2)}${(new Date().getMonth()+1).toString().padStart(2,'0')}${new Date().getDate().toString().padStart(2,'0')}${new Date().getHours().toString().padStart(2,'0')}${new Date().getMinutes().toString().padStart(2,'0')}ABCD`,
  seats: ['5 排 05 座', '4 排 06 座', '5 排 07 座'],
  total_price: 99,
  status: 'pending'
}

export default function UploadSeatPage() {
  const router = Taro.getCurrentInstance().router?.params || {}
  const [uploading, setUploading] = useState(false)
  const [imagePath, setImagePath] = useState('')
  const [imageId, setImageId] = useState('')
  const [analysis, setAnalysis] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [useMock, setUseMock] = useState(true) // 默认使用 mock 数据

  // 选择并上传图片
  const chooseAndUpload = async () => {
    try {
      const res = await Taro.chooseImage({
        count: 1,
        sourceType: ['album', 'camera']
      })

      const tempFilePath = res.tempFilePaths[0]
      setImagePath(tempFilePath)
      setUploading(true)

      // 模拟上传延迟
      setTimeout(() => {
        if (useMock) {
          // 使用 Mock 数据
          setAnalysis(MOCK_ANALYSIS)
          setImageId('mock-' + Date.now())
          Taro.showToast({
            title: '识别成功（Mock）',
            icon: 'success'
          })
        } else {
          // 真实 API 调用
          const uploadTask = Taro.uploadFile({
            url: `${process.env.TARO_ENV === 'h5' ? '/api/v1' : 'http://127.0.0.1:8021/api/v1'}/upload-seat-image`,
            filePath: tempFilePath,
            name: 'image',
            success: (uploadRes) => {
              const data = JSON.parse(uploadRes.data)
              if (data.success && data.analysis) {
                setImageId(data.image_id)
                setAnalysis(data.analysis)
                Taro.showToast({
                  title: '识别成功',
                  icon: 'success'
                })
              } else {
                Taro.showModal({
                  title: '识别失败',
                  content: data.message || '未能识别座位信息，请确保截图清晰完整',
                  showCancel: false
                })
              }
            },
            fail: (err) => {
              console.error('上传失败', err)
              Taro.showToast({
                title: '上传失败',
                icon: 'error'
              })
            },
            complete: () => {
              setUploading(false)
            }
          })
          return
        }
        setUploading(false)
      }, 1500)

    } catch (err) {
      console.error('选择图片失败', err)
      setUploading(false)
    }
  }

  // 确认订单
  const confirmOrder = async () => {
    if (!analysis || !imageId) return

    setLoading(true)

    // 模拟请求延迟
    setTimeout(() => {
      if (useMock) {
        // 使用 Mock 响应
        const orderData = MOCK_ORDER_RESPONSE
        Taro.showToast({
          title: '下单成功（Mock）',
          icon: 'success'
        })
        setTimeout(() => {
          Taro.redirectTo({
            url: `/pages/orders/index?mock_order=${JSON.stringify(orderData)}`
          })
        }, 1500)
      } else {
        // 真实 API 调用
        Taro.request({
          url: `${process.env.TARO_ENV === 'h5' ? '/api/v1' : 'http://127.0.0.1:8021/api/v1'}/confirm-seat-order`,
          method: 'POST',
          data: {
            image_id: imageId,
            cinema_code: router.cinemaCode,
            cinema_name: router.cinemaName,
            movie_name: decodeURIComponent(router.movie || ''),
            show_date: router.showDate || '',
            show_time: router.showTime || '',
            seat_preference: router.seatPreference || '不限'
          }
        }).then(res => {
          if (res.data.success) {
            Taro.showToast({
              title: '下单成功',
              icon: 'success'
            })
            setTimeout(() => {
              Taro.redirectTo({
                url: `/pages/orders/index`
              })
            }, 1500)
          } else {
            Taro.showModal({
              title: '下单失败',
              content: res.data.message || '请稍后重试',
              showCancel: false
            })
          }
        }).catch(err => {
          console.error('确认订单失败', err)
          Taro.showModal({
            title: '下单失败',
            content: '网络错误，请稍后重试',
            showCancel: false
          })
        }).finally(() => {
          setLoading(false)
        })
        return
      }
      setLoading(false)
    }, 1000)
  }

  return (
    <View className='upload-seat-page'>
      {/* Mock 模式切换 */}
      <View className='mock-switch'>
        <Text className='mock-label'>Mock 模式</Text>
        <View
          className={`mock-toggle ${useMock ? 'active' : ''}`}
          onClick={() => setUseMock(!useMock)}
        >
          <View className='mock-toggle-inner' />
        </View>
      </View>

      {/* 电影信息 */}
      <View className='movie-info'>
        <Text className='movie-name'>{decodeURIComponent(router.movie || '未选择电影')}</Text>
        <Text className='cinema-name'>{router.cinemaName}</Text>
        <Text className='show-time'>{router.showTime || '请选择场次'}</Text>
      </View>

      {/* 上传指引 */}
      <View className='guide-section'>
        <View className='guide-title'>
          <Text className='step-number'>1</Text>
          <Text>跳转选座</Text>
        </View>
        <Text className='guide-desc'>点击下面按钮，跳转到猫眼/淘票票小程序选座</Text>
        <Button
          className='jump-btn'
          onClick={() => {
            if (useMock) {
              Taro.showToast({
                title: 'Mock 模式：直接截图上传',
                icon: 'none',
                duration: 2000
              })
            } else {
              // TODO: 跳转到猫眼小程序
              Taro.showToast({ title: '开发中', icon: 'none' })
            }
          }}
        >
          跳转猫眼选座
        </Button>
      </View>

      <View className='guide-section'>
        <View className='guide-title'>
          <Text className='step-number'>2</Text>
          <Text>截图上传</Text>
        </View>
        <Text className='guide-desc'>选好座位后，截图并上传，AI 会自动识别座位信息</Text>

        {/* 示例图 */}
        <View className='example-container'>
          <Text className='example-label'>示例：</Text>
          <View className='example-images'>
            <View className='example-placeholder'>
              <Text>选座页面</Text>
              <Text>→</Text>
              <Text>座位截图</Text>
            </View>
          </View>
        </View>

        <Button
          className='upload-btn'
          loading={uploading}
          onClick={chooseAndUpload}
        >
          {uploading ? '识别中...' : '选择截图上传'}
        </Button>

        {/* 预览图 */}
        {imagePath && (
          <View className='image-preview'>
            <Image src={imagePath} mode='widthFix' />
          </View>
        )}
      </View>

      {/* AI 识别结果 */}
      {analysis && (
        <View className='result-section'>
          <View className='result-title'>
            <Text className='step-number'>3</Text>
            <Text>确认订单</Text>
          </View>

          <View className='result-card'>
            <View className='result-row'>
              <Text className='label'>影院</Text>
              <Text className='value'>{analysis.cinema_name}</Text>
            </View>
            <View className='result-row'>
              <Text className='label'>电影</Text>
              <Text className='value'>{analysis.movie_name}</Text>
            </View>
            <View className='result-row'>
              <Text className='label'>场次</Text>
              <Text className='value'>{analysis.show_date} {analysis.show_time}</Text>
            </View>
            <View className='result-row'>
              <Text className='label'>影厅</Text>
              <Text className='value'>{analysis.hall || '普通厅'}</Text>
            </View>
            <View className='result-row'>
              <Text className='label'>座位</Text>
              <Text className='value seats'>{analysis.seat_labels.join(', ')}</Text>
            </View>
            <View className='result-row total'>
              <Text className='label'>总价</Text>
              <Text className='value price'>¥{analysis.total_price}</Text>
            </View>
          </View>

          <Button
            className='confirm-btn'
            loading={loading}
            onClick={confirmOrder}
          >
            确认下单 ¥{analysis.total_price}
          </Button>
        </View>
      )}
    </View>
  )
}
