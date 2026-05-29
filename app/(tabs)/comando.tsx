import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedNumber } from '@/components/AnimatedNumber';

import {
  AppHeader,
  EditorialPanel,
  GoldDivider,
  MetricCard,
  PremiumCard,
  PrimaryButton,
  ProgressCard,
  StateMeter,
  StatusPill,
  screen,
  useScreen,
} from '@/components/polaris';
import { ACTIVE_MODULE } from '@/data/modules';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useUserIntelligence } from '@/hooks/useUserIntelligence';
import { useWellnessStore } from '@/store/wellnessStore';
import { generateWeeklySessionIfNeeded } from '@/lib/weekly-session-generator';
import { useWearableConnections } from '@/lib/wearables';
import { LIVE_SESSION, getNextSession, formatSessionDate } from '@/data/live-sessions';

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'BUENOS DÍAS';
  if (hour < 18) return 'BUENAS TARDES';
  return 'BUENAS NOCHES';
}

export default function DashboardScreen() {
  const sc = useScreen();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDesktop } = useBreakpoint();
  const { state, protocolDay, todayCheckIn, latestCheckIn, userId } = useLifeFlow();
  const { user: wellnessUser } = useWellnessStore();
  const { intelligence, engagementTier } = useUserIntelligence(userId);
  const progress = Math.min(Math.round((protocolDay / 90) * 100), 100);
  const checkIn = todayCheckIn ?? latestCheckIn;

  const { isConnected: isWearableConnected } = useWearableConnections();
  const hasWearable = isWearableConnected('whoop') || isWearableConnected('oura');

  const [weeklySession, setWeeklySession] = useState<{ ai_message: string; week_number: number } | null>(null);

  useEffect(() => {
    if (userId && state.profile) {
      generateWeeklySessionIfNeeded(userId, protocolDay, state.profile)
        .then(s => { if (s?.ai_message) setWeeklySession(s); })
        .catch(() => {});
    }
  }, [userId]);

  // Intelligence-driven greeting suffix
  const intelligenceGreeting = (() => {
    if (intelligence.anomaly_detected && intelligence.anomaly_type === 'mood_drop') {
      return 'Tu energía ha bajado estos días. Hablemos con Norman sobre cómo reconectarte.';
    }
    if (intelligence.churn_risk_label === 'critical') {
      return 'Llevas varios días sin actividad. Un pequeño paso hoy reactiva todo el sistema.';
    }
    if (intelligence.churn_risk_label === 'high') {
      return 'Tu consistencia puede estar en riesgo. ¿Qué bloqueó tu práctica?';
    }
    if (engagementTier === 'excellent') {
      return '¡Excelente racha! Tu disciplina está generando resultados medibles.';
    }
    return null;
  })();

  // Next best action card
  const nextActionConfig = (() => {
    if (!intelligence.next_action) return null;
    const configs: Record<string, { icon: React.ComponentProps<typeof MaterialIcons>['name']; label: string; screen: string }> = {
      complete_checkin: { icon: 'assignment', label: 'REGISTRAR CHECK-IN', screen: '/checkin' },
      continue_lesson:  { icon: 'play-arrow', label: 'CONTINUAR LECCIÓN', screen: `/module/${ACTIVE_MODULE.id}` },
      try_binaural:     { icon: 'headphones', label: 'SESIÓN BINAURAL', screen: '/bienestar' },
      journal:          { icon: 'edit', label: 'ESCRIBIR EN DIARIO', screen: '/bienestar' },
      talk_to_mentor:   { icon: 'forum', label: 'CONSULTAR MENTOR', screen: '/(tabs)/mentor' },
    };
    return configs[intelligence.next_action] ?? null;
  })();

  // Wellness stats
  const totalWellnessSessions = (state.wellnessSessions ?? []).length;
  const totalWellnessMinutes = wellnessUser.totalWellnessMinutes > 0
    ? wellnessUser.totalWellnessMinutes
    : Math.round((state.wellnessSessions ?? []).reduce((acc, s) => acc + (s.durationSeconds ?? 0), 0) / 60);
  const wellnessStreak = wellnessUser.weeklyActivity.filter(Boolean).length;

  // Engagement bar animated width
  const engagementWidth = useSharedValue(0);
  useEffect(() => {
    if (intelligence.engagement_score > 0) {
      engagementWidth.value = withTiming(intelligence.engagement_score, { duration: 1000 });
    }
  }, [intelligence.engagement_score]);
  const engagementBarStyle = useAnimatedStyle(() => ({
    width: `${engagementWidth.value}%` as unknown as number,
  }));

  // ── Shared JSX blocks (idénticos en mobile y desktop) ─────────────────────

  const heroBlock = (
    <EditorialPanel
      eyebrow={`DÍA ${protocolDay} · PROTOCOLO SOBERANO`}
      title={`${greeting()},\n${state.profile.name}.`}
      body={
        intelligenceGreeting ??
        (todayCheckIn
          ? 'Check-in registrado. Ahora convierte tu estado en ejecución medible.'
          : 'Tu sala de mando espera lectura interna para calibrar el día.')
      }>
      <Text style={styles.time}>
        {new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
      </Text>
      <PrimaryButton
        label={todayCheckIn ? 'REVISAR CHECK-IN' : 'HACER CHECK-IN'}
        icon="assignment"
        onPress={() => router.push('/checkin')}
      />
    </EditorialPanel>
  );

  const anomalyBlock = intelligence.anomaly_detected && intelligence.anomaly_type && (
    <Pressable
      onPress={() => router.push('/(tabs)/mentor')}
      style={({ pressed }) => [styles.anomalyCard, pressed && { opacity: 0.85 }]}>
      <MaterialIcons name="warning-amber" size={18} color={palette.gold} />
      <View style={styles.anomalyTextBlock}>
        <Text style={styles.anomalyTitle}>SEÑAL DETECTADA</Text>
        <Text style={styles.anomalyBody}>
          {intelligence.anomaly_type === 'mood_drop'
            ? 'Bajón de energía detectado. Norman puede ayudarte a entender qué está pasando.'
            : intelligence.anomaly_type === 'streak_break'
            ? 'Racha rota. Hoy es el mejor día para retomar.'
            : 'Llevas días sin conectar con tu mentor. ¿Cómo estás?'}
        </Text>
      </View>
      <MaterialIcons name="chevron-right" size={18} color={palette.smoke} />
    </Pressable>
  );

  const nbaBlock = nextActionConfig && intelligence.next_action_urgency !== 'low' && (
    <Pressable
      onPress={() => router.push(nextActionConfig.screen as never)}
      style={({ pressed }) => [styles.nbaCard, pressed && { opacity: 0.85 }]}>
      <View style={styles.nbaBadge}>
        <MaterialIcons name={nextActionConfig.icon} size={18} color={palette.black} />
      </View>
      <View style={styles.nbaTextBlock}>
        <Text style={styles.nbaLabel}>PRÓXIMA ACCIÓN RECOMENDADA</Text>
        <Text style={styles.nbaAction}>{nextActionConfig.label}</Text>
        {intelligence.next_action_reason && (
          <Text style={styles.nbaReason}>{intelligence.next_action_reason}</Text>
        )}
      </View>
      <MaterialIcons name="arrow-forward" size={16} color={palette.gold} />
    </Pressable>
  );

  // North Star daily anchor — identity primer before metrics
  const northAnchorStrip = state.northStar.dailyReminder ? (
    <Pressable
      onPress={() => router.push('/(tabs)/norte')}
      style={({ pressed }) => [styles.northAnchor, pressed && { opacity: 0.8 }]}>
      <MaterialIcons name="north" size={12} color={palette.gold} />
      <Text style={styles.northAnchorText} numberOfLines={2}>
        {state.northStar.dailyReminder}
      </Text>
    </Pressable>
  ) : null;

  const engagementBlock = intelligence.engagement_score > 0 && (
    <View style={styles.engagementRow}>
      <Text style={styles.engagementLabel}>ENGAGEMENT</Text>
      <Animated.View style={[styles.engagementBar, engagementBarStyle]} />
      <Text style={styles.engagementScore}>{intelligence.engagement_score}/100</Text>
    </View>
  );

  const metricsRow = (
    <View style={[styles.grid, isDesktop && styles.gridDesktop]}>
      <MetricCard
        label="Racha"
        value={`${Math.max(state.checkIns.length, protocolDay)}`}
        numericValue={Math.max(state.checkIns.length, protocolDay)}
        meta="días de protocolo"
        icon="local-fire-department"
        entryDelay={0}
        style={isDesktop ? styles.metricCardDesktop : undefined}
      />
      <MetricCard
        label="Check-ins"
        value={`${state.checkIns.length}`}
        numericValue={state.checkIns.length}
        meta={todayCheckIn ? 'hoy completo' : 'pendiente hoy'}
        icon="fact-check"
        entryDelay={60}
        style={isDesktop ? styles.metricCardDesktop : undefined}
      />
      <MetricCard
        label="Módulo"
        value={`0${ACTIVE_MODULE.order}`}
        meta={ACTIVE_MODULE.title.split(/[\s:]/)[0].toLowerCase()}
        icon="view-module"
        entryDelay={120}
        style={isDesktop ? styles.metricCardDesktop : undefined}
      />
      <MetricCard
        label="Capacidad"
        value={checkIn
          ? `${Math.round((checkIn.energy + checkIn.clarity + checkIn.sleep + (11 - checkIn.stress)) / 4)}/10`
          : '--'}
        numericValue={checkIn
          ? Math.round((checkIn.energy + checkIn.clarity + checkIn.sleep + (11 - checkIn.stress)) / 4)
          : undefined}
        numericSuffix="/10"
        meta="operativa hoy"
        icon="verified-user"
        entryDelay={180}
        style={isDesktop ? styles.metricCardDesktop : undefined}
      />
    </View>
  );

  const estadoBlock = (
    <View style={styles.stack}>
      <View style={styles.sectionTopRow}>
        <Text style={screen.sectionTitle}>Biometría</Text>
        <StatusPill
          label={todayCheckIn ? 'ACTUALIZADO' : 'SIN LECTURA'}
          tone={todayCheckIn ? 'gold' : 'muted'}
        />
      </View>
      {checkIn ? (
        <PremiumCard style={styles.meterCard}>
          <StateMeter label="Energía" value={checkIn.energy} />
          <StateMeter label="Enfoque / claridad" value={checkIn.clarity} />
          <StateMeter label="Estrés" value={checkIn.stress} inverted />
        </PremiumCard>
      ) : (
        <Pressable
          onPress={() => router.push('/checkin')}
          style={({ pressed }) => [styles.estadoEmpty, pressed && { opacity: 0.8 }]}>
          <MaterialIcons name="assignment" size={20} color={palette.smoke} />
          <View style={{ flex: 1 }}>
            <Text style={styles.estadoEmptyTitle}>SIN LECTURA HOY</Text>
            <Text style={styles.estadoEmptySub}>Registra tu check-in para calibrar el sistema</Text>
          </View>
          <MaterialIcons name="chevron-right" size={16} color={palette.smoke} />
        </Pressable>
      )}
      {!hasWearable && protocolDay >= 3 && (
        <Pressable
          onPress={() => router.push('/perfil/wearables' as never)}
          style={({ pressed }) => [styles.wearableCta, pressed && { opacity: 0.8 }]}>
          <MaterialIcons name="watch" size={16} color={palette.gold} />
          <View style={styles.wearableCtaCopy}>
            <Text style={styles.wearableCtaTitle}>CONECTA TU WEARABLE</Text>
            <Text style={styles.wearableCtaSub}>
              WHOOP u Oura — HRV, recuperación y sueño automáticos
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={16} color={palette.smoke} />
        </Pressable>
      )}
    </View>
  );

  const protocolBlock = (
    <PremiumCard style={styles.protocolCard}>
      <StatusPill label={`MÓDULO ${ACTIVE_MODULE.order} · ACTIVO`} />
      <Text style={styles.protocolTitle}>{ACTIVE_MODULE.title}</Text>
      <Text style={styles.protocolBody}>
        Próxima acción: completa la lección activa y ejecuta un bloque mercader de 90 minutos
        sin mensajería.
      </Text>
      <PrimaryButton
        label="CONTINUAR LECCIÓN"
        icon="play-arrow"
        onPress={() => router.push({ pathname: '/module/[id]', params: { id: ACTIVE_MODULE.id } })}
      />
    </PremiumCard>
  );

  const wellnessBlock = (
    <PremiumCard style={styles.wellnessCard}>
      <View style={styles.wellnessRow}>
        <View style={styles.wellnessIconBox}>
          <MaterialIcons name="spa" size={28} color={palette.purple} />
        </View>
        <View style={styles.wellnessBody}>
          <Text style={styles.wellnessTitle}>MÓDULO BIENESTAR</Text>
          <Text style={styles.wellnessSub}>Meditación · Respiración · Binaurales</Text>
        </View>
      </View>
      {totalWellnessSessions > 0 && (
        <View style={styles.wellnessStats}>
          <View style={styles.wellnessStat}>
            <AnimatedNumber value={totalWellnessSessions} delay={300} style={styles.wellnessStatNum} />
            <Text style={styles.wellnessStatLabel}>SESIONES</Text>
          </View>
          <View style={styles.wellnessStatDivider} />
          <View style={styles.wellnessStat}>
            <AnimatedNumber value={totalWellnessMinutes} delay={420} style={styles.wellnessStatNum} />
            <Text style={styles.wellnessStatLabel}>MINUTOS</Text>
          </View>
          <View style={styles.wellnessStatDivider} />
          <View style={styles.wellnessStat}>
            <AnimatedNumber value={wellnessStreak} delay={540} style={styles.wellnessStatNum} />
            <Text style={styles.wellnessStatLabel}>DÍAS/SEM</Text>
          </View>
        </View>
      )}
      <PrimaryButton
        label="ABRIR BIENESTAR"
        icon="spa"
        onPress={() => router.push('/bienestar' as never)}
      />
    </PremiumCard>
  );

  // ── Norman Quick Panel — chips predictivos por módulo + estado ───────────────
  const normanChips = useMemo(() => {
    type Chip = { label: string; icon: React.ComponentProps<typeof MaterialIcons>['name']; prompt: string };
    const hour = new Date().getHours();
    const mo = ACTIVE_MODULE.order ?? 0;

    // Pool contextual (máx 2) — se insertan primero si aplican
    const ctx: Chip[] = [];
    if (!todayCheckIn) {
      ctx.push({ label: '¿Cómo está mi sistema?', icon: 'monitor-heart', prompt: 'Aún no registré mi check-in de hoy. ¿Cómo debo calibrar y preparar mi sistema antes de avanzar?' });
    }
    if (checkIn && checkIn.stress >= 7) {
      ctx.push({ label: 'Bajar tensión ahora', icon: 'self-improvement', prompt: `Mi estrés está en ${checkIn.stress}/10. Dame un protocolo inmediato de regulación del sistema nervioso que pueda aplicar ahora mismo.` });
    } else if (checkIn && checkIn.energy <= 3) {
      ctx.push({ label: 'Recuperar energía', icon: 'bolt', prompt: `Mi energía está en ${checkIn.energy}/10. ¿Cuál es la acción de mínimo esfuerzo y máximo impacto para este estado hoy?` });
    }
    if (ctx.length < 2) {
      if (hour >= 5 && hour < 10) {
        ctx.push({ label: 'Apertura del día', icon: 'wb-sunny', prompt: 'Estoy iniciando mi día. Dame una intención específica y una acción mercader concreta para las próximas 3 horas.' });
      } else if (hour >= 20) {
        ctx.push({ label: 'Cierre del día', icon: 'nights-stay', prompt: 'Estoy cerrando el día. Ayúdame a revisar qué avancé, qué evité y cómo preparo el sistema para mañana.' });
      }
    }

    // Chips por módulo activo (siempre 2 relevantes al contenido actual)
    const byModule: Record<number, [Chip, Chip]> = {
      0: [{ label: '¿Qué cambia primero en mí?', icon: 'military-tech', prompt: '¿Qué es lo primero que debe cambiar en mi sistema interno para que el Método Polaris funcione?' },
          { label: 'Acción del Método hoy', icon: 'play-arrow', prompt: 'Estoy en el módulo inicial del Método Polaris. ¿Qué acción concreta me recomiendas ejecutar hoy?' }],
      1: [{ label: 'Mi creencia más limitante', icon: 'fitness-center', prompt: '¿Cuál es la creencia limitante que más me está frenando hoy? Ayúdame a identificarla y a reformularla.' },
          { label: 'Mi yo en 5 años', icon: 'search', prompt: '¿Qué me diría mi versión de 5 años adelante sobre las decisiones que estoy tomando hoy?' }],
      2: [{ label: '¿Qué emoción evito sentir?', icon: 'bolt', prompt: '¿Qué emoción estoy evitando sentir ahora mismo? Guíame a nombrarla y a procesarla desde el Método.' },
          { label: 'Escritura terapéutica', icon: 'edit', prompt: 'Guíame con una práctica de escritura terapéutica del Método Polaris para liberar lo que tengo acumulado.' }],
      3: [{ label: '¿Qué me enseña esta crisis?', icon: 'explore', prompt: '¿Qué está intentando enseñarme la situación difícil que enfrento ahora? ¿Cómo la veo desde el protocolo?' },
          { label: 'Aplicar C.A.D.A.V.R.A.', icon: 'hub', prompt: '¿Cómo aplico el marco C.A.D.A.V.R.A. a mi situación actual? Dame los pasos específicos.' }],
      4: [{ label: 'Entrar en Flow ahora', icon: 'water', prompt: '¿Cómo entro en estado de Flow en los próximos 30 minutos? Dame el protocolo de entrada específico para mi estado actual.' },
          { label: 'Coherencia cardíaca', icon: 'favorite', prompt: 'Guíame en un protocolo de coherencia cardíaca ahora mismo. Necesito regular mi sistema nervioso autónomo.' }],
      5: [{ label: 'Mis llaves de éxito', icon: 'vpn-key', prompt: '¿Cuál es la llave maestra que más necesito abrir en esta fase del protocolo para desbloquear mi siguiente nivel?' },
          { label: 'Mi relación con el dinero', icon: 'attach-money', prompt: '¿Mi relación actual con el dinero viene del miedo o del servicio? Ayúdame a identificar el patrón real.' }],
      6: [{ label: 'Planear mi semana', icon: 'calendar-today', prompt: 'Ayúdame a planear mi semana desde el modelo Polaris. ¿Cuáles son mis 3 prioridades de alto impacto?' },
          { label: 'Mis PERAS esta semana', icon: 'hourglass-empty', prompt: '¿Qué actividad de mi semana consume más tiempo sin impactar mis PERAS? Ayúdame a identificarla y eliminarla.' }],
      7: [{ label: 'Relación que necesito atender', icon: 'people', prompt: '¿Cuál relación clave en mi vida necesita mi atención ahora? ¿Qué acción concreta tomo esta semana?' },
          { label: 'Servir desde mis dones', icon: 'volunteer-activism', prompt: '¿Cómo sirvo mejor a mi equipo y entorno desde mis dones naturales? ¿Dónde estoy operando fuera de ellos?' }],
    };

    const modChips: Chip[] = (byModule[mo] ?? byModule[0]);

    // Siempre: analizar coherencia como chip de cierre
    const base: Chip[] = [
      { label: 'Analizar coherencia', icon: 'psychology', prompt: 'Analiza mi coherencia interna hoy. ¿Estoy actuando desde mis valores o desde el miedo? Dame un diagnóstico específico.' },
      { label: 'Recordar mi norte', icon: 'north', prompt: '¿Por qué empecé el protocolo? Recuérdame mi propósito y dame una perspectiva de largo plazo que me ancore hoy.' },
    ];

    return [...ctx, ...modChips, ...base].slice(0, 4);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayCheckIn, checkIn?.stress, checkIn?.energy, protocolDay, ACTIVE_MODULE.order]);

  const normanPanelLine = useMemo(() => {
    const first = state.profile.name.split(' ')[0] || state.profile.name;
    if (!todayCheckIn) return `Sin lectura de hoy, ${first}. ¿Cómo entra tu sistema al protocolo?`;
    if (checkIn && checkIn.stress >= 8) return `Tensión alta detectada. ¿Qué lo está generando — nómbralo.`;
    if (checkIn && checkIn.energy <= 3) return `Energía baja hoy. Cambiamos el protocolo: una acción de alto impacto.`;
    const hour = new Date().getHours();
    if (hour < 10) return `Es el momento de apertura. ¿Cuál es tu intención para las próximas 3 horas?`;
    if (hour >= 20) return `Es hora de cierre. ¿Qué avanzaste hoy y qué preparas para mañana?`;
    return `Día ${protocolDay} — ${ACTIVE_MODULE.title.split(':')[0]}. ¿En qué trabajamos?`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayCheckIn, checkIn?.stress, checkIn?.energy, protocolDay]);

  const normanQuickPanel = (
    <View style={styles.normanQP}>
      {/* Header */}
      <View style={styles.normanQPHeader}>
        <View style={styles.normanQPAvatar}>
          <MaterialIcons name="psychology" size={18} color={palette.gold} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.normanQPName}>NORMAN · MENTOR IA</Text>
          <Text style={styles.normanQPMeta}>Protocolo Soberano · Día {protocolDay}</Text>
        </View>
        <View style={styles.normanQPOnline} />
        <Pressable
          onPress={() => router.push('/(tabs)/mentor' as never)}
          style={({ pressed }) => [styles.normanQPOpen, pressed && { opacity: 0.75 }]}
          accessibilityLabel="Abrir mentor">
          <MaterialIcons name="open-in-new" size={13} color={palette.black} />
        </Pressable>
      </View>

      {/* Context line */}
      <Text style={styles.normanQPLine}>{normanPanelLine}</Text>

      {/* Chips — 2 × 2 */}
      <View style={styles.normanQPChips}>
        {normanChips.map((chip) => (
          <Pressable
            key={chip.label}
            style={({ pressed }) => [styles.normanChip, pressed && { opacity: 0.75 }]}
            onPress={() =>
              router.push({
                pathname: '/(tabs)/mentor',
                params: { initialPrompt: chip.prompt },
              } as never)
            }>
            <MaterialIcons name={chip.icon} size={12} color={palette.gold} />
            <Text style={styles.normanChipText} numberOfLines={2}>{chip.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Weekly dispatch — folded inline when available */}
      {weeklySession && (
        <View style={styles.normanWeeklySnippet}>
          <Text style={styles.normanWeeklyLabel}>DESPACHO · SEMANA {weeklySession.week_number}</Text>
          <Text style={styles.normanWeeklyText} numberOfLines={4}>{weeklySession.ai_message}</Text>
          <Pressable
            onPress={() => router.push('/(tabs)/mentor' as never)}
            style={({ pressed }) => [styles.normanWeeklyBtn, pressed && { opacity: 0.75 }]}>
            <Text style={styles.normanWeeklyBtnText}>RESPONDER A NORMAN</Text>
            <MaterialIcons name="arrow-forward" size={12} color={palette.gold} />
          </Pressable>
        </View>
      )}
    </View>
  );

  // ── Live Session Card ────────────────────────────────────────────────────────
  const liveSession = getNextSession(LIVE_SESSION);
  const liveSessionBlock = (
    <Pressable
      style={({ pressed }) => [
        styles.liveCard,
        liveSession.isOngoing && styles.liveCardOngoing,
        pressed && { opacity: 0.9 },
      ]}
      onPress={() => {
        if (typeof window !== 'undefined') {
          window.open(LIVE_SESSION.joinUrl, '_blank');
        } else {
          const Linking = require('expo-linking');
          Linking.openURL(LIVE_SESSION.joinUrl);
        }
      }}
      accessibilityLabel="Unirse a la sesión en vivo">
      {/* Live indicator */}
      <View style={styles.liveTopRow}>
        <View style={[styles.liveDotWrap, liveSession.isOngoing && styles.liveDotOngoing]}>
          <View style={[styles.liveDot, liveSession.isOngoing && styles.liveDotActive]} />
          <Text style={[styles.liveLabel, liveSession.isOngoing && styles.liveLabelActive]}>
            {liveSession.isOngoing ? 'EN VIVO AHORA' : 'PRÓXIMA SESIÓN'}
          </Text>
        </View>
        <MaterialIcons
          name={liveSession.isOngoing ? 'videocam' : 'event'}
          size={16}
          color={liveSession.isOngoing ? palette.danger : palette.gold}
        />
      </View>

      {/* Session info */}
      <Text style={styles.liveTitle}>{LIVE_SESSION.title}</Text>
      <Text style={styles.liveSub}>{LIVE_SESSION.subtitle}</Text>

      {/* Countdown */}
      <View style={styles.liveCountdownRow}>
        {liveSession.isOngoing ? (
          <Text style={styles.liveCountdownOngoing}>Sesión en curso · ÚNETE AHORA</Text>
        ) : (
          <>
            <MaterialIcons name="schedule" size={13} color={palette.smoke} />
            <Text style={styles.liveCountdown}>
              {formatSessionDate(liveSession.date, liveSession.isToday, liveSession.daysUntil)}
              {' · '}{LIVE_SESSION.time} COT
              {liveSession.daysUntil === 0 && liveSession.minutesUntil > 0
                ? `  · en ${liveSession.minutesUntil < 60
                    ? `${liveSession.minutesUntil} min`
                    : `${Math.floor(liveSession.minutesUntil / 60)}h ${liveSession.minutesUntil % 60}m`}`
                : ''}
            </Text>
          </>
        )}
      </View>

      {/* Join CTA */}
      <View style={[styles.liveBtn, liveSession.isOngoing && styles.liveBtnOngoing]}>
        <MaterialIcons
          name={liveSession.isOngoing ? 'videocam' : 'open-in-new'}
          size={15}
          color={liveSession.isOngoing ? '#fff' : palette.black}
        />
        <Text style={[styles.liveBtnText, liveSession.isOngoing && styles.liveBtnTextOngoing]}>
          {liveSession.isOngoing ? 'UNIRME A LA SESIÓN' : `AGENDAR · ${LIVE_SESSION.durationMinutes} MIN`}
        </Text>
      </View>
    </Pressable>
  );

  // ── Community Teaser ─────────────────────────────────────────────────────────
  const communityBlock = (
    <Pressable
      style={({ pressed }) => [styles.communityCard, pressed && { opacity: 0.85 }]}
      onPress={() => router.push('/bienestar/comunidad' as never)}
      accessibilityLabel="Ver comunidad de Operadores Soberanos">
      <View style={styles.communityHeader}>
        <View style={styles.communityIconBox}>
          <MaterialIcons name="groups" size={22} color={palette.gold} />
        </View>
        <View style={styles.communityCopy}>
          <Text style={styles.communityTitle}>OPERADORES SOBERANOS</Text>
          <Text style={styles.communitySub}>Comunidad del Protocolo</Text>
        </View>
        <MaterialIcons name="chevron-right" size={18} color={palette.smoke} />
      </View>
      <Text style={styles.communityBody}>
        Comparte insights, celebra victorias y mantén la accountability con otros en el protocolo.
      </Text>
    </Pressable>
  );

  return (
    <ScrollView
      style={sc.root}
      contentContainerStyle={
        isDesktop
          ? styles.contentDesktop
          : [sc.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]
      }
      showsVerticalScrollIndicator={false}
      bounces
      overScrollMode="never"
      keyboardShouldPersistTaps="handled">

      <AppHeader title="POLARIS" />

      {isDesktop ? (
        /* ══════════════════════════════════════════════════════════
           DESKTOP LAYOUT — full-width, dos columnas en la parte inferior
           ══════════════════════════════════════════════════════════ */
        <>
          {/* Fila superior: Hero + Engagement */}
          {northAnchorStrip}
          <View style={styles.desktopTopRow}>
            <View style={styles.desktopHeroCol}>{heroBlock}</View>
            <View style={styles.desktopSideCol}>
              {anomalyBlock}
              {nbaBlock}
              {engagementBlock}
              <ProgressCard
                label={protocolDay >= 60 ? 'ARC DE TRANSFORMACIÓN · FASE FINAL' : protocolDay >= 30 ? 'ARC DE TRANSFORMACIÓN · PROFUNDIDAD' : 'ARC DE TRANSFORMACIÓN · BASE'}
                value={`${progress}% · Día ${protocolDay} de 90`}
                progress={progress}
              />
            </View>
          </View>

          {/* KPI strip — 4 columnas */}
          {metricsRow}

          {/* Cuerpo principal — dos columnas */}
          <View style={styles.desktopBody}>
            <View style={styles.desktopLeft}>
              <GoldDivider label="ESTADO DEL DÍA" />
              {estadoBlock}
              <GoldDivider label="BIENESTAR" />
              {wellnessBlock}
            </View>
            <View style={styles.desktopRight}>
              <GoldDivider label="NORMAN · MENTOR IA" />
              {normanQuickPanel}
              <GoldDivider label="HOY EN TU PROTOCOLO" />
              {protocolBlock}
              <GoldDivider label="SESIÓN EN VIVO" />
              {liveSessionBlock}
              <GoldDivider label="COMUNIDAD" />
              {communityBlock}
              <GoldDivider label="MI NORTE" />
              <PremiumCard style={styles.northCard}>
                <Text style={styles.northTitle}>{state.northStar.purpose || 'Define tu norte'}</Text>
                <Text style={styles.northBody}>
                  {state.northStar.dailyReminder || 'Agrega tu recordatorio diario en Mi Norte.'}
                </Text>
                <PrimaryButton
                  label="EDITAR NORTE"
                  icon="explore"
                  onPress={() => router.push('/(tabs)/norte')}
                />
              </PremiumCard>
            </View>
          </View>
        </>
      ) : (
        /* ══════════════════════════════════════════════════════════
           MOBILE LAYOUT — columna única
           ══════════════════════════════════════════════════════════ */
        <>
          {heroBlock}
          {northAnchorStrip}
          {anomalyBlock}
          {nbaBlock}
          <GoldDivider label="NORMAN · MENTOR IA" />
          {normanQuickPanel}
          {engagementBlock}
          <ProgressCard
            label={protocolDay >= 60 ? 'ARC DE TRANSFORMACIÓN · FASE FINAL' : protocolDay >= 30 ? 'ARC DE TRANSFORMACIÓN · PROFUNDIDAD' : 'ARC DE TRANSFORMACIÓN · BASE'}
            value={`${progress}% · Día ${protocolDay} de 90`}
            progress={progress}
          />
          {metricsRow}
          <GoldDivider label="ESTADO DEL DÍA" />
          {estadoBlock}
          <GoldDivider label="HOY EN TU PROTOCOLO" />
          {protocolBlock}
          <GoldDivider label="BIENESTAR" />
          {wellnessBlock}
          <GoldDivider label="SESIÓN EN VIVO" />
          {liveSessionBlock}
          <GoldDivider label="COMUNIDAD" />
          {communityBlock}
          <GoldDivider label="MI NORTE" />
          <PremiumCard style={styles.northCard}>
            <Text style={styles.northTitle}>{state.northStar.purpose || 'Define tu norte'}</Text>
            <Text style={styles.northBody}>
              {state.northStar.dailyReminder || 'Agrega tu recordatorio diario en Mi Norte.'}
            </Text>
            <PrimaryButton
              label="EDITAR NORTE"
              icon="explore"
              onPress={() => router.push('/(tabs)/norte')}
            />
          </PremiumCard>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // ── Desktop content container ──────────────────────────────────────────────
  contentDesktop: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 1200,
    paddingHorizontal: 40,
    paddingTop: 32,
    paddingBottom: 60,
    gap: 24,
  },
  // Desktop top row: hero (60%) + side panel (40%)
  desktopTopRow: {
    flexDirection: 'row',
    gap: 24,
    alignItems: 'flex-start',
  },
  desktopHeroCol: {
    flex: 3,
  },
  desktopSideCol: {
    flex: 2,
    gap: 16,
  },
  // Metric grid: 4 cols on desktop
  gridDesktop: {
    flexWrap: 'nowrap',
  },
  metricCardDesktop: {
    flex: 1,
    width: undefined,
    minHeight: 120,
  },
  // Two-column body
  desktopBody: {
    flexDirection: 'row',
    gap: 24,
    alignItems: 'flex-start',
  },
  desktopLeft: {
    flex: 3,
    gap: 16,
  },
  desktopRight: {
    flex: 2,
    gap: 16,
  },

  // ── Norman Quick Panel ──────────────────────────────────────────────────────
  normanQP: {
    backgroundColor: palette.charcoal,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radii.md,
    borderLeftWidth: 3,
    borderLeftColor: palette.gold,
    padding: spacing.lg,
    gap: spacing.md,
  },
  normanQPHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  normanQPAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(200,160,80,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  normanQPName: {
    fontFamily: Fonts.display,
    fontWeight: '700',
    color: palette.ivory,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
    lineHeight: 15,
  },
  normanQPMeta: {
    ...typography.mono,
    color: palette.smoke,
    fontSize: 11,
    marginTop: 1,
  },
  normanQPOnline: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: palette.success,
  },
  normanQPOpen: {
    backgroundColor: palette.gold,
    borderRadius: radii.sm,
    padding: 6,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  normanQPLine: {
    ...typography.body,
    color: palette.ash,
    fontSize: 13,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  normanQPChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  normanChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radii.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    width: '48%',
    minHeight: 44,
  },
  normanChipText: {
    ...typography.label,
    color: palette.ash,
    fontSize: 11,
    flex: 1,
    lineHeight: 16,
  },

  // ── North anchor strip ───────────────────────────────────────────────────
  northAnchor: {
    alignItems: 'center',
    backgroundColor: 'rgba(179,141,60,0.07)',
    borderColor: 'rgba(179,141,60,0.25)',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 44,
  },
  northAnchorText: {
    color: palette.gold,
    flex: 1,
    fontFamily: Fonts.sans,
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 18,
  },

  // Wearable CTA
  wearableCta: {
    alignItems: 'center',
    borderColor: palette.gold + '33',
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: 'rgba(201,160,0,0.05)',
    minHeight: 52,
  },
  wearableCtaCopy: {
    flex: 1,
    gap: 2,
  },
  wearableCtaTitle: {
    fontFamily: Fonts.display,
    fontWeight: '700',
    color: palette.gold,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
    lineHeight: 15,
  },
  wearableCtaSub: {
    ...typography.mono,
    color: palette.ash,
    fontSize: 11,
  },

  // ── Shared ────────────────────────────────────────────────────────────────
  time: {
    color: palette.gold,
    fontFamily: Fonts.mono,
    fontSize: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  stack: {
    gap: spacing.md,
  },
  sectionTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  meterCard: {
    gap: spacing.lg,
  },
  protocolCard: {
    gap: spacing.lg,
  },
  protocolTitle: {
    ...typography.title,
    color: palette.ivory,
  },
  protocolBody: {
    ...typography.body,
    color: palette.ash,
  },
  wellnessCard: {
    gap: spacing.lg,
    marginBottom: 0,
  },
  wellnessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  wellnessIconBox: {
    width: 56,
    height: 56,
    borderRadius: radii.sm,
    backgroundColor: palette.purpleMuted,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  wellnessBody: {
    flex: 1,
    gap: 3,
  },
  wellnessTitle: {
    fontFamily: Fonts.display,
    fontWeight: '700',
    color: palette.ivory,
    fontSize: 13,
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
    lineHeight: 18,
  },
  wellnessSub: {
    ...typography.body,
    color: palette.ash,
    fontSize: 12,
  },
  wellnessStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.purpleGlow,
    borderRadius: radii.sm,
    paddingVertical: spacing.md,
  },
  wellnessStat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  wellnessStatNum: {
    fontFamily: Fonts.display,
    color: palette.purple,
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 26,
  },
  wellnessStatLabel: {
    ...typography.label,
    color: palette.smoke,
    fontSize: 11,
    letterSpacing: 1,
  },
  wellnessStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: palette.purpleDim,
  },
  northCard: {
    gap: spacing.lg,
  },
  northTitle: {
    color: palette.ivory,
    fontFamily: Fonts.display,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.8,
    lineHeight: 26,
    textTransform: 'uppercase',
  },
  northBody: {
    ...typography.body,
    color: palette.ash,
    fontStyle: 'italic',
  },

  // ── Anomaly alert card ──────────────────────────────────────────────────────
  anomalyCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 200, 4, 0.07)',
    borderColor: palette.gold,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  anomalyTextBlock: {
    flex: 1,
    gap: 2,
  },
  anomalyTitle: {
    fontFamily: Fonts.display,
    fontWeight: '700',
    color: palette.gold,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
    lineHeight: 15,
  },
  anomalyBody: {
    ...typography.body,
    color: palette.ash,
    fontSize: 13,
    lineHeight: 19,
  },

  // ── Next best action card ───────────────────────────────────────────────────
  nbaCard: {
    alignItems: 'center',
    backgroundColor: palette.charcoal,
    borderColor: palette.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  nbaBadge: {
    alignItems: 'center',
    backgroundColor: palette.gold,
    borderRadius: radii.sm,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  nbaTextBlock: {
    flex: 1,
    gap: 2,
  },
  nbaLabel: {
    ...typography.label,
    color: palette.smoke,
    fontSize: 11,
    letterSpacing: 1.5,
  },
  nbaAction: {
    fontFamily: Fonts.display,
    fontWeight: '700',
    color: palette.ivory,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
    lineHeight: 16,
  },
  nbaReason: {
    ...typography.body,
    color: palette.ash,
    fontSize: 11,
  },

  // ── Engagement bar ──────────────────────────────────────────────────────────
  engagementRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    paddingHorizontal: 4,
  },
  engagementLabel: {
    ...typography.label,
    color: palette.smoke,
    fontSize: 11,
    letterSpacing: 1.5,
    width: 84,
  },
  engagementBar: {
    backgroundColor: palette.gold,
    borderRadius: 2,
    flex: 1,
    height: 4,
    maxWidth: '60%',
    opacity: 0.6,
  },
  engagementScore: {
    ...typography.mono,
    color: palette.ash,
    fontSize: 11,
    width: 52,
    textAlign: 'right',
  },

  // ── Live Session Card ───────────────────────────────────────────────────────
  liveCard: {
    backgroundColor:  'rgba(10,10,10,0.85)',
    borderColor:      palette.gold + '55',
    borderRadius:     radii.md,
    borderWidth:      1.5,
    gap:              spacing.md,
    padding:          spacing.lg,
  },
  liveCardOngoing: {
    borderColor: palette.danger,
    borderWidth: 2,
  },
  liveTopRow: {
    alignItems:    'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  liveDotWrap: {
    alignItems:   'center',
    flexDirection: 'row',
    gap:           spacing.xs,
  },
  liveDotOngoing: {},
  liveDot: {
    backgroundColor: palette.gold,
    borderRadius:    4,
    height:          6,
    width:           6,
  },
  liveDotActive: {
    backgroundColor: palette.danger,
  },
  liveLabel: {
    color:        palette.gold,
    fontFamily:   Fonts.mono,
    fontSize:     11,
    letterSpacing: 2,
  },
  liveLabelActive: {
    color: palette.danger,
  },
  liveTitle: {
    color:         palette.ivory,
    fontFamily:    Fonts.display,
    fontSize:      18,
    fontWeight:    '800',
    letterSpacing:  1,
    textTransform: 'uppercase',
  },
  liveSub: {
    ...typography.mono,
    color:   palette.smoke,
    fontSize: 11,
    marginTop: -spacing.xs,
  },
  liveCountdownRow: {
    alignItems:   'center',
    flexDirection: 'row',
    gap:           spacing.xs,
  },
  liveCountdown: {
    ...typography.body,
    color:    palette.ash,
    fontSize: 12,
    lineHeight: 18,
  },
  liveCountdownOngoing: {
    color:       palette.danger,
    fontFamily:  Fonts.mono,
    fontSize:    11,
    letterSpacing: 1.5,
  },
  liveBtn: {
    alignItems:      'center',
    backgroundColor: palette.gold,
    borderRadius:    radii.sm,
    flexDirection:   'row',
    gap:              spacing.sm,
    justifyContent:  'center',
    minHeight:        44,
    paddingVertical:  spacing.sm,
  },
  liveBtnOngoing: {
    backgroundColor: palette.danger,
  },
  liveBtnText: {
    color:        palette.black,
    fontFamily:   Fonts.mono,
    fontSize:     11,
    fontWeight:   '700',
    letterSpacing: 2,
  },
  liveBtnTextOngoing: {
    color: '#fff',
  },

  // ── Community Teaser Card ───────────────────────────────────────────────────
  communityCard: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderColor:     palette.lineSoft,
    borderRadius:    radii.md,
    borderWidth:     1,
    gap:             spacing.md,
    padding:         spacing.lg,
  },
  communityHeader: {
    alignItems:   'center',
    flexDirection: 'row',
    gap:           spacing.md,
  },
  communityIconBox: {
    alignItems:      'center',
    backgroundColor: 'rgba(179,141,60,0.10)',
    borderRadius:    radii.sm,
    height:          40,
    justifyContent:  'center',
    width:           40,
    flexShrink:      0,
  },
  communityCopy: {
    flex: 1,
    gap:  2,
  },
  communityTitle: {
    color:         palette.ivory,
    fontFamily:    Fonts.display,
    fontSize:      13,
    fontWeight:    '700',
    letterSpacing:  1.5,
  },
  communitySub: {
    ...typography.mono,
    color:   palette.smoke,
    fontSize: 11,
  },
  communityBody: {
    ...typography.body,
    color:    palette.ash,
    fontSize: 13,
    lineHeight: 20,
  },

  // ── Biometrics empty state ──────────────────────────────────────────────────
  estadoEmpty: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: palette.lineSoft,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  estadoEmptyTitle: {
    fontFamily: Fonts.display,
    fontWeight: '700',
    color: palette.smoke,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
    lineHeight: 15,
  },
  estadoEmptySub: {
    ...typography.body,
    color: palette.ash,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 2,
  },

  // ── Norman weekly dispatch (inline) ────────────────────────────────────────
  normanWeeklySnippet: {
    borderTopWidth: 1,
    borderTopColor: palette.lineSoft,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  normanWeeklyLabel: {
    ...typography.label,
    color: palette.gold,
    fontSize: 11,
    letterSpacing: 2,
  },
  normanWeeklyText: {
    ...typography.body,
    color: palette.ash,
    fontSize: 13,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  normanWeeklyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    minHeight: 44,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  normanWeeklyBtnText: {
    fontFamily: Fonts.display,
    fontWeight: '700',
    color: palette.gold,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
    lineHeight: 15,
  },
});
