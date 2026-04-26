import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  AppHeader,
  EditorialPanel,
  MetricCard,
  PremiumCard,
  PrimaryButton,
  ProgressCard,
  SectionHeader,
  StateMeter,
  StatusPill,
  screen,
} from '@/components/polaris';
import { ACTIVE_MODULE } from '@/data/modules';
import { Fonts, palette, spacing, typography } from '@/constants/theme';
import { useLifeFlow } from '@/hooks/use-lifeflow';

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'BUENOS DIAS';
  if (hour < 18) return 'BUENAS TARDES';
  return 'BUENAS NOCHES';
}

export default function DashboardScreen() {
  const router = useRouter();
  const { state, protocolDay, todayCheckIn, latestCheckIn } = useLifeFlow();
  const progress = Math.min(Math.round((protocolDay / 90) * 100), 100);
  const checkIn = todayCheckIn ?? latestCheckIn;

  return (
    <ScrollView style={screen.root} contentContainerStyle={screen.content}>
      <AppHeader title="LIFEFLOW" />

      <EditorialPanel
        eyebrow={`DIA ${protocolDay} · PROTOCOLO SOBERANO`}
        title={`${greeting()}, ${state.profile.name}`}
        body={todayCheckIn ? 'Check-in registrado. Ahora convierte tu estado en ejecucion medible.' : 'Tu centro de mando esta esperando lectura interna para calibrar el dia.'}>
        <Text style={styles.time}>{new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</Text>
        <PrimaryButton label={todayCheckIn ? 'REVISAR CHECK-IN' : 'HACER CHECK-IN'} icon="assignment" onPress={() => router.push('/checkin')} />
      </EditorialPanel>

      <ProgressCard label="Progreso del protocolo" value={`${progress}% · ${protocolDay}/90`} progress={progress} />

      <View style={styles.grid}>
        <MetricCard label="Racha" value={`${Math.max(state.checkIns.length, protocolDay)}`} meta="dias de protocolo" icon="local-fire-department" />
        <MetricCard label="Check-ins" value={`${state.checkIns.length}`} meta={todayCheckIn ? 'hoy completo' : 'pendiente hoy'} icon="fact-check" />
        <MetricCard label="Modulo activo" value={`0${ACTIVE_MODULE.number}`} meta="mercader" icon="view-module" />
        <MetricCard label="Coherencia" value={checkIn ? `${Math.round((checkIn.energy + checkIn.clarity + checkIn.sleep + (11 - checkIn.stress)) / 4)}/10` : '--'} meta="estado del dia" icon="verified-user" />
      </View>

      <View style={styles.stack}>
        <SectionHeader title="Estado del dia" meta={todayCheckIn ? 'ACTUALIZADO' : 'SIN LECTURA'} />
        <PremiumCard style={styles.meterCard}>
          <StateMeter label="Energia" value={checkIn?.energy ?? 0} />
          <StateMeter label="Enfoque / claridad" value={checkIn?.clarity ?? 0} />
          <StateMeter label="Estres" value={checkIn?.stress ?? 0} inverted />
        </PremiumCard>
      </View>

      <View style={styles.stack}>
        <SectionHeader title="Hoy en tu protocolo" meta="ACCION RECOMENDADA" />
        <PremiumCard style={styles.protocolCard}>
          <StatusPill label={`MODULO ${ACTIVE_MODULE.number} · ACTIVO`} />
          <Text style={styles.protocolTitle}>{ACTIVE_MODULE.title}</Text>
          <Text style={styles.protocolBody}>
            Proxima accion: completa la leccion activa y ejecuta un bloque mercader de 90 minutos sin mensajeria.
          </Text>
          <PrimaryButton label="CONTINUAR LECCION" icon="play-arrow" onPress={() => router.push({ pathname: '/module/[id]', params: { id: ACTIVE_MODULE.id } })} />
        </PremiumCard>
      </View>

      <View style={styles.stack}>
        <SectionHeader title="Mi Norte" meta="EDITABLE" />
        <PremiumCard style={styles.northCard}>
          <Text style={styles.northTitle}>{state.northStar.purpose}</Text>
          <Text style={styles.northBody}>{state.northStar.dailyReminder}</Text>
          <PrimaryButton label="EDITAR NORTE" icon="explore" onPress={() => router.push('/(tabs)/norte')} />
        </PremiumCard>
      </View>
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
  northCard: {
    gap: spacing.lg,
  },
  northTitle: {
    color: palette.ivory,
    fontFamily: Fonts.display,
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: 1.1,
    lineHeight: 26,
    textTransform: 'uppercase',
  },
  northBody: {
    ...typography.body,
    color: palette.ash,
  },
});
