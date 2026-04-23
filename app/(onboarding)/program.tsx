import React, { useState } from 'react'
import { View, Text, Pressable, StyleSheet, SafeAreaView } from 'react-native'
import { useRouter } from 'expo-router'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useProgramStore } from '../../store/programStore'

const C = {
  bg: '#01191D', surface: '#0D2B30', surface2: '#0F3640',
  mint: '#AEFEF0', mintBorder: 'rgba(174,254,240,0.20)',
  gold: '#EDBA01', goldBorder: 'rgba(237,186,1,0.40)',
  text: '#FFFFFF', textMuted: '#86C6B3',
}

export default function OnboardingProgram() {
  const router = useRouter()
  const { setProgramType } = useProgramStore()
  const [selected, setSelected] = useState<'polaris' | 'growth_players' | null>(null)

  const handleSelect = (type: 'polaris' | 'growth_players') => {
    setSelected(type)
    setProgramType(type)
    setTimeout(() => router.push('/(onboarding)/archetype'), 180)
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Animated.View entering={FadeInDown.delay(100).duration(600)}>
          <Text style={styles.label}>PASO 1 DE 4</Text>
          <Text style={styles.title}>¿En qué programa{'\n'}estás inscrito?</Text>
        </Animated.View>

        <View style={styles.cards}>
          <Animated.View entering={FadeInDown.delay(300).duration(600)}>
            <Pressable
              style={[styles.card, styles.cardPolaris, selected === 'polaris' && styles.cardSelected]}
              onPress={() => handleSelect('polaris')}
            >
              <Text style={styles.cardIcon}>★</Text>
              <Text style={[styles.cardTitle, { color: C.gold }]}>POLARIS™</Text>
              <Text style={styles.cardBrand}>Growth Institute</Text>
              <Text style={styles.cardDesc}>"Encuentra Tu Norte"</Text>
            </Pressable>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(450).duration(600)}>
            <Pressable
              style={[styles.card, styles.cardGP, selected === 'growth_players' && styles.cardSelectedMint]}
              onPress={() => handleSelect('growth_players')}
            >
              <Text style={[styles.cardIcon, { color: C.mint }]}>↑↑</Text>
              <Text style={[styles.cardTitle, { color: C.mint }]}>GROWTH PLAYERS</Text>
              <Text style={[styles.cardDesc, { color: C.textMuted }]}>"Crecimiento con Equilibrio"</Text>
            </Pressable>
          </Animated.View>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 48, justifyContent: 'center' },
  label: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 11, color: C.textMuted, letterSpacing: 2,
    textTransform: 'uppercase', marginBottom: 12,
  },
  title: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 28, color: C.text, lineHeight: 36, marginBottom: 40,
  },
  cards: { gap: 16 },
  card: {
    borderWidth: 1.5, borderRadius: 18, padding: 28,
    alignItems: 'center', gap: 8,
  },
  cardPolaris: { backgroundColor: '#0F0F0F', borderColor: C.goldBorder },
  cardGP: { backgroundColor: C.bg, borderColor: C.mintBorder },
  cardSelected: { borderColor: C.gold, borderWidth: 2 },
  cardSelectedMint: { borderColor: C.mint, borderWidth: 2 },
  cardIcon: {
    fontSize: 32, color: C.gold, fontWeight: '700', marginBottom: 4,
  },
  cardTitle: {
    fontFamily: 'SpaceGrotesk_700Bold', fontSize: 20, letterSpacing: 1,
  },
  cardBrand: {
    fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12, color: '#C9C9C9',
  },
  cardDesc: {
    fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13,
    color: '#6D6D6D', fontStyle: 'italic',
  },
})
