import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
} from '@/components/polaris';
import { ACTIVE_MODULE } from '@/data/modules';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { useUserIntelligence } from '@/hooks/useUserIntelligence';
import { useWellnessStore } from '@/store/wellnessStore';

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'BUENOS DIAS';
  if (hour < 18) return 'BUENAS TARDES';
  return 'BUENAS NOCHES';
}

export default function DashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, protocolDay, todayCheckIn, latestCheckIn, userId } = useLifeFlow();
  const { user: wellnessUser } = useWellnessStore();
  const { intelligence, engagementTier } = useUserIntelligence(userId);
  const progress = Math.min(Math.round((protocolDay / 90) * 100), 100);
  const checkIn = todayCheckIn ?? latestCheckIn;

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

  return (
    <ScrollView
      style={screen.root}
      contentContainerStyle={[screen.content, { paddingTop: insets.top + 16 }]}
      showsVerticalScrollIndicator={false}
      bounces
      overScrollMode="never"
      keyboardShouldPersistTaps="handled">
      <AppHeader title="LIFEFLOW" />

      {/* ── Editorial Hero ── */}
      <EditorialPanel
        eyebrow={`DIA ${protocolDay} · PROTOCOLO SOBERANO`}
        title={`${greeting()},\n${state.profile.name}.`}
        body={
          intelligenceGreeting ??
          (todayCheckIn
            ? 'Check-in registrado. Ahora convierte tu estado en ejecucion medible.'
            : 'Tu sala de mando espera lectura interna para calibrar el dia.')
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

      {/* ── Anomaly Alert (only when detected) ── */}
      {intelligence.anomaly_detected && intelligence.anomaly_type && (
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
      )}

      {/* ── Next Best Action (from ML engine) ── */}
      {nextActionConfig && intelligence.next_action_urgency !== 'low' && (
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
      )}

      {/* ── Engagement Score (subtle pill in metric grid header) ── */}
      {intelligence.engagement_score > 0 && (
        <View style={styles.engagementRow}>
          <Text style={styles.engagementLabel}>ENGAGEMENT</Text>
          <View style={[
            styles.engagementBar,
            { width: `${intelligence.engagement_score}%` as unknown as number },
          ]} />
          <Text style={styles.engagementScore}>{intelligence.engagement_score}/100</Text>
        </View>
      )}

      {/* ── Protocol Progress ── */}
      <ProgressCard
        label="Progreso del protocolo"
        value={`${progress}% · ${protocolDay}/90`}
        progress={progress}
      />

      {/* ── Metric Grid ── */}
      <View style={styles.grid}>
        <MetricCard
          label="Racha"
          value={`${Math.max(state.checkIns.length, protocolDay)}`}
          meta="dias de protocolo"
          icon="local-fire-department"
        />
        <MetricCard
          label="Check-ins"
          value={`${state.checkIns.length}`}
          meta={todayCheckIn ? 'hoy completo' : 'pendiente hoy'}
          icon="fact-check"
        />
        <MetricCard
          label="Modulo"
          value={`0${ACTIVE_MODULE.order}`}
          meta={ACTIVE_MODULE.title.split(' ')[0].toLowerCase()}
          icon="view-module"
        />
        <MetricCard
          label="Coherencia"
          value={
            checkIn
              ? `${Math.round((checkIn.energy + checkIn.clarity + checkIn.sleep + (11 - checkIn.stress)) / 4)}/10`
              : '--'
          }
          meta="estado del dia"
          icon="verified-user"
        />
      </View>

      {/* ── Estado del dia ── */}
      <GoldDivider label="ESTADO DEL DIA" />
      <View style={styles.stack}>
        <View style={styles.sectionTopRow}>
          <Text style={screen.sectionTitle}>Biometria</Text>
          <StatusPill
            label={todayCheckIn ? 'ACTUALIZADO' : 'SIN LECTURA'}
            tone={todayCheckIn ? 'gold' : 'muted'}
          />
        </View>
        <PremiumCard style={styles.meterCard}>
          <StateMeter label="Energia" value={checkIn?.energy ?? 0} />
          <StateMeter label="Enfoque / claridad" value={checkIn?.clarity ?? 0} />
          <StateMeter label="Estres" value={checkIn?.stress ?? 0} inverted />
        </PremiumCard>
      </View>

      {/* ── Protocolo del dia ── */}
      <GoldDivider label="HOY EN TU PROTOCOLO" />
      <PremiumCard style={styles.protocolCard}>
        <StatusPill label={`MODULO ${ACTIVE_MODULE.order} · ACTIVO`} />
        <Text style={styles.protocolTitle}>{ACTIVE_MODULE.title}</Text>
        <Text style={styles.protocolBody}>
          Proxima accion: completa la leccion activa y ejecuta un bloque mercader de 90 minutos
          sin mensajeria.
        </Text>
        <PrimaryButton
          label="CONTINUAR LECCION"
          icon="play-arrow"
          onPress={() =>
            router.push({ pathname: '/module/[id]', params: { id: ACTIVE_MODULE.id } })
          }
        />
      </PremiumCard>

      {/* ── Bienestar ── */}
      <GoldDivider label="BIENESTAR" />
      <PremiumCard style={styles.wellnessCard}>
        <View style={styles.wellnessRow}>
          <View style={styles.wellnessIconBox}>
            <MaterialIcons name="spa" size={28} color="#7c5cbf" />
          </View>
          <View style={styles.wellnessBody}>
            <Text style={styles.wellnessTitle}>MÓDULO BIENESTAR</Text>
            <Text style={styles.wellnessSub}>Meditación · Respiración · Binaurales</Text>
          </View>
        </View>
        <View style={styles.wellnessStats}>
          <View style={styles.wellnessStat}>
            <Text style={styles.wellnessStatNum}>{totalWellnessSessions}</Text>
            <Text style={styles.wellnessStatLabel}>SESIONES</Text>
          </View>
          <View style={styles.wellnessStatDivider} />
          <View style={styles.wellnessStat}>
            <Text style={styles.wellnessStatNum}>{totalWellnessMinutes}</Text>
            <Text style={styles.wellnessStatLabel}>MINUTOS</Text>
          </View>
          <View style={styles.wellnessStatDivider} />
          <View style={styles.wellnessStat}>
            <Text style={styles.wellnessStatNum}>{wellnessStreak}</Text>
            <Text style={styles.wellnessStatLabel}>DÍAS/SEM</Text>
          </View>
        </View>
        <PrimaryButton
          label="ABRIR BIENESTAR"
          icon="spa"
          onPress={() => router.push('/bienestar' as never)}
        />
      </PremiumCard>

      {/* ── Mi Norte ── */}
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: '#7c5cbf22',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  wellnessBody: {
    flex: 1,
    gap: 3,
  },
  wellnessTitle: {
    ...typography.section,
    color: palette.ivory,
    fontSize: 13,
    letterSpacing: 2,
  },
  wellnessSub: {
    ...typography.body,
    color: palette.ash,
    fontSize: 12,
  },
  wellnessStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7c5cbf11',
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
    color: '#b09cdb',
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 26,
  },
  wellnessStatLabel: {
    ...typography.label,
    color: palette.smoke,
    fontSize: 7,
    letterSpacing: 1,
  },
  wellnessStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#7c5cbf44',
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
    ...typography.label,
    color: palette.gold,
    fontSize: 9,
    letterSpacing: 2,
  },
  anomalyBody: {
    ...typography.body,
    color: palette.ash,
    fontSize: 12,
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
    fontSize: 8,
    letterSpacing: 1.5,
  },
  nbaAction: {
    ...typography.section,
    color: palette.ivory,
    fontSize: 11,
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
    fontSize: 7,
    letterSpacing: 1.5,
    width: 80,
  },
  engagementBar: {
    backgroundColor: palette.gold,
    borderRadius: 2,
    flex: 1,
    height: 3,
    maxWidth: '60%',
    opacity: 0.6,
  },
  engagementScore: {
    ...typography.mono,
    color: palette.ash,
    fontSize: 10,
    width: 48,
    textAlign: 'right',
  },
});
