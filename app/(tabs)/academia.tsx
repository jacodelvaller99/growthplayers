import React, { useState } from 'react'
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useProgramStore, getModulesForProgram, type ProgramModule } from '../../store/programStore'
import { PolarisTokens, GrowthPlayersTokens } from '../../components/design/tokens'

export default function AcademiaScreen() {
  const {
    programType,
    currentModuleId,
    moduleProgress,
    setCurrentModule,
    setModuleNotes,
    completeModule,
  } = useProgramStore()

  const modules = getModulesForProgram(programType)
  const T = programType === 'polaris' ? PolarisTokens : GrowthPlayersTokens

  const [selectedModule, setSelectedModule] = useState<ProgramModule | null>(null)
  const [noteText, setNoteText] = useState('')

  const openModule = (mod: ProgramModule) => {
    setSelectedModule(mod)
    setNoteText(moduleProgress[mod.id]?.notes || '')
  }

  const closeModal = () => {
    if (selectedModule) {
      setModuleNotes(selectedModule.id, noteText)
    }
    setSelectedModule(null)
  }

  const handleComplete = (moduleId: string) => {
    completeModule(moduleId)
    setCurrentModule(moduleId)
  }

  const completedCount = modules.filter((m) => moduleProgress[m.id]?.completed).length

  const renderModule = ({ item, index }: { item: ProgramModule; index: number }) => {
    const prog = moduleProgress[item.id]
    const isCompleted = prog?.completed ?? false
    const progress = prog?.progress ?? 0
    const isCurrent = item.id === currentModuleId

    return (
      <Animated.View entering={FadeInDown.delay(index * 60).duration(400)}>
        <Pressable
          onPress={() => openModule(item)}
          style={[
            styles.card,
            {
              backgroundColor: T.surface,
              borderColor: isCurrent ? T.accent : T.border,
              borderTopWidth: isCurrent ? 2 : 1,
              borderTopColor: isCurrent ? T.accent : T.border,
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.moduleTitle, { color: isCurrent ? T.accent : T.text }]}>
                {String(item.order).padStart(2, '0')} · {item.title}
              </Text>
              <Text style={[styles.moduleSubtitle, { color: T.textMuted }]}>
                {item.subtitle}
              </Text>
            </View>
            {isCompleted && (
              <View
                style={[
                  styles.badge,
                  { backgroundColor: T.accentMuted, borderColor: T.accentBorder },
                ]}
              >
                <Text style={[styles.badgeText, { color: T.accent }]}>✓</Text>
              </View>
            )}
          </View>

          <View style={[styles.progressTrack, { backgroundColor: T.border }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${isCompleted ? 100 : progress}%` as any,
                  backgroundColor: T.accent,
                },
              ]}
            />
          </View>

          <Text style={[styles.progressLabel, { color: T.textFaint }]}>
            {isCompleted
              ? 'COMPLETADO'
              : progress > 0
              ? `${progress}% — EN PROGRESO`
              : 'SIN INICIAR'}
          </Text>
        </Pressable>
      </Animated.View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: T.bg }]}>
      <View style={[styles.header, { borderBottomColor: T.border }]}>
        <Text style={[styles.headerLabel, { color: T.accent }]}>
          {programType === 'polaris' ? 'PROGRAMA POLARIS' : 'GROWTH PLAYERS'}
        </Text>
        <Text style={[styles.headerSubtitle, { color: T.textMuted }]}>
          {completedCount} / {modules.length} módulos completados
        </Text>
      </View>

      <FlatList
        data={modules}
        keyExtractor={(item) => item.id}
        renderItem={renderModule}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />

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
          <View
            style={[
              styles.modalSheet,
              { backgroundColor: T.surface, borderColor: T.border },
            ]}
          >
            {selectedModule && (
              <>
                <Text style={[styles.modalLabel, { color: T.accent }]}>
                  MÓDULO {String(selectedModule.order).padStart(2, '0')}
                </Text>
                <Text style={[styles.modalTitle, { color: T.text }]}>
                  {selectedModule.title}
                </Text>
                <Text style={[styles.modalSubtitle, { color: T.textMuted }]}>
                  {selectedModule.subtitle}
                </Text>

                <Text style={[styles.notesLabel, { color: T.accent }]}>MIS NOTAS</Text>
                <TextInput
                  value={noteText}
                  onChangeText={setNoteText}
                  multiline
                  numberOfLines={5}
                  placeholder="Escribe tus aprendizajes aquí..."
                  placeholderTextColor={T.textFaint}
                  style={[
                    styles.notesInput,
                    { backgroundColor: T.bg, borderColor: T.border, color: T.text },
                  ]}
                />

                <View style={styles.modalActions}>
                  <Pressable
                    onPress={closeModal}
                    style={[styles.btnSecondary, { borderColor: T.accentBorder }]}
                  >
                    <Text style={[styles.btnSecondaryText, { color: T.accent }]}>GUARDAR</Text>
                  </Pressable>
                  {!moduleProgress[selectedModule.id]?.completed && (
                    <Pressable
                      onPress={() => {
                        handleComplete(selectedModule.id)
                        closeModal()
                      }}
                      style={[styles.btnPrimary, { backgroundColor: T.accent }]}
                    >
                      <Text style={[styles.btnPrimaryText, { color: T.bg }]}>COMPLETAR</Text>
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
  container: { flex: 1, backgroundColor: '#01191D' },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerLabel: {
    fontSize: 10,
    letterSpacing: 2.5,
    fontFamily: 'Outfit_600SemiBold',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
  },
  list: { padding: 16, gap: 12 },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  moduleTitle: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 2,
  },
  moduleSubtitle: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 12,
    lineHeight: 18,
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  badgeText: { fontSize: 12, fontFamily: 'Outfit_700Bold' },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    marginBottom: 6,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 2 },
  progressLabel: {
    fontSize: 9,
    letterSpacing: 1.5,
    fontFamily: 'Outfit_600SemiBold',
    textTransform: 'uppercase',
  },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalLabel: {
    fontSize: 10,
    letterSpacing: 2.5,
    fontFamily: 'Outfit_600SemiBold',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  modalTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 22,
    lineHeight: 28,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  notesLabel: {
    fontSize: 9,
    letterSpacing: 2,
    fontFamily: 'Outfit_600SemiBold',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontFamily: 'Outfit_400Regular',
    fontSize: 14,
    lineHeight: 22,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  modalActions: { flexDirection: 'row', gap: 12 },
  btnSecondary: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnSecondaryText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 12,
    letterSpacing: 1.5,
  },
  btnPrimary: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnPrimaryText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 12,
    letterSpacing: 1.5,
  },
})
