import React from 'react'
import { View, Text, StyleSheet, SafeAreaView } from 'react-native'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import Svg, { Circle, Path } from 'react-native-svg'

const C = {
  bg: '#01191D', surface: '#0D2B30',
  mint: '#AEFEF0', mintFaint: 'rgba(174,254,240,0.40)',
  text: '#FFFFFF', textMuted: '#86C6B3',
  divider: 'rgba(174,254,240,0.08)',
}

function CompassSvg({ size = 72 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle cx="50" cy="50" r="46" stroke={C.mint} strokeWidth="2" fill="none" opacity={0.25} />
      <Path d="M50 10 L57 44 L50 50 L43 44 Z" fill={C.mint} opacity={0.7} />
      <Path d="M50 90 L43 56 L50 50 L57 56 Z" fill={C.textMuted} opacity={0.5} />
      <Path d="M10 50 L44 43 L50 50 L44 57 Z" fill={C.textMuted} opacity={0.5} />
      <Path d="M90 50 L56 57 L50 50 L56 43 Z" fill={C.mint} opacity={0.7} />
      <Circle cx="50" cy="50" r="5" fill={C.mint} opacity={0.9} />
    </Svg>
  )
}

export default function ComunidadScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>COMUNIDAD</Text>
      </View>
      <View style={styles.container}>
        <Animated.View entering={FadeIn.delay(200).duration(700)} style={styles.iconWrap}>
          <CompassSvg size={96} />
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(500).duration(700)} style={styles.textWrap}>
          <Text style={styles.title}>Tu comunidad está llegando</Text>
          <Text style={styles.subtitle}>
            Conecta con otros líderes Polaris.{'\n'}Celebra victorias. Supera obstáculos juntos.
          </Text>
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(700).duration(600)} style={styles.badge}>
          <Text style={styles.badgeText}>PRÓXIMAMENTE</Text>
        </Animated.View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: {
    paddingHorizontal: 20, paddingTop: 52, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: C.divider,
  },
  headerTitle: {
    fontFamily: 'SpaceGrotesk_700Bold', fontSize: 18, color: C.text,
  },
  container: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 40, gap: 24,
  },
  iconWrap: { opacity: 0.6 },
  textWrap: { alignItems: 'center', gap: 12 },
  title: {
    fontFamily: 'SpaceGrotesk_700Bold', fontSize: 20,
    color: C.text, textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'SpaceGrotesk_400Regular', fontSize: 14,
    color: C.textMuted, textAlign: 'center', lineHeight: 22,
  },
  badge: {
    backgroundColor: 'rgba(174,254,240,0.08)',
    borderWidth: 1, borderColor: 'rgba(174,254,240,0.20)',
    borderRadius: 999, paddingHorizontal: 20, paddingVertical: 8,
  },
  badgeText: {
    fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 12,
    color: C.mintFaint, letterSpacing: 2,
  },
})
