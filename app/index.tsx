import { Redirect } from 'expo-router'
import { View, ActivityIndicator } from 'react-native'
import { useAuthStore } from '../store'

export default function Index() {
  const { session, isLoading } = useAuthStore()

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#01191D', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#AEFEF0" size="large" />
      </View>
    )
  }

  if (session) {
    return <Redirect href="/(tabs)/comando" />
  }

  return <Redirect href="/(auth)/login" />
}
