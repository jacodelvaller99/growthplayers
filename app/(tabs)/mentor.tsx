import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  View, Text, TextInput, FlatList, Pressable,
  KeyboardAvoidingView, Platform, StyleSheet,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import Animated, {
  FadeIn, useSharedValue, withRepeat, withTiming,
  useAnimatedStyle, withSequence, withDelay,
} from 'react-native-reanimated'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useChatStore } from '../../store/chatStore'
import { useProgramStore, getModulesForProgram } from '../../store/programStore'
import { useAuthStore } from '../../store'
import { useProfile } from '../../hooks/useProfile'
import { streamMentorResponse, getChatMessages } from '../../lib/mentor'

const C = {
  bg: '#0A0A0A', surface: '#141414', surface2: '#1C1C1C',
  mint: '#EDBA01', mintMuted: 'rgba(237,186,1,0.10)',
  mintBorder: 'rgba(237,186,1,0.20)', mintFaint: 'rgba(237,186,1,0.35)',
  gold: '#EDBA01', goldMuted: 'rgba(237,186,1,0.12)', goldBorder: 'rgba(237,186,1,0.20)',
  text: '#FFFFFF', textMuted: '#C0C0C0', textFaint: 'rgba(237,186,1,0.35)',
  divider: 'rgba(255,255,255,0.08)',
}

const AnimatedDot = ({ delay }: { delay: number }) => {
  const opacity = useSharedValue(0.3)
  useEffect(() => {
    opacity.value = withDelay(delay, withRepeat(withTiming(1, { duration: 400 }), -1, true))
  }, [])
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }))
  return <Animated.View style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.mint }, style]} />
}

const LoadingDots = () => (
  <View style={{ flexDirection: 'row', gap: 4, padding: 4 }}>
    <AnimatedDot delay={0} />
    <AnimatedDot delay={150} />
    <AnimatedDot delay={300} />
  </View>
)

interface MsgBubble {
  id: string
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
}

