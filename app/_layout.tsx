import React, { useEffect, Component } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useFonts, SpaceGrotesk_700Bold, SpaceGrotesk_600SemiBold, SpaceGrotesk_400Regular } from '../constants/Typography'
import { SpaceMono_400Regular, SpaceMono_700Bold } from '@expo-google-fonts/space-mono'
import { useAuthStore } from '../store'

SplashScreen.preventAutoHideAsync()

// ─── Error Boundary ───────────────────────────────────────────────────────────
interface EBState { hasError: boolean; error: Error | null }

class AppErrorBoundary extends Component<{ children: React.ReactNode }, EBState> {
  state: EBState = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): EBState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[Lifeflow] Unhandled error:', error.message, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={eb.container}>
          <Text style={eb.icon}>⚠</Text>
          <Text style={eb.title}>Algo salió mal</Text>
          <Text style={eb.message}>
            {this.state.error?.message || 'Error inesperado'}
          </Text>
          <Pressable
            style={eb.btn}
            onPress={() => this.setState({ hasError: false, error: null })}
          >
            <Text style={eb.btnText}>REINTENTAR</Text>
          </Pressable>
        </View>
      )
    }
    return this.props.children
  }
}

const eb = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#0A0A0A',
    alignItems: 'center', justifyContent: 'center', padding: 32,
  },
  icon: { fontSize: 40, color: '#EDBA01', marginBottom: 20 },
  title: {
    fontWeight: '700', fontSize: 18, color: '#F5F5F5',
    marginBottom: 10, letterSpacing: 0.5,
  },
  message: {
    fontSize: 13, color: '#8A8A8A', textAlign: 'center',
    marginBottom: 32, lineHeight: 20,
  },
  btn: {
    backgroundColor: '#EDBA01', borderRadius: 10,
    paddingHorizontal: 28, paddingVertical: 14,
  },
  btnText: {
    color: '#0A0A0A', fontWeight: '700',
    fontSize: 13, letterSpacing: 1.5,
  },
})

// ─── Root Layout ──────────────────────────────────────────────────────────────
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
    <AppErrorBoundary>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="checkin" options={{ presentation: 'modal' }} />
        <Stack.Screen name="respiracion" options={{ presentation: 'fullScreenModal' }} />
      </Stack>
    </AppErrorBoundary>
  )
}
