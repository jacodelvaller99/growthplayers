import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, FlatList, Pressable, TextInput,
  Modal, StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, RefreshControl,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useAuthStore } from '../../store'
import { getBitacora, createBitacoraEntry, type BitacoraEntry } from '../../lib/database'
import { useProfile } from '../../hooks/useProfile'

// ─── Tokens ───────────────────────────────────────────────────────────────────
const T = {
  bg:          '#0A0A0A',
  surface:     '#111111',
  surface2:    '#181818',
  gold:        '#EDBA01',
  goldMid:     'rgba(237,186,1,0.14)',
  goldBorder:  'rgba(237,186,1,0.22)',
  goldDim:     'rgba(237,186,1,0.45)',
  goldFaint:   'rgba(237,186,1,0.07)',
  text:        '#FFFFFF',
  textMid:     '#888888',
  textDim:     '#555555',
  divider:     'rgba(255,255,255,0.07)',
}

const MOODS = ['😴', '😕', '😐', '😊', '🔥']
const MOOD_LABELS = ['BAJO', 'REGULAR', 'NEUTRO', 'BUENO', 'FUEGO']

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  })
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function BitacoraScreen() {
  const insets = useSafeAreaInsets()
  const { session } = useAuthStore()
  const { profile } = useProfile()
  const userId = session?.user?.id as string | undefined

  const [entries, setEntries] = useState<BitacoraEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [newContent, setNewContent] = useState('')
  const [newMood, setNewMood] = useState(3)
  const [newEnergy, setNewEnergy] = useState(3)
  const [isSaving, setIsSaving] = useState(false)

  const load = useCallback(async () => {
    if (!userId) { setIsLoading(false); return }
    const data = await getBitacora(userId, 30)
    setEntries(data)
    setIsLoading(false)
  }, [userId])

  useEffect(() => { load() }, [load])

  const onRefresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const handleCreate = async () => {
    if (!newContent.trim() || !userId) return
    setIsSaving(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    const entry = await createBitacoraEntry(userId, {
      content: newContent.trim(), mood: newMood, energy: newEnergy,
    })
    if (entry) {
      setEntries(prev => [entry, ...prev])
      setNewContent(''); setNewMood(3); setNewEnergy(3)
      setModalOpen(false)
    }
    setIsSaving(false)
  }

  const renderEntry = ({ item, index }: { item: BitacoraEntry; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 50).duration(400)}>
      <View style={styles.entryCard}>
        {/* Left accent */}
        <View style={[styles.entryAccent, { opacity: 0.4 + ((item.mood ?? 3) / 5) * 0.6 }]} />
        <View style={styles.entryBody}>
          <View style={styles.entryTop}>
            <Text style={styles.entryMood}>{MOODS[(item.mood ?? 3) - 1]}</Text>
            <Text style={styles.entryDate}>{fmtDate(item.created_at)}</Text>
          </View>
          <Text style={styles.entryText}>{item.content}</Text>
          {(item.energy ?? 0) > 0 && (
            <View style={styles.entryMetaRow}>
              <MaterialCommunityIcons name="lightning-bolt" size={11} color={T.goldDim} />
              <Text style={styles.entryMeta}>ENERGÍA {item.energy}/5</Text>
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  )

  return (
    <View style={styles.container}>
      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <Animated.View
        entering={FadeIn.duration(400)}
        style={[styles.header, { paddingTop: insets.top + 14 }]}
      >
        <View>
          <Text style={styles.headerEyebrow}>BITÁCORA PERSONAL</Text>
          <Text style={styles.headerTitle}>NORTE</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.headerCount}>{entries.length}</Text>
          <Text style={styles.headerCountLabel}>entradas</Text>
        </View>
      </Animated.View>

      {/* ── MI NORTE quote ─────────────────────────────────────────── */}
      {profile?.norte && (
        <Animated.View entering={FadeIn.delay(100).duration(400)} style={styles.norteQuote}>
          <MaterialCommunityIcons name="compass-rose" size={16} color={T.gold} style={{ marginRight: 10, marginTop: 1 }} />
          <Text style={styles.norteText} numberOfLines={2}>{profile.norte}</Text>
        </Animated.View>
      )}

      {/* ── ENTRIES ────────────────────────────────────────────────── */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={T.gold} size="large" />
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={item => item.id}
          renderItem={renderEntry}
          contentContainerStyle={[styles.list, { paddingBottom: 110 + insets.bottom }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.gold} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <MaterialCommunityIcons name="compass-outline" size={52} color={T.gold} style={{ opacity: 0.2 }} />
              <Text style={styles.emptyTitle}>BITÁCORA EN BLANCO</Text>
              <Text style={styles.emptySub}>Registra tus reflexiones diarias y avance del protocolo</Text>
            </View>
          }
        />
      )}

      {/* ── FAB ────────────────────────────────────────────────────── */}
      <Pressable
        style={[styles.fab, { bottom: 80 + insets.bottom }]}
        onPress={() => setModalOpen(true)}
        accessibilityLabel="Nueva entrada"
      >
        <MaterialCommunityIcons name="plus" size={26} color={T.bg} />
      </Pressable>

      {/* ── NEW ENTRY MODAL ────────────────────────────────────────── */}
      <Modal
        visible={modalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setModalOpen(false)} />
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 24 }]}>
            {/* Handle */}
            <View style={styles.modalHandle} />

            <View style={styles.modalTopRow}>
              <Text style={styles.modalTitle}>NUEVA ENTRADA</Text>
              <Pressable onPress={() => setModalOpen(false)} hitSlop={12}>
                <MaterialCommunityIcons name="close" size={20} color={T.textMid} />
              </Pressable>
            </View>

            <TextInput
              style={styles.modalInput}
              value={newContent}
              onChangeText={setNewContent}
              placeholder="¿Qué quieres registrar hoy?"
              placeholderTextColor={T.textDim}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              autoFocus
              maxLength={1000}
              autoComplete="off"
            />

            {/* Mood selector */}
            <View style={styles.selectorRow}>
              <Text style={styles.selectorLabel}>ÁNIMO</Text>
              <View style={styles.selectorBtns}>
                {MOODS.map((m, i) => (
                  <Pressable
                    key={i}
                    onPress={() => setNewMood(i + 1)}
                    style={[styles.moodBtn, newMood === i + 1 && styles.moodBtnActive]}
                  >
                    <Text style={styles.moodEmoji}>{m}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Energy selector */}
            <View style={styles.selectorRow}>
              <Text style={styles.selectorLabel}>ENERGÍA</Text>
              <View style={styles.selectorBtns}>
                {[1, 2, 3, 4, 5].map(v => (
                  <Pressable
                    key={v}
                    onPress={() => setNewEnergy(v)}
                    style={[styles.energyBtn, newEnergy === v && styles.energyBtnActive]}
                  >
                    <Text style={[styles.energyTxt, newEnergy === v && { color: T.bg }]}>{v}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <Pressable
              style={[styles.saveBtn, (!newContent.trim() || isSaving) && { opacity: 0.35 }]}
              onPress={handleCreate}
              disabled={!newContent.trim() || isSaving}
            >
              <Text style={styles.saveBtnText}>{isSaving ? 'GUARDANDO…' : 'GUARDAR ENTRADA'}</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
    paddingHorizontal: 22, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: T.divider,
  },
  headerEyebrow: {
    fontSize: 9, fontFamily: 'SpaceGrotesk_600SemiBold',
    color: T.goldDim, letterSpacing: 2.5, marginBottom: 4,
  },
  headerTitle: {
    fontSize: 28, fontFamily: 'SpaceGrotesk_700Bold', color: T.text, letterSpacing: 0.5,
  },
  headerCount: { fontSize: 32, fontFamily: 'SpaceGrotesk_700Bold', color: T.gold },
  headerCountLabel: { fontSize: 10, fontFamily: 'SpaceGrotesk_400Regular', color: T.textMid },

  // Norte quote strip
  norteQuote: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: T.goldFaint, borderBottomWidth: 1, borderBottomColor: T.goldBorder,
    paddingHorizontal: 22, paddingVertical: 12,
  },
  norteText: {
    flex: 1, fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular',
    color: T.goldDim, lineHeight: 18, fontStyle: 'italic',
  },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, gap: 10 },

  // Entry card
  entryCard: {
    flexDirection: 'row', backgroundColor: T.surface,
    borderRadius: 14, borderWidth: 1, borderColor: T.divider, overflow: 'hidden',
  },
  entryAccent: { width: 3, backgroundColor: T.gold },
  entryBody: { flex: 1, padding: 14, gap: 6 },
  entryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  entryMood: { fontSize: 18 },
  entryDate: { fontSize: 10, fontFamily: 'SpaceGrotesk_400Regular', color: T.textDim },
  entryText: { fontSize: 14, fontFamily: 'SpaceGrotesk_400Regular', color: T.text, lineHeight: 22 },
  entryMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  entryMeta: { fontSize: 9, fontFamily: 'SpaceGrotesk_700Bold', color: T.goldDim, letterSpacing: 1.5 },

  // Empty
  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 14 },
  emptyTitle: { fontSize: 14, fontFamily: 'SpaceGrotesk_700Bold', color: T.textMid, letterSpacing: 2 },
  emptySub: { fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular', color: T.textDim, textAlign: 'center', paddingHorizontal: 40 },

  // FAB
  fab: {
    position: 'absolute', right: 20,
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: T.gold, alignItems: 'center', justifyContent: 'center',
    shadowColor: T.gold, shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.65)' },
  modalSheet: {
    backgroundColor: T.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderColor: T.divider, padding: 24, gap: 16,
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: T.textDim,
    alignSelf: 'center', marginBottom: 4,
  },
  modalTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 15, fontFamily: 'SpaceGrotesk_700Bold', color: T.text, letterSpacing: 2 },
  modalInput: {
    backgroundColor: T.surface2, borderWidth: 1.5, borderColor: T.divider,
    borderRadius: 14, padding: 14,
    fontFamily: 'SpaceGrotesk_400Regular', fontSize: 15, color: T.text, lineHeight: 24,
    minHeight: 120,
  },
  selectorRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  selectorLabel: {
    fontSize: 9, fontFamily: 'SpaceGrotesk_700Bold',
    color: T.goldDim, letterSpacing: 2, width: 56,
  },
  selectorBtns: { flexDirection: 'row', gap: 8 },
  moodBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: T.surface2, borderWidth: 1.5, borderColor: T.divider,
    alignItems: 'center', justifyContent: 'center',
  },
  moodBtnActive: { borderColor: T.goldBorder, backgroundColor: T.goldMid },
  moodEmoji: { fontSize: 18 },
  energyBtn: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: T.surface2, borderWidth: 1.5, borderColor: T.divider,
    alignItems: 'center', justifyContent: 'center',
  },
  energyBtnActive: { backgroundColor: T.gold, borderColor: T.gold },
  energyTxt: { fontSize: 15, fontFamily: 'SpaceGrotesk_700Bold', color: T.textMid },
  saveBtn: {
    height: 54, borderRadius: 14, backgroundColor: T.gold,
    alignItems: 'center', justifyContent: 'center',
  },
  saveBtnText: {
    fontFamily: 'SpaceGrotesk_700Bold', fontSize: 13, color: T.bg, letterSpacing: 2,
  },
})
