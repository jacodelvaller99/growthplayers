import React, { useState } from 'react'
import {
  View, Text, Pressable, StyleSheet, Dimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useProgramStore } from '../../store/programStore'

const { width: W } = Dimensions.get('window')

const T = {
  bg:          '#0A0A0A',
  surface:     '#111111',
  surface2:    '#181818',
  gold:        '#EDBA01',
  goldMid:     'rgba(237,186,1,0.14)',
  goldBorder:  'rgba(237,186,1,0.28)',
  goldDim:     'rgba(237,186,1,0.45)',
  goldFaint:   'rgba(237,186,1,0.07)',
  text:        '#FFFFFF',
  textMid:     '#888888',
  textDim:     '#555555',
  divider:     'rgba(255,255,255,0.07)',
}

export default function OnboardingProgram() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { setProgramType } = useProgramStore()
  const [selected, setSelected] = useState<'polaris' | 'growth_players' | null>(null)

  const handleSelect = (type: 'polaris' | 'growth_players') => {
    setSelected(type)
    setProgramType(type)
    setTimeout(() => router.push('/(onboarding)/archetype'), 200)
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}>
      {/* Step indicator */}
      <Animated.View entering={FadeIn.duration(500)} style={styles.stepRow}>
        {[1, 2, 3, 4].map(s => (
          <View key={s} style={[styles.stepDot, s === 1 && styles.stepDotActive]} />
        ))}
      </Animated.View>

      {/* Header */}
      <Animated.View entering={FadeInDown.delay(80).duration(600)} style={styles.headerBlock}>
        <Text style={styles.eyebrow}>PASO 1 DE 4</Text>
        <Text style={styles.title}>ELIGE TU{'\n'}PROGRAMA</Text>
        <Text style={styles.sub}>Selecciona el programa en el que estás inscrito</Text>
      </Animated.View>

      {/* Program Cards */}
      <View style={styles.cardsWrap}>
        {/* POLARIS card */}
        <Animated.View entering={FadeInDown.delay(220).duration(600)}>
          <Pressable
            onPress={() => handleSelect('polaris')}
            style={({ pressed }) => [
              styles.card, styles.cardPolaris,
              selected === 'polaris' && styles.cardActive,
              pressed && { opacity: 0.88 },
            ]}
          >
            {/* Top accent bar */}
            <View style={styles.cardAccentBar} />

            <View style={styles.cardInner}>
              {/* Icon */}
              <View style={styles.polarisIconWrap}>
                {/* Cross */}
                <View style={[styles.crossArm, styles.crossArmV]} />
                <View style={[styles.crossArm, styles.crossArmH]} />
                <View style={styles.polarisCore} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.cardProgramLabel}>PROGRAMA</Text>
                <Text style={styles.cardTitle}>POLARIS™</Text>
                <Text style={styles.cardInstitute}>Growth Institute</Text>
              </View>

              {selected === 'polaris' && (
                <MaterialCommunityIcons name="check-circle" size={22} color={T.gold} />
              )}
            </View>

            <Text style={styles.cardQuote}>"Encuentra Tu Norte"</Text>

            <View style={styles.cardTags}>
              <View style={styles.tag}><Text style={styles.tagText}>MENTORING</Text></View>
              <View style={styles.tag}><Text style={styles.tagText}>PROTOCOLO</Text></View>
              <View style={styles.tag}><Text style={styles.tagText}>NORTE</Text></View>
            </View>
          </Pressable>
        </Animated.View>

        {/* GROWTH PLAYERS card */}
        <Animated.View entering={FadeInDown.delay(360).duration(600)}>
          <Pressable
            onPress={() => handleSelect('growth_players')}
            style={({ pressed }) => [
              styles.card, styles.cardGP,
              selected === 'growth_players' && styles.cardActive,
              pressed && { opacity: 0.88 },
            ]}
          >
            <View style={styles.cardInner}>
              {/* Icon */}
              <View style={styles.gpIconWrap}>
                <Text style={styles.gpIconText}>↑↑</Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.cardProgramLabel}>PROGRAMA</Text>
                <Text style={[styles.cardTitle, { fontSize: 16 }]}>GROWTH PLAYERS</Text>
                <Text style={styles.cardInstitute}>Growth Institute</Text>
              </View>

              {selected === 'growth_players' && (
                <MaterialCommunityIcons name="check-circle" size={22} color={T.gold} />
              )}
            </View>

            <Text style={styles.cardQuote}>"Crecimiento con Equilibrio"</Text>

            <View style={styles.cardTags}>
              <View style={styles.tag}><Text style={styles.tagText}>CRECIMIENTO</Text></View>
              <View style={styles.tag}><Text style={styles.tagText}>EQUILIBRIO</Text></View>
            </View>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: T.bg,
    paddingHorizontal: 24,
  },

  // Step dots
  stepRow: { flexDirection: 'row', gap: 6, marginBottom: 32 },
  stepDot: { width: 18, height: 3, borderRadius: 2, backgroundColor: T.surface2 },
  stepDotActive: { backgroundColor: T.gold },

  // Header
  headerBlock: { marginBottom: 36, gap: 8 },
  eyebrow: {
    fontSize: 9, fontFamily: 'SpaceGrotesk_700Bold',
    color: T.goldDim, letterSpacing: 3, textTransform: 'uppercase',
  },
  title: {
    fontSize: 40, fontFamily: 'SpaceGrotesk_700Bold',
    color: T.text, lineHeight: 44, letterSpacing: -0.5,
  },
  sub: {
    fontSize: 13, fontFamily: 'SpaceGrotesk_400Regular',
    color: T.textMid, lineHeight: 20,
  },

  // Cards
  cardsWrap: { gap: 14, flex: 1 },
  card: {
    borderWidth: 1.5, borderRadius: 20,
    overflow: 'hidden', padding: 20,
  },
  cardPolaris: { backgroundColor: T.surface, borderColor: T.goldBorder },
  cardGP: { backgroundColor: T.surface, borderColor: T.divider },
  cardActive: { borderColor: T.gold, borderWidth: 2 },

  cardAccentBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: T.gold },

  cardInner: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 4, marginBottom: 14 },

  // Polaris icon
  polarisIconWrap: {
    width: 44, height: 44, alignItems: 'center', justifyContent: 'center',
    backgroundColor: T.goldMid, borderRadius: 22, borderWidth: 1.5, borderColor: T.goldBorder,
  },
  crossArm: { position: 'absolute', backgroundColor: T.gold, borderRadius: 1 },
  crossArmV: { width: 2, height: 22 },
  crossArmH: { width: 22, height: 2 },
  polarisCore: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: T.gold },

  // GP icon
  gpIconWrap: {
    width: 44, height: 44, alignItems: 'center', justifyContent: 'center',
    backgroundColor: T.surface2, borderRadius: 22, borderWidth: 1.5, borderColor: T.divider,
  },
  gpIconText: { fontSize: 18, color: T.gold, fontWeight: '700', letterSpacing: -2, lineHeight: 22 },

  // Card text
  cardProgramLabel: {
    fontSize: 8, fontFamily: 'SpaceGrotesk_700Bold',
    color: T.goldDim, letterSpacing: 3, marginBottom: 2,
  },
  cardTitle: {
    fontSize: 20, fontFamily: 'SpaceGrotesk_700Bold', color: T.text, lineHeight: 24,
  },
  cardInstitute: {
    fontSize: 11, fontFamily: 'SpaceGrotesk_400Regular', color: T.textMid, marginTop: 2,
  },
  cardQuote: {
    fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular',
    color: T.textMid, fontStyle: 'italic', marginBottom: 14,
  },
  cardTags: { flexDirection: 'row', gap: 6 },
  tag: {
    backgroundColor: T.surface2, borderWidth: 1, borderColor: T.divider,
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4,
  },
  tagText: {
    fontSize: 8, fontFamily: 'SpaceGrotesk_700Bold', color: T.textMid, letterSpacing: 1.5,
  },
})
