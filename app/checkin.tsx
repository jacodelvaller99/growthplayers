import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
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
  ScaleSelector,
  SecondaryButton,
  screen,
  useScreen,
} from '@/components/polaris';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { analytics } from '@/lib/analytics';

function todayLabel() {
  return new Date()
    .toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
    .toUpperCase();
}

const CHECK_IN_TITLES = [
  'LEE EL\nSISTEMA.',
  'AUDITA\nTU ESTADO.',
  'CALIBRA\nEL SISTEMA.',
  'MIDE EL\nTERRENo.',
  'ENTRA\nEN DATA.',
  'REGISTRA\nLA SEÑAL.',
  'VERIFICA\nTU BASE.',
];

function checkInTitle(streak: number): string {
  const idx = streak % CHECK_IN_TITLES.length;
  return CHECK_IN_TITLES[idx];
}

export default function CheckInScreen() {
  const sc = useScreen();
  const { isDesktop } = useBreakpoint();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { todayCheckIn, saveCheckIn, state } = useLifeFlow();

  // Streak data for protection warning
  const streak = (() => {
    const sorted = [...state.checkIns].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const today = new Date(); today.setHours(0,0,0,0);
    let s = 0; let cursor = new Date(today);
    for (const ci of sorted) {
      const d = new Date(ci.date); d.setHours(0,0,0,0);
      if (d.getTime() === cursor.getTime()) { s++; cursor.setDate(cursor.getDate() - 1); }
      else if (d.getTime() < cursor.getTime()) break;
    }
    return s;
  })();
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
      ? 'CAPACIDAD MAXIMA · EJECUTA SIN LIMITE'
      : coherence >= 6
        ? 'SISTEMA OPERATIVO · CALIBRA Y MUEVE'
        : coherence >= 4
          ? 'CARGA ALTA · UN FOCO, UNA ACCIÓN'
          : 'MODO RECUPERACION · PRIMERO EL SISTEMA';

  // Stress as intelligence — never a failure
  const stressReading =
    stress >= 8
      ? `Estrés ${stress}/10 — tu sistema reconoce un desafío real. Eso es información, no debilidad.`
      : stress >= 6
        ? `Estrés ${stress}/10 — carga moderada activa. Opera con claridad sobre tus prioridades.`
        : stress <= 3
          ? `Estrés ${stress}/10 — sistema en calma. Condiciones óptimas para trabajo profundo.`
          : null;

  const submit = async () => {
    await saveCheckIn({
      energy,
      clarity,
      stress,
      sleep,
      systemNeed: systemNeed.trim() || 'Orden, foco y ejecucion sin ruido.',
    });
    analytics.checkinSubmit(energy, clarity, stress, sleep);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace('/(tabs)/comando');
  };

  // ── Shared JSX blocks ──────────────────────────────────────────────────────
  // Desktop variant — vertical stack (number on top of bar)
  const coherenceCard = (
    <PremiumCard style={styles.coherenceCard}>
      <Text style={styles.coherenceEyebrow}>ÍNDICE DE CAPACIDAD HOY</Text>
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
              width: `${coherence * 10}%` as `${number}%`,
              backgroundColor: coherenceStrong ? palette.gold : palette.smoke,
            },
          ]}
        />
      </View>
      <Text style={[styles.coherenceStatus, coherenceStrong && { color: palette.gold }]}>
        {coherenceLabel}
      </Text>
      {stressReading ? (
        <Text style={styles.stressReading}>{stressReading}</Text>
      ) : null}
    </PremiumCard>
  );

  // Mobile variant — "ÍNDICE DE CAPACIDAD" card: big number/10 on the left,
  // progress + status on the right (matches mobile prototype composition).
  const capacityCardMobile = (
    <PremiumCard style={styles.capacityCard}>
      <View style={styles.capacityScoreCol}>
        <View style={styles.coherenceRow}>
          <Text style={[styles.capacityScore, coherenceStrong && styles.coherenceScoreStrong]}>
            {coherence}
          </Text>
          <Text style={styles.capacityDenom}>/10</Text>
        </View>
        <Text style={styles.capacityEyebrow}>ÍNDICE DE CAPACIDAD</Text>
      </View>
      <View style={styles.capacityMeterCol}>
        <View style={styles.coherenceTrack}>
          <View
            style={[
              styles.coherenceFill,
              {
                width: `${coherence * 10}%` as `${number}%`,
                backgroundColor: coherenceStrong ? palette.gold : palette.smoke,
              },
            ]}
          />
        </View>
        <Text style={[styles.capacityStatus, coherenceStrong && { color: palette.gold }]}>
          {coherenceLabel}
        </Text>
        {stressReading ? <Text style={styles.stressReading}>{stressReading}</Text> : null}
      </View>
    </PremiumCard>
  );

  const systemNeedSuggestions =
    stress >= 7
      ? ['Decomprimirme antes de arrancar', 'Espacio para procesar sin decidir', 'Un solo foco hoy']
      : energy <= 4
        ? ['Mínimo viable hoy — una acción', 'Descanso sin culpa esta tarde', 'Apagar lo no urgente']
        : ['Claridad sobre mis prioridades', 'Foco sin interrupciones', 'Ejecutar sin analizar de más'];

  const systemNeedCard = (
    <PremiumCard style={styles.card}>
      <Text style={styles.systemLabel}>LECTURA DEL SISTEMA</Text>
      {!systemNeed.trim() && (
        <View style={styles.needSuggestions}>
          {systemNeedSuggestions.map((s) => (
            <Pressable
              key={s}
              onPress={() => setSystemNeed(s)}
              style={({ pressed }) => [styles.needPill, pressed && { opacity: 0.7 }]}>
              <Text style={styles.needPillText}>+ {s}</Text>
            </Pressable>
          ))}
        </View>
      )}
      <PremiumInput
        value={systemNeed}
        onChangeText={setSystemNeed}
        placeholder="¿Qué necesita tu sistema para operar bien hoy?"
        multiline
        style={styles.textArea}
        accessibilityLabel="Que necesita tu sistema hoy"
      />
    </PremiumCard>
  );

  // ── Desktop layout ──────────────────────────────────────────────────────────
  if (isDesktop) {
    return (
      <KeyboardAvoidingView
        style={sc.root}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={insets.top}>
        <ScrollView
          contentContainerStyle={[styles.contentDesktop, { paddingTop: insets.top + 32 }]}
          showsVerticalScrollIndicator={false}
          bounces
          overScrollMode="never"
          keyboardShouldPersistTaps="handled">
          <AppHeader title="CHECK-IN DIARIO" />

          <View style={styles.desktopGrid}>
            {/* ── Left column: Biometría ── */}
            <View style={styles.desktopLeft}>
              <GoldAccentCard>
                <Text style={styles.dateLabel}>{todayLabel()}</Text>
                <Text style={styles.introTitle}>{checkInTitle(streak)}</Text>
                <Text style={styles.introBody}>
                  Esta medición calibra tu dashboard, mentor y score soberano. La honestidad aquí es
                  una ventaja competitiva.
                </Text>
              </GoldAccentCard>

              <GoldDivider label="BIOMETRÍA" />

              <PremiumCard style={styles.card}>
                <ScaleSelector label="ENERGÍA" value={energy} onChange={setEnergy} icon="bolt" />
                <ScaleSelector
                  label="CLARIDAD MENTAL"
                  value={clarity}
                  onChange={setClarity}
                  icon="center-focus-strong"
                />
                <ScaleSelector
                  label="ESTRÉS"
                  value={stress}
                  onChange={setStress}
                  icon="device-thermostat"
                />
                <ScaleSelector
                  label="CALIDAD DE SUEÑO"
                  value={sleep}
                  onChange={setSleep}
                  icon="bedtime"
                />
              </PremiumCard>
            </View>

            {/* ── Right column: Coherencia + Necesidad ── */}
            <View style={styles.desktopRight}>
              {coherenceCard}

              <GoldDivider label="LECTURA INTERNA" />

              {systemNeedCard}

              <PrimaryButton label="GUARDAR CHECK-IN" icon="check" onPress={submit} />
              <SecondaryButton label="VOLVER" icon="close" onPress={() => router.back()} />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── Mobile layout ───────────────────────────────────────────────────────────
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
      {/* ── Header: back → comando · fecha · título ── */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.replace('/(tabs)/comando')}
          accessibilityRole="button"
          accessibilityLabel="Volver al centro de comando"
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.65 }]}>
          <MaterialIcons name="arrow-back" size={20} color={palette.ash} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.dateLabel}>{todayLabel()}</Text>
          <Text style={styles.headerTitle}>CHECK-IN DIARIO</Text>
        </View>
      </View>

      {/* ── Intro: "LEE EL SISTEMA." ── */}
      <GoldAccentCard>
        {streak >= 3 && (
          <View style={styles.streakRow}>
            <MaterialIcons name="local-fire-department" size={14} color={palette.gold} />
            <Text style={styles.streakText}>Racha de {streak} días — no la rompas hoy</Text>
          </View>
        )}
        <Text style={styles.introTitle}>{checkInTitle(streak)}</Text>
        <Text style={styles.introBody}>
          No calibras para sentirte bien. Calibras para saber con qué tropas sales hoy al campo.
        </Text>
      </GoldAccentCard>

      {/* ── Biometrics ── */}
      <GoldDivider label="BIOMETRÍA" />
      <PremiumCard style={styles.card}>
        <ScaleSelector label="ENERGÍA" value={energy} onChange={setEnergy} icon="bolt" />
        <ScaleSelector
          label="CLARIDAD MENTAL"
          value={clarity}
          onChange={setClarity}
          icon="adjust"
        />
        <ScaleSelector
          label="CARGA DEL SISTEMA"
          value={stress}
          onChange={setStress}
          icon="device-thermostat"
        />
        <ScaleSelector label="CALIDAD DE SUEÑO" value={sleep} onChange={setSleep} icon="bedtime" />
      </PremiumCard>

      {/* ── Índice de capacidad ── */}
      {capacityCardMobile}

      {/* ── System Need ── */}
      <GoldDivider label="LECTURA INTERNA" />
      {systemNeedCard}

      <PrimaryButton label="GUARDAR CHECK-IN" icon="check" onPress={submit} />
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  // Header (mobile) — back · date · title
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

  // Intro
  dateLabel: {
    ...typography.mono,
    color: palette.ash,
  },
  streakRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  streakText: {
    color: palette.gold,
    fontFamily: Fonts.display,
    fontSize: 11,
    letterSpacing: 1.5,
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
    fontSize: 11,
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
    fontFamily: Fonts.display,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
    color: palette.smoke,
  },
  stressReading: {
    ...typography.caption,
    color: palette.ash,
    fontStyle: 'italic',
    lineHeight: 18,
    marginTop: 4,
  },

  // Capacity card (mobile) — score column + meter column
  capacityCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.lg,
  },
  capacityScoreCol: {
    gap: 4,
  },
  capacityScore: {
    color: palette.smoke,
    fontFamily: Fonts.display,
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: -1,
    lineHeight: 46,
  },
  capacityDenom: {
    ...typography.mono,
    color: palette.smoke,
    fontSize: 16,
    marginBottom: 6,
  },
  capacityEyebrow: {
    ...typography.label,
    color: palette.ash,
    fontSize: 10,
  },
  capacityMeterCol: {
    flex: 1,
    gap: spacing.sm,
  },
  capacityStatus: {
    fontFamily: Fonts.display,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
    color: palette.smoke,
  },

  // System need
  systemLabel: {
    ...typography.label,
    color: palette.ash,
    fontSize: 11,
  },
  needSuggestions: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 6,
  },
  needPill: {
    backgroundColor: 'rgba(201,160,0,0.08)',
    borderColor: palette.gold + '44',
    borderRadius: radii.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  needPillText: {
    color: palette.gold,
    fontFamily: Fonts.display,
    fontSize: 12,
    lineHeight: 16,
  },
  textArea: {
    minHeight: 110,
    paddingTop: spacing.lg,
    textAlignVertical: 'top',
  },

  // Desktop layout
  contentDesktop: {
    alignSelf: 'center' as const,
    width: '100%',
    maxWidth: 1200,
    paddingHorizontal: 40,
    paddingTop: 32,
    paddingBottom: 60,
    gap: 24,
  },
  desktopGrid: {
    flexDirection: 'row' as const,
    gap: 32,
    alignItems: 'flex-start' as const,
  },
  desktopLeft: {
    flex: 1,
    gap: 16,
  },
  desktopRight: {
    flex: 1,
    gap: 16,
  },
});
