import React, { useState } from 'react'
import { View, Text, ScrollView, Pressable, StyleSheet, SafeAreaView } from 'react-native'
import Slider from '@react-native-community/slider'
import { useRouter } from 'expo-router'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useAuthStore } from '../../store'
import { useProgramStore } from '../../store/programStore'
import { upsertProfile, upsertAllPilares } from '../../lib/database'

const C = {
  bg: '#01191D', surface: '#0D2B30',
  mint: '#AEFEF0', mintBorder: 'rgba(174,254,240,0.20)',
  text: '#FFFFFF', textMuted: '#86C6B3',
}

const PILARES = [
  { key: 'fe',       label: 'Fe / Espiritualidad', color: '#7c3aed' },
  { key: 'finanzas', label: 'Finanzas',             color: '#059669' },
  { key: 'salud',    label: 'Salud',                color: '#dc2626' },
  { key: 'familia',  label: 'Familia',              color: '#f97316' },
  { key: 'mente',    label: 'Mente',                color: '#06b6d4' },
  { key: 'negocio',  label: 'Negocio / Carrera',    color: '#8b5cf6' },
  { key: 'impacto',  label: 'Impacto',              color: '#0ea5e9' },
  { key: 'legado',   label: 'Legado',               color: '#64748b' },
]

type PilaresMap = Record<string, number>

export default function OnboardingWheel() {
  const router = useRouter()
  const { session } = useAuthStore()
  const { setProgramType, programType, archetypeId } = useProgramStore()
  const [isSaving, setIsSaving] = useState(false)

  const [values, setValues] = useState<PilaresMap>(
    Object.fromEntries(PILARES.map((p) => [p.key, 5]))
  )

  const handleFinish = async () => {
    setIsSaving(true)
    const userId = session?.user?.id
    if (!userId) {
      // Dev/preview mode: no session, navigate anyway
      setIsSaving(false)
      router.replace('/(tabs)/comando')
      return
    }
    try {
      const avg = Object.values(values).reduce((a, b) => a + b, 0) / 8
      await Promise.all([
        upsertAllPilares(userId, values),
        upsertProfile(userId, {
          program_type: programType,
          archetype_id: archetypeId,
          sovereignty_score: Math.round(avg * 10) / 10,
          current_module_id: 0,
          streak: 0,
          total_days: 0,
        }),
      ])
      router.replace('/(tabs)/comando')
    } catch (e) {
      console.error('[wheel] handleFinish error:', e)
      setIsSaving(false)
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Animated.View entering={FadeInDown.delay(100).duration(600)}>
          <Text style={styles.label}>PASO 4 DE 4</Text>
          <Text style={styles.title}>¿Cómo estás{'\n'}hoy?</Text>
          <Text style={styles.subtitle}>Evalúa los 8 pilares de tu vida (1–10)</Text>
        </Animated.View>

        <View style={styles.pilares}>
          {PILARES.map((p, i) => (
            <Animated.View key={p.key} entering={FadeInDown.delay(250 + i * 50).duration(400)} style={styles.pilarRow}>
              <View style={styles.pilarHeader}>
                <Text style={styles.pilarLabel}>{p.label}</Text>
                <Text style={[styles.pilarValue, { color: p.color }]}>{values[p.key]}</Text>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={1}
                maximumValue={10}
                step={1}
                value={values[p.key]}
                onValueChange={(v) => setValues((prev) => ({ ...prev, [p.key]: v }))}
                minimumTrackTintColor={p.color}
                maximumTrackTintColor="rgba(255,255,255,0.1)"
                thumbTintColor={p.color}
              />
            </Animated.View>
          ))}
        </View>

        <Pressable
          style={[styles.btn, isSaving && styles.btnDisabled]}
          onPress={handleFinish}
          disabled={isSaving}
        >
          <Text style={styles.btnText}>
            {isSaving ? 'INICIANDO PROTOCOLO...' : 'INICIAR PROTOCOLO →'}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: 24, paddingTop: 48, paddingBottom: 40, gap: 0 },
  label: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 11, color: C.textMuted, letterSpacing: 2,
    textTransform: 'uppercase', marginBottom: 12,
  },
  title: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 28, color: C.text, lineHeight: 36, marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 14, color: C.textMuted, marginBottom: 32,
  },
  pilares: { gap: 20, marginBottom: 40 },
  pilarRow: {
    backgroundColor: C.surface, borderRadius: 12, padding: 16,
  },
  pilarHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  pilarLabel: {
    fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 14, color: C.text,
  },
  pilarValue: {
    fontFamily: 'SpaceGrotesk_700Bold', fontSize: 20,
  },
  slider: { width: '100%', height: 36 },
  btn: {
    height: 56, backgroundColor: C.mint, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  btnText: {
    fontFamily: 'SpaceGrotesk_700Bold', fontSize: 14,
    color: '#01191D', letterSpacing: 1.5,
  },
})
