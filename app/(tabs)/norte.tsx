import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppHeader,
  GoldAccentCard,
  GoldDivider,
  PremiumCard,
  PremiumInput,
  PrimaryButton,
  StatusPill,
  screen,
} from '@/components/polaris';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { useLifeFlow } from '@/hooks/use-lifeflow';

export default function NorteScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, updateNorthStar } = useLifeFlow();
  const [purpose, setPurpose] = useState(state.northStar.purpose);
  const [identity, setIdentity] = useState(state.northStar.identity);
  const [dailyReminder, setDailyReminder] = useState(state.northStar.dailyReminder);
  const [nonNegotiables, setNonNegotiables] = useState(
    state.northStar.nonNegotiables.join('\n'),
  );

  const isNorteEmpty = !purpose.trim() && !identity.trim();

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
      <AppHeader title="MI NORTE" />

      {/* ── Purpose Display ── */}
      <GoldAccentCard>
        <StatusPill label="DIRECCION MAESTRA" dot />
        <Text style={styles.purposeStatement}>{purpose || 'Define tu proposito principal'}</Text>
        <Text style={styles.identityStatement}>{identity || 'Define tu identidad'}</Text>
      </GoldAccentCard>

      {/* ── Empty State CTA ── */}
      {isNorteEmpty && (
        <Pressable
          onPress={() => router.push('/(onboarding)' as never)}
          style={({ pressed }) => [styles.emptyCta, pressed && { opacity: 0.8 }]}>
          <MaterialIcons name="explore" size={20} color={palette.gold} />
          <Text style={styles.emptyCtaText}>
            Tu Norte guía cada decisión. Configúralo ahora →
          </Text>
        </Pressable>
      )}

      {/* ── Daily Reminder ── */}
      {state.northStar.dailyReminder ? (
        <PremiumCard style={styles.reminderCard}>
          <Text style={styles.reminderLabel}>RECORDATORIO DIARIO</Text>
          <Text style={styles.reminderText}>{state.northStar.dailyReminder}</Text>
        </PremiumCard>
      ) : null}

      {/* ── Non-Negotiables ── */}
      {state.northStar.nonNegotiables.length > 0 && (
        <>
          <GoldDivider label="NO NEGOCIABLES" />
          <View style={styles.ruleList}>
            {state.northStar.nonNegotiables.map((item, index) => (
              <PremiumCard key={`${item}-${index}`} style={styles.ruleCard}>
                <Text style={styles.ruleIndex}>
                  {String(index + 1).padStart(2, '0')}
                </Text>
                <Text style={styles.ruleText}>{item}</Text>
              </PremiumCard>
            ))}
          </View>
        </>
      )}

      {/* ── Edit Form ── */}
      <GoldDivider label="EDITAR NORTE" />
      <PremiumCard style={styles.form}>
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>PROPOSITO PRINCIPAL</Text>
          <PremiumInput
            value={purpose}
            onChangeText={setPurpose}
            multiline
            style={styles.textArea}
            placeholder="¿Por que operas a este nivel?"
            accessibilityLabel="Proposito principal"
          />
        </View>
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>DECLARACION DE IDENTIDAD</Text>
          <PremiumInput
            value={identity}
            onChangeText={setIdentity}
            multiline
            style={styles.textArea}
            placeholder="Soy alguien que..."
            accessibilityLabel="Declaracion de identidad"
          />
        </View>
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>NO NEGOCIABLES · UNO POR LINEA</Text>
          <PremiumInput
            value={nonNegotiables}
            onChangeText={setNonNegotiables}
            multiline
            style={styles.textAreaLarge}
            placeholder="Primer principio&#10;Segundo principio&#10;..."
            accessibilityLabel="No negociables"
          />
        </View>
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>RECORDATORIO DIARIO</Text>
          <PremiumInput
            value={dailyReminder}
            onChangeText={setDailyReminder}
            multiline
            style={styles.textArea}
            placeholder="La frase que te ancla cada mañana..."
            accessibilityLabel="Recordatorio diario"
          />
        </View>
        <PrimaryButton label="GUARDAR NORTE" icon="check" onPress={save} />
      </PremiumCard>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  // Purpose display
  purposeStatement: {
    color: palette.ivory,
    fontFamily: Fonts.display,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
    lineHeight: 28,
    textTransform: 'uppercase',
  },
  identityStatement: {
    ...typography.body,
    color: palette.ash,
  },

  // Daily reminder
  reminderCard: {
    gap: spacing.sm,
  },
  reminderLabel: {
    ...typography.label,
    color: palette.ash,
  },
  reminderText: {
    ...typography.body,
    color: palette.ivoryDim,
    fontStyle: 'italic',
  },

  // Non-negotiables
  ruleList: {
    gap: spacing.sm,
  },
  ruleCard: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
  },
  ruleIndex: {
    color: palette.smoke,
    fontFamily: Fonts.mono,
    fontSize: 11,
    lineHeight: 22,
    minWidth: 22,
  },
  ruleText: {
    ...typography.section,
    color: palette.ivory,
    flex: 1,
    fontWeight: '400',
    letterSpacing: 0.5,
    textTransform: 'none',
  },

  // Edit form
  form: {
    gap: spacing.lg,
  },
  fieldGroup: {
    gap: spacing.sm,
  },
  fieldLabel: {
    ...typography.label,
    color: palette.ash,
  },
  textArea: {
    minHeight: 78,
    paddingTop: spacing.md,
    textAlignVertical: 'top',
  },
  textAreaLarge: {
    minHeight: 110,
    paddingTop: spacing.md,
    textAlignVertical: 'top',
  },

  // Empty state CTA
  emptyCta: {
    alignItems: 'center',
    borderColor: palette.gold,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    backgroundColor: 'rgba(201, 160, 0, 0.08)',
  },
  emptyCtaText: {
    ...typography.body,
    color: palette.gold,
    flex: 1,
    fontWeight: '600',
  },
});
