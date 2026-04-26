import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader, PremiumCard, PremiumInput, PrimaryButton, SectionHeader, StatusPill, screen } from '@/components/polaris';
import { palette, spacing, typography } from '@/constants/theme';
import { useLifeFlow } from '@/hooks/use-lifeflow';

export default function NorteScreen() {
  const { state, updateNorthStar } = useLifeFlow();
  const [purpose, setPurpose] = useState(state.northStar.purpose);
  const [identity, setIdentity] = useState(state.northStar.identity);
  const [dailyReminder, setDailyReminder] = useState(state.northStar.dailyReminder);
  const [nonNegotiables, setNonNegotiables] = useState(state.northStar.nonNegotiables.join('\n'));

  const save = () =>
    updateNorthStar({
      purpose,
      identity,
      dailyReminder,
      nonNegotiables: nonNegotiables
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean),
    });

  return (
    <ScrollView style={screen.root} contentContainerStyle={screen.content}>
      <AppHeader title="MI NORTE" />
      <PremiumCard style={styles.statementCard}>
        <StatusPill label="DIRECCION MAESTRA" />
        <Text style={styles.statement}>{purpose}</Text>
        <Text style={styles.body}>{identity}</Text>
      </PremiumCard>

      <View style={styles.section}>
        <SectionHeader title="Editar Norte" meta="LOCAL" />
        <PremiumCard style={styles.form}>
          <Text style={styles.label}>Proposito principal</Text>
          <PremiumInput value={purpose} onChangeText={setPurpose} multiline style={styles.textArea} />
          <Text style={styles.label}>Declaracion de identidad</Text>
          <PremiumInput value={identity} onChangeText={setIdentity} multiline style={styles.textArea} />
          <Text style={styles.label}>No negociables</Text>
          <PremiumInput value={nonNegotiables} onChangeText={setNonNegotiables} multiline style={styles.textArea} />
          <Text style={styles.label}>Recordatorio diario</Text>
          <PremiumInput value={dailyReminder} onChangeText={setDailyReminder} multiline style={styles.textArea} />
          <PrimaryButton label="GUARDAR NORTE" icon="check" onPress={save} />
        </PremiumCard>
      </View>

      <View style={styles.section}>
        <SectionHeader title="No negociables" />
        {state.northStar.nonNegotiables.map((item, index) => (
          <PremiumCard key={`${item}-${index}`} style={styles.ruleCard}>
            <Text style={styles.ruleIndex}>0{index + 1}</Text>
            <Text style={styles.ruleText}>{item}</Text>
          </PremiumCard>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  statementCard: {
    gap: spacing.lg,
  },
  statement: {
    ...typography.hero,
    color: palette.ivory,
  },
  body: {
    ...typography.body,
    color: palette.ash,
  },
  section: {
    gap: spacing.md,
  },
  form: {
    gap: spacing.md,
  },
  label: {
    ...typography.label,
    color: palette.gold,
  },
  textArea: {
    minHeight: 78,
    paddingTop: spacing.md,
    textAlignVertical: 'top',
  },
  ruleCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  ruleIndex: {
    ...typography.mono,
    color: palette.gold,
  },
  ruleText: {
    ...typography.section,
    color: palette.ivory,
    flex: 1,
  },
});
