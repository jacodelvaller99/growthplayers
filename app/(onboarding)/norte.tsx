import React, { useState } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useAuthStore } from '../../store'
import { upsertProfile } from '../../lib/database'

const C = {
  bg: '#01191D', surface: '#0D2B30', surface2: '#0F3640',
  mint: '#AEFEF0', mintBorder: 'rgba(174,254,240,0.20)',
  mintFaint: 'rgba(174,254,240,0.40)',
  text: '#FFFFFF', textMuted: '#86C6B3',
}

export default function OnboardingNorte() {
  const router = useRouter()
  const { session } = useAuthStore()
  const [norte, setNorte] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleContinue = async () => {
    if (!norte.trim()) return
    setIsSaving(true)
    if (session?.user?.id) {
      await upsertProfile(session.user.id, { norte: norte.trim() })
    }
    router.push('/(onboarding)/wheel')
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        <View style={styles.container}>
          <Animated.View entering={FadeInDown.delay(100).duration(600)}>
            <Text style={styles.label}>PASO 3 DE 4</Text>
            <Text style={styles.title}>Tu Norte{'\n'}Verdadero</Text>
            <Text style={styles.subtitle}>El propósito que guía cada decisión</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(350).duration(600)} style={styles.inputWrap}>
            <Text style={styles.inputLabel}>¿Qué quieres construir y por qué?</Text>
            <TextInput
              style={styles.input}
              multiline
              numberOfLines={4}
              placeholder="Ej: Construir una empresa que libere a mi familia y demuestre que la excelencia es alcanzable..."
              placeholderTextColor="rgba(174,254,240,0.25)"
              value={norte}
              onChangeText={setNorte}
              textAlignVertical="top"
            />
            <Text style={styles.hint}>
              Escribe con honestidad. Nadie más lo leerá.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(550).duration(600)}>
            <Pressable
              style={[styles.btn, (!norte.trim() || isSaving) && styles.btnDisabled]}
              onPress={handleContinue}
              disabled={!norte.trim() || isSaving}
            >
              <Text style={styles.btnText}>
                {isSaving ? 'GUARDANDO...' : 'ESTE ES MI NORTE →'}
              </Text>
            </Pressable>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  kav: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 48, justifyContent: 'space-between', paddingBottom: 32 },
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
    fontSize: 14, color: C.textMuted, marginBottom: 40,
  },
  inputWrap: { flex: 1, gap: 8 },
  inputLabel: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 13, color: C.mint, marginBottom: 8,
  },
  input: {
    backgroundColor: C.surface,
    borderWidth: 1, borderColor: C.mintBorder,
    borderRadius: 12, padding: 16,
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 16, color: C.text,
    minHeight: 120, lineHeight: 24,
  },
  hint: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 12, color: C.mintFaint, fontStyle: 'italic',
  },
  btn: {
    height: 56, backgroundColor: C.mint, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.4 },
  btnText: {
    fontFamily: 'SpaceGrotesk_700Bold', fontSize: 14,
    color: '#01191D', letterSpacing: 1.5,
  },
})
