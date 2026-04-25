import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  View, Text, TextInput, FlatList, Pressable,
  KeyboardAvoidingView, Platform, StyleSheet,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import Animated, {
  FadeIn, useSharedValue, withRepeat, withTiming,
  useAnimatedStyle, withDelay,
} from 'react-native-reanimated'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useChatStore } from '../../store/chatStore'
import { useProgramStore, getModulesForProgram } from '../../store/programStore'
import { useAuthStore } from '../../store'
import { useProfile } from '../../hooks/useProfile'
import { streamMentorResponse, getChatMessages } from '../../lib/mentor'

// ─── Tokens ───────────────────────────────────────────────────────────────────
const T = {
  bg:          '#0A0A0A',
  surface:     '#111111',
  surface2:    '#181818',
  gold:        '#EDBA01',
  goldMid:     'rgba(237,186,1,0.14)',
  goldBorder:  'rgba(237,186,1,0.20)',
  goldDim:     'rgba(237,186,1,0.45)',
  goldFaint:   'rgba(237,186,1,0.07)',
  text:        '#FFFFFF',
  textMid:     '#888888',
  textDim:     'rgba(237,186,1,0.35)',
  divider:     'rgba(255,255,255,0.07)',
}

// ─── Animated Loading Dots ────────────────────────────────────────────────────
const Dot = ({ delay }: { delay: number }) => {
  const opacity = useSharedValue(0.25)
  useEffect(() => {
    opacity.value = withDelay(delay, withRepeat(withTiming(1, { duration: 380 }), -1, true))
  }, [])
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }))
  return <Animated.View style={[{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: T.gold }, style]} />
}

const LoadingDots = () => (
  <View style={{ flexDirection: 'row', gap: 5, padding: 4 }}>
    <Dot delay={0} />
    <Dot delay={140} />
    <Dot delay={280} />
  </View>
)

// ─── Types ────────────────────────────────────────────────────────────────────
interface MsgBubble {
  id: string
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function MentorScreen() {
  const insets = useSafeAreaInsets()
  const { session } = useAuthStore()
  const { profile } = useProfile()
  const { programType, currentModuleId, streak, totalDays, archetypeId } = useProgramStore()
  const { clearChat } = useChatStore()

  const [inputText, setInputText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [localMessages, setLocalMessages] = useState<MsgBubble[]>([])
  const listRef = useRef<FlatList>(null)

  const modules = getModulesForProgram(programType)
  const currentModule = modules.find(m => m.id === currentModuleId) ?? modules[0]

  // Load chat history
  useEffect(() => {
    const userId = session?.user?.id
    if (!userId) return
    getChatMessages(userId, 50).then(rows => {
      if (rows.length > 0) {
        setLocalMessages(rows.map(r => ({ id: r.id, role: r.role, content: r.content })))
      }
    })
  }, [session?.user?.id])

  const scrollToEnd = () => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80)
  }

  const handleSend = useCallback(async () => {
    const text = inputText.trim()
    if (!text || isStreaming) return
    const userId = session?.user?.id
    if (!userId) return

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setInputText('')
    setIsStreaming(true)

    const userMsg: MsgBubble = { id: `u_${Date.now()}`, role: 'user', content: text }
    const assistantId = `a_${Date.now()}`
    const assistantMsg: MsgBubble = { id: assistantId, role: 'assistant', content: '', isStreaming: true }

    setLocalMessages(prev => [...prev, userMsg, assistantMsg])
    scrollToEnd()

    const history = localMessages.map(m => ({ role: m.role, content: m.content }))

    try {
      await streamMentorResponse(
        {
          userId,
          userName: profile?.full_name || 'Amigo',
          programType,
          archetypeId: archetypeId || 'guerrero',
          currentModuleTitle: currentModule?.title ?? '',
          currentModuleSubtitle: currentModule?.subtitle ?? '',
          streak,
          totalDays,
          norte: profile?.norte ?? undefined,
          sovereigntyScore: profile?.sovereignty_score,
        },
        text,
        history,
        (chunk) => {
          setLocalMessages(prev =>
            prev.map(m => m.id === assistantId ? { ...m, content: m.content + chunk } : m)
          )
          scrollToEnd()
        }
      )
    } finally {
      setLocalMessages(prev =>
        prev.map(m => m.id === assistantId ? { ...m, isStreaming: false } : m)
      )
      setIsStreaming(false)
    }
  }, [inputText, isStreaming, session?.user?.id, profile, programType, archetypeId,
    currentModule, streak, totalDays, localMessages])

