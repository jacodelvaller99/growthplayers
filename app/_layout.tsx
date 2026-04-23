import { useEffect } from 'react'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useFonts, SpaceGrotesk_700Bold, SpaceGrotesk_600SemiBold, SpaceGrotesk_400Regular } from '../constants/Typography'
import { SpaceMono_400Regular, SpaceMono_700Bold } from '@expo-google-fonts/space-mono'
import { useAuthStore } from '../store'

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const { initialize } = useAuthStore()

  const [fontsLoaded] = useFonts({
    SpaceGrotesk_700Bold,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_400Regular,
    SpaceMono_400Regular,
    SpaceMono_700Bold,
  })

  useEffect(() => {
    initialize()
  }, [])

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync()
    }
  }, [fontsLoaded])

  if (!fontsLoaded) return null

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(onboarding)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="checkin" options={{ presentation: 'modal' }} />
      <Stack.Screen name="respiracion" options={{ presentation: 'fullScreenModal' }} />
    </Stack>
  )
}
