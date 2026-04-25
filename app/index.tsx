import { Redirect } from 'expo-router'
import { View, ActivityIndicator } from 'react-native'
import { useAuthStore } from '../store'

export default function Index() {
  const { session, isLoading } = useAuthStore()

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0A0A0A', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#EDBA01" size="large" />
      </View>
    )
  }

  if (session) {
    return <Redirect href="/(tabs)/comando" />
  }

  return <Redirect href="/(auth)/login" />
}
