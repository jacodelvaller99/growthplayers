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
  useScreen,
} from '@/components/polaris';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useLifeFlow } from '@/hooks/use-lifeflow';

export default function NorteScreen() {
  const sc = useScreen();
  const { isDesktop } = useBreakpoint();
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
  const [saved, setSaved] = useState(false);

  // Norte completeness — 4 fields, each contributes 25%
  const norteScore = [
    purpose.trim().length > 0,
    identity.trim().length > 0,
    dailyReminder.trim().length > 0,
    nonNegotiables.trim().length > 0,
  ].filter(Boolean).length * 25;

  const save = async () => {
    await updateNorthStar({
      purpose,
      identity,
      dailyReminder,
      nonNegotiables: nonNegotiables
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  // ── Desktop layout ────────────────────────────────────────────────────────
  if (isDesktop) {
    return (
      <KeyboardAvoidingView style={sc.root} behavior="padding">
        <ScrollView
          contentContainerStyle={styles.contentDesktop}
          showsVerticalScrollIndicator={false}
          bounces
          overScrollMode="never"
          keyboardShouldPersistTaps="handled">
          <AppHeader title="MI NORTE" />
          <View style={styles.desktopGrid}>
            {/* ── Left column: preview ── */}
            <View style={styles.desktopLeft}>
              <GoldAccentCard>
                <View style={styles.northHeader}>
                  <StatusPill label="DIRECCIÓN MAESTRA" dot />
                  <Text style={[styles.norteScore, norteScore === 100 && styles.norteScoreFull]}>
                    {norteScore}% DEFINIDO
                  </Text>
                </View>
                <Text style={styles.purposeStatement}>
                  {purpose || 'Define tu propósito principal'}
                </Text>
                <Text style={styles.identityStatement}>
                  {identity || 'Define tu identidad'}
                </Text>
              </GoldAccentCard>

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

              {state.northStar.dailyReminder ? (
                <PremiumCard style={styles.reminderCard}>
                  <Text style={styles.reminderLabel}>RECORDATORIO DIARIO</Text>
                  <Text style={styles.reminderText}>{state.northStar.dailyReminder}</Text>
                </PremiumCard>
              ) : null}

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
            </View>

            {/* ── Right column: edit form ── */}
            <View style={styles.desktopRight}>
              <GoldDivider label="EDITAR NORTE" />
              <PremiumCard style={styles.form}>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>PROPÓSITO PRINCIPAL</Text>
                  <PremiumInput
                    value={purpose}
                    onChangeText={setPurpose}
                    multiline
                    style={styles.textArea}
                    placeholder="¿Por qué operas a este nivel?"
                    accessibilityLabel="Propósito principal"
                  />
                </View>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>DECLARACIÓN DE IDENTIDAD</Text>
                  <PremiumInput
                    value={identity}
                    onChangeText={setIdentity}
                    multiline
                    style={styles.textArea}
                    placeholder="Soy alguien que..."
                    accessibilityLabel="Declaración de identidad"
                  />
                </View>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>NO NEGOCIABLES · UNO POR LÍNEA</Text>
                  {!nonNegotiables.trim() && (
                    <View style={styles.promptSuggestions}>
                      {['Mi salud es primero', 'No trabajo los domingos', 'Tiempo con familia intocable', 'Sin deudas por consumo'].map((s) => (
                        <Pressable
                          key={s}
                          onPress={() => setNonNegotiables((prev) => prev ? `${prev}\n${s}` : s)}
                          style={({ pressed }) => [styles.suggestionPill, pressed && { opacity: 0.7 }]}>
                          <Text style={styles.suggestionText}>+ {s}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
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
                <PrimaryButton
                  label={saved ? 'NORTE DECLARADO ✓' : 'GUARDAR NORTE'}
                  icon={saved ? 'check-circle' : 'check'}
                  onPress={save}
                />
                {saved ? (
                  <Text style={styles.savedToast}>
                    Declarado. El protocolo ahora opera hacia este norte.
                  </Text>
                ) : null}
              </PremiumCard>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── Mobile / tablet layout (unchanged) ───────────────────────────────────
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
      <AppHeader title="MI NORTE" />

      {/* ── Purpose Display ── */}
      <GoldAccentCard>
        <View style={styles.northHeader}>
          <StatusPill label="DIRECCIÓN MAESTRA" dot />
          <Text style={[styles.norteScore, norteScore === 100 && styles.norteScoreFull]}>
            {norteScore}% DEFINIDO
          </Text>
        </View>
        <Text style={styles.purposeStatement}>{purpose || 'Define tu propósito principal'}</Text>
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
          <Text style={styles.fieldLabel}>PROPÓSITO PRINCIPAL</Text>
          <PremiumInput
            value={purpose}
            onChangeText={setPurpose}
            multiline
            style={styles.textArea}
            placeholder="¿Por qué operas a este nivel?"
            accessibilityLabel="Propósito principal"
          />
        </View>
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>DECLARACIÓN DE IDENTIDAD</Text>
          <PremiumInput
            value={identity}
            onChangeText={setIdentity}
            multiline
            style={styles.textArea}
            placeholder="Soy alguien que..."
            accessibilityLabel="Declaración de identidad"
          />
        </View>
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>NO NEGOCIABLES · UNO POR LÍNEA</Text>
          {!nonNegotiables.trim() && (
            <View style={styles.promptSuggestions}>
              {['Mi salud es primero', 'No trabajo los domingos', 'Tiempo con familia intocable', 'Sin deudas por consumo'].map((s) => (
                <Pressable
                  key={s}
                  onPress={() => setNonNegotiables((prev) => prev ? `${prev}\n${s}` : s)}
                  style={({ pressed }) => [styles.suggestionPill, pressed && { opacity: 0.7 }]}>
                  <Text style={styles.suggestionText}>+ {s}</Text>
                </Pressable>
              ))}
            </View>
          )}
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
        <PrimaryButton
          label={saved ? 'NORTE DECLARADO ✓' : 'GUARDAR NORTE'}
          icon={saved ? 'check-circle' : 'check'}
          onPress={save}
        />
        {saved ? (
          <Text style={styles.savedToast}>
            Declarado. El protocolo ahora opera hacia este norte.
          </Text>
        ) : null}
      </PremiumCard>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  // Desktop layout
  contentDesktop: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 1200,
    paddingHorizontal: 40,
    paddingTop: 32,
    paddingBottom: 60,
    gap: 24,
  },
  desktopGrid: {
    flexDirection: 'row',
    gap: 32,
    alignItems: 'flex-start',
  },
  desktopLeft: {
    flex: 1,
    gap: 16,
  },
  desktopRight: {
    flex: 1,
    gap: 16,
  },

  // North header
  northHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  norteScore: {
    ...typography.mono,
    color: palette.smoke,
    fontSize: 9,
    letterSpacing: 1,
  },
  norteScoreFull: {
    color: palette.gold,
  },

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

  savedToast: {
    color: palette.gold,
    fontFamily: Fonts.sans,
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 18,
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

  // Non-negotiables suggestion pills
  promptSuggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  suggestionPill: {
    backgroundColor: 'rgba(201,160,0,0.08)',
    borderColor: palette.gold + '44',
    borderRadius: radii.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  suggestionText: {
    color: palette.gold,
    fontFamily: Fonts.sans,
    fontSize: 11,
    lineHeight: 16,
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