export default function MentorScreen() {
  const { session } = useAuthStore()
  const { profile } = useProfile()
  const insets = useSafeAreaInsets()
  const { programType, currentModuleId, streak, totalDays, archetypeId } = useProgramStore()
  const { messages: storeMessages, addMessage, updateMessageContent, setLoading, clearChat } = useChatStore()

  const [inputText, setInputText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [localMessages, setLocalMessages] = useState<MsgBubble[]>([])
  const listRef = useRef<FlatList>(null)

  const modules = getModulesForProgram(programType)
  const currentModule = modules.find((m) => m.id === currentModuleId) ?? modules[0]

  // Load chat history from Supabase on mount
  useEffect(() => {
    const userId = session?.user?.id
    if (!userId) return
    getChatMessages(userId, 50).then((rows) => {
      if (rows.length > 0) {
        const msgs: MsgBubble[] = rows.map((r) => ({
          id: r.id,
          role: r.role,
          content: r.content,
        }))
        setLocalMessages(msgs)
      }
    })
  }, [session?.user?.id])

  const scrollToEnd = () => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100)
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

    setLocalMessages((prev) => [...prev, userMsg, assistantMsg])
    scrollToEnd()

    const history = localMessages.map((m) => ({ role: m.role, content: m.content }))

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
          setLocalMessages((prev) =>
            prev.map((m) => m.id === assistantId ? { ...m, content: m.content + chunk } : m)
          )
          scrollToEnd()
        }
      )
    } finally {
      setLocalMessages((prev) =>
        prev.map((m) => m.id === assistantId ? { ...m, isStreaming: false } : m)
      )
      setIsStreaming(false)
    }
  }, [inputText, isStreaming, session?.user?.id, profile, programType, archetypeId,
      currentModule, streak, totalDays, localMessages])

  const renderMessage = ({ item }: { item: MsgBubble }) => {
    const isUser = item.role === 'user'
    return (
      <Animated.View entering={FadeIn.duration(300)} style={[styles.msgRow, isUser && styles.msgRowRight]}>
        {!isUser && (
          <View style={styles.mentorAvatar}>
            <Text style={styles.mentorAvatarText}>★</Text>
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
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View>
          <Text style={styles.headerTitle}>MENTOR</Text>
          <Text style={styles.headerSub}>
            {programType === 'polaris' ? 'IA · Polaris Protocol' : 'IA · Growth Players'}
          </Text>
        </View>
        <Pressable onPress={clearChat} style={styles.newBtn}>
          <Text style={styles.newBtnText}>Nueva</Text>
        </Pressable>
      </View>

      {/* MODULE CONTEXT */}
      {currentModule && (
        <View style={styles.moduleCtx}>
          <View style={styles.moduleDot} />
          <Text style={styles.moduleCtxText}>
            {currentModule.title} — {currentModule.subtitle}
          </Text>
        </View>
      )}

      {/* CHAT */}
      <FlatList
        ref={listRef}
        data={localMessages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.chatContent}
        onContentSizeChange={scrollToEnd}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyIcon}>★</Text>
            <Text style={styles.emptyTitle}>Mentor listo</Text>
            <Text style={styles.emptySub}>
              Escribe tu primera pregunta sobre {currentModule?.title ?? 'el módulo actual'}
            </Text>
          </View>
        }
      />

      {/* INPUT */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Escribe tu respuesta..."
          placeholderTextColor={C.textFaint}
          multiline
          maxLength={500}
          editable={!isStreaming}
          onSubmitEditing={handleSend}
        />
        <Pressable
          style={[styles.sendBtn, (!inputText.trim() || isStreaming) && { opacity: 0.4 }]}
          onPress={handleSend}
          disabled={!inputText.trim() || isStreaming}
        >
          <MaterialCommunityIcons name="arrow-up" size={20} color="#0A0A0A" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: C.divider,
  },
  headerTitle: {
    fontFamily: 'SpaceGrotesk_700Bold', fontSize: 18, color: C.text,
  },
  headerSub: {
    fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 13, color: C.gold,
  },
  newBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: C.mintBorder, borderRadius: 8,
  },
  newBtnText: {
    fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 12, color: C.mint,
  },
  moduleCtx: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.goldMuted, borderWidth: 1, borderColor: C.goldBorder,
    marginHorizontal: 16, marginTop: 10, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  moduleDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.gold },
  moduleCtxText: {
    fontFamily: 'SpaceGrotesk_400Regular', fontSize: 11, color: C.gold, flex: 1,
  },
  chatContent: { padding: 16, gap: 12, flexGrow: 1 },
  msgRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  msgRowRight: { flexDirection: 'row-reverse' },
  mentorAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: C.goldMuted, borderWidth: 1.5, borderColor: C.goldBorder,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  mentorAvatarText: { fontSize: 14, color: C.gold },
  bubble: { maxWidth: '85%', padding: 12, borderRadius: 14 },
  bubbleMentor: {
    backgroundColor: C.surface, borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(237,186,1,0.10)',
    borderBottomLeftRadius: 4,
  },
  bubbleUser: {
    backgroundColor: C.mintMuted,
    borderWidth: 1, borderColor: C.mintBorder,
    borderBottomRightRadius: 4,
  },
  bubbleText: {
    fontFamily: 'SpaceGrotesk_400Regular', fontSize: 14,
    color: C.text, lineHeight: 22,
  },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12 },
  emptyIcon: { fontSize: 40, color: C.gold, opacity: 0.4 },
  emptyTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16, color: C.textMuted },
  emptySub: {
    fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, color: C.textFaint,
    textAlign: 'center', paddingHorizontal: 32,
  },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.divider,
    paddingHorizontal: 16, paddingVertical: 10, paddingBottom: Platform.OS === 'ios' ? 28 : 10,
    marginBottom: Platform.OS === 'web' ? 60 : 0,
    zIndex: 10,
  },
  input: {
    flex: 1, backgroundColor: C.surface2, borderWidth: 1, borderColor: 'rgba(237,186,1,0.10)',
    borderRadius: 24, paddingHorizontal: 16, paddingVertical: 12,
    fontFamily: 'SpaceGrotesk_400Regular', fontSize: 14, color: C.text,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center',
  },
})
