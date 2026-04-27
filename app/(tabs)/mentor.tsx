import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  AppHeader,
  ChatBubble,
  GoldDivider,
  PolarisMark,
  PremiumCard,
  PremiumInput,
  StatusPill,
  screen,
} from '@/components/polaris';
import { ACTIVE_MODULE } from '@/data/modules';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { streamMentorResponse, type MentorContext } from '@/lib/mentor';
import type { MentorMessage } from '@/types/lifeflow';

// ─── Prompt shortcuts ─────────────────────────────────────────────────────────
const QUICK_PROMPTS = [
  { label: 'Analiza mi estado', icon: 'psychology' as const },
  { label: 'Dame una practica', icon: 'fitness-center' as const },
  { label: 'Ordena mi dia', icon: 'calendar-today' as const },
  { label: 'Recuerdame mi norte', icon: 'explore' as const },
];

// ─── Typing indicator ─────────────────────────────────────────────────────────
function TypingBubble({ text }: { text: string }) {
  return (
    <View style={styles.typingBubble}>
      {text ? (
        <Text style={styles.typingText}>{text}</Text>
      ) : (
        <View style={styles.dotsRow}>
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
      )}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function MentorScreen() {
  const router = useRouter();
  const {
    state,
    todayCheckIn,
    protocolDay,
    isSubscribed,
    addMentorMessages,
  } = useLifeFlow();

  const [input, setInput]               = useState('');
  const [isStreaming, setIsStreaming]   = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [pendingUserMsg, setPendingUserMsg] = useState<MentorMessage | null>(null);

  const scrollRef = useRef<ScrollView>(null);

  // Gate: ≥ 3 mensajes de usuario sin suscripción
  const userMsgCount = useMemo(
    () => state.mentorMessages.filter((m) => m.role === 'user').length,
    [state.mentorMessages],
  );
  const isGated = !isSubscribed && userMsgCount >= 3;

  // Mensajes a mostrar = persistidos + mensaje de usuario pendiente
  const displayMessages = useMemo(() => {
    if (pendingUserMsg) return [...state.mentorMessages, pendingUserMsg];
    return state.mentorMessages;
  }, [state.mentorMessages, pendingUserMsg]);

  const scrollToBottom = (animated = true) => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated }), 80);
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const submit = async (text = input) => {
    const clean = text.trim();
    if (!clean || isStreaming) return;

    // Gate premium
    if (isGated) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      router.push('/paywall');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInput('');

    const userMsg: MentorMessage = {
      id:        `u-${Date.now()}`,
      role:      'user',
      text:      clean,
      createdAt: new Date().toISOString(),
    };

    setPendingUserMsg(userMsg);
    setStreamingText('');
    setIsStreaming(true);
    scrollToBottom();

    try {
      const ctx: MentorContext = {
        name:         state.profile.name,
        role:         state.profile.role,
        protocolDay,
        northStar:    state.northStar,
        todayCheckIn,
        messageCount: userMsgCount,
      };

      const history = state.mentorMessages.slice(-10).map((m) => ({
        role: m.role,
        text: m.text,
      }));

      let fullText = '';
      await streamMentorResponse(ctx, clean, history, (delta) => {
        fullText += delta;
        setStreamingText(fullText);
        scrollToBottom(false);
      });

      const mentorMsg: MentorMessage = {
        id:        `m-${Date.now()}`,
        role:      'mentor',
        text:      fullText || '…',
        createdAt: new Date().toISOString(),
      };

      await addMentorMessages(userMsg, mentorMsg);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (err) {
      console.error('[Mentor] streaming error:', err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setPendingUserMsg(null);
      setStreamingText('');
      setIsStreaming(false);
      scrollToBottom();
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={screen.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={76}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[screen.content, styles.content]}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scrollToBottom(false)}>

        {/* ── Header ── */}
        <AppHeader
          title="MENTOR POLARIS"
          right={
            <View style={styles.onlineBlock}>
              <PolarisMark size={36} />
              <StatusPill
                label={isStreaming ? 'RESPONDIENDO' : 'EN LINEA'}
                tone={isStreaming ? 'muted' : 'success'}
                dot
              />
            </View>
          }
        />

        {/* ── Operative Context ── */}
        <PremiumCard style={styles.contextCard}>
          <StatusPill label={`MODULO ${ACTIVE_MODULE.number} · ${ACTIVE_MODULE.title}`} />
          <Text style={styles.contextTitle}>CONTEXTO OPERATIVO</Text>
          {todayCheckIn ? (
            <View style={styles.metricsRow}>
              <View style={styles.metricPill}>
                <MaterialIcons name="bolt" size={12} color={palette.gold} />
                <Text style={styles.metricPillText}>ENERGIA {todayCheckIn.energy}/10</Text>
              </View>
              <View style={styles.metricPill}>
                <MaterialIcons name="center-focus-strong" size={12} color={palette.gold} />
                <Text style={styles.metricPillText}>CLARIDAD {todayCheckIn.clarity}/10</Text>
              </View>
              <View style={styles.metricPill}>
                <MaterialIcons name="device-thermostat" size={12} color={palette.gold} />
                <Text style={styles.metricPillText}>ESTRES {todayCheckIn.stress}/10</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.noCheckin}>
              Sin check-in hoy. El mentor puede orientar, pero falta lectura del sistema.
            </Text>
          )}
          {state.northStar.dailyReminder ? (
            <Text style={styles.contextNorth}>{state.northStar.dailyReminder}</Text>
          ) : null}
        </PremiumCard>

        {/* ── Paywall banner ── */}
        {isGated && (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push('/paywall');
            }}
            style={({ pressed }) => [styles.paywallBanner, pressed && { opacity: 0.85 }]}>
            <MaterialIcons name="lock" size={16} color={palette.black} />
            <Text style={styles.paywallText}>DESBLOQUEAR MENTOR PREMIUM</Text>
            <MaterialIcons name="chevron-right" size={16} color={palette.black} />
          </Pressable>
        )}

        {/* ── Quick Prompts ── */}
        <GoldDivider label="CONSULTAS RAPIDAS" />
        <View style={styles.promptGrid}>
          {QUICK_PROMPTS.map((p) => (
            <Pressable
              key={p.label}
              accessibilityRole="button"
              accessibilityLabel={p.label}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                submit(p.label);
              }}
              style={({ pressed }) => [
                styles.prompt,
                pressed && { opacity: 0.75, transform: [{ scale: 0.97 }] },
              ]}>
              <MaterialIcons name={p.icon} size={16} color={palette.gold} />
              <Text style={styles.promptText}>{p.label.toUpperCase()}</Text>
            </Pressable>
          ))}
        </View>

        {/* ── Message Thread ── */}
        {displayMessages.length > 0 && (
          <>
            <GoldDivider label="CONVERSACION" />
            <View style={styles.thread}>
              {displayMessages.map((message) => (
                <ChatBubble key={message.id} role={message.role}>
                  {message.text}
                </ChatBubble>
              ))}
              {isStreaming && <TypingBubble text={streamingText} />}
            </View>
          </>
        )}

        {displayMessages.length === 0 && !isStreaming && (
          <PremiumCard style={styles.emptyCard}>
            <MaterialIcons name="chat-bubble-outline" size={28} color={palette.smoke} />
            <Text style={styles.emptyTitle}>LISTO PARA OPERAR</Text>
            <Text style={styles.emptyBody}>
              Escribe tu consulta o usa las opciones rapidas para activar al mentor.
            </Text>
          </PremiumCard>
        )}
      </ScrollView>

      {/* ── Input Bar ── */}
      <View style={styles.inputBar}>
        <PremiumInput
          value={input}
          onChangeText={setInput}
          placeholder="CONSULTA AL MENTOR..."
          style={styles.input}
          onSubmitEditing={() => submit()}
          returnKeyType="send"
          editable={!isStreaming}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Enviar mensaje"
          style={({ pressed }) => [
            styles.sendButton,
            isStreaming && styles.sendButtonDisabled,
            pressed && !isStreaming && { opacity: 0.8, transform: [{ scale: 0.95 }] },
          ]}
          onPress={() => submit()}
          disabled={isStreaming}>
          <MaterialIcons
            name={isStreaming ? 'hourglass-empty' : 'arrow-upward'}
            size={22}
            color={isStreaming ? palette.smoke : palette.black}
          />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  content: {
    paddingBottom: 148,
  },
  onlineBlock: {
    alignItems: 'flex-end',
    gap: spacing.sm,
  },

  // Context card
  contextCard: {
    gap: spacing.md,
  },
  contextTitle: {
    ...typography.section,
    color: palette.ivory,
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metricPill: {
    alignItems: 'center',
    backgroundColor: palette.goldLight,
    borderColor: palette.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  metricPillText: {
    ...typography.label,
    color: palette.gold,
    fontSize: 8,
  },
  noCheckin: {
    ...typography.mono,
    color: palette.smoke,
  },
  contextNorth: {
    ...typography.body,
    color: palette.ash,
    fontSize: 13,
    fontStyle: 'italic',
  },

  // Paywall banner
  paywallBanner: {
    alignItems: 'center',
    backgroundColor: palette.gold,
    borderRadius: radii.md,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  paywallText: {
    ...typography.section,
    color: palette.black,
    flex: 1,
    textAlign: 'center',
  },

  // Quick prompts
  promptGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  prompt: {
    alignItems: 'center',
    borderColor: palette.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    width: '48%',
    minHeight: 44,
  },
  promptText: {
    ...typography.label,
    color: palette.gold,
    flex: 1,
    fontSize: 8,
  },

  // Thread
  thread: {
    gap: spacing.md,
  },

  // Typing bubble
  typingBubble: {
    alignSelf: 'flex-start',
    backgroundColor: palette.charcoal,
    borderColor: palette.lineSoft,
    borderRadius: radii.md,
    borderWidth: 1,
    maxWidth: '86%',
    padding: spacing.lg,
  },
  typingText: {
    ...typography.body,
    color: palette.ivory,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 4,
  },
  dot: {
    backgroundColor: palette.ash,
    borderRadius: 4,
    height: 8,
    width: 8,
  },

  // Empty state
  emptyCard: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    ...typography.section,
    color: palette.ash,
  },
  emptyBody: {
    ...typography.body,
    color: palette.smoke,
    fontSize: 13,
    textAlign: 'center',
  },

  // Input bar
  inputBar: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: palette.blackDeep,
    borderTopColor: palette.line,
    borderTopWidth: 1,
    bottom: 76,
    flexDirection: 'row',
    gap: spacing.md,
    maxWidth: 430,
    padding: spacing.lg,
    position: 'absolute',
    width: '100%',
  },
  input: {
    flex: 1,
    fontFamily: Fonts.display,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  sendButton: {
    alignItems: 'center',
    backgroundColor: palette.gold,
    borderRadius: radii.pill,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  sendButtonDisabled: {
    backgroundColor: palette.charcoal,
  },
});
