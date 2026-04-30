import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
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
  const { state, protocolDay, todayCheckIn, latestCheckIn } = useLifeFlow();
  const { user: wellnessUser } = useWellnessStore();
  const progress = Math.min(Math.round((protocolDay / 90) * 100), 100);
  const checkIn = todayCheckIn ?? latestCheckIn;

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
          todayCheckIn
            ? 'Check-in registrado. Ahora convierte tu estado en ejecucion medible.'
            : 'Tu sala de mando espera lectura interna para calibrar el dia.'
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
});
