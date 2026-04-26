import React, { useState } from 'react'
import {
  View, Text, FlatList, Pressable, TextInput,
  Modal, KeyboardAvoidingView, Platform, StyleSheet, Dimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated'
import { useProgramStore, getModulesForProgram, type ProgramModule } from '../../store/programStore'

const { width: W } = Dimensions.get('window')

// ─── Design Tokens ───────────────────────────────────────────────────────────
const T = {
  bg:           '#0A0A0A',
  surface:      '#111111',
  surface2:     '#181818',
  surfaceRaise: '#1E1E1E',
  gold:         '#EDBA01',
  goldMid:      'rgba(237,186,1,0.14)',
  goldBorder:   'rgba(237,186,1,0.22)',
  goldDim:      'rgba(237,186,1,0.45)',
  goldFaint:    'rgba(237,186,1,0.07)',
  text:         '#FFFFFF',
  textMid:      '#888888',
  textDim:      '#555555',
  divider:      'rgba(255,255,255,0.07)',
}

// ─── Progress Ring (simple segmented) ────────────────────────────────────────
const ProgressRing = ({ pct }: { pct: number }) => {
  const segs = 12
  const filled = Math.round((pct / 100) * segs)
  return (
    <View style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
      {/* simplified: just a colored arc indicator */}
      <View style={{
        width: 34, height: 34, borderRadius: 17,
        borderWidth: 2.5, borderColor: T.surface2,
        position: 'absolute',
      }} />
      <View style={{
        width: 34, height: 34, borderRadius: 17,
        borderWidth: 2.5,
        borderColor: pct >= 100 ? T.gold : 'transparent',
        borderTopColor: pct > 0 ? T.gold : 'transparent',
        borderRightColor: pct > 33 ? T.gold : 'transparent',
        borderBottomColor: pct > 66 ? T.gold : 'transparent',
        position: 'absolute',
        transform: [{ rotate: '-90deg' }],
      }} />
      <Text style={{
        fontSize: 9, fontFamily: 'SpaceGrotesk_700Bold',
        color: pct > 0 ? T.gold : T.textDim,
      }}>
        {pct}%
      </Text>
    </View>
  )
}

// ─── Screen ──────────────────────────────────────────────────────────────────
export default function AcademiaScreen() {
  const insets = useSafeAreaInsets()
  const {
    programType, currentModuleId, moduleProgress,
    setCurrentModule, setModuleNotes, completeModule,
  } = useProgramStore()

  const modules = getModulesForProgram(programType)
  const [selectedModule, setSelectedModule] = useState<ProgramModule | null>(null)
  const [noteText, setNoteText] = useState('')

  const openModule = (mod: ProgramModule) => {
    setSelectedModule(mod)
    setNoteText(moduleProgress[mod.id]?.notes || '')
  }

  const closeModal = () => {
    if (selectedModule) setModuleNotes(selectedModule.id, noteText)
    setSelectedModule(null)
  }

  const handleComplete = (moduleId: string) => {
    completeModule(moduleId)
    setCurrentModule(moduleId)
  }

  const completedCount = modules.filter(m => moduleProgress[m.id]?.completed).length
  const pctDone = Math.round((completedCount / modules.length) * 100)

  const renderModule = ({ item, index }: { item: ProgramModule; index: number }) => {
    const prog = moduleProgress[item.id]
    const isCompleted = prog?.completed ?? false
    const progress = prog?.progress ?? 0
    const isCurrent = item.id === currentModuleId

    return (
      <Animated.View entering={FadeInDown.delay(index * 50).duration(400)}>
        <Pressable
          onPress={() => openModule(item)}
          style={({ pressed }) => [
            styles.moduleCard,
            isCurrent && styles.moduleCardActive,
            isCompleted && styles.moduleCardDone,
            pressed && { opacity: 0.82 },
          ]}
        >
          {/* Order number — large editorial */}
          <Text style={[styles.orderNum, isCurrent && { color: T.gold }]}>
            {String(item.order).padStart(2, '0')}
          </Text>

          {/* Content */}
          <View style={styles.moduleInfo}>
            <Text style={[styles.moduleTitle, isCurrent && { color: T.gold }]}>
              {item.title}
            </Text>
            <Text style={styles.moduleSub}>{item.subtitle}</Text>

            {/* Progress track */}
            <View style={styles.progTrack}>
              <View style={[styles.progFill, {
                width: `${isCompleted ? 100 : progress}%`,
                backgroundColor: isCompleted ? T.gold : 'rgba(237,186,1,0.40)',
              }]} />
            </View>

            <Text style={styles.progLabel}>
              {isCompleted ? 'COMPLETADO' : progress > 0 ? `${progress}% — EN PROGRESO` : 'SIN INICIAR'}
            </Text>
          </View>

          {/* Right badge */}
          <View style={styles.moduleMeta}>
            {isCompleted ? (
              <View style={styles.doneBadge}>
                <MaterialCommunityIcons name="check" size={14} color={T.gold} />
              </View>
            ) : isCurrent ? (
              <View style={styles.activeDot} />
            ) : (
              <MaterialCommunityIcons name="chevron-right" size={16} color={T.textDim} />
            )}
          </View>
        </Pressable>
      </Animated.View>
    )
  }

  return (
    <View style={[styles.container]}>
      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <Animated.View
        entering={FadeIn.duration(400)}
        style={[styles.header, { paddingTop: insets.top + 14 }]}
      >
        <View>
          <Text style={styles.headerEyebrow}>
            {programType === 'polaris' ? 'POLARIS PROTOCOL™' : 'GROWTH PLAYERS™'}
          </Text>
          <Text style={styles.headerTitle}>PROTOCOLO</Text>
        </View>
        {/* Overall progress */}
        <View style={styles.overallProg}>
          <Text style={styles.overallNum}>{completedCount}</Text>
          <Text style={styles.overallTotal}>/{modules.length}</Text>
        </View>
      </Animated.View>

      {/* ── PROGRESS BAR ───────────────────────────────────────────── */}
      <Animated.View entering={FadeIn.delay(100).duration(400)} style={styles.globalProgWrap}>
        <View style={styles.globalProgTrack}>
          <View style={[styles.globalProgFill, { width: `${pctDone}%` }]} />
        </View>
        <Text style={styles.globalProgLabel}>{pctDone}% COMPLETADO</Text>
      </Animated.View>

      {/* ── MODULE LIST ────────────────────────────────────────────── */}
      <FlatList
        data={modules}
        keyExtractor={item => item.id}
        renderItem={renderModule}
        contentContainerStyle={[styles.list, { paddingBottom: 100 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      />

      {/* ── MODULE DETAIL MODAL ────────────────────────────────────── */}
      <Modal
        visible={!!selectedModule}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <Pressable style={styles.modalBackdrop} onPress={closeModal} />
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 24 }]}>
            {selectedModule && (
              <>
                {/* Module number large */}
                <Text style={styles.modalOrder}>
                  {String(selectedModule.order).padStart(2, '0')}
                </Text>
                <Text style={styles.modalTitle}>{selectedModule.title}</Text>
                <Text style={styles.modalSub}>{selectedModule.subtitle}</Text>

                <View style={styles.modalDivider} />

                {/* Notes */}
                <Text style={styles.notesLabel}>MIS NOTAS</Text>
                <TextInput
                  value={noteText}
                  onChangeText={setNoteText}
                  multiline
                  numberOfLines={5}
                  placeholder="Escribe tus aprendizajes aquí..."
                  placeholderTextColor={T.textDim}
                  style={styles.notesInput}
                  textAlignVertical="top"
                  autoComplete="off"
                />

                {/* Actions */}
                <View style={styles.modalActions}>
                  <Pressable onPress={closeModal} style={styles.modalBtnSecondary}>
                    <Text style={styles.modalBtnSecondaryText}>GUARDAR</Text>
                  </Pressable>
                  {!moduleProgress[selectedModule.id]?.completed && (
                    <Pressable
                      onPress={() => { handleComplete(selectedModule.id); closeModal() }}
                      style={styles.modalBtnPrimary}
                    >
                      <MaterialCommunityIcons name="check-circle-outline" size={16} color={T.bg} />
                      <Text style={styles.modalBtnPrimaryText}>COMPLETAR</Text>
                    </Pressable>
                  )}
                </View>
              </>
            )}
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
    color: T.goldDim, letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 4,
  },
  headerTitle: {
    fontSize: 28, fontFamily: 'SpaceGrotesk_700Bold',
    color: T.text, letterSpacing: 0.5,
  },
  overallProg: { flexDirection: 'row', alignItems: 'baseline', gap: 1 },
  overallNum: { fontSize: 32, fontFamily: 'SpaceGrotesk_700Bold', color: T.gold },
  overallTotal: { fontSize: 14, fontFamily: 'SpaceGrotesk_400Regular', color: T.textMid },

  // Global progress bar
  globalProgWrap: {
    paddingHorizontal: 22, paddingVertical: 12, gap: 6, borderBottomWidth: 1, borderBottomColor: T.divider,
  },
  globalProgTrack: {
    height: 3, backgroundColor: T.surface2, borderRadius: 999, overflow: 'hidden',
  },
  globalProgFill: { height: '100%', backgroundColor: T.gold, borderRadius: 999 },
  globalProgLabel: {
    fontSize: 9, fontFamily: 'SpaceGrotesk_700Bold',
    color: T.goldDim, letterSpacing: 2,
  },

  // List
  list: { padding: 16, gap: 10 },

  // Module card
  moduleCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: T.surface, borderRadius: 14,
    borderWidth: 1, borderColor: T.divider,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  moduleCardActive: {
    borderColor: T.goldBorder, backgroundColor: T.goldFaint,
  },
  moduleCardDone: { opacity: 0.7 },
  orderNum: {
    fontSize: 28, fontFamily: 'SpaceGrotesk_700Bold',
    color: T.textDim, lineHeight: 32, width: 42,
  },
  moduleInfo: { flex: 1, gap: 4 },
  moduleTitle: {
    fontSize: 15, fontFamily: 'SpaceGrotesk_700Bold', color: T.text, lineHeight: 20,
  },
  moduleSub: {
    fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular', color: T.textMid, lineHeight: 17,
  },
  progTrack: { height: 2, backgroundColor: T.surface2, borderRadius: 999, overflow: 'hidden', marginTop: 6 },
  progFill: { height: '100%', borderRadius: 999 },
  progLabel: {
    fontSize: 8, fontFamily: 'SpaceGrotesk_700Bold',
    color: T.textDim, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 3,
  },
  moduleMeta: { alignItems: 'center', justifyContent: 'center' },
  doneBadge: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: T.goldMid, borderWidth: 1.5, borderColor: T.goldBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  activeDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: T.gold,
  },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  modalSheet: {
    backgroundColor: T.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderColor: T.divider,
    padding: 26,
  },
  modalOrder: {
    fontSize: 64, fontFamily: 'SpaceGrotesk_700Bold',
    color: T.goldMid, lineHeight: 68, marginBottom: -8,
  },
  modalTitle: {
    fontSize: 26, fontFamily: 'SpaceGrotesk_700Bold', color: T.text, lineHeight: 32,
  },
  modalSub: {
    fontSize: 14, fontFamily: 'SpaceGrotesk_400Regular', color: T.textMid, lineHeight: 21, marginTop: 4,
  },
  modalDivider: { height: 1, backgroundColor: T.divider, marginVertical: 18 },
  notesLabel: {
    fontSize: 9, fontFamily: 'SpaceGrotesk_700Bold',
    color: T.gold, letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 10,
  },
  notesInput: {
    backgroundColor: T.surface2, borderWidth: 1.5, borderColor: T.divider,
    borderRadius: 12, padding: 14,
    fontFamily: 'SpaceGrotesk_400Regular', fontSize: 14, color: T.text, lineHeight: 22,
    minHeight: 100, marginBottom: 20,
  },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalBtnSecondary: {
    flex: 1, height: 52, borderRadius: 12,
    borderWidth: 1.5, borderColor: T.goldBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  modalBtnSecondaryText: {
    fontFamily: 'SpaceGrotesk_700Bold', fontSize: 12, color: T.gold, letterSpacing: 2,
  },
  modalBtnPrimary: {
    flex: 1, height: 52, borderRadius: 12,
    backgroundColor: T.gold,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  modalBtnPrimaryText: {
    fontFamily: 'SpaceGrotesk_700Bold', fontSize: 12, color: T.bg, letterSpacing: 2,
  },
})
