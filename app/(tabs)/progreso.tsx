import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Share, StyleSheet, Switch, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AchievementBadge,
  AppHeader,
  DangerButton,
  GoldDivider,
  MetricCard,
  PremiumCard,
  PremiumInput,
  PrimaryButton,
  ProgressCard,
  SecondaryButton,
  SovereignScore,
  StatusPill,
  WeeklySparkline,
  screen,
  useScreen,
} from '@/components/polaris';
import { ACTIVE_MODULE, POLARIS_MODULES } from '@/data/modules';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { useSubscription } from '@/hooks/useSubscription';
import { useUserIntelligence } from '@/hooks/useUserIntelligence';
import { intel } from '@/lib/supabase';
import { useWellnessStore } from '@/store/wellnessStore';
import { calcSovereignScore } from '@/lib/utils';
import {
  requestNotificationPermissions,
  scheduleCheckinReminder,
  cancelReminders,
} from '@/services/notifications';
import type { NorthStar } from '@/types/lifeflow';

// ─── Streak Calendar Component (42-day heatmap) ────────────────────────────

/**
 * Visual 42-day (6-week) heatmap grid.
 * Gold cell = check-in done that day.
 * Today has a gold ring indicator.
 * Future days are fully hidden (opacity 0 — they exist for grid alignment only).
 */
function StreakCalendar({ checkIns }: { checkIns: Array<{ date: string }> }) {
  const { days, checkinCount, checkinPct } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().slice(0, 10);

    // Align to Monday start of the current week
    const dow = today.getDay(); // 0=Sun, 1=Mon ...
    const daysFromMon = (dow + 6) % 7; // Mon=0 ... Sun=6
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - daysFromMon);

    // Go back 5 more weeks from the Monday of this week
    const start = new Date(startOfWeek);
    start.setDate(start.getDate() - 35);

    const checkinSet = new Set(checkIns.map((c) => c.date.slice(0, 10)));

    // Count check-ins in the last 30 calendar days (backwards from today)
    let cnt30 = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      if (checkinSet.has(d.toISOString().slice(0, 10))) cnt30++;
    }

    const gridDays: {
      dateStr: string;
      hasCheckin: boolean;
      isToday: boolean;
      isFuture: boolean;
    }[] = [];

    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      gridDays.push({
        dateStr,
        hasCheckin: checkinSet.has(dateStr),
        isToday: dateStr === todayStr,
        isFuture: d > today,
      });
    }

    return {
      days: gridDays,
      checkinCount: cnt30,
      checkinPct: Math.round((cnt30 / 30) * 100),
    };
  }, [checkIns]);

  const weeks: (typeof days)[] = [];
  for (let i = 0; i < 6; i++) {
    weeks.push(days.slice(i * 7, (i + 1) * 7));
  }

  return (
    <View style={calStyles.wrap}>
      {/* Header row */}
      <View style={calStyles.header}>
        <Text style={calStyles.title}>RACHA · ÚLTIMOS 42 DÍAS</Text>
        <View style={calStyles.statRow}>
          <Text style={calStyles.statNum}>{checkinCount}</Text>
          <Text style={calStyles.statLabel}>/ 30 días  ·  {checkinPct}%</Text>
        </View>
      </View>

      {/* Day-of-week labels: Mon … Sun */}
      <View style={calStyles.labelRow}>
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => (
          <Text key={d} style={calStyles.dayLabel}>{d}</Text>
        ))}
      </View>

      {/* 6-week grid */}
      {weeks.map((week, wi) => (
        <View key={wi} style={calStyles.weekRow}>
          {week.map((day) => (
            <View
              key={day.dateStr}
              style={[
                calStyles.cell,
                day.hasCheckin && calStyles.cellActive,
                day.isToday && !day.hasCheckin && calStyles.cellToday,
                day.isFuture && calStyles.cellFuture,
              ]}
            />
          ))}
        </View>
      ))}

      {/* Legend */}
      <View style={calStyles.legend}>
        <View style={[calStyles.legendDot, { backgroundColor: palette.charcoal }]} />
        <Text style={calStyles.legendText}>Sin check-in</Text>
        <View style={[calStyles.legendDot, { backgroundColor: palette.gold }]} />
        <Text style={calStyles.legendText}>Check-in</Text>
      </View>
    </View>
  );
}

