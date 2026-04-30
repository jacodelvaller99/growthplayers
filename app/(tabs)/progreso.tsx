import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
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
} from '@/components/polaris';
import { ACTIVE_MODULE } from '@/data/modules';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { useWellnessStore } from '@/store/wellnessStore';
import { calcSovereignScore } from '@/lib/utils';
import {
  requestNotificationPermissions,
  scheduleCheckinReminder,
  cancelReminders,
} from '@/services/notifications';
import type { NorthStar } from '@/types/lifeflow';

export default function ProgresoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    state, protocolDay, averages,
    updateProfile, updateNorthStar,
    resetOnboarding, clearData, signOut,
  } = useLifeFlow();

  const wellnessTier = useWellnessStore((s) => s.user.subscriptionTier);

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

  const TIER_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentProps<typeof MaterialIcons>['name'] }> = {
    free:         { label: 'FREE',          color: palette.smoke,   icon: 'lock-open'         },
    premium:      { label: 'PREMIUM',       color: palette.gold,    icon: 'workspace-premium' },
    premium_plus: { label: 'PREMIUM PLUS',  color: '#7c5cbf',       icon: 'diamond'           },
  };
  const tierInfo = TIER_CONFIG[wellnessTier] ?? TIER_CONFIG.free;

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
      const ok = window.confirm('¿Limpiar todos los datos de LifeFlow?');
      if (ok) clearData();
      return;
    }
    Alert.alert(
      'LIMPIAR DATOS',
      'Esto elimina todo el progreso local de LifeFlow. Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Limpiar', style: 'destructive', onPress: clearData },
      ],
    );
  };

  return (
    <KeyboardAvoidingView
      style={screen.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={insets.top}>
    <ScrollView
      contentContainerStyle={[screen.content, { paddingTop: insets.top + 16 }]}
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

      {/* ── Achievements ── */}
      <GoldDivider label="LOGROS" />
      <View style={styles.achievementsGrid}>
        {achievements.map((a) => (
          <AchievementBadge key={a.label} icon={a.icon} label={a.label} earned={a.earned} />
        ))}
      </View>

      {/* ── Mi Bienestar ── */}
      <GoldDivider label="MI BIENESTAR" />

      {/* Tier badge */}
      <PremiumCard style={[styles.tierCard, { borderColor: tierInfo.color + '55' }]}>
        <View style={[styles.tierIconBox, { backgroundColor: tierInfo.color + '22' }]}>
          <MaterialIcons name={tierInfo.icon} size={22} color={tierInfo.color} />
        </View>
        <View style={styles.tierBody}>
          <Text style={styles.tierLabel}>PLAN ACTIVO</Text>
          <Text style={[styles.tierName, { color: tierInfo.color }]}>{tierInfo.label}</Text>
          {wellnessTier === 'free' && (
            <Text style={styles.tierSub}>Actualiza a Premium para desbloquear todo el contenido</Text>
          )}
        </View>
        {wellnessTier === 'free' && (
          <Pressable style={styles.tierUpgradeBtn}>
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
            <Text style={styles.b2bTitle}>LIFEFLOW PARA TU EMPRESA</Text>
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
      <GoldDivider label="NOTIFICACIONES" />
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
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
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
    borderRadius: 2,
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
    borderRadius: 2,
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
    color: palette.gold,
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
});
