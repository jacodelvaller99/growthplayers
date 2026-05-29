import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppHeader,
  ChatBubble,
  GoldDivider,
  PolarisMark,
  PremiumCard,
  PremiumInput,
  StatusPill,
  screen,
  useScreen,
} from '@/components/polaris';
import { ACTIVE_MODULE } from '@/data/modules';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { useMentorMemory } from '@/hooks/useMentorMemory';
import { useUserIntelligence } from '@/hooks/useUserIntelligence';
import { analytics } from '@/lib/analytics';
import { streamMentorResponse, type MentorContext } from '@/lib/mentor';
import { db2, intel } from '@/lib/supabase';
import { useWearableConnections, useWearableDaily } from '@/lib/wearables';
import type { CheckIn, MentorMessage } from '@/types/lifeflow';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getOpeningMessage(params: {
  name: string;
  protocolDay: number;
  todayCheckIn: CheckIn | null;
  activeModuleTitle: string;
  recentCheckIns: CheckIn[];
}): string {
  const { name, protocolDay, todayCheckIn, activeModuleTitle, recentCheckIns } = params;
  const firstName = name.split(' ')[0] || name;

  // ── Pattern: 3+ consecutive high-stress days ────────────────────────────────
  const sorted = [...recentCheckIns].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  const highStressStreak = sorted.slice(0, 5).filter((c) => c.stress >= 7).length;
  const lowEnergyStreak  = sorted.slice(0, 5).filter((c) => c.energy <= 4).length;

  if (highStressStreak >= 3) {
    return `Llevas ${highStressStreak} días con el sistema nervioso en modo amenaza, ${firstName}. Antes de cualquier contenido — ¿qué evento de hace ${highStressStreak + 1} días no has terminado de digerir? ¿Cuántas decisiones tienes pendientes, no las que tomaste — las que estás evitando?`;
  }
  if (lowEnergyStreak >= 3) {
    return `${lowEnergyStreak} días consecutivos con energía baja, ${firstName}. Esto no es cansancio — es carga acumulada sin descarga. ¿Cuándo fue la última vez que hiciste algo sin ningún propósito productivo? Empieza por eso.`;
  }

  // Day 1 special welcome — hooks identity from the first second
  if (protocolDay <= 1) {
    return `${firstName}. Llegaste. Esto no es un curso — es un espejo de alta definición. Aquí no te digo lo que quieres escuchar; te digo lo que necesitas ver. ¿Qué te trajo específicamente a este protocolo en este momento de tu vida? Esa respuesta es el punto de partida de todo.`;
  }

  // Milestone identity crystallization moments
  if (protocolDay === 7) {
    return `${firstName}. Una semana completa. Eso no es trivial — la mayoría abandona antes del día 3. Esta semana ya te puso en el 20% superior. Ahora la pregunta real: ¿qué has notado diferente en ti que todavía no le has dicho a nadie?`;
  }
  if (protocolDay === 14) {
    return `Dos semanas, ${firstName}. Ya tienes datos reales de tu sistema — no suposiciones, datos. Mira tu check-in promedio de esta quincena. ¿Qué patrón te sorprendió más? No lo que esperabas ver — lo que no esperabas.`;
  }
  if (protocolDay === 30) {
    return `Un mes completo, ${firstName}. Treinta días de datos, treinta días de decisiones, treinta días de construir quien eres en lugar de quien deberías ser. La mayoría nunca llega aquí. ¿Qué parte de ti de hace 30 días ya no existe?`;
  }
  if (protocolDay === 60) {
    return `${firstName}. Sesenta días. Eso ya no es motivación — eso es identidad. La neurociencia dice que a los 66 días un comportamiento se vuelve automático. Estás a seis días de que esto sea quien eres, no lo que haces. ¿Qué quieres que sea automático en ti?`;
  }
  if (protocolDay === 90) {
    return `${firstName}. Noventa días. Eres una persona diferente. No diferente en lo que dices — diferente en lo que haces cuando nadie mira. Eso es el protocolo funcionando. Una sola pregunta: comparado con quien eras en el Día 1 — ¿cuál es la diferencia más importante que has ganado?`;
  }

  if (!todayCheckIn) {
    return `${firstName}, aún no has registrado tu check-in de hoy. Sin lectura del sistema, opero a ciegas. Tómate 2 minutos antes de avanzar — eso multiplica la calidad de cualquier decisión que tomemos juntos.`;
  }
  if (todayCheckIn.stress >= 8) {
    return `${firstName}, veo el estrés en ${todayCheckIn.stress}/10 hoy. Antes de cualquier acción, necesitamos reducir eso. El cortisol alto colapsa el pensamiento estratégico. ¿Qué está generando esa presión? Nómbralo.`;
  }
  if (todayCheckIn.energy <= 3) {
    return `Energía en ${todayCheckIn.energy}/10 hoy, ${firstName}. Eso cambia el protocolo. Enfoque mínimo viable: una acción de alto impacto, sin desperdiciar recurso cognitivo. ¿Cuál es tu prioridad número uno ahora?`;
  }
  return `Día ${protocolDay} del protocolo. Estás en ${activeModuleTitle}. Energía ${todayCheckIn.energy}/10, claridad ${todayCheckIn.clarity}/10 — condiciones para ejecutar. ¿En qué trabajamos hoy, ${firstName}?`;
}

