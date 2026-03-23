import Taro from '@tarojs/taro'
import { View, Text, Button } from '@tarojs/components'
import './index.scss'

export default function ProfilePage() {
  const handleLogin = () => {
    Taro.showToast({ title: '登录功能开发中', icon: 'none' })
  }

  return (
    <View className='profile-page'>
      <View className='user-card'>
        <View className='avatar'>
          <Text className='avatar-text'>?</Text>
        </View>
        <Text className='nickname'>未登录</Text>
        <Button className='login-btn' onClick={handleLogin}>
          微信登录
        </Button>
      </View>

      <View className='menu-list'>
        <View className='menu-item'>
          <Text className='menu-text'>我的补偿券</Text>
          <Text className='menu-value'>¥0</Text>
        </View>
        <View className='menu-item'>
          <Text className='menu-text'>联系客服</Text>
          <Text className='menu-arrow'>{'>'}</Text>
        </View>
        <View className='menu-item'>
          <Text className='menu-text'>关于我们</Text>
          <Text className='menu-arrow'>{'>'}</Text>
        </View>
      </View>
    </View>
  )
}