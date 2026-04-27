import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  AppHeader,
  GoldAccentCard,
  GoldDivider,
  PremiumCard,
  PremiumInput,
  PrimaryButton,
  ScaleSelector,
  SecondaryButton,
  screen,
} from '@/components/polaris';
import { Fonts, palette, spacing, typography } from '@/constants/theme';
import { useLifeFlow } from '@/hooks/use-lifeflow';

function todayLabel() {
  return new Date()
    .toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
    .toUpperCase();
}

export default function CheckInScreen() {
  const router = useRouter();
  const { todayCheckIn, saveCheckIn } = useLifeFlow();
  const [energy, setEnergy] = useState(todayCheckIn?.energy ?? 7);
  const [clarity, setClarity] = useState(todayCheckIn?.clarity ?? 7);
  const [stress, setStress] = useState(todayCheckIn?.stress ?? 4);
  const [sleep, setSleep] = useState(todayCheckIn?.sleep ?? 7);
  const [systemNeed, setSystemNeed] = useState(todayCheckIn?.systemNeed ?? '');

  // Real-time coherence score
  const coherence = Math.round((energy + clarity + sleep + (11 - stress)) / 4);
  const coherenceStrong = coherence >= 7;
  const coherenceLabel =
    coherence >= 8
      ? 'SISTEMA EN ESTADO OPTIMO'
      : coherence >= 6
        ? 'SISTEMA OPERATIVO · CALIBRAR'
        : coherence >= 4
          ? 'SISTEMA BAJO · AJUSTA HOY'
          : 'SISTEMA CRITICO · PRIORIZA RECUPERACION';

  const submit = async () => {
    await saveCheckIn({
      energy,
      clarity,
      stress,
      sleep,
      systemNeed: systemNeed.trim() || 'Orden, foco y ejecucion sin ruido.',
    });
    router.replace('/(tabs)/comando');
  };

  return (
    <ScrollView style={screen.root} contentContainerStyle={screen.content}>
      <AppHeader title="CHECK-IN DIARIO" />

      {/* ── Intro ── */}
      <GoldAccentCard>
        <Text style={styles.dateLabel}>{todayLabel()}</Text>
        <Text style={styles.introTitle}>LEE EL{'\n'}SISTEMA.</Text>
        <Text style={styles.introBody}>
          Esta medicion calibra tu dashboard, mentor y score soberano. La honestidad aqui es una
          ventaja competitiva.
        </Text>
      </GoldAccentCard>

      {/* ── Biometrics ── */}
      <GoldDivider label="BIOMETRIA" />
      <PremiumCard style={styles.card}>
        <ScaleSelector label="ENERGIA" value={energy} onChange={setEnergy} icon="bolt" />
        <ScaleSelector
          label="CLARIDAD MENTAL"
          value={clarity}
          onChange={setClarity}
          icon="center-focus-strong"
        />
        <ScaleSelector
          label="ESTRES"
          value={stress}
          onChange={setStress}
          icon="device-thermostat"
        />
        <ScaleSelector label="CALIDAD DE SUEÑO" value={sleep} onChange={setSleep} icon="bedtime" />
      </PremiumCard>

      {/* ── Real-time Coherence Preview ── */}
      <PremiumCard style={styles.coherenceCard}>
        <Text style={styles.coherenceEyebrow}>COHERENCIA DEL SISTEMA</Text>
        <View style={styles.coherenceRow}>
          <Text style={[styles.coherenceScore, coherenceStrong && styles.coherenceScoreStrong]}>
            {coherence}
          </Text>
          <Text style={styles.coherenceDenom}>/10</Text>
        </View>
        <View style={styles.coherenceTrack}>
          <View
            style={[
              styles.coherenceFill,
              {
                width: `${coherence * 10}%`,
                backgroundColor: coherenceStrong ? palette.gold : palette.smoke,
              },
            ]}
          />
        </View>
        <Text style={[styles.coherenceStatus, coherenceStrong && { color: palette.gold }]}>
          {coherenceLabel}
        </Text>
      </PremiumCard>

      {/* ── System Need ── */}
      <GoldDivider label="LECTURA INTERNA" />
      <PremiumCard style={styles.card}>
        <Text style={styles.systemLabel}>QUE NECESITA TU SISTEMA HOY</Text>
        <PremiumInput
          value={systemNeed}
          onChangeText={setSystemNeed}
          placeholder="Escribe una lectura honesta de lo que necesitas..."
          multiline
          style={styles.textArea}
          accessibilityLabel="Que necesita tu sistema hoy"
        />
      </PremiumCard>

      <PrimaryButton label="GUARDAR CHECK-IN" icon="check" onPress={submit} />
      <SecondaryButton label="VOLVER" icon="close" onPress={() => router.back()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Intro
  dateLabel: {
    ...typography.mono,
    color: palette.gold,
  },
  introTitle: {
    color: palette.ivory,
    fontFamily: Fonts.display,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 0.5,
    lineHeight: 30,
    textTransform: 'uppercase',
  },
  introBody: {
    ...typography.body,
    color: palette.ash,
    fontSize: 14,
    lineHeight: 22,
  },

  // Biometrics card
  card: {
    gap: spacing.xl,
  },

  // Coherence
  coherenceCard: {
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  coherenceEyebrow: {
    ...typography.label,
    color: palette.ash,
  },
  coherenceRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 4,
  },
  coherenceScore: {
    color: palette.smoke,
    fontFamily: Fonts.display,
    fontSize: 56,
    fontWeight: '800',
    letterSpacing: -1,
    lineHeight: 60,
  },
  coherenceScoreStrong: {
    color: palette.gold,
  },
  coherenceDenom: {
    ...typography.body,
    color: palette.ash,
    marginBottom: 10,
  },
  coherenceTrack: {
    backgroundColor: palette.charcoal,
    height: 2,
    overflow: 'hidden',
    width: '100%',
  },
  coherenceFill: {
    height: '100%',
  },
  coherenceStatus: {
    ...typography.mono,
    color: palette.smoke,
  },

  // System need
  systemLabel: {
    ...typography.label,
    color: palette.gold,
  },
  textArea: {
    minHeight: 110,
    paddingTop: spacing.lg,
    textAlignVertical: 'top',
  },
});
