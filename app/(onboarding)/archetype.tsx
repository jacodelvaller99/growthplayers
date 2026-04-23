import React, { useState } from 'react'
import { View, Text, Pressable, StyleSheet, SafeAreaView } from 'react-native'
import { useRouter } from 'expo-router'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useProgramStore } from '../../store/programStore'

const C = {
  bg: '#01191D', surface: '#0D2B30',
  text: '#FFFFFF', textMuted: '#86C6B3', textFaint: 'rgba(174,254,240,0.40)',
  mint: '#AEFEF0',
}

const ARCHETYPES = [
  {
    id: 'guerrero',
    emoji: '⚔️',
    label: 'Guerrero',
    desc: 'Acción, disciplina, fuerza',
    color: '#dc2626',
    bg: 'rgba(220,38,38,0.10)',
    border: 'rgba(220,38,38,0.30)',
  },
  {
    id: 'pontifice',
    emoji: '✨',
    label: 'Pontífice',
    desc: 'Visión, sabiduría, guía',
    color: '#7c3aed',
    bg: 'rgba(124,58,237,0.10)',
    border: 'rgba(124,58,237,0.30)',
  },
  {
    id: 'mercader',
    emoji: '💰',
    label: 'Mercader',
    desc: 'Estrategia, abundancia, red',
    color: '#059669',
    bg: 'rgba(5,150,105,0.10)',
    border: 'rgba(5,150,105,0.30)',
  },
  {
    id: 'guardian',
    emoji: '🛡️',
    label: 'Guardián',
    desc: 'Protección, comunidad, legado',
    color: '#0ea5e9',
    bg: 'rgba(14,165,233,0.10)',
    border: 'rgba(14,165,233,0.30)',
  },
]

export default function OnboardingArchetype() {
  const router = useRouter()
  const { setArchetype } = useProgramStore()
  const [selected, setSelected] = useState<string | null>(null)

  const handleSelect = (id: string) => {
    setSelected(id)
    setArchetype(id)
    setTimeout(() => router.push('/(onboarding)/norte'), 180)
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Animated.View entering={FadeInDown.delay(100).duration(600)}>
          <Text style={styles.label}>PASO 2 DE 4</Text>
          <Text style={styles.title}>Tu arquetipo{'\n'}de liderazgo</Text>
        </Animated.View>

        <View style={styles.grid}>
          {ARCHETYPES.map((arch, i) => (
            <Animated.View key={arch.id} entering={FadeInDown.delay(250 + i * 80).duration(500)} style={styles.cardWrap}>
              <Pressable
                style={[
                  styles.card,
                  { backgroundColor: arch.bg, borderColor: arch.border },
                  selected === arch.id && { borderWidth: 2, borderColor: arch.color },
                ]}
                onPress={() => handleSelect(arch.id)}
              >
                <Text style={styles.emoji}>{arch.emoji}</Text>
                <Text style={[styles.cardLabel, { color: arch.color }]}>{arch.label}</Text>
                <Text style={styles.cardDesc}>{arch.desc}</Text>
              </Pressable>
            </Animated.View>
          ))}
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 48 },
  label: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 11, color: C.textMuted, letterSpacing: 2,
    textTransform: 'uppercase', marginBottom: 12,
  },
  title: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 28, color: C.text, lineHeight: 36, marginBottom: 32,
  },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12,
  },
  cardWrap: { width: '47%' },
  card: {
    borderWidth: 1.5, borderRadius: 16, padding: 20,
    alignItems: 'center', gap: 8, minHeight: 130,
    justifyContent: 'center',
  },
  emoji: { fontSize: 32 },
  cardLabel: {
    fontFamily: 'SpaceGrotesk_700Bold', fontSize: 15,
    textAlign: 'center',
  },
  cardDesc: {
    fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12,
    color: C.textMuted, textAlign: 'center',
  },
})
