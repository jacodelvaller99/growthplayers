import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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

  // ── "Valores núcleo" chips (mobile) — backed by the same `nonNegotiables`
  //    newline-string state so save() + desktop stay untouched. ──────────────
  const values = nonNegotiables
    .split('\n')
    .map((v) => v.trim())
    .filter(Boolean);
  const [addingValue, setAddingValue] = useState(false);
  const [valueDraft, setValueDraft] = useState('');

  const removeValue = (index: number) => {
    setNonNegotiables(values.filter((_, i) => i !== index).join('\n'));
  };
  const commitValue = () => {
    const v = valueDraft.trim();
    if (v) setNonNegotiables(values.length ? `${values.join('\n')}\n${v}` : v);
    setValueDraft('');
    setAddingValue(false);
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
                  <MaterialIcons name="explore" size={20} color={palette.goldText} />
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

  // ── Mobile / tablet layout ────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={sc.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={insets.top}>
    <ScrollView
      contentContainerStyle={[sc.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}
      showsVerticalScrollIndicator={false}
      bounces
      overScrollMode="never"
      keyboardShouldPersistTaps="handled">
      {/* ── Header: back → comando · título · subtítulo ── */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.replace('/(tabs)/comando')}
          accessibilityRole="button"
          accessibilityLabel="Volver al centro de comando"
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.65 }]}>
          <MaterialIcons name="arrow-back" size={20} color={palette.ash} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>MI NORTE</Text>
          <Text style={styles.headerSub}>La dirección maestra que ordena cada decisión.</Text>
        </View>
      </View>

      {/* ── Empty State CTA ── */}
      {isNorteEmpty && (
        <Pressable
          onPress={() => router.push('/(onboarding)' as never)}
          style={({ pressed }) => [styles.emptyCta, pressed && { opacity: 0.8 }]}>
          <MaterialIcons name="explore" size={20} color={palette.goldText} />
          <Text style={styles.emptyCtaText}>
            Tu Norte guía cada decisión. Configúralo ahora →
          </Text>
        </Pressable>
      )}

      {/* ── Dirección maestra ── */}
      <GoldDivider label="DIRECCIÓN MAESTRA" />
      <PremiumInput
        value={purpose}
        onChangeText={setPurpose}
        multiline
        style={styles.textArea}
        placeholder="¿Por qué operas? ¿A qué le sirves?"
        accessibilityLabel="Dirección maestra"
      />

      {/* ── Declaración de identidad ── */}
      <GoldDivider label="DECLARACIÓN DE IDENTIDAD" />
      <PremiumInput
        value={identity}
        onChangeText={setIdentity}
        style={styles.input}
        placeholder="Soy el tipo de persona que…"
        accessibilityLabel="Declaración de identidad"
      />

      {/* ── Valores núcleo (chips) ── */}
      <GoldDivider label="VALORES NÚCLEO" />
      <View style={styles.chipWrap}>
        {values.map((v, i) => (
          <Pressable
            key={`${v}-${i}`}
            onPress={() => removeValue(i)}
            accessibilityRole="button"
            accessibilityLabel={`Quitar ${v}`}
            style={({ pressed }) => [styles.chip, pressed && { opacity: 0.7 }]}>
            <Text style={styles.chipText}>{v}</Text>
            <MaterialIcons name="close" size={13} color={palette.ink} />
          </Pressable>
        ))}
        {addingValue ? (
          <View style={styles.chipInput}>
            <TextInput
              value={valueDraft}
              onChangeText={setValueDraft}
              onSubmitEditing={commitValue}
              onBlur={commitValue}
              autoFocus
              returnKeyType="done"
              placeholder="Valor…"
              placeholderTextColor={palette.smoke}
              selectionColor={palette.gold}
              style={styles.chipInputText}
              accessibilityLabel="Nuevo valor núcleo"
            />
          </View>
        ) : (
          <Pressable
            onPress={() => setAddingValue(true)}
            accessibilityRole="button"
            accessibilityLabel="Añadir valor núcleo"
            style={({ pressed }) => [styles.chipAdd, pressed && { opacity: 0.7 }]}>
            <MaterialIcons name="add" size={14} color={palette.ash} />
            <Text style={styles.chipAddText}>Añadir</Text>
          </Pressable>
        )}
      </View>

      {/* ── Recordatorio diario ── */}
      <GoldDivider label="RECORDATORIO DIARIO" />
      <PremiumInput
        value={dailyReminder}
        onChangeText={setDailyReminder}
        multiline
        style={styles.textArea}
        placeholder="La frase que te ancla cada mañana…"
        accessibilityLabel="Recordatorio diario"
      />

      <PrimaryButton
        label={saved ? 'NORTE DECLARADO' : 'GUARDAR NORTE'}
        icon={saved ? 'check-circle' : 'explore'}
        onPress={save}
      />
    </ScrollView>

    {/* ── Toast: NORTE FIJADO EN EL SISTEMA ── */}
    {saved ? (
      <View style={[styles.toast, { bottom: insets.bottom + 24 }]} pointerEvents="none">
        <MaterialIcons name="check" size={16} color={palette.ink} />
        <Text style={styles.toastText}>NORTE FIJADO EN EL SISTEMA</Text>
      </View>
    ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  // Header (mobile) — back · title · sub
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
  },
  backBtn: {
    alignItems: 'center',
    backgroundColor: palette.graphite,
    borderColor: palette.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    marginTop: 2,
    width: 40,
  },
  headerCopy: {
    flex: 1,
    gap: 6,
  },
  headerTitle: {
    ...typography.title,
    color: palette.ivory,
  },
  headerSub: {
    ...typography.body,
    color: palette.ash,
    fontSize: 13,
  },

  // Single-line field (identity)
  input: {
    minHeight: 52,
  },

  // Valores núcleo — chips
  chipWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    alignItems: 'center',
    backgroundColor: palette.gold,
    borderRadius: radii.pill,
    flexDirection: 'row',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: spacing.md,
  },
  chipText: {
    color: palette.ink,
    fontFamily: Fonts.display,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  chipAdd: {
    alignItems: 'center',
    borderColor: palette.lineHard,
    borderRadius: radii.pill,
    borderStyle: 'dashed',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: spacing.md,
  },
  chipAddText: {
    color: palette.ash,
    fontFamily: Fonts.display,
    fontSize: 12,
    letterSpacing: 0.5,
  },
  chipInput: {
    alignItems: 'center',
    borderColor: palette.lineGold,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 36,
    minWidth: 120,
    paddingHorizontal: spacing.md,
  },
  chipInputText: {
    color: palette.ivory,
    fontFamily: Fonts.sans,
    fontSize: 13,
    minWidth: 90,
    paddingVertical: 0,
  },

  // Toast — "NORTE FIJADO EN EL SISTEMA"
  toast: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: palette.gold,
    borderRadius: radii.sm,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    position: 'absolute',
  },
  toastText: {
    ...typography.label,
    color: palette.ink,
    fontSize: 10,
  },

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
    fontSize: 11,
    letterSpacing: 1,
  },
  norteScoreFull: {
    color: palette.goldText,
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
    fontFamily: Fonts.display,
    fontWeight: '700',
    color: palette.ash,
    fontSize: 11,
    letterSpacing: 1.8,
    textTransform: 'uppercase' as const,
    lineHeight: 15,
  },
  reminderText: {
    ...typography.body,
    color: palette.ivoryDim,
    fontStyle: 'italic',
  },

  savedToast: {
    color: palette.goldText,
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
    fontWeight: '600',
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
    fontFamily: Fonts.display,
    fontWeight: '700',
    color: palette.ash,
    fontSize: 11,
    letterSpacing: 1.8,
    textTransform: 'uppercase' as const,
    lineHeight: 15,
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  suggestionText: {
    color: palette.goldText,
    fontFamily: Fonts.sans,
    fontSize: 12,
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
    color: palette.goldText,
    flex: 1,
    fontWeight: '600',
  },
});
