import React, { useState } from 'react'
import {
  View, Text, TextInput, ScrollView, Pressable,
  StyleSheet, SafeAreaView,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useCheckin } from '../hooks/useCheckin'

const C = {
  bg: '#0A0A0A', surface: '#141414', surface2: '#1C1C1C',
  mint: '#EDBA01', mintBorder: 'rgba(237,186,1,0.20)',
  mintFaint: 'rgba(237,186,1,0.35)',
  text: '#FFFFFF', textMuted: '#C0C0C0',
  divider: 'rgba(255,255,255,0.08)',
}

const OPTIONS = [
  { value: 1, emoji: '😴', label: 'Muy bajo' },
  { value: 2, emoji: '😕', label: 'Bajo' },
  { value: 3, emoji: '😐', label: 'Normal' },
  { value: 4, emoji: '💪', label: 'Bien' },
  { value: 5, emoji: '⚡', label: 'Excelente' },
]

function ScaleSelector({ label, value, onChange }: {
  label: string; value: number; onChange: (v: number) => void
}) {
  return (
    <View style={styles.scaleWrap}>
      <Text style={styles.scaleLabel}>{label}</Text>
      <View style={styles.scaleRow}>
        {OPTIONS.map((o) => (
          <Pressable
            key={o.value}
            style={[styles.scaleBtn, value === o.value && styles.scaleBtnActive]}
            onPress={() => onChange(o.value)}
          >
            <Text style={styles.scaleEmoji}>{o.emoji}</Text>
            <Text style={[styles.scaleTxt, value === o.value && styles.scaleTxtActive]}>
              {o.value}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  )
}

export default function CheckinScreen() {
  const router = useRouter()
  const { todayCheckin, hasCheckedIn, isLoading, submitCheckin } = useCheckin()

  const [energy, setEnergy] = useState(3)
  const [focus, setFocus] = useState(3)
  const [mood, setMood] = useState(3)
  const [intention, setIntention] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async () => {
    setIsSaving(true)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    const ok = await submitCheckin({ energy, focus, mood, intention: intention.trim() || undefined })
    if (ok) {
      router.back()
    } else {
      setIsSaving(false)
    }
  }

  if (isLoading) return <View style={styles.safe} />

  if (hasCheckedIn && todayCheckin) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <Animated.View entering={FadeInDown.duration(600)} style={styles.doneWrap}>
            <Text style={styles.doneIcon}>✓</Text>
            <Text style={styles.doneTitle}>Check-in completado</Text>
            <Text style={styles.doneSub}>Ya registraste tu día de hoy</Text>
            <View style={styles.doneSummary}>
              <Text style={styles.doneStat}>⚡ Energía: {todayCheckin.energy}/5</Text>
              <Text style={styles.doneStat}>🎯 Foco: {todayCheckin.focus}/5</Text>
              <Text style={styles.doneStat}>😊 Ánimo: {todayCheckin.mood}/5</Text>
            </View>
            <Pressable style={styles.closeBtn} onPress={() => router.back()}>
              <Text style={styles.closeBtnText}>CERRAR</Text>
            </Pressable>
          </Animated.View>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>CHECK-IN DIARIO</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.closeX}>✕</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <ScaleSelector label="⚡ Nivel de Energía" value={energy} onChange={setEnergy} />
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          <ScaleSelector label="🎯 Nivel de Foco" value={focus} onChange={setFocus} />
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(300).duration(500)}>
          <ScaleSelector label="😊 Estado de Ánimo" value={mood} onChange={setMood} />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400).duration(500)} style={styles.intentionWrap}>
          <Text style={styles.scaleLabel}>✦ Mi intención de hoy</Text>
          <TextInput
            style={styles.intentionInput}
            value={intention}
            onChangeText={setIntention}
            placeholder="¿Qué es lo más importante que harás hoy?"
            placeholderTextColor="rgba(237,186,1,0.25)"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(500).duration(500)}>
          <Pressable
            style={[styles.submitBtn, isSaving && { opacity: 0.5 }]}
            onPress={handleSubmit}
            disabled={isSaving}
          >
            <Text style={styles.submitBtnText}>
              {isSaving ? 'REGISTRANDO...' : 'REGISTRAR DÍA'}
            </Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 52, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: C.divider,
  },
  headerTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 18, color: C.text },
  closeX: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 20, color: C.textMuted, padding: 4 },
  scroll: { padding: 20, gap: 16, paddingBottom: 40 },
  scaleWrap: { backgroundColor: C.surface, borderRadius: 14, padding: 16 },
  scaleLabel: {
    fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 14, color: C.text, marginBottom: 12,
  },
  scaleRow: { flexDirection: 'row', justifyContent: 'space-between' },
  scaleBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 10,
    borderRadius: 10, borderWidth: 1, borderColor: 'transparent', marginHorizontal: 2,
  },
  scaleBtnActive: {
    backgroundColor: 'rgba(237,186,1,0.08)', borderColor: C.mintBorder,
  },
  scaleEmoji: { fontSize: 22 },
  scaleTxt: {
    fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 12, color: C.textMuted, marginTop: 4,
  },
  scaleTxtActive: { color: C.mint },
  intentionWrap: { backgroundColor: C.surface, borderRadius: 14, padding: 16 },
  intentionInput: {
    backgroundColor: C.surface2, borderWidth: 1, borderColor: C.mintBorder,
    borderRadius: 10, padding: 14,
    fontFamily: 'SpaceGrotesk_400Regular', fontSize: 14, color: C.text,
    minHeight: 80, lineHeight: 22,
  },
  submitBtn: {
    height: 56, backgroundColor: C.mint, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
  },
  submitBtnText: {
    fontFamily: 'SpaceGrotesk_700Bold', fontSize: 15, color: '#0A0A0A', letterSpacing: 1.5,
  },
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  doneWrap: { alignItems: 'center', gap: 12, paddingHorizontal: 40 },
  doneIcon: { fontSize: 48, color: C.mint },
  doneTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 22, color: C.text },
  doneSub: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 14, color: C.textMuted },
  doneSummary: {
    backgroundColor: C.surface, borderRadius: 14, padding: 16, width: '100%', gap: 8, marginTop: 8,
  },
  doneStat: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 15, color: C.text },
  closeBtn: {
    marginTop: 16, height: 48, paddingHorizontal: 32,
    borderWidth: 1, borderColor: C.mintBorder, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  closeBtnText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 13, color: C.mint, letterSpacing: 1 },
})
