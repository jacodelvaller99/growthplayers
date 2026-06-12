import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import MedicalDisclaimer from '@/components/MedicalDisclaimer';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GoldDivider, PremiumCard, screen, useScreen } from '@/components/polaris';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import {
  useWearableConnections,
  useWearableDaily,
  useWearableTimeseries,
  calculateBiometricReadiness,
  recoveryLabel,
  hrvToNormanLanguage,
  type WearableDaily,
} from '@/lib/wearables';

// ─── Score bar ────────────────────────────────────────────────────────────────
function ScoreBar({
  label, score, max = 100, color,
}: {
  label: string; score: number | null; max?: number; color: string;
}) {
  const pct = score != null ? Math.round((score / max) * 100) : 0;
  const display = score != null ? String(Math.round(score)) : '–';
  return (
    <View style={scoreBarStyles.container}>
      <Text style={scoreBarStyles.label}>{label}</Text>
      <View style={scoreBarStyles.track}>
        <View style={[scoreBarStyles.fill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={[scoreBarStyles.value, { color }]}>{display}</Text>
    </View>
  );
}
const scoreBarStyles = StyleSheet.create({
  container: { gap: 4 },
  label:     { ...typography.label, color: palette.smoke, fontSize: 9, letterSpacing: 1.5 },
  track:     {
    height: 4, backgroundColor: palette.charcoal, borderRadius: 2, overflow: 'hidden',
  },
  fill:      { height: 4, borderRadius: 2 },
  value:     { fontFamily: Fonts.display, fontSize: 22, letterSpacing: 1 },
});

// ─── Mini sparkline (simplified text-based for RN without chart lib) ──────────
function HRSparkline({ points }: { points: { value: number; recorded_at: string }[] }) {
  if (!points.length) return (
    <Text style={{ ...typography.caption, color: palette.smoke }}>Sin datos de FC</Text>
  );

  const vals = points.map(p => p.value);
  const min  = Math.min(...vals);
  const max  = Math.max(...vals);
  const avg  = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);

  // Sample 20 points for display
  const step    = Math.max(1, Math.floor(vals.length / 20));
  const sampled = points.filter((_, i) => i % step === 0).slice(0, 20);

  return (
    <View style={sparklineStyles.container}>
      <View style={sparklineStyles.bars}>
        {sampled.map((p, i) => {
          const h = max === min ? 50 : Math.round(((p.value - min) / (max - min)) * 40) + 4;
          return (
            <View
              key={i}
              style={[sparklineStyles.bar, { height: h }]}
            />
          );
        })}
      </View>
      <View style={sparklineStyles.stats}>
        <Text style={sparklineStyles.stat}>Min: {min}bpm</Text>
        <Text style={sparklineStyles.stat}>Avg: {avg}bpm</Text>
        <Text style={sparklineStyles.stat}>Max: {max}bpm</Text>
      </View>
    </View>
  );
}
const sparklineStyles = StyleSheet.create({
  container: { gap: spacing.sm },
  bars:      {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    height: 48,
  },
  bar:       {
    flex: 1,
    backgroundColor: palette.gold + '88',
    borderRadius: 1,
    minWidth: 3,
  },
  stats:     { flexDirection: 'row', justifyContent: 'space-between' },
  stat:      { ...typography.mono, color: palette.smoke, fontSize: 10 },
});

// ─── 7-day mini bar chart ─────────────────────────────────────────────────────
function WeeklyBars({ data, field, color }: {
  data: WearableDaily[];
  field: 'recovery_score' | 'sleep_score' | 'activity_score';
  color: string;
}) {
  const last7 = data.slice(0, 7).reverse();
  if (!last7.length) return null;

  const vals = last7.map(d => d[field] ?? 0);
  const max  = Math.max(...vals, 1);

  return (
    <View style={weeklyStyles.container}>
      {last7.map((d, i) => {
        const h = Math.round((vals[i] / max) * 32) + 4;
        return (
          <View key={d.id} style={weeklyStyles.col}>
            <View style={[weeklyStyles.bar, { height: h, backgroundColor: color + (vals[i] > 0 ? 'cc' : '33') }]} />
            <Text style={weeklyStyles.label}>
              {new Date(d.date + 'T12:00:00').toLocaleDateString('es', { weekday: 'narrow' })}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
const weeklyStyles = StyleSheet.create({
  container: { flexDirection: 'row', gap: 4, alignItems: 'flex-end', height: 48 },
  col:       { flex: 1, alignItems: 'center', gap: 4 },
  bar:       { width: '100%', borderRadius: 2, minHeight: 4 },
  label:     { ...typography.label, color: palette.smoke, fontSize: 8 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function BiometricsScreen() {
  const sc = useScreen();
  const router  = useRouter();
  const insets  = useSafeAreaInsets();

  const { connections, isConnected } = useWearableConnections();
  const { data: dailyData, today, averages } = useWearableDaily(7);
  const { data: hrPoints } = useWearableTimeseries('heart_rate', 24);

  const hasWearable = connections.length > 0;
  const provider    = connections[0]?.provider ?? null;

  // No wearable connected
  if (!hasWearable) {
    return (
      <ScrollView
        style={sc.root}
        contentContainerStyle={[sc.content, { paddingTop: insets.top + 16 }]}>
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={22} color={palette.ash} />
          </Pressable>
          <Text style={styles.title}>MI CUERPO</Text>
          <View style={{ width: 36 }} />
        </View>

        <PremiumCard style={styles.noWearableCard}>
          <MaterialIcons name="monitor-heart" size={36} color={palette.goldMuted} />
          <Text style={styles.noWearableTitle}>CONECTA TU WEARABLE</Text>
          <Text style={styles.noWearableSub}>
            Conecta tu Oura Ring o WHOOP para ver tus datos biométricos
            y recibir recomendaciones personalizadas de Norman.
          </Text>
          <Pressable
            style={styles.connectBtn}
            onPress={() => router.push('/perfil/wearables' as never)}>
            <Text style={styles.connectBtnText}>CONECTAR DISPOSITIVO →</Text>
          </Pressable>
        </PremiumCard>
      </ScrollView>
    );
  }

  const readiness = calculateBiometricReadiness(dailyData);
  const recovLabel = today?.recovery_score != null
    ? recoveryLabel(today.recovery_score)
    : 'Sin datos';

  const baseline7dHrv = averages?.hrv ?? null;
  const normanInsight = today?.hrv_ms
    ? hrvToNormanLanguage(today.hrv_ms, baseline7dHrv)
    : null;

  return (
    <ScrollView
      style={sc.root}
      contentContainerStyle={[
        sc.content,
        { paddingTop: insets.top + 16, paddingBottom: 80 },
      ]}
      showsVerticalScrollIndicator={false}>

      {/* Header */}
      <View style={styles.topRow}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color={palette.ash} />
        </Pressable>
        <Text style={styles.title}>MI CUERPO HOY</Text>
        {/* Provider badge */}
        <View style={styles.providerBadge}>
          <Text style={styles.providerText}>{provider === 'oura' ? '⬡ Oura' : '◈ WHOOP'}</Text>
        </View>
      </View>

      <MedicalDisclaimer />

      {/* Main scores */}
      <PremiumCard style={styles.mainScores}>
        <View style={styles.scoresRow}>
          <View style={styles.scoreBlock}>
            <ScoreBar
              label="RECUPERACIÓN"
              score={today?.recovery_score ?? null}
              color={scoreColor(today?.recovery_score)}
            />
            <Text style={styles.scoreSubLabel}>{recovLabel}</Text>
          </View>
          <View style={styles.scoreDivider} />
          <View style={styles.scoreBlock}>
            <ScoreBar
              label="SUEÑO"
              score={today?.sleep_score ?? null}
              color="#4a6fa5"
            />
            {today?.sleep_duration_min && (
              <Text style={styles.scoreSubLabel}>
                {Math.floor(today.sleep_duration_min / 60)}h {today.sleep_duration_min % 60}min
              </Text>
            )}
          </View>
          <View style={styles.scoreDivider} />
          <View style={styles.scoreBlock}>
            <ScoreBar
              label="ACTIVIDAD"
              score={today?.activity_score ?? today?.strain_score ?? null}
              max={provider === 'whoop' ? 21 : 100}
              color="#2e7d52"
            />
            {today?.steps && (
              <Text style={styles.scoreSubLabel}>
                {today.steps.toLocaleString()}p
              </Text>
            )}
          </View>
        </View>
      </PremiumCard>

      {/* Vitals row */}
      <PremiumCard style={styles.vitalsCard}>
        <View style={styles.vitalsRow}>
          <View style={styles.vitalItem}>
            <MaterialIcons name="favorite" size={16} color="#e63946" />
            <Text style={styles.vitalValue}>
              {today?.hrv_ms != null ? `${Math.round(today.hrv_ms)}ms` : '–'}
            </Text>
            <Text style={styles.vitalLabel}>HRV</Text>
          </View>
          <View style={styles.vitalDivider} />
          <View style={styles.vitalItem}>
            <MaterialIcons name="monitor-heart" size={16} color="#4a6fa5" />
            <Text style={styles.vitalValue}>
              {today?.resting_hr != null ? `${today.resting_hr}bpm` : '–'}
            </Text>
            <Text style={styles.vitalLabel}>FC Reposo</Text>
          </View>
          <View style={styles.vitalDivider} />
          <View style={styles.vitalItem}>
            <MaterialIcons name="thermostat" size={16} color="#b07d1a" />
            <Text style={styles.vitalValue}>
              {today?.body_temp_delta != null
                ? `${today.body_temp_delta >= 0 ? '+' : ''}${today.body_temp_delta.toFixed(1)}°C`
                : '–'}
            </Text>
            <Text style={styles.vitalLabel}>Temp</Text>
          </View>
          <View style={styles.vitalDivider} />
          <View style={styles.vitalItem}>
            <MaterialIcons name="air" size={16} color="#2e7d52" />
            <Text style={styles.vitalValue}>
              {today?.spo2_avg != null ? `${today.spo2_avg.toFixed(1)}%` : '–'}
            </Text>
            <Text style={styles.vitalLabel}>SpO₂</Text>
          </View>
        </View>
      </PremiumCard>

      {/* Heart rate 24h */}
      {hrPoints.length > 0 && (
        <>
          <GoldDivider label="RITMO CARDÍACO — ÚLTIMAS 24H" />
          <PremiumCard>
            <HRSparkline points={hrPoints} />
          </PremiumCard>
        </>
      )}

      {/* 7-day trend */}
      {dailyData.length > 1 && (
        <>
          <GoldDivider label="TENDENCIA 7 DÍAS" />
          <PremiumCard style={styles.weeklyCard}>
            <Text style={styles.weeklyLabel}>RECUPERACIÓN</Text>
            <WeeklyBars data={dailyData} field="recovery_score" color={palette.goldText} />
            <Text style={[styles.weeklyLabel, { marginTop: spacing.md }]}>SUEÑO</Text>
            <WeeklyBars data={dailyData} field="sleep_score" color="#4a6fa5" />
          </PremiumCard>
        </>
      )}

      {/* Norman insight */}
      {normanInsight && (
        <>
          <GoldDivider label="NORMAN DICE" />
          <PremiumCard style={styles.normanCard}>
            <MaterialIcons name="psychology" size={20} color={palette.goldText} />
            <Text style={styles.normanText}>
              “{normanInsight.charAt(0).toUpperCase() + normanInsight.slice(1)}.”
            </Text>
          </PremiumCard>
        </>
      )}

      {/* Quick link to devices */}
      <Pressable
        style={styles.devicesLink}
        onPress={() => router.push('/perfil/wearables' as never)}>
        <MaterialIcons name="settings" size={14} color={palette.smoke} />
        <Text style={styles.devicesLinkText}>Gestionar dispositivos</Text>
        <MaterialIcons name="chevron-right" size={14} color={palette.smoke} />
      </Pressable>

    </ScrollView>
  );
}

// ─── Color helpers ────────────────────────────────────────────────────────────
function scoreColor(score: number | null | undefined): string {
  if (score == null) return palette.smoke;
  if (score >= 70) return '#2e7d52';
  if (score >= 50) return palette.gold;
  if (score >= 30) return '#b07d1a';
  return '#e63946';
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title:   { ...typography.title, color: palette.ivory, fontSize: 18 },

  providerBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: palette.line,
  },
  providerText: { ...typography.mono, color: palette.ash, fontSize: 10 },

  mainScores: { marginBottom: spacing.md, gap: spacing.md },
  scoresRow:  { flexDirection: 'row', gap: spacing.md },
  scoreBlock: { flex: 1, gap: 4 },
  scoreDivider: { width: 1, backgroundColor: palette.line },
  scoreSubLabel: { ...typography.caption, color: palette.smoke, fontSize: 10 },

  vitalsCard: { marginBottom: spacing.md },
  vitalsRow:  {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  vitalItem:    { alignItems: 'center', gap: 4, flex: 1 },
  vitalValue:   { fontFamily: Fonts.display, color: palette.ivory, fontSize: 16, letterSpacing: 0.5 },
  vitalLabel:   { ...typography.label, color: palette.smoke, fontSize: 9, textAlign: 'center' },
  vitalDivider: { width: 1, height: 36, backgroundColor: palette.line },

  weeklyCard:  { gap: spacing.sm },
  weeklyLabel: { ...typography.label, color: palette.smoke, fontSize: 9, letterSpacing: 1.5 },

  normanCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  normanText: {
    ...typography.body,
    color: palette.ash,
    fontStyle: 'italic',
    flex: 1,
    lineHeight: 22,
  },

  devicesLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
  devicesLinkText: { ...typography.caption, color: palette.smoke },

  noWearableCard: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xl,
  },
  noWearableTitle: { ...typography.section, color: palette.ivory, letterSpacing: 2, marginTop: spacing.sm },
  noWearableSub:   { ...typography.body, color: palette.smoke, textAlign: 'center', lineHeight: 22 },
  connectBtn: {
    backgroundColor: palette.gold,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radii.sm,
    marginTop: spacing.sm,
  },
  connectBtnText: { ...typography.label, color: palette.ink, fontWeight: '700' },
});