  const renderMessage = ({ item }: { item: MsgBubble }) => {
    const isUser = item.role === 'user'
    return (
      <Animated.View
        entering={FadeIn.duration(280)}
        style={[styles.msgRow, isUser && styles.msgRowRight]}
      >
        {!isUser && (
          <View style={styles.mentorAvatar}>
            <Text style={styles.mentorAvatarStar}>★</Text>
          </View>
        )}
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleMentor]}>
          {item.isStreaming && item.content === '' ? (
            <LoadingDots />
          ) : (
            <Text style={styles.bubbleText}>{item.content}</Text>
          )}
        </View>
      </Animated.View>
    )
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <View>
          <Text style={styles.headerEyebrow}>INTELIGENCIA ARTIFICIAL</Text>
          <Text style={styles.headerTitle}>MENTOR</Text>
        </View>
        <Pressable
          onPress={() => { clearChat(); setLocalMessages([]) }}
          style={styles.newChatBtn}
          accessibilityLabel="Nueva conversación"
        >
          <MaterialCommunityIcons name="plus" size={14} color={T.gold} />
          <Text style={styles.newChatText}>NUEVO</Text>
        </Pressable>
      </View>

      {/* ── CONTEXT PILL ───────────────────────────────────────────── */}
      {currentModule && (
        <View style={styles.contextPill}>
          <View style={styles.contextDot} />
          <Text style={styles.contextText} numberOfLines={1}>
            {currentModule.title} — {currentModule.subtitle}
          </Text>
        </View>
      )}

      {/* ── MESSAGES ───────────────────────────────────────────────── */}
      <FlatList
        ref={listRef}
        data={localMessages}
        keyExtractor={item => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.chatList}
        onContentSizeChange={scrollToEnd}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyIcon}>★</Text>
            <Text style={styles.emptyTitle}>MENTOR LISTO</Text>
            <Text style={styles.emptySub}>
              Pregunta sobre {currentModule?.title ?? 'tu protocolo'}, tu norte, o cualquier bloqueo que enfrentes hoy.
            </Text>
          </View>
        }
      />

      {/* ── INPUT BAR ──────────────────────────────────────────────── */}
      <View style={[styles.inputBar, { paddingBottom: Platform.OS === 'ios' ? insets.bottom + 8 : 12 }]}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Escribe tu pregunta..."
          placeholderTextColor={T.textDim}
          multiline
          maxLength={600}
          editable={!isStreaming}
          returnKeyType="send"
          onSubmitEditing={handleSend}
        />
        <Pressable
          style={[styles.sendBtn, (!inputText.trim() || isStreaming) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim() || isStreaming}
          accessibilityLabel="Enviar mensaje"
        >
          <MaterialCommunityIcons name="arrow-up" size={18} color={T.bg} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
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
  newChatBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1.5, borderColor: T.goldBorder, borderRadius: 8,
  },
  newChatText: {
    fontSize: 10, fontFamily: 'SpaceGrotesk_700Bold', color: T.gold, letterSpacing: 1.5,
  },

  // Context pill
  contextPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: T.goldFaint, borderBottomWidth: 1, borderBottomColor: T.goldBorder,
    paddingHorizontal: 22, paddingVertical: 10,
  },
  contextDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: T.gold },
  contextText: {
    flex: 1, fontSize: 11, fontFamily: 'SpaceGrotesk_400Regular', color: T.goldDim,
  },

  // Chat
  chatList: { padding: 16, gap: 14, flexGrow: 1 },
  msgRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  msgRowRight: { flexDirection: 'row-reverse' },
  mentorAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: T.goldMid, borderWidth: 1.5, borderColor: T.goldBorder,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  mentorAvatarStar: { fontSize: 12, color: T.gold },
  bubble: { maxWidth: '84%', padding: 13, borderRadius: 16 },
  bubbleMentor: {
    backgroundColor: T.surface, borderWidth: 1, borderColor: 'rgba(237,186,1,0.10)',
    borderBottomLeftRadius: 4,
  },
  bubbleUser: {
    backgroundColor: T.goldFaint, borderWidth: 1.5, borderColor: T.goldBorder,
    borderBottomRightRadius: 4,
  },
  bubbleText: {
    fontFamily: 'SpaceGrotesk_400Regular', fontSize: 14, color: T.text, lineHeight: 22,
  },

  // Empty
  emptyWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 72, gap: 14, paddingHorizontal: 40,
  },
  emptyIcon: { fontSize: 36, color: T.gold, opacity: 0.3 },
  emptyTitle: {
    fontSize: 12, fontFamily: 'SpaceGrotesk_700Bold',
    color: T.textMid, letterSpacing: 3,
  },
  emptySub: {
    fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, color: T.textDim,
    textAlign: 'center', lineHeight: 20,
  },

  // Input
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    backgroundColor: T.surface, borderTopWidth: 1, borderTopColor: T.divider,
    paddingHorizontal: 16, paddingTop: 10,
    marginBottom: Platform.OS === 'web' ? 60 : 0,
  },
  input: {
    flex: 1, backgroundColor: T.surface2,
    borderWidth: 1.5, borderColor: 'rgba(237,186,1,0.12)',
    borderRadius: 22, paddingHorizontal: 16, paddingVertical: 11,
    fontFamily: 'SpaceGrotesk_400Regular', fontSize: 14, color: T.text,
    maxHeight: 110,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: T.gold, alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.35 },
})
