import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, FlatList, Pressable, TextInput,
  Modal, StyleSheet, SafeAreaView, KeyboardAvoidingView,
  Platform, ActivityIndicator, RefreshControl,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useAuthStore } from '../../store'
import { getBitacora, createBitacoraEntry, type BitacoraEntry } from '../../lib/database'

const C = {
  bg: '#01191D', surface: '#0D2B30', surface2: '#0F3640',
  mint: '#AEFEF0', mintMuted: 'rgba(174,254,240,0.12)',
  mintBorder: 'rgba(174,254,240,0.20)', mintFaint: 'rgba(174,254,240,0.40)',
  text: '#FFFFFF', textMuted: '#86C6B3', textFaint: 'rgba(174,254,240,0.40)',
  divider: 'rgba(174,254,240,0.08)',
}

const MOODS = ['😴', '😕', '😐', '😊', '🔥']

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export default function BitacoraScreen() {
  const { session } = useAuthStore()
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
      setEntries((prev) => [entry, ...prev])
      setNewContent(''); setNewMood(3); setNewEnergy(3)
      setModalOpen(false)
    }
    setIsSaving(false)
  }

  const renderEntry = ({ item, index }: { item: BitacoraEntry; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(400)}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardMood}>{MOODS[(item.mood ?? 3) - 1]}</Text>
          <Text style={styles.cardDate}>{formatDate(item.created_at)}</Text>
        </View>
        <Text style={styles.cardContent}>{item.content}</Text>
        {(item.energy ?? 0) > 0 && (
          <Text style={styles.cardMeta}>⚡ Energía: {item.energy}/5</Text>
        )}
      </View>
    </Animated.View>
  )

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>BITÁCORA</Text>
        <Text style={styles.headerSub}>{entries.length} entradas</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={C.mint} size="large" /></View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          renderItem={renderEntry}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.mint} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <MaterialCommunityIcons name="book-open-variant" size={56} color={C.mint} style={{ opacity: 0.2 }} />
              <Text style={styles.emptyTitle}>Tu bitácora está en blanco</Text>
              <Text style={styles.emptySub}>Empieza a escribir tus reflexiones diarias</Text>
            </View>
          }
        />
      )}

      <Pressable style={styles.fab} onPress={() => setModalOpen(true)}>
        <MaterialCommunityIcons name="plus" size={28} color="#01191D" />
      </Pressable>

      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={() => setModalOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nueva entrada</Text>
              <Pressable onPress={() => setModalOpen(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </Pressable>
            </View>
            <TextInput
              style={styles.modalInput}
              value={newContent}
              onChangeText={setNewContent}
              placeholder="¿Qué quieres registrar hoy?"
              placeholderTextColor={C.textFaint}
              multiline numberOfLines={5}
              textAlignVertical="top" autoFocus
            />
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Ánimo:</Text>
              {MOODS.map((m, i) => (
                <Pressable key={i} onPress={() => setNewMood(i + 1)}
                  style={[styles.moodBtn, newMood === i + 1 && styles.moodBtnActive]}>
                  <Text style={styles.moodEmoji}>{m}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Energía:</Text>
              {[1, 2, 3, 4, 5].map((v) => (
                <Pressable key={v} onPress={() => setNewEnergy(v)}
                  style={[styles.energyBtn, newEnergy === v && styles.energyBtnActive]}>
                  <Text style={[styles.energyTxt, newEnergy === v && styles.energyTxtActive]}>{v}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              style={[styles.saveBtn, (!newContent.trim() || isSaving) && styles.saveBtnDisabled]}
              onPress={handleCreate} disabled={!newContent.trim() || isSaving}
            >
              <Text style={styles.saveBtnText}>{isSaving ? 'GUARDANDO...' : 'GUARDAR'}</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: 20, paddingTop: 52, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: C.divider },
  headerTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 18, color: C.text },
  headerSub: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, color: C.textMuted },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: 16, gap: 10, paddingBottom: 100 },
  card: { backgroundColor: C.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: C.divider, gap: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardMood: { fontSize: 20 },
  cardDate: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 11, color: C.textFaint },
  cardContent: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 14, color: C.text, lineHeight: 22 },
  cardMeta: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12, color: C.textMuted },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 12 },
  emptyTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16, color: C.textMuted },
  emptySub: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, color: C.textFaint, textAlign: 'center' },
  fab: {
    position: 'absolute', right: 20, bottom: 90, width: 56, height: 56,
    borderRadius: 28, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center',
    shadowColor: C.mint, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
  },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalSheet: {
    backgroundColor: C.surface2, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40, gap: 14,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 18, color: C.text },
  modalClose: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 20, color: C.textMuted, padding: 4 },
  modalInput: {
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.mintBorder,
    borderRadius: 12, padding: 14, fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 15, color: C.text, minHeight: 120, lineHeight: 24,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaLabel: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 13, color: C.textMuted, width: 60 },
  moodBtn: { padding: 6, borderRadius: 8, borderWidth: 1, borderColor: 'transparent' },
  moodBtnActive: { borderColor: C.mintBorder, backgroundColor: C.mintMuted },
  moodEmoji: { fontSize: 22 },
  energyBtn: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  energyBtnActive: { borderColor: C.mintBorder, backgroundColor: C.mintMuted },
  energyTxt: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 15, color: C.textMuted },
  energyTxtActive: { color: C.mint },
  saveBtn: { height: 52, backgroundColor: C.mint, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 14, color: '#01191D', letterSpacing: 1 },
})