function computeStreak(checkIns: CheckIn[]): number {
  if (!checkIns.length) return 0;
  const sorted = [...checkIns].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let streak = 0;
  let cursor = new Date(today);
  for (const ci of sorted) {
    const d = new Date(ci.date);
    d.setHours(0, 0, 0, 0);
    if (d.getTime() === cursor.getTime()) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else if (d.getTime() < cursor.getTime()) {
      break;
    }
  }
  return streak;
}

// ─── Prompt shortcuts por módulo ──────────────────────────────────────────────
const BASE_PROMPTS: Array<{ label: string; icon: React.ComponentProps<typeof MaterialIcons>['name'] }> = [
  { label: 'Analiza mi estado', icon: 'psychology' },
  { label: 'Ordena mi dia', icon: 'calendar-today' },
];

const MODULE_PROMPTS: Record<number, Array<{ label: string; icon: React.ComponentProps<typeof MaterialIcons>['name'] }>> = {
  0: [
    { label: '¿Qué cambia primero en mí con el Método?', icon: 'military-tech' },
    { label: '¿Qué hace diferente a alguien en el protocolo?', icon: 'play-arrow' },
  ],
  1: [
    { label: '¿Cuál es mi creencia que más me limita hoy?', icon: 'fitness-center' },
    { label: '¿Qué me diría mi versión de 5 años adelante?', icon: 'search' },
  ],
  2: [
    { label: '¿Qué emoción estoy evitando sentir ahora?', icon: 'bolt' },
    { label: 'Guíame con escritura terapéutica', icon: 'edit' },
  ],
  3: [
    { label: '¿Qué me está enseñando esta crisis?', icon: 'explore' },
    { label: '¿Cómo aplico C.A.D.A.V.R.A. hoy?', icon: 'hub' },
  ],
  4: [
    { label: '¿Cómo entro en Flow en los próximos 30 min?', icon: 'water' },
    { label: 'Protocolo de coherencia cardíaca ahora', icon: 'favorite' },
  ],
  5: [
    { label: '¿Cuál es la llave que más necesito abrir?', icon: 'vpn-key' },
    { label: '¿Mi relación con el dinero viene del miedo o del servicio?', icon: 'attach-money' },
  ],
  6: [
    { label: 'Ayúdame a planear mi semana', icon: 'calendar-today' },
    { label: '¿Qué actividad consume más tiempo sin impactar mis PERAS?', icon: 'hourglass-empty' },
  ],
  7: [
    { label: '¿Cuál relación necesita mi atención ahora?', icon: 'people' },
    { label: '¿Cómo sirvo mejor desde mis dones?', icon: 'volunteer-activism' },
  ],
};

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
  const sc = useScreen();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { initialPrompt } = useLocalSearchParams<{ initialPrompt?: string }>();
  const {
    state,
    todayCheckIn,
    protocolDay,
    averages,
    isSubscribed,
    addMentorMessages,
    loadMoreMentorMessages,
    userId,
  } = useLifeFlow();

  // ── Intelligence Engine hooks ──────────────────────────────────────────────
  const { intelligence } = useUserIntelligence(userId);
  const { addMemory, searchMemories } = useMentorMemory(userId);

  // ── Wearable hooks ─────────────────────────────────────────────────────────
  const { connections } = useWearableConnections();
  const { today: latestWearable } = useWearableDaily(3);
  const wearableProvider = connections.find((c) => c.is_active)?.provider ?? null;

  const [input, setInput]               = useState('');
  const [isStreaming, setIsStreaming]   = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [pendingUserMsg, setPendingUserMsg] = useState<MentorMessage | null>(null);
  const [loadingMore, setLoadingMore]   = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(() => state.mentorMessages.length >= 50);

  // Threads state
  const [showThreads, setShowThreads] = useState(false);
  const [threads, setThreads] = useState<Array<{ id: string; title: string; created_at: string }>>([]);

  const loadThreads = async () => {
    if (!userId) return;
    try {
      const { data } = await db2.mentorThreads()
        .select('id, title, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);
      if (data) setThreads(data as typeof threads);
    } catch { /* tabla puede no existir */ }
  };

  const scrollRef = useRef<ScrollView>(null);
  // Flag to track auto-send from quick chips (set after submit is defined)
  const pendingInitialPrompt = useRef(initialPrompt ?? null);

  // Opening message — recomputes when check-in loads (async from Supabase)
  const openingMessage = useMemo(
    () =>
      getOpeningMessage({
        name:              state.profile.name,
        protocolDay,
        todayCheckIn,
        activeModuleTitle: ACTIVE_MODULE.title,
        recentCheckIns:    state.checkIns
          .slice()
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 7),
      }),
    // recompute once todayCheckIn arrives from Supabase (was null at mount)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [todayCheckIn?.date, protocolDay, state.checkIns.length],
  );

  // Commitment primer — shown as a second opening bubble, rotating by week
  const commitmentPrimer = useMemo(() => {
    const firstName = state.profile.name.split(' ')[0] || state.profile.name;
    if (protocolDay <= 7) {
      return `Una pregunta antes de empezar, ${firstName}. Si no pudieras fallar y nadie te juzgara — ¿qué estarías construyendo diferente en tu vida ahora mismo? No me des la respuesta que crees que deberías dar. Dame la real.`;
    }
    if (protocolDay <= 14) {
      return `¿Qué has notado diferente en ti desde que comenzaste el protocolo? No lo que has hecho — lo que eres diferente. Eso es lo que me importa rastrear contigo.`;
    }
    if (protocolDay <= 21) {
      return `Semana tres, ${firstName}. Las primeras dos semanas son adrenalina. Esta es donde se filtra quien realmente quiere cambiar. ¿Qué hábito del protocolo ya se siente natural?`;
    }
    if (protocolDay <= 30) {
      return `¿Cuál es el obstáculo interno que más aparece cuando intentas avanzar, ${firstName}? No el externo — el tuyo. Ese es el que vale la pena nombrar.`;
    }
    if (protocolDay <= 60) {
      const week = Math.floor((protocolDay - 30) / 7) % 4;
      const prompts = [
        `${firstName}, ¿qué está en tu cabeza antes de que empiece a operar contigo hoy?`,
        `¿Qué decisión has estado postergando esta semana, ${firstName}? Solo una.`,
        `¿Dónde está tu energía puesta esta semana? ¿Coincide con tus prioridades reales?`,
        `${firstName}, ¿qué es lo que más te está costando sostener del protocolo?`,
      ];
      return prompts[week];
    }
    if (protocolDay <= 90) {
      const week = Math.floor((protocolDay - 60) / 7) % 4;
      const endgamePrompts = [
        `${firstName}, estás en el último tramo. ¿Qué parte de ti de hace 60 días todavía aparece cuando hay presión?`,
        `¿Qué harás diferente cuando esto termine, ${firstName}? No el plan — la persona.`,
        `En el día 90 vas a mirar atrás. ¿Qué quieres que ya sea automático en ti para ese momento?`,
        `${firstName}, ¿cuál es la promesa que te hiciste al inicio que todavía no has cumplido del todo?`,
      ];
      return endgamePrompts[week];
    }
    return `${firstName}. Noventa días completados. ¿Cuál es el siguiente nivel que ya estás diseñando?`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [protocolDay]);

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

  const handleLoadMore = async () => {
    if (loadingMore || !hasMoreMessages) return;
    setLoadingMore(true);
    try {
      const gotMore = await loadMoreMentorMessages(state.mentorMessages.length);
      setHasMoreMessages(gotMore);
    } finally {
      setLoadingMore(false);
    }
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
    analytics.chatMessage(clean.length);
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
      const streak = computeStreak(state.checkIns);
      const sovereignScore = Math.round(
        (averages.energy + averages.clarity + (10 - averages.stress) + averages.sleep) / 4 * 100,
      );
      const tier =
        sovereignScore >= 750 ? 'Maestro'
        : sovereignScore >= 500 ? 'Soberano'
        : sovereignScore >= 200 ? 'Mercader'
        : 'Explorador';

      // ── Step 1: Semantic memory search (parallel with build) ──────────────
      const memoriesPromise = searchMemories(clean, 3);

      // ── Step 2: Build context with Intelligence fields ─────────────────────
      const relevantMemories = await memoriesPromise;

      // Dynamic module progress (based on completed lessons)
      const activeModLessons = ACTIVE_MODULE.lessons.length;
      const activeModCompleted = ACTIVE_MODULE.lessons.filter(
        (l) => (state.completedLessons ?? []).includes(l.id)
      ).length;
      const activeModProgress = activeModLessons > 0
        ? Math.round((activeModCompleted / activeModLessons) * 100)
        : 0;

      const ctx: MentorContext = {
        userName:             state.profile.name,
        role:                 state.profile.role,
        totalDays:            protocolDay,
        streak,
        sovereignScore,
        tier,
        activeModuleTitle:    ACTIVE_MODULE.title,
        activeModuleProgress: activeModProgress,
        northStar:            state.northStar,
        todayCheckIn,
        recentCheckIns:       state.checkIns
          .slice()
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 14),
        messageCount:         userMsgCount,
        completedTasks:       Object.values(state.completedTasks ?? {}).map((t) => ({
          lessonId:    t.lessonId,
          lessonTitle: t.title,
          keyResponse: t.responses ? Object.values(t.responses)[0] : undefined,
        })),
        // Intelligence Engine enrichment
        engagementScore:  intelligence.engagement_score,
        churnRisk:        intelligence.churn_risk,
        churnRiskLabel:   intelligence.churn_risk_label,
        anomalyType:      intelligence.anomaly_type,
        nextAction:       intelligence.next_action,
        cohortLabel:      intelligence.cohort_label,
        relevantMemories: relevantMemories.map((m) => ({
          content:     m.content,
          memory_type: m.memory_type,
          importance:  m.importance,
          similarity:  m.similarity,
        })),
        // Biometric enrichment (wearable)
        biometricProvider:  wearableProvider,
        biometricReadiness: latestWearable?.recovery_score ?? null,
        biometricHrv:       latestWearable?.hrv_ms ?? null,
        biometricRestingHr: latestWearable?.resting_hr ?? null,
        biometricAnomaly:   intelligence.anomaly_type?.startsWith('biometric') ? intelligence.anomaly_type : null,
      };

      const history = state.mentorMessages.slice(-10).map((m) => ({
        role: m.role,
        text: m.text,
      }));

      // ── Step 3: Stream response ────────────────────────────────────────────
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

      // ── Step 4: Persist messages ───────────────────────────────────────────
      await addMentorMessages(userMsg, mentorMsg);

      // ── Step 5: Save conversation to mentor_conversations (fire & forget) ──
      if (userId) {
        intel.conversations()
          .insert([
            { user_id: userId, role: 'user',      content: clean },
            { user_id: userId, role: 'assistant', content: fullText },
          ])
          .then(({ error }: { error: unknown }) => {
            if (error) console.warn('[Mentor] save conversation:', error);
          });
      }

      // ── Step 6: Save user message as memory (fire & forget) ───────────────
      // Only messages with meaningful content (addMemory handles threshold)
      addMemory(clean, undefined, undefined, {
        module: ACTIVE_MODULE.title,
        session_msg_count: userMsgCount,
      }).catch(() => { /* silent */ });

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

  // ── Auto-send prompt from home screen quick chips ───────────────────────────
  // Placed after `submit` so it's available in closure without TDZ error
  useEffect(() => {
    const prompt = pendingInitialPrompt.current;
    if (!prompt) return;
    pendingInitialPrompt.current = null;
    const timer = setTimeout(() => submit(prompt), 800);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={sc.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={insets.top}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[sc.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }, styles.content]}
        showsVerticalScrollIndicator={false}
        bounces
        overScrollMode="never"
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scrollToBottom(false)}>
        <AppHeader
          title="MENTOR POLARIS"
          right={
            <View style={styles.onlineBlock}>
              <TouchableOpacity
                onPress={() => { loadThreads(); setShowThreads(true); }}
                style={styles.chatsBtn}
                accessibilityLabel="Ver historial de chats">
                <Text style={styles.chatsBtnText}>CHATS</Text>
              </TouchableOpacity>
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
          <StatusPill label={`MÓDULO ${ACTIVE_MODULE.order} · ${ACTIVE_MODULE.title}`} />
          <Text style={styles.contextTitle}>CONTEXTO OPERATIVO</Text>
          {todayCheckIn ? (
            <View style={styles.metricsRow}>
              <View style={styles.metricPill}>
                <MaterialIcons name="bolt" size={12} color={palette.gold} />
                <Text style={styles.metricPillText}>ENERGÍA {todayCheckIn.energy}/10</Text>
              </View>
              <View style={styles.metricPill}>
                <MaterialIcons name="center-focus-strong" size={12} color={palette.gold} />
                <Text style={styles.metricPillText}>CLARIDAD {todayCheckIn.clarity}/10</Text>
              </View>
              <View style={styles.metricPill}>
                <MaterialIcons name="device-thermostat" size={12} color={palette.gold} />
                <Text style={styles.metricPillText}>ESTRÉS {todayCheckIn.stress}/10</Text>
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
          {[
            ...BASE_PROMPTS,
            ...(MODULE_PROMPTS[ACTIVE_MODULE.order] ?? []),
          ].map((p) => (
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

        {/* ── Last session memory anchor ── */}
        {state.mentorMessages.length >= 6 && (
          <PremiumCard style={styles.memoryCard}>
            <View style={styles.memoryHeader}>
              <MaterialIcons name="history" size={12} color={palette.gold} />
              <Text style={styles.memoryLabel}>ÚLTIMA SESIÓN</Text>
            </View>
            <Text style={styles.memoryText} numberOfLines={2}>
              {state.mentorMessages
                .filter((m) => m.role === 'user')
                .slice(-2)
                .map((m) => m.text.slice(0, 80))
                .join(' · ')}
            </Text>
          </PremiumCard>
        )}

        {/* ── Message Thread ── */}
        {displayMessages.length > 0 && (
          <>
            <GoldDivider label="CONVERSACION" />
            {hasMoreMessages && (
              <Pressable
                onPress={handleLoadMore}
                disabled={loadingMore}
                accessibilityRole="button"
                accessibilityLabel="Cargar mensajes anteriores"
                style={({ pressed }) => [
                  styles.loadMoreBtn,
                  pressed && { opacity: 0.7 },
                  loadingMore && { opacity: 0.5 },
                ]}>
                {loadingMore ? (
                  <ActivityIndicator size="small" color={palette.gold} />
                ) : (
                  <>
                    <MaterialIcons name="history" size={14} color={palette.gold} />
                    <Text style={styles.loadMoreText}>CARGAR MENSAJES ANTERIORES</Text>
                  </>
                )}
              </Pressable>
            )}
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
          <>
            <GoldDivider label="CONVERSACION" />
            <View style={styles.thread}>
              <ChatBubble role="mentor">{openingMessage}</ChatBubble>
              {commitmentPrimer ? (
                <ChatBubble role="mentor">{commitmentPrimer}</ChatBubble>
              ) : null}
            </View>
          </>
        )}
      </ScrollView>

      {/* ── Threads Modal ── */}
      <Modal visible={showThreads} transparent animationType="slide">
        <View style={styles.threadsOverlay}>
          <View style={styles.threadsSheet}>
            <View style={styles.threadsHeader}>
              <Text style={styles.threadsTitle}>HISTORIAL DE CHATS</Text>
              <Pressable onPress={() => setShowThreads(false)} style={styles.threadsClose}>
                <MaterialIcons name="close" size={20} color={palette.ash} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {threads.length === 0 ? (
                <Text style={styles.threadsEmpty}>Sin conversaciones guardadas aún</Text>
              ) : (
                threads.map(t => (
                  <Pressable
                    key={t.id}
                    onPress={() => setShowThreads(false)}
                    style={styles.threadRow}>
                    <MaterialIcons name="chat-bubble-outline" size={16} color={palette.gold} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.threadTitle} numberOfLines={1}>
                        {t.title || 'Conversación sin título'}
                      </Text>
                      <Text style={styles.threadDate}>
                        {new Date(t.created_at).toLocaleDateString('es-CO')}
                      </Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={16} color={palette.smoke} />
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Input Bar ── */}
      <View style={[styles.inputBar, { paddingBottom: insets.bottom + spacing.md, maxWidth: sc.isDesktop ? 960 : sc.isTablet ? 720 : 430 }]}>
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
    // paddingBottom is set dynamically via insets.bottom + 24
  },
  onlineBlock: {
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  chatsBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
    minWidth: 64,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatsBtnText: {
    fontFamily: Fonts.display,
    fontSize: 11,
    color: palette.gold,
    letterSpacing: 1.5,
  },
  threadsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  threadsSheet: {
    backgroundColor: '#111111',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    borderColor: palette.line,
    maxHeight: '70%',
    paddingBottom: 32,
  },
  threadsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
  },
  threadsTitle: {
    fontFamily: Fonts.display,
    fontSize: 13,
    color: palette.ivory,
    letterSpacing: 2,
  },
  threadsClose: { padding: 4 },
  threadsEmpty: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: palette.smoke,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  threadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  threadTitle: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: palette.ivory,
  },
  threadDate: {
    fontSize: 11,
    color: palette.smoke,
    marginTop: 2,
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
    backgroundColor: 'rgba(255,200,4,0.18)',
    borderColor: palette.gold + '44',
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  metricPillText: {
    ...typography.label,
    color: palette.gold,
    fontSize: 11,
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

  // Memory summary card
  memoryCard: {
    gap: 6,
    backgroundColor: 'rgba(201, 160, 0, 0.04)',
    borderColor: palette.gold + '22',
  },
  memoryHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  memoryLabel: {
    ...typography.label,
    color: palette.gold,
    fontSize: 11,
    letterSpacing: 1.5,
  },
  memoryText: {
    ...typography.mono,
    color: palette.smoke,
    fontSize: 11,
    lineHeight: 16,
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
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    width: '48%',
  },
  promptPressed: {
    backgroundColor: 'rgba(255, 200, 4, 0.08)',
    borderColor: palette.gold,
  },
  promptText: {
    ...typography.label,
    color: palette.ash,
    flex: 1,
    flexWrap: 'wrap',
    fontSize: 11,
    lineHeight: 16,
  },

  // Load more
  loadMoreBtn: {
    alignItems: 'center',
    alignSelf: 'center',
    borderColor: palette.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
    minHeight: 48,
    minWidth: 120,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  loadMoreText: {
    ...typography.label,
    color: palette.gold,
    fontSize: 11,
    letterSpacing: 1,
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
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    width: '100%',
  },
  input: {
    flex: 1,
    fontFamily: Fonts.display,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  sendButton: {
    alignItems: 'center',
    backgroundColor: palette.gold,
    borderRadius: radii.sm,    // brand: near-sharp corner instead of pill
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  sendButtonDisabled: {
    backgroundColor: palette.charcoal,
  },
});
