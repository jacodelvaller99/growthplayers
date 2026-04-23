import React, { useEffect } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import Animated, { FadeIn, FadeInDown, useSharedValue, withRepeat, withSequence, withTiming, useAnimatedStyle } from 'react-native-reanimated'
import Svg, { Path, Polygon } from 'react-native-svg'
import { useAuthStore } from '../../store'
import { getProfile } from '../../lib/database'

const C = {
  bg: '#01191D', surface: '#0D2B30', mint: '#AEFEF0',
  gold: '#EDBA01', text: '#FFFFFF', textMuted: '#86C6B3',
}

function PolarisStarSvg({ size = 80 }: { size?: number }) {
  const s = size / 2
  const outerR = s * 0.9
  const innerR = s * 0.38
  const points8 = Array.from({ length: 8 }).map((_, i) => {
    const angle = (i * Math.PI * 2) / 8 - Math.PI / 2
    const inner = ((i + 0.5) * Math.PI * 2) / 8 - Math.PI / 2
    const ox = s + outerR * Math.cos(angle)
    const oy = s + outerR * Math.sin(angle)
    const ix = s + innerR * Math.cos(inner)
    const iy = s + innerR * Math.sin(inner)
    return `${ox},${oy} ${ix},${iy}`
  }).join(' ')

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Polygon points={points8} fill={C.gold} opacity={0.95} />
    </Svg>
  )
}

export default function OnboardingSplash() {
  const router = useRouter()
  const { session } = useAuthStore()
  const glowScale = useSharedValue(1)

  useEffect(() => {
    glowScale.value = withRepeat(
      withSequence(withTiming(1.15, { duration: 2000 }), withTiming(1, { duration: 2000 })),
      -1, true
    )
    // Auto-skip if profile already complete
    if (session?.user?.id) {
      getProfile(session.user.id).then((profile) => {
        if (profile?.program_type && profile?.archetype_id && profile?.norte) {
          router.replace('/(tabs)/comando')
        }
      })
    }
  }, [])

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: 0.15,
  }))

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.glow, glowStyle]} />

      <Animated.View entering={FadeIn.delay(200).duration(800)} style={styles.starWrap}>
        <PolarisStarSvg size={100} />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(500).duration(700)} style={styles.textWrap}>
        <Text style={styles.title}>LIFEFLOW</Text>
        <View style={styles.divider} />
        <Text style={styles.subtitle}>× POLARIS PROTOCOL</Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(900).duration(700)} style={styles.btnWrap}>
        <Pressable
          style={({ pressed }) => [styles.btn, pressed && { opacity: 0.8 }]}
          onPress={() => router.push('/(onboarding)/program')}
        >
          <Text style={styles.btnText}>COMENZAR</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/(auth)/login')} style={styles.linkWrap}>
          <Text style={styles.link}>Ya tengo cuenta</Text>
        </Pressable>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: C.bg,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32,
  },
  glow: {
    position: 'absolute', width: 400, height: 400,
    borderRadius: 200, backgroundColor: C.gold,
    top: -100,
  },
  starWrap: { marginBottom: 32 },
  textWrap: { alignItems: 'center', marginBottom: 56 },
  title: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 36, color: C.text,
    letterSpacing: 4, marginBottom: 12,
  },
  divider: { width: 40, height: 1.5, backgroundColor: C.gold, marginBottom: 12 },
  subtitle: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 12, color: C.gold, letterSpacing: 3,
  },
  btnWrap: { width: '100%', alignItems: 'center', gap: 16 },
  btn: {
    width: '100%', height: 56, backgroundColor: C.gold,
    borderRadius: 14, alignItems: 'center', justifyContent: 'center',
  },
  btnText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 15, color: '#0F0F0F', letterSpacing: 2,
  },
  linkWrap: { paddingVertical: 8 },
  link: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 14, color: C.textMuted,
  },
})
