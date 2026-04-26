import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { POLARIS_MODULES } from '@/data/modules';
import { EditorialPanel, PremiumCard, PremiumInput, PrimaryButton, SecondaryButton, StatusPill, screen } from '@/components/polaris';
import { palette, spacing, typography } from '@/constants/theme';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import type { NorthStar } from '@/types/lifeflow';

const programs = [
  { id: 'protocolo-soberano', label: 'PROTOCOLO SOBERANO', meta: '90 DIAS · EJECUCION INTEGRAL' },
  { id: 'mercader', label: 'MERCADER', meta: 'TIEMPO · CAPITAL · FOCO' },
  { id: 'elite-os', label: 'ELITE OPERATING SYSTEM', meta: 'SISTEMA AVANZADO' },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { completeOnboarding, state } = useLifeFlow();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(state.profile.name);
  const [role, setRole] = useState(state.profile.role);
  const [program, setProgram] = useState(state.activeProgramId);
  const [north, setNorth] = useState<NorthStar>(state.northStar);

  const finish = async () => {
    await completeOnboarding({
      profile: { name: name.trim() || 'Juan Carlos', role: role.trim() || 'Empresario' },
      activeProgramId: program,
      northStar: north,
    });
    router.replace('/(tabs)/comando');
  };

  return (
    <ScrollView style={screen.root} contentContainerStyle={screen.content}>
      <View style={styles.progressRail}>
        {[0, 1, 2, 3].map((item) => (
          <View key={item} style={[styles.progressSegment, item <= step && styles.progressSegmentActive]} />
        ))}
      </View>

      {step === 0 ? (
        <EditorialPanel
          eyebrow="LIFEFLOW / POLARIS"
          title="TU SALA DE MANDO PERSONAL."
          body="Configura direccion, programa y cadencia. Esta app no busca calmarte: busca convertir tu estado interno en ejecucion visible.">
          <PrimaryButton label="COMENZAR ACTIVACION" icon="arrow-forward" onPress={() => setStep(1)} />
        </EditorialPanel>
      ) : null}

      {step === 1 ? (
        <PremiumCard style={styles.formCard}>
          <StatusPill label="SETUP INICIAL" />
          <Text style={styles.title}>IDENTIDAD DEL OPERADOR</Text>
          <PremiumInput value={name} onChangeText={setName} placeholder="NOMBRE" />
          <PremiumInput value={role} onChangeText={setRole} placeholder="ROL / IDENTIDAD" />
          <View style={styles.actions}>
            <SecondaryButton label="ATRAS" onPress={() => setStep(0)} />
            <PrimaryButton label="CONTINUAR" icon="arrow-forward" onPress={() => setStep(2)} />
          </View>
        </PremiumCard>
      ) : null}

      {step === 2 ? (
        <View style={styles.stack}>
          <Text style={screen.sectionTitle}>SELECCIONA PROGRAMA</Text>
          {programs.map((item) => (
            <PremiumCard key={item.id} style={[styles.optionCard, program === item.id && styles.optionActive]}>
              <Text style={styles.optionTitle} onPress={() => setProgram(item.id)}>
                {item.label}
              </Text>
              <Text style={styles.optionMeta}>{item.meta}</Text>
            </PremiumCard>
          ))}
          <View style={styles.actions}>
            <SecondaryButton label="ATRAS" onPress={() => setStep(1)} />
            <PrimaryButton label="CONTINUAR" icon="arrow-forward" onPress={() => setStep(3)} />
          </View>
        </View>
      ) : null}

      {step === 3 ? (
        <PremiumCard style={styles.formCard}>
          <StatusPill label={`MODULO ACTIVO ${POLARIS_MODULES[5].number}`} />
          <Text style={styles.title}>DEFINE TU NORTE</Text>
          <PremiumInput value={north.purpose} onChangeText={(purpose) => setNorth({ ...north, purpose })} multiline />
          <PremiumInput value={north.identity} onChangeText={(identity) => setNorth({ ...north, identity })} multiline />
          <PremiumInput value={north.dailyReminder} onChangeText={(dailyReminder) => setNorth({ ...north, dailyReminder })} multiline />
          <View style={styles.actions}>
            <SecondaryButton label="ATRAS" onPress={() => setStep(2)} />
            <PrimaryButton label="ACTIVAR LIFEFLOW" icon="check" onPress={finish} />
          </View>
        </PremiumCard>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  progressRail: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  progressSegment: {
    backgroundColor: palette.charcoal,
    flex: 1,
    height: 3,
  },
  progressSegmentActive: {
    backgroundColor: palette.gold,
  },
  stack: {
    gap: spacing.md,
  },
  formCard: {
    gap: spacing.lg,
  },
  title: {
    ...typography.title,
    color: palette.ivory,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  optionCard: {
    gap: spacing.sm,
  },
  optionActive: {
    borderColor: palette.gold,
  },
  optionTitle: {
    ...typography.section,
    color: palette.ivory,
  },
  optionMeta: {
    ...typography.mono,
    color: palette.gold,
  },
});
