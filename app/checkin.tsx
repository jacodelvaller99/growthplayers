import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { AppHeader, PremiumCard, PremiumInput, PrimaryButton, ScaleSelector, SecondaryButton, screen } from '@/components/polaris';
import { palette, spacing, typography } from '@/constants/theme';
import { useLifeFlow } from '@/hooks/use-lifeflow';

export default function CheckInScreen() {
  const router = useRouter();
  const { todayCheckIn, saveCheckIn } = useLifeFlow();
  const [energy, setEnergy] = useState(todayCheckIn?.energy ?? 7);
  const [clarity, setClarity] = useState(todayCheckIn?.clarity ?? 7);
  const [stress, setStress] = useState(todayCheckIn?.stress ?? 4);
  const [sleep, setSleep] = useState(todayCheckIn?.sleep ?? 7);
  const [systemNeed, setSystemNeed] = useState(todayCheckIn?.systemNeed ?? '');

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
      <Text style={styles.intro}>Lee el sistema antes de exigirle rendimiento. Esta medicion calibra dashboard, mentor y progreso.</Text>

      <PremiumCard style={styles.card}>
        <ScaleSelector label="Energia" value={energy} onChange={setEnergy} />
        <ScaleSelector label="Claridad" value={clarity} onChange={setClarity} />
        <ScaleSelector label="Estres" value={stress} onChange={setStress} />
        <ScaleSelector label="Sueño" value={sleep} onChange={setSleep} />
      </PremiumCard>

      <PremiumCard style={styles.card}>
        <Text style={styles.label}>QUE NECESITA TU SISTEMA HOY</Text>
        <PremiumInput value={systemNeed} onChangeText={setSystemNeed} placeholder="ESCRIBE UNA LECTURA HONESTA..." multiline style={styles.textArea} />
      </PremiumCard>

      <PrimaryButton label="GUARDAR CHECK-IN" icon="check" onPress={submit} />
      <SecondaryButton label="VOLVER" icon="close" onPress={() => router.back()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  intro: {
    ...typography.body,
    color: palette.ash,
  },
  card: {
    gap: spacing.xl,
  },
  label: {
    ...typography.label,
    color: palette.gold,
  },
  textArea: {
    minHeight: 110,
    paddingTop: spacing.lg,
    textAlignVertical: 'top',
  },
});