const calStyles = StyleSheet.create({
  wrap: {
    backgroundColor: 'rgba(10,10,10,0.6)',
    borderColor:     palette.lineSoft,
    borderRadius:    radii.md,
    borderWidth:     1,
    gap:             spacing.sm,
    padding:         spacing.lg,
  },
  header: {
    alignItems:     'center',
    flexDirection:  'row',
    justifyContent: 'space-between',
    marginBottom:    spacing.xs,
  },
  title: {
    color:        palette.gold,
    fontFamily:   Fonts.mono,
    fontSize:     9,
    letterSpacing: 2,
  },
  statRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  statNum: {
    color:       palette.ivory,
    fontFamily:  Fonts.display,
    fontSize:    18,
    fontWeight:  '800',
    lineHeight:  22,
  },
  statLabel: {
    color:      palette.ash,
    fontFamily: Fonts.mono,
    fontSize:   10,
  },
  labelRow: {
    flexDirection: 'row',
    gap:           4,
    marginBottom:  2,
  },
  dayLabel: {
    color:     palette.smoke,
    flex:      1,
    fontFamily: Fonts.mono,
    fontSize:   8,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  weekRow: {
    flexDirection: 'row',
    gap:           4,
  },
  cell: {
    backgroundColor: palette.charcoal,
    borderRadius:    3,
    flex:            1,
    aspectRatio:     1,
    opacity:         0.5,
  },
  cellActive: {
    backgroundColor: palette.gold,
    opacity:         1,
  },
  cellToday: {
    borderColor: palette.gold,
    borderWidth: 1.5,
    opacity:     0.9,
  },
  cellFuture: {
    opacity: 0.15,
  },
  legend: {
    alignItems:    'center',
    flexDirection: 'row',
    gap:            spacing.sm,
    marginTop:      spacing.xs,
  },
  legendDot: {
    borderRadius: 2,
    height:       8,
    width:        8,
  },
  legendText: {
    color:       palette.smoke,
    fontFamily:  Fonts.mono,
    fontSize:    9,
    letterSpacing: 0.5,
    marginRight:  spacing.sm,
  },
});

export default function ProgresoScreen() {
  const sc = useScreen();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    state, protocolDay, averages,
    updateProfile, updateNorthStar,
    resetOnboarding, clearData, signOut,
    deleteAccount, exportData,
    userId,
  } = useLifeFlow();

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  const { intelligence, topAffinity, engagementTier } = useUserIntelligence(userId);
  const subscription = useSubscription();

  // ── Admin flag (read from profiles.is_admin — never hardcoded) ──────────────
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    if (!userId) return;
    intel.profiles()
      .select('is_admin')
      .eq('id', userId)
      .single()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(({ data }: { data: any }) => { if (data?.is_admin === true) setIsAdmin(true); });
  }, [userId]);

  // ML Consent toggle
  const [mlConsent, setMlConsent] = useState(state.profile.mlConsent !== false);

  const handleMlConsentToggle = async (value: boolean) => {
    setMlConsent(value);
    await updateProfile({ ...state.profile, mlConsent: value });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const wellnessTier = useWellnessStore((s) => s.user.subscriptionTier);

  /** Subscription badge derived from Supabase Realtime-synced state */
  const subTier   = subscription.tier;
  const subColor  = subscription.tierInfo.color;
  const subLabel  = subscription.tierInfo.name.toUpperCase();
  const subIcon: React.ComponentProps<typeof MaterialIcons>['name'] =
    subTier === 'growthplayers' ? 'groups'
    : subTier === 'polaris'       ? 'explore'
    : subTier === 'premium_plus'  ? 'diamond'
    : subTier === 'premium'       ? 'workspace-premium'
    : 'lock-open';

  const [deleting, setDeleting]   = useState(false);
  const [exporting, setExporting] = useState(false);
  const [name, setName] = useState(state.profile.name);
  const [role, setRole] = useState(state.profile.role);
  const [north, setNorth] = useState<NorthStar>(state.northStar);
  const [notificationsOn, setNotificationsOn] = useState(false);
  const [savingNorth, setSavingNorth] = useState(false);

  // Check if notifications are already scheduled
  useEffect(() => {
    if (Platform.OS === 'web') return;
    import('expo-notifications').then((N) =>
      N.getAllScheduledNotificationsAsync().then((list) =>
        setNotificationsOn(list.length > 0),
      ),
    );
  }, []);

  const protocolProgress = Math.min(Math.round((protocolDay / 90) * 100), 100);

  // Wellness session counts for score
  const wellnessSessions = state.wellnessSessions ?? [];
  const wellnessMeditation = wellnessSessions.filter((s) => s.type === 'meditation').length;
  const wellnessBreathing  = wellnessSessions.filter((s) => s.type === 'breathing').length;
  const wellnessBinaural   = wellnessSessions.filter((s) => s.type === 'binaural').length;

  // Wellness stats
  const totalWellnessMinutes = Math.round(
    wellnessSessions.reduce((acc, s) => acc + ((s.durationSeconds ?? 0) / 60), 0)
  );

  const wellnessStreak = useMemo(() => {
    if (!wellnessSessions.length) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let streak = 0;
    const day = new Date(today);
    while (streak < 365) {
      const dayStr = day.toISOString().slice(0, 10);
      const hasSession = wellnessSessions.some((s) => s.completedAt?.startsWith(dayStr));
      if (!hasSession) break;
      streak++;
      day.setDate(day.getDate() - 1);
    }
    return streak;
  }, [wellnessSessions]);

  // Sovereign Score v2 — includes wellness bonus
  const score = calcSovereignScore({
    energy:            averages.energy ?? 0,
    clarity:           averages.clarity ?? 0,
    stress:            averages.stress ?? 5,
    sleep:             averages.sleep ?? 0,
    streak:            state.checkIns.length,
    completedLessons:  (state.completedLessons ?? []).length,
    completedTasks:    Object.keys(state.completedTasks ?? {}).length,
    wellnessMeditation,
    wellnessBreathing,
    wellnessBinaural,
  });

  // Last 7 check-ins for sparklines
  const last7 = state.checkIns.slice(-7);
  const energyValues = last7.length ? last7.map((c) => c.energy) : [0, 0, 0, 0, 0, 0, 0];
  const clarityValues = last7.length ? last7.map((c) => c.clarity) : [0, 0, 0, 0, 0, 0, 0];

  // Achievements
  const achievements = [
    { icon: 'local-fire-department' as const, label: 'RACHA\n7D', earned: protocolDay >= 7 },
    { icon: 'verified' as const, label: 'PRIMER\nMES', earned: protocolDay >= 30 },
    { icon: 'bolt' as const, label: 'ENERGIA\n8+', earned: (averages.energy ?? 0) >= 8 },
    { icon: 'stars' as const, label: 'SCORE\n600', earned: score >= 600 },
    { icon: 'fact-check' as const, label: '10 CHECK\nINS', earned: state.checkIns.length >= 10 },
    { icon: 'emoji-events' as const, label: 'ELITE\n800', earned: score >= 800 },
    { icon: 'psychology' as const, label: 'CLARIDAD\n8+', earned: (averages.clarity ?? 0) >= 8 },
    { icon: 'workspace-premium' as const, label: 'SOBERANO\n90D', earned: protocolDay >= 90 },
  ];

  // Archetype badges — earned by completing all lessons in a module with an arquetipo
  const archetypes = useMemo(() => {
    const completed = state.completedLessons ?? [];
    return POLARIS_MODULES
      .filter((m) => m.arquetipo)
      .map((m) => {
        const totalLessons = m.lessons.length;
        const completedCount = m.lessons.filter((l) => completed.includes(l.id)).length;
        const earned = totalLessons > 0 && completedCount >= totalLessons;
        return {
          id: m.id,
          name: (m.arquetipo ?? '').toUpperCase(),
          order: m.order,
          earned,
          completedCount,
          totalLessons,
        };
      });
  }, [state.completedLessons]);

  // Transformation narrative
  const narrativeBlock = useMemo(() => {
    const completedLessonCount = (state.completedLessons ?? []).length;
    const taskCount = Object.keys(state.completedTasks ?? {}).length;
    const avgEnergy = Math.round(averages.energy ?? 0);

    const lines: string[] = [];

    if (protocolDay <= 3) {
      lines.push(`Llevas ${protocolDay} día${protocolDay === 1 ? '' : 's'} en el protocolo. Esto acaba de comenzar — la mayoría abandona en los primeros 7 días. Tú no eres la mayoría.`);
    } else if (protocolDay <= 7) {
      lines.push(`${protocolDay} días. Estás cruzando la primera zona de filtro. Cada check-in es una declaración de quién eres — no de lo que sientes.`);
    } else if (protocolDay <= 14) {
      lines.push(`Día ${protocolDay}. Superaste el punto donde la mayoría desaparece. El hábito ya está grabándose en tu sistema nervioso.`);
    } else if (protocolDay <= 30) {
      lines.push(`${protocolDay} días. La neurociencia dice que a los 21 días una conducta empieza a volverse automática. Ya cruzaste ese umbral.`);
    } else if (protocolDay <= 60) {
      lines.push(`Día ${protocolDay} de 90. Estás en el arco de profundidad — donde los cambios dejan de ser visibles y empiezan a ser estructurales.`);
    } else {
      lines.push(`Día ${protocolDay} de 90. Eso no es disciplina — es quién eres ahora. El protocolo ya vive en ti.`);
    }

    if (state.northStar.identity && protocolDay >= 7) {
      lines.push(`Tu identidad declarada: "${state.northStar.identity.slice(0, 100)}". Cada acción que tomaste en el protocolo es evidencia de que eso ya es real.`);
    } else if (completedLessonCount > 0) {
      lines.push(`${completedLessonCount} lección${completedLessonCount === 1 ? '' : 'es'} completada${completedLessonCount === 1 ? '' : 's'}. Cada una reconfiguró algo — aunque no lo hayas notado todavía.`);
    }
    if (taskCount > 0) {
      lines.push(`${taskCount} tarea${taskCount === 1 ? '' : 's'} de reflexión escritas. Eso es más autoconocimiento real que la mayoría acumula en un año.`);
    }
    if (avgEnergy >= 7 && state.checkIns.length >= 5) {
      lines.push(`Tu energía promedio es ${avgEnergy}/10. El sistema está funcionando.`);
    }

    return lines.slice(0, 3);
  }, [protocolDay, state.completedLessons, state.completedTasks, state.checkIns.length, averages.energy]);

  const toggleNotifications = async (value: boolean) => {
    if (value) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        Alert.alert('Permisos requeridos', 'Activa las notificaciones en Configuración para recibir recordatorios.');
        return;
      }
      await scheduleCheckinReminder(protocolDay);
      setNotificationsOn(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      await cancelReminders();
      setNotificationsOn(false);
    }
  };

  const saveNorth = async () => {
    setSavingNorth(true);
    await updateNorthStar(north);
    setSavingNorth(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleSignOut = () => {
    if (typeof window !== 'undefined') {
      const ok = window.confirm('¿Cerrar sesión? Puedes volver a ingresar cuando quieras.');
      if (ok) { signOut(); router.replace('/'); }
      return;
    }
    Alert.alert(
      'CERRAR SESIÓN',
      '¿Cerrar sesión? Puedes volver a ingresar cuando quieras.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar sesión', style: 'destructive', onPress: async () => { await signOut(); router.replace('/'); } },
      ],
    );
  };

  const clear = () => {
    if (typeof window !== 'undefined') {
      const ok = window.confirm('¿Limpiar todos los datos de Polaris?');
      if (ok) clearData();
      return;
    }
    Alert.alert(
      'LIMPIAR DATOS',
      'Esto elimina todo el progreso local de Polaris. Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Limpiar', style: 'destructive', onPress: clearData },
      ],
    );
  };

  // GDPR: Export all personal data
  const handleExport = async () => {
    setExporting(true);
    try {
      const json = await exportData();
      if (Platform.OS === 'web') {
        const blob = new Blob([json], { type: 'application/json' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `polaris-datos-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        await Share.share({
          message: json,
          title:   'Mis datos de Polaris',
        });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al exportar';
      Alert.alert('Error', msg);
    } finally {
      setExporting(false);
    }
  };

  // GDPR: Delete account — 2-step confirmation
  const handleDeleteAccount = () => {
    Alert.alert(
      'ELIMINAR CUENTA',
      '¿Estás seguro? Esta acción eliminará tu cuenta y TODOS tus datos de Polaris de forma permanente e irreversible.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Continuar',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'CONFIRMACIÓN FINAL',
              'Se eliminarán: historial de check-ins, conversaciones con Norman, progreso de lecciones y todos los datos biométricos. Esta acción NO SE PUEDE DESHACER.',
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'ELIMINAR MI CUENTA',
                  style: 'destructive',
                  onPress: async () => {
                    setDeleting(true);
                    try {
                      await deleteAccount();
                      router.replace('/');
                    } catch (e: unknown) {
                      const msg = e instanceof Error ? e.message : 'Error al eliminar';
                      Alert.alert('Error', `No se pudo eliminar la cuenta: ${msg}`);
                    } finally {
                      setDeleting(false);
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  // ── Desktop (≥1200px) layout ─────────────────────────────────────────────────
  if (sc.isDesktop) {
    return (
      <KeyboardAvoidingView
        style={sc.root}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={insets.top}>
        <ScrollView
          contentContainerStyle={[deskStyles.contentDesktop, { paddingTop: insets.top + 32 }]}
          showsVerticalScrollIndicator={false}
          bounces
          overScrollMode="never"
          keyboardShouldPersistTaps="handled">

          {/* ── ZONA 1: Top row ── */}
          <AppHeader title="PROGRESO" />
          <SovereignScore score={score} />
          {narrativeBlock.length > 0 && (
            <View style={styles.narrativeCard}>
              <Text style={styles.narrativeLabel}>TU HISTORIA</Text>
              {narrativeBlock.map((line, i) => (
                <Text key={i} style={styles.narrativeLine}>{line}</Text>
              ))}
            </View>
          )}

          {/* ── ZONA 2: Middle two-column row ── */}
          <View style={deskStyles.desktopMiddle}>

            {/* Left column */}
            <View style={deskStyles.desktopLeft}>
              <GoldDivider label="MÉTRICAS DEL SISTEMA" />
              <View style={styles.grid}>
                <MetricCard
                  label="Racha"
                  value={`${Math.max(state.checkIns.length, protocolDay)}`}
                  meta="dias activos"
                  icon="local-fire-department"
                />
                <MetricCard
                  label="Check-ins"
                  value={`${state.checkIns.length}`}
                  meta="completados"
                  icon="fact-check"
                />
                <MetricCard
                  label="Lecciones"
                  value={`${(state.completedLessons ?? []).length}`}
                  meta="completadas"
                  icon="menu-book"
                />
                <MetricCard
                  label="Días"
                  value={`${protocolDay}`}
                  meta="protocolo"
                  icon="calendar-today"
                />
              </View>

              <GoldDivider label="BIOMETRÍA PROMEDIO (7D)" />
              <PremiumCard style={styles.sparklineCard}>
                <WeeklySparkline label="ENERGIA" values={energyValues} color={palette.gold} />
                <View style={styles.sparklineDivider} />
                <WeeklySparkline label="CLARIDAD" values={clarityValues} color={palette.success} />
              </PremiumCard>

              <GoldDivider label="LOGROS" />
              <View style={styles.achievementsGrid}>
                {achievements.map((a) => (
                  <AchievementBadge key={a.label} icon={a.icon} label={a.label} earned={a.earned} />
                ))}
              </View>

              <GoldDivider label="ARQUETIPOS DESBLOQUEADOS" />
              <View style={styles.archetypeList}>
                {archetypes.map((arch) => (
                  <PremiumCard
                    key={arch.id}
                    style={[styles.archetypeRow, arch.earned && styles.archetypeRowEarned]}>
                    <MaterialIcons
                      name={arch.earned ? 'military-tech' : 'lock'}
                      size={18}
                      color={arch.earned ? palette.gold : palette.smoke}
                    />
                    <View style={styles.archetypeCopy}>
                      <Text style={[styles.archetypeName, arch.earned && styles.archetypeNameEarned]}>
                        {arch.name}
                      </Text>
                      <Text style={styles.archetypeProgress}>
                        {arch.earned
                          ? 'ARQUETIPO CONQUISTADO'
                          : `${arch.completedCount}/${arch.totalLessons} LECCIONES`}
                      </Text>
                    </View>
                    {arch.earned && (
                      <View style={styles.archetypeCheck}>
                        <MaterialIcons name="check-circle" size={14} color={palette.gold} />
                      </View>
                    )}
                  </PremiumCard>
                ))}
              </View>
            </View>

            {/* Right column */}
            <View style={deskStyles.desktopRight}>
              <GoldDivider label="PROTOCOLO" />
              <ProgressCard
                label="Progreso · Protocolo Soberano 90D"
                value={`${protocolProgress}% · ${protocolDay}/90`}
                progress={protocolProgress}
              />

              {/* Profile edit */}
              <PremiumCard style={styles.form}>
                <PremiumInput
                  value={name}
                  onChangeText={setName}
                  placeholder="NOMBRE"
                  accessibilityLabel="Nombre de perfil"
                  returnKeyType="next"
                />
                <PremiumInput
                  value={role}
                  onChangeText={setRole}
                  placeholder="ROL / TITULO"
                  accessibilityLabel="Rol o título"
                  returnKeyType="done"
                />
                <PrimaryButton
                  label="GUARDAR PERFIL"
                  icon="check"
                  onPress={async () => {
                    await updateProfile({ name, role });
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  }}
                />
              </PremiumCard>

              {/* Subscription tier badge */}
              <PremiumCard style={[styles.tierCard, {
                borderColor: subscription.isExpiringSoon
                  ? palette.warning + '88'
                  : subColor + '55',
              }]}>
                <View style={[styles.tierIconBox, { backgroundColor: subColor + '22' }]}>
                  <MaterialIcons name={subIcon} size={22} color={subColor} />
                </View>
                <View style={styles.tierBody}>
                  <Text style={styles.tierLabel}>PLAN ACTIVO</Text>
                  <Text style={[styles.tierName, { color: subColor }]}>{subLabel}</Text>
                  {subscription.isExpiringSoon && subscription.expiresAt ? (
                    <Text style={[styles.tierSub, { color: palette.warning }]}>
                      ⚠ Expira {new Date(subscription.expiresAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                    </Text>
                  ) : subTier === 'free' ? (
                    <Text style={styles.tierSub}>Actualiza a Premium para desbloquear todo el contenido</Text>
                  ) : (
                    <Text style={styles.tierSub}>{subscription.tierInfo.description}</Text>
                  )}
                </View>
                {subTier === 'free' && (
                  <Pressable style={styles.tierUpgradeBtn} onPress={() => router.push('/pricing' as never)}>
                    <Text style={styles.tierUpgradeText}>UPGRADE</Text>
                  </Pressable>
                )}
              </PremiumCard>

              {isAdmin && (
                <Pressable
                  style={styles.adminBtn}
                  onPress={() => router.push('/admin' as never)}
                  accessibilityLabel="Cuadro de Mando Integral">
                  <MaterialIcons name="dashboard-customize" size={16} color={palette.gold} />
                  <Text style={styles.adminBtnText}>Cuadro de Mando →</Text>
                </Pressable>
              )}
            </View>
          </View>

          {/* ── ZONA 3: Bottom full-width account section ── */}
          <View style={deskStyles.desktopBottom}>
            <GoldDivider label="CUENTA" />
            <View style={deskStyles.desktopAccountGrid}>
              {/* Notificaciones */}
              <PremiumCard style={[styles.settingsCard, deskStyles.desktopAccountCard]}>
                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingTitle}>RECORDATORIO DIARIO</Text>
                    <Text style={styles.settingMeta}>Check-in a las 7:00 AM</Text>
                  </View>
                  <Switch
                    value={notificationsOn}
                    onValueChange={toggleNotifications}
                    trackColor={{ false: palette.charcoal, true: palette.gold }}
                    thumbColor={notificationsOn ? palette.black : palette.ash}
                  />
                </View>
                <View style={[styles.settingRow, { borderTopWidth: 1, borderTopColor: palette.line, paddingTop: spacing.md }]}>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingTitle}>ANÁLISIS DE COMPORTAMIENTO</Text>
                    <Text style={styles.settingMeta}>
                      Permite a Polaris personalizar recomendaciones con IA. Tus datos nunca se venden.
                    </Text>
                  </View>
                  <Switch
                    value={mlConsent}
                    onValueChange={handleMlConsentToggle}
                    trackColor={{ false: palette.charcoal, true: palette.gold }}
                    thumbColor={mlConsent ? palette.black : palette.ash}
                  />
                </View>
              </PremiumCard>

              {/* Export / Sign out / Danger zone */}
              <PremiumCard style={[styles.gdprCard, deskStyles.desktopAccountCard]}>
                <Text style={styles.gdprIntro}>
                  Tienes derecho a acceder, exportar y eliminar todos tus datos personales en cualquier momento (RGPD / GDPR).
                </Text>
                <Pressable
                  style={[styles.gdprBtn, exporting && { opacity: 0.6 }]}
                  onPress={handleExport}
                  disabled={exporting}
                  accessibilityLabel="Exportar mis datos">
                  <MaterialIcons name="download" size={18} color={palette.gold} />
                  <View style={styles.gdprBtnBody}>
                    <Text style={styles.gdprBtnTitle}>{exporting ? 'EXPORTANDO...' : 'EXPORTAR MIS DATOS'}</Text>
                    <Text style={styles.gdprBtnMeta}>JSON con todo tu historial · check-ins, conversaciones, lecciones</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={16} color={palette.smoke} />
                </Pressable>
                <Pressable style={styles.signOutBtn} onPress={handleSignOut}>
                  <MaterialIcons name="logout" size={18} color={palette.danger} />
                  <Text style={styles.signOutText}>CERRAR SESIÓN</Text>
                </Pressable>
                <Pressable
                  style={[styles.gdprDeleteBtn, deleting && { opacity: 0.6 }]}
                  onPress={handleDeleteAccount}
                  disabled={deleting}
                  accessibilityLabel="Eliminar cuenta">
                  <MaterialIcons name="delete-forever" size={18} color={palette.danger} />
                  <View style={styles.gdprBtnBody}>
                    <Text style={styles.gdprDeleteTitle}>{deleting ? 'ELIMINANDO...' : 'ELIMINAR CUENTA'}</Text>
                    <Text style={styles.gdprBtnMeta}>Elimina tu cuenta y todos los datos de forma permanente</Text>
                  </View>
                </Pressable>
              </PremiumCard>
            </View>
          </View>

          {/* Version footer */}
          <Text style={styles.versionText}>
            Polaris Growth Institute v{appVersion}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── Mobile / Tablet layout (original) ────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={sc.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={insets.top}>
    <ScrollView
      contentContainerStyle={[sc.content, { paddingTop: insets.top + 16 }]}
      showsVerticalScrollIndicator={false}
      bounces
      overScrollMode="never"
      keyboardShouldPersistTaps="handled">
      <AppHeader title="PERFIL" />

      {/* ── Profile Hero ── */}
      <PremiumCard style={styles.heroCard}>
        <View style={styles.avatarWrap}>
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{state.profile.name.slice(0, 2).toUpperCase()}</Text>
            </View>
          </View>
          <StatusPill label="PROTOCOLO SOBERANO" tone="gold" dot />
        </View>
        <View style={styles.heroInfo}>
          <Text style={styles.heroName}>{state.profile.name.toUpperCase()}</Text>
          <Text style={styles.heroRole}>{state.profile.role}</Text>
          <View style={styles.heroBadgeRow}>
            <View style={styles.heroBadge}>
              <MaterialIcons name="calendar-today" size={11} color={palette.gold} />
              <Text style={styles.heroBadgeText}>DIA {protocolDay}</Text>
            </View>
            <View style={styles.heroBadge}>
              <MaterialIcons name="view-module" size={11} color={palette.gold} />
              <Text style={styles.heroBadgeText}>MODULO {ACTIVE_MODULE.order}</Text>
            </View>
          </View>
        </View>
      </PremiumCard>

      {/* ── Sovereign Score ── */}
      <SovereignScore score={score} />

      {/* ── Share profile CTA ── */}
      <Pressable
        style={shareStyles.row}
        onPress={() => router.push('/perfil' as never)}
        accessibilityLabel="Ver y compartir tarjeta soberana">
        <MaterialIcons name="share" size={16} color={palette.gold} />
        <Text style={shareStyles.label}>VER TARJETA SOBERANA</Text>
        <MaterialIcons name="chevron-right" size={16} color={palette.smoke} />
      </Pressable>

      {/* ── Transformation Narrative ── */}
      {narrativeBlock.length > 0 && (
        <View style={styles.narrativeCard}>
          <Text style={styles.narrativeLabel}>TU HISTORIA</Text>
          {narrativeBlock.map((line, i) => (
            <Text key={i} style={styles.narrativeLine}>{line}</Text>
          ))}
        </View>
      )}

      {/* ── Protocol Progress ── */}
      <ProgressCard
        label="Progreso · Protocolo Soberano 90D"
        value={`${protocolProgress}% · ${protocolDay}/90`}
        progress={protocolProgress}
      />

      {/* ── Metric Grid ── */}
      <View style={styles.grid}>
        <MetricCard
          label="Racha"
          value={`${Math.max(state.checkIns.length, protocolDay)}`}
          meta="dias activos"
          icon="local-fire-department"
        />
        <MetricCard
          label="Energia"
          value={averages.energy ? `${averages.energy}` : '--'}
          meta="promedio /10"
          icon="bolt"
        />
        <MetricCard
          label="Claridad"
          value={averages.clarity ? `${averages.clarity}` : '--'}
          meta="promedio /10"
          icon="center-focus-strong"
        />
        <MetricCard
          label="Check-ins"
          value={`${state.checkIns.length}`}
          meta="completados"
          icon="fact-check"
        />
      </View>

      {/* ── Weekly Sparklines ── */}
      {last7.length > 0 && (
        <>
          <GoldDivider label="ULTIMOS 7 DIAS" />
          <PremiumCard style={styles.sparklineCard}>
            <WeeklySparkline label="ENERGIA" values={energyValues} color={palette.gold} />
            <View style={styles.sparklineDivider} />
            <WeeklySparkline label="CLARIDAD" values={clarityValues} color={palette.success} />
          </PremiumCard>
        </>
      )}

      {/* ── 42-Day Streak Heatmap ── */}
      {state.checkIns.length > 0 && (
        <StreakCalendar checkIns={state.checkIns} />
      )}

      {/* ── Intelligence DNA Dashboard ── */}
      {intelligence.engagement_score > 0 && (
        <>
          <GoldDivider label="ADN DE COMPORTAMIENTO" />
          <PremiumCard style={dnaStyles.card}>
            {/* Cohort badge */}
            {intelligence.cohort_label && (
              <View style={dnaStyles.cohortRow}>
                <MaterialIcons name="group" size={14} color={palette.gold} />
                <Text style={dnaStyles.cohortLabel}>
                  PERFIL: {intelligence.cohort_label.replace(/_/g, ' ').toUpperCase()}
                </Text>
                <View style={[dnaStyles.tierBadge, {
                  backgroundColor:
                    engagementTier === 'excellent' ? palette.goldLight
                    : engagementTier === 'good' ? palette.successMuted
                    : 'rgba(120,120,120,0.15)',
                }]}>
                  <Text style={[dnaStyles.tierText, {
                    color: engagementTier === 'excellent' ? palette.gold : engagementTier === 'good' ? palette.success : palette.smoke,
                  }]}>{engagementTier.toUpperCase()}</Text>
                </View>
              </View>
            )}

            {/* Engagement gauge */}
            <View style={dnaStyles.gaugeRow}>
              <Text style={dnaStyles.gaugeLabel}>ENGAGEMENT</Text>
              <View style={dnaStyles.gaugeTrack}>
                <View style={[dnaStyles.gaugeFill, { width: `${intelligence.engagement_score}%` as unknown as number }]} />
              </View>
              <Text style={dnaStyles.gaugeValue}>{intelligence.engagement_score}/100</Text>
            </View>

            {/* Affinity bars */}
            <Text style={dnaStyles.sectionLabel}>AFINIDAD POR MÓDULO</Text>
            {[
              { key: 'binaural',   label: 'Binaurales',  value: intelligence.affinity_binaural },
              { key: 'meditation', label: 'Meditación',  value: intelligence.affinity_meditation },
              { key: 'breathing',  label: 'Respiración', value: intelligence.affinity_breathing },
              { key: 'lessons',    label: 'Lecciones',   value: intelligence.affinity_lessons },
              { key: 'mentor',     label: 'Mentor IA',   value: intelligence.affinity_mentor },
              { key: 'journaling', label: 'Diario',      value: intelligence.affinity_journaling },
            ].map((af) => (
              <View key={af.key} style={dnaStyles.affinityRow}>
                <Text style={[dnaStyles.affinityLabel, topAffinity === af.key && { color: palette.gold }]}>
                  {af.label}{topAffinity === af.key ? ' ★' : ''}
                </Text>
                <View style={dnaStyles.affinityTrack}>
                  <View style={[
                    dnaStyles.affinityFill,
                    { width: `${Math.round(af.value * 100)}%` as unknown as number },
                    topAffinity === af.key && { backgroundColor: palette.gold },
                  ]} />
                </View>
                <Text style={dnaStyles.affinityPct}>{Math.round(af.value * 100)}%</Text>
              </View>
            ))}

            {/* Churn risk (only if not low) */}
            {intelligence.churn_risk_label !== 'low' && (
              <View style={dnaStyles.riskRow}>
                <MaterialIcons
                  name="warning-amber"
                  size={13}
                  color={intelligence.churn_risk_label === 'critical' ? palette.danger : palette.gold}
                />
                <Text style={[dnaStyles.riskText, intelligence.churn_risk_label === 'critical' && { color: palette.danger }]}>
                  Riesgo de abandono: {intelligence.churn_risk_label.toUpperCase()}
                  {'  — Habla con Norman para retomar tu impulso.'}
                </Text>
              </View>
            )}
          </PremiumCard>
        </>
      )}

      {/* ── Achievements ── */}
      <GoldDivider label="LOGROS" />
      <View style={styles.achievementsGrid}>
        {achievements.map((a) => (
          <AchievementBadge key={a.label} icon={a.icon} label={a.label} earned={a.earned} />
        ))}
      </View>

      {/* ── Archetype badges ── */}
      <GoldDivider label="ARQUETIPOS DESBLOQUEADOS" />
      <View style={styles.archetypeList}>
        {archetypes.map((arch) => (
          <PremiumCard
            key={arch.id}
            style={[styles.archetypeRow, arch.earned && styles.archetypeRowEarned]}>
            <MaterialIcons
              name={arch.earned ? 'military-tech' : 'lock'}
              size={18}
              color={arch.earned ? palette.gold : palette.smoke}
            />
            <View style={styles.archetypeCopy}>
              <Text style={[styles.archetypeName, arch.earned && styles.archetypeNameEarned]}>
                {arch.name}
              </Text>
              <Text style={styles.archetypeProgress}>
                {arch.earned
                  ? 'ARQUETIPO CONQUISTADO'
                  : `${arch.completedCount}/${arch.totalLessons} LECCIONES`}
              </Text>
            </View>
            {arch.earned && (
              <View style={styles.archetypeCheck}>
                <MaterialIcons name="check-circle" size={14} color={palette.gold} />
              </View>
            )}
          </PremiumCard>
        ))}
      </View>

      {/* ── Mi Bienestar ── */}
      <GoldDivider label="MI BIENESTAR" />

      {/* Tier badge — Supabase Realtime-synced */}
      <PremiumCard style={[styles.tierCard, {
        borderColor: subscription.isExpiringSoon
          ? palette.warning + '88'
          : subColor + '55',
      }]}>
        <View style={[styles.tierIconBox, { backgroundColor: subColor + '22' }]}>
          <MaterialIcons name={subIcon} size={22} color={subColor} />
        </View>
        <View style={styles.tierBody}>
          <Text style={styles.tierLabel}>PLAN ACTIVO</Text>
          <Text style={[styles.tierName, { color: subColor }]}>{subLabel}</Text>
          {subscription.isExpiringSoon && subscription.expiresAt ? (
            <Text style={[styles.tierSub, { color: palette.warning }]}>
              ⚠ Expira {new Date(subscription.expiresAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
            </Text>
          ) : subTier === 'free' ? (
            <Text style={styles.tierSub}>Actualiza a Premium para desbloquear todo el contenido</Text>
          ) : (
            <Text style={styles.tierSub}>{subscription.tierInfo.description}</Text>
          )}
        </View>
        {subTier === 'free' && (
          <Pressable style={styles.tierUpgradeBtn} onPress={() => router.push('/pricing' as never)}>
            <Text style={styles.tierUpgradeText}>UPGRADE</Text>
          </Pressable>
        )}
      </PremiumCard>

      {/* Wellness stats */}
      <View style={styles.grid}>
        <MetricCard
          label="Sesiones"
          value={`${wellnessSessions.length}`}
          meta="totales"
          icon="self-improvement"
        />
        <MetricCard
          label="Minutos"
          value={`${totalWellnessMinutes}`}
          meta="acumulados"
          icon="timer"
        />
        <MetricCard
          label="Racha"
          value={`${wellnessStreak}`}
          meta="días wellness"
          icon="local-fire-department"
        />
        <MetricCard
          label="Meditación"
          value={`${wellnessMeditation}`}
          meta="sesiones"
          icon="spa"
        />
      </View>

      {/* B2B CTA */}
      <PremiumCard style={styles.b2bCard}>
        <View style={styles.b2bHeader}>
          <View style={[styles.b2bIconBox, { backgroundColor: palette.gold + '22' }]}>
            <MaterialIcons name="business" size={24} color={palette.gold} />
          </View>
          <View style={styles.b2bTextCol}>
            <Text style={styles.b2bTitle}>POLARIS PARA TU EMPRESA</Text>
            <Text style={styles.b2bSub}>Lleva el bienestar a todo tu equipo</Text>
          </View>
        </View>
        <Text style={styles.b2bBody}>
          Acceso corporativo, dashboard de métricas de equipo, y programas de bienestar personalizados para organizaciones.
        </Text>
        <View style={styles.b2bFeatures}>
          {['Dashboard de equipo', 'Licencias múltiples', 'Soporte prioritario'].map((f) => (
            <View key={f} style={styles.b2bFeatureRow}>
              <MaterialIcons name="check-circle" size={14} color={palette.gold} />
              <Text style={styles.b2bFeatureText}>{f}</Text>
            </View>
          ))}
        </View>
        <Pressable style={styles.b2bBtn}>
          <MaterialIcons name="arrow-forward" size={16} color={palette.black} />
          <Text style={styles.b2bBtnText}>SOLICITAR INFORMACIÓN</Text>
        </Pressable>
      </PremiumCard>

      {/* ── Edit Profile ── */}
      <GoldDivider label="EDITAR PERFIL" />
      <PremiumCard style={styles.form}>
        <PremiumInput
          value={name}
          onChangeText={setName}
          placeholder="NOMBRE"
          accessibilityLabel="Nombre de perfil"
          returnKeyType="next"
        />
        <PremiumInput
          value={role}
          onChangeText={setRole}
          placeholder="ROL / TITULO"
          accessibilityLabel="Rol o título"
          returnKeyType="done"
        />
        <PrimaryButton
          label="GUARDAR PERFIL"
          icon="check"
          onPress={async () => {
            await updateProfile({ name, role });
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }}
        />
      </PremiumCard>

      {/* ── Mi Norte ── */}
      <GoldDivider label="MI NORTE" />
      <PremiumCard style={styles.form}>
        <View style={styles.northField}>
          <Text style={styles.northLabel}>PROPÓSITO PRINCIPAL</Text>
          <PremiumInput
            value={north.purpose}
            onChangeText={(purpose) => setNorth({ ...north, purpose })}
            placeholder="¿Por qué operas a este nivel?"
            multiline
            style={styles.textarea}
            accessibilityLabel="Propósito principal"
          />
        </View>
        <View style={styles.northField}>
          <Text style={styles.northLabel}>DECLARACIÓN DE IDENTIDAD</Text>
          <PremiumInput
            value={north.identity}
            onChangeText={(identity) => setNorth({ ...north, identity })}
            placeholder="Soy alguien que..."
            multiline
            style={styles.textarea}
            accessibilityLabel="Declaración de identidad"
          />
        </View>
        <View style={styles.northField}>
          <Text style={styles.northLabel}>RECORDATORIO DIARIO</Text>
          <PremiumInput
            value={north.dailyReminder}
            onChangeText={(dailyReminder) => setNorth({ ...north, dailyReminder })}
            placeholder="La frase que te ancla cada mañana..."
            multiline
            style={styles.textarea}
            accessibilityLabel="Recordatorio diario"
          />
        </View>
        <PrimaryButton
          label={savingNorth ? 'GUARDANDO...' : 'GUARDAR NORTE'}
          icon="explore"
          onPress={saveNorth}
          disabled={savingNorth}
        />
      </PremiumCard>

      {/* ── Notificaciones ── */}
      <GoldDivider label="NOTIFICACIONES Y PRIVACIDAD" />
      <PremiumCard style={styles.settingsCard}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>RECORDATORIO DIARIO</Text>
            <Text style={styles.settingMeta}>Check-in a las 7:00 AM</Text>
          </View>
          <Switch
            value={notificationsOn}
            onValueChange={toggleNotifications}
            trackColor={{ false: palette.charcoal, true: palette.gold }}
            thumbColor={notificationsOn ? palette.black : palette.ash}
          />
        </View>
        <View style={[styles.settingRow, { borderTopWidth: 1, borderTopColor: palette.line, paddingTop: spacing.md }]}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>ANÁLISIS DE COMPORTAMIENTO</Text>
            <Text style={styles.settingMeta}>
              Permite a Polaris personalizar recomendaciones con IA. Tus datos nunca se venden.
            </Text>
          </View>
          <Switch
            value={mlConsent}
            onValueChange={handleMlConsentToggle}
            trackColor={{ false: palette.charcoal, true: palette.gold }}
            thumbColor={mlConsent ? palette.black : palette.ash}
          />
        </View>
      </PremiumCard>

      {/* ── Privacidad y Datos (GDPR) ── */}
      <GoldDivider label="PRIVACIDAD Y DATOS" />
      <PremiumCard style={styles.gdprCard}>
        <Text style={styles.gdprIntro}>
          Tienes derecho a acceder, exportar y eliminar todos tus datos personales en cualquier momento (RGPD / GDPR).
        </Text>

        {/* Export */}
        <Pressable
          style={[styles.gdprBtn, exporting && { opacity: 0.6 }]}
          onPress={handleExport}
          disabled={exporting}
          accessibilityLabel="Exportar mis datos">
          <MaterialIcons name="download" size={18} color={palette.gold} />
          <View style={styles.gdprBtnBody}>
            <Text style={styles.gdprBtnTitle}>{exporting ? 'EXPORTANDO...' : 'EXPORTAR MIS DATOS'}</Text>
            <Text style={styles.gdprBtnMeta}>JSON con todo tu historial · check-ins, conversaciones, lecciones</Text>
          </View>
          <MaterialIcons name="chevron-right" size={16} color={palette.smoke} />
        </Pressable>

        {/* Delete account */}
        <Pressable
          style={[styles.gdprDeleteBtn, deleting && { opacity: 0.6 }]}
          onPress={handleDeleteAccount}
          disabled={deleting}
          accessibilityLabel="Eliminar cuenta">
          <MaterialIcons name="delete-forever" size={18} color={palette.danger} />
          <View style={styles.gdprBtnBody}>
            <Text style={styles.gdprDeleteTitle}>{deleting ? 'ELIMINANDO...' : 'ELIMINAR CUENTA'}</Text>
            <Text style={styles.gdprBtnMeta}>Elimina tu cuenta y todos los datos de forma permanente</Text>
          </View>
        </Pressable>
      </PremiumCard>

      {/* ── Sistema ── */}
      <GoldDivider label="SISTEMA" />
      <PremiumCard style={styles.systemCard}>
        <View style={styles.systemInfo}>
          <Text style={styles.systemLabel}>PROGRAMA ACTIVO</Text>
          <Text style={styles.systemValue}>Protocolo Soberano</Text>
          <Text style={styles.systemMeta}>
            Módulo {ACTIVE_MODULE.order} — {ACTIVE_MODULE.title}
          </Text>
        </View>
        <SecondaryButton
          label="REINICIAR ONBOARDING"
          icon="restart-alt"
          onPress={resetOnboarding}
        />
        <Pressable onPress={handleSignOut} style={styles.signOutBtn}>
          <MaterialIcons name="logout" size={18} color={palette.danger} />
          <Text style={styles.signOutText}>CERRAR SESIÓN</Text>
        </Pressable>
        <DangerButton
          label="LIMPIAR DATOS LOCALES"
          icon="delete-outline"
          onPress={clear}
        />
      </PremiumCard>

      {/* ── Admin Access (only visible to admins — read from profiles.is_admin) ── */}
      {isAdmin && (
        <Pressable
          style={styles.adminBtn}
          onPress={() => router.push('/admin' as never)}
          accessibilityLabel="Cuadro de Mando Integral">
          <MaterialIcons name="dashboard-customize" size={16} color={palette.gold} />
          <Text style={styles.adminBtnText}>Cuadro de Mando →</Text>
        </Pressable>
      )}

      {/* ── Version footer ── */}
      <Text style={styles.versionText}>
        Polaris Growth Institute v{appVersion}
      </Text>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  // Transformation narrative
  narrativeCard: {
    backgroundColor: 'rgba(179,141,60,0.06)',
    borderColor: 'rgba(179,141,60,0.2)',
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  narrativeLabel: {
    color: palette.gold,
    fontFamily: Fonts.mono,
    fontSize: 9,
    letterSpacing: 2,
  },
  narrativeLine: {
    color: palette.ash,
    fontFamily: Fonts.sans,
    fontSize: 13,
    lineHeight: 20,
  },

  // Hero profile card
  heroCard: {
    gap: spacing.lg,
  },
  avatarWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.lg,
  },
  avatarRing: {
    borderColor: palette.gold,
    borderRadius: radii.xs,
    borderWidth: 2,
    padding: 3,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: palette.gold,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  avatarText: {
    color: palette.black,
    fontFamily: Fonts.display,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 1,
  },
  heroInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  heroName: {
    color: palette.ivory,
    fontFamily: Fonts.display,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1,
  },
  heroRole: {
    ...typography.body,
    color: palette.ash,
    fontSize: 13,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  heroBadge: {
    alignItems: 'center',
    backgroundColor: palette.goldLight,
    borderColor: palette.line,
    borderRadius: radii.xs,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  heroBadgeText: {
    ...typography.label,
    color: palette.gold,
    fontSize: 8,
  },

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },

  // Sparklines
  sparklineCard: {
    gap: spacing.xl,
  },
  sparklineDivider: {
    backgroundColor: palette.lineSoft,
    height: 1,
  },

  // Achievements
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },

  // Archetype badges
  archetypeList: {
    gap: spacing.sm,
  },
  archetypeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    opacity: 0.5,
  },
  archetypeRowEarned: {
    opacity: 1,
    borderColor: palette.gold + '55',
  },
  archetypeCopy: {
    flex: 1,
    gap: 2,
  },
  archetypeName: {
    color: palette.smoke,
    fontFamily: Fonts.display,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
  },
  archetypeNameEarned: {
    color: palette.ivory,
  },
  archetypeProgress: {
    ...typography.mono,
    color: palette.ash,
    fontSize: 9,
  },
  archetypeCheck: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Form
  form: {
    gap: spacing.md,
  },

  // Norte fields
  northField: {
    gap: spacing.sm,
  },
  northLabel: {
    ...typography.label,
    color: palette.ash,
  },
  textarea: {
    minHeight: 80,
    paddingTop: spacing.sm,
    textAlignVertical: 'top',
  },

  // Settings card
  settingsCard: {
    gap: spacing.md,
  },
  settingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  settingInfo: {
    flex: 1,
    gap: 2,
  },
  settingTitle: {
    ...typography.label,
    color: palette.ivory,
    letterSpacing: 1,
  },
  settingMeta: {
    ...typography.mono,
    color: palette.smoke,
  },

  // Sign out
  signOutBtn: {
    alignItems: 'center',
    borderColor: palette.danger,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  signOutText: {
    ...typography.label,
    color: palette.danger,
    fontSize: 11,
    letterSpacing: 2,
  },

  // Tier badge
  tierCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  tierIconBox: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  tierBody: {
    flex: 1,
    gap: 2,
  },
  tierLabel: {
    ...typography.label,
    color: palette.ash,
    fontSize: 9,
    letterSpacing: 1.5,
  },
  tierName: {
    fontFamily: Fonts.display,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
  tierSub: {
    ...typography.caption,
    color: palette.smoke,
    fontSize: 10,
  },
  tierUpgradeBtn: {
    backgroundColor: palette.gold,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  tierUpgradeText: {
    ...typography.label,
    color: palette.black,
    fontSize: 9,
    fontWeight: '700',
  },

  // B2B card
  b2bCard: {
    gap: spacing.md,
    borderColor: palette.gold + '44',
    marginBottom: spacing.lg,
  },
  b2bHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  b2bIconBox: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  b2bTextCol: {
    flex: 1,
    gap: 2,
  },
  b2bTitle: {
    ...typography.section,
    color: palette.ivory,
    fontSize: 12,
    letterSpacing: 2,
  },
  b2bSub: {
    ...typography.caption,
    color: palette.smoke,
    fontSize: 11,
  },
  b2bBody: {
    ...typography.body,
    color: palette.ash,
    fontSize: 12,
    lineHeight: 18,
  },
  b2bFeatures: {
    gap: spacing.sm,
  },
  b2bFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  b2bFeatureText: {
    ...typography.caption,
    color: palette.ash,
    fontSize: 11,
  },
  b2bBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: palette.gold,
    borderRadius: radii.sm,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  b2bBtnText: {
    ...typography.label,
    color: palette.black,
    fontWeight: '700',
    fontSize: 11,
  },

  // System
  systemCard: {
    gap: spacing.md,
  },
  systemInfo: {
    gap: spacing.xs,
    paddingBottom: spacing.sm,
    borderBottomColor: palette.lineSoft,
    borderBottomWidth: 1,
  },
  systemLabel: {
    ...typography.label,
    color: palette.ash,
  },
  systemValue: {
    color: palette.ivory,
    fontFamily: Fonts.display,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  systemMeta: {
    ...typography.mono,
    color: palette.smoke,
  },
  // GDPR section
  gdprCard: {
    gap: spacing.md,
  },
  gdprIntro: {
    ...typography.caption,
    color: palette.smoke,
    lineHeight: 18,
    fontSize: 11,
  },
  gdprBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 60,
  },
  gdprBtnBody: {
    flex: 1,
    gap: 2,
  },
  gdprBtnTitle: {
    ...typography.label,
    color: palette.gold,
    fontSize: 10,
    letterSpacing: 1.5,
  },
  gdprBtnMeta: {
    ...typography.caption,
    color: palette.smoke,
    fontSize: 10,
  },
  gdprDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: palette.danger + '55',
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 60,
  },
  gdprDeleteTitle: {
    ...typography.label,
    color: palette.danger,
    fontSize: 10,
    letterSpacing: 1.5,
  },

  // Version
  versionText: {
    ...typography.caption,
    color: palette.smoke,
    fontSize: 10,
    textAlign: 'center',
    paddingBottom: spacing.xl,
    paddingTop: spacing.sm,
    opacity: 0.5,
  },

  // Admin access button — ghost style, only rendered when is_admin === true
  adminBtn: {
    alignItems: 'center',
    alignSelf: 'center',
    borderColor: 'rgba(255,200,4,0.25)',
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 2,
  },
  adminBtnText: {
    fontFamily: Fonts.sans,
    color: palette.gold,
    fontSize: 12,
    letterSpacing: 1,
  },
});

// ─── Share row ────────────────────────────────────────────────────────────────
const shareStyles = StyleSheet.create({
  row: {
    alignItems:      'center',
    borderColor:     palette.gold + '44',
    borderRadius:    radii.sm,
    borderWidth:     1,
    flexDirection:   'row',
    gap:             spacing.sm,
    justifyContent:  'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(179,141,60,0.05)',
  },
  label: {
    color:       palette.gold,
    flex:        1,
    fontFamily:  Fonts.mono,
    fontSize:    10,
    letterSpacing: 2,
    textAlign:   'center',
  },
});

// ─── Desktop layout styles ───────────────────────────────────────────────────
const deskStyles = StyleSheet.create({
  contentDesktop: {
    alignSelf:        'center' as const,
    width:            '100%'  as const,
    maxWidth:         1200,
    paddingHorizontal: 40,
    paddingTop:       32,
    paddingBottom:    60,
    gap:              24,
  },
  desktopMiddle: {
    flexDirection: 'row',
    gap:           24,
    alignItems:    'flex-start',
  },
  desktopLeft: {
    flex: 3,
    gap:  16,
  },
  desktopRight: {
    flex: 2,
    gap:  16,
  },
  desktopBottom: {
    gap: 16,
  },
  desktopAccountGrid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           16,
  },
  desktopAccountCard: {
    flex:     1,
    minWidth: 280,
  },
});

// ─── DNA Dashboard styles ─────────────────────────────────────────────────────
const dnaStyles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  cohortRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cohortLabel: {
    ...typography.label,
    color: palette.ash,
    flex: 1,
    fontSize: 9,
    letterSpacing: 1.5,
  },
  tierBadge: {
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  tierText: {
    fontFamily: Fonts.display,
    fontSize: 8,
    letterSpacing: 1.5,
  },
  gaugeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  gaugeLabel: {
    ...typography.label,
    color: palette.smoke,
    fontSize: 8,
    letterSpacing: 1.5,
    width: 82,
  },
  gaugeTrack: {
    backgroundColor: palette.charcoal,
    borderRadius: 2,
    flex: 1,
    height: 6,
    overflow: 'hidden',
  },
  gaugeFill: {
    backgroundColor: palette.gold,
    borderRadius: 2,
    height: 6,
  },
  gaugeValue: {
    ...typography.mono,
    color: palette.ash,
    fontSize: 10,
    textAlign: 'right',
    width: 44,
  },
  sectionLabel: {
    ...typography.label,
    color: palette.smoke,
    fontSize: 8,
    letterSpacing: 2,
    marginBottom: 2,
    marginTop: spacing.sm,
  },
  affinityRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  affinityLabel: {
    ...typography.body,
    color: palette.ash,
    fontSize: 11,
    width: 82,
  },
  affinityTrack: {
    backgroundColor: palette.charcoal,
    borderRadius: 2,
    flex: 1,
    height: 4,
    overflow: 'hidden',
  },
  affinityFill: {
    backgroundColor: palette.lineSoft,
    borderRadius: 2,
    height: 4,
  },
  affinityPct: {
    ...typography.mono,
    color: palette.smoke,
    fontSize: 9,
    textAlign: 'right',
    width: 32,
  },
  riskRow: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,200,4,0.06)',
    borderColor: 'rgba(255,200,4,0.3)',
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  riskText: {
    ...typography.body,
    color: palette.gold,
    flex: 1,
    fontSize: 11,
  },
});
