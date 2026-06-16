/**
 * components/biometric — tarjetas de la Biometric Intelligence Layer.
 *
 * Presentacionales (solo tokens de tema). El lenguaje técnico (coherencia/fatiga/drivers
 * + coach_safe_summary) es para admin/mentor; la versión cliente usa etiquetas suaves y
 * solo el `client_safe_summary`. Reglas de oro/ink respetadas.
 */
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { PremiumCard } from '@/components/polaris';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import type {
  CoherenceState, DailyMetrics, FatigueRisk, InterventionLevel, RecoveryState, SleepState, TrendState,
} from '@/lib/biometricLogic';
import type { ConnectionStatus, InsightRow, ReflectionInput } from '@/lib/biometric';
import { SCENARIO_LABEL, SCENARIOS, type Scenario } from '@/lib/biometricSimulator';

// ─── Tokens de presentación (admin/mentor) ──────────────────────────────────────
const SLEEP_META: Record<SleepState, { label: string; color: string }> = {
  excellent: { label: 'Excelente', color: palette.success },
  good:      { label: 'Bueno',     color: palette.success },
  fragile:   { label: 'Frágil',    color: palette.warning },
  poor:      { label: 'Pobre',     color: palette.danger },
  critical:  { label: 'Crítico',   color: palette.danger },
};
const RECOVERY_META: Record<RecoveryState, { label: string; color: string }> = {
  strong:     { label: 'Fuerte',       color: palette.success },
  adequate:   { label: 'Adecuada',     color: palette.success },
  compromised:{ label: 'Comprometida', color: palette.warning },
  weak:       { label: 'Débil',        color: palette.danger },
  high_risk:  { label: 'Alto riesgo',  color: palette.danger },
};
const COHERENCE_META: Record<CoherenceState, { label: string; color: string }> = {
  stable:            { label: 'Estable',         color: palette.success },
  slightly_disturbed:{ label: 'Leve perturbación',color: palette.warning },
  unstable:          { label: 'Inestable',       color: palette.danger },
  highly_unstable:   { label: 'Muy inestable',   color: palette.danger },
};
const FATIGUE_META: Record<FatigueRisk, { label: string; color: string }> = {
  low:      { label: 'Baja',     color: palette.success },
  moderate: { label: 'Moderada', color: palette.warning },
  elevated: { label: 'Elevada',  color: palette.danger },
  high:     { label: 'Alta',     color: palette.danger },
};
const TREND_META: Record<TrendState, { label: string; color: string }> = {
  improving: { label: 'Mejorando', color: palette.success },
  stable:    { label: 'Estable',   color: palette.goldText },
  volatile:  { label: 'Inestable', color: palette.warning },
  worsening: { label: 'A la baja', color: palette.danger },
};
const LEVEL_META: Record<InterventionLevel, { label: string; color: string }> = {
  low:    { label: 'SEGUIR', color: palette.success },
  medium: { label: 'OBSERVAR', color: palette.warning },
  high:   { label: 'ATENDER', color: palette.danger },
  urgent: { label: 'URGENTE', color: palette.danger },
};

// Etiquetas suaves para el cliente (sin jerga clínica).
const CLIENT_RECOVERY: Record<RecoveryState, string> = {
  strong: 'Recuperado', adequate: 'Estable', compromised: 'Cargado', weak: 'Bajo', high_risk: 'Necesita descanso',
};
const CLIENT_SLEEP: Record<SleepState, string> = {
  excellent: 'Sueño óptimo', good: 'Buen descanso', fragile: 'Descanso parcial', poor: 'Poco descanso', critical: 'Descanso insuficiente',
};

function L({ children }: { children: string }) {
  return <Text style={s.label}>{children}</Text>;
}
function Empty({ label }: { label: string }) {
  return <Text style={s.empty}>{label}</Text>;
}
function StatePill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={s.statePill}>
      <Text style={s.stateLabel}>{label}</Text>
      <Text style={[s.stateValue, { color }]}>{value}</Text>
    </View>
  );
}

// ─── BiometricInsightCard ────────────────────────────────────────────────────────
export function BiometricInsightCard({
  insight, variant = 'admin',
}: {
  insight: InsightRow | null;
  variant?: 'admin' | 'client';
}) {
  if (!insight) {
    return (
      <PremiumCard style={s.card}>
        <L>{variant === 'client' ? 'TU CUERPO HOY' : 'LECTURA BIOMÉTRICA'}</L>
        <Empty label={variant === 'client'
          ? 'Conecta tu wearable para ver la lectura de tu cuerpo.'
          : 'Sin lectura todavía (sin datos de wearable o aún sin interpretar).'} />
      </PremiumCard>
    );
  }

  const rec = RECOVERY_META[insight.recovery_state as RecoveryState] ?? RECOVERY_META.compromised;
  const lvl = LEVEL_META[insight.intervention_level as InterventionLevel] ?? LEVEL_META.low;

  if (variant === 'client') {
    const recLabel = CLIENT_RECOVERY[insight.recovery_state as RecoveryState] ?? '—';
    const sleepLabel = CLIENT_SLEEP[insight.sleep_state as SleepState] ?? '—';
    return (
      <PremiumCard style={s.card}>
        <L>TU CUERPO HOY</L>
        <View style={s.clientHeadRow}>
          <View style={[s.clientBadge, { borderColor: rec.color }]}>
            <Text style={[s.clientBadgeText, { color: rec.color }]}>{recLabel.toUpperCase()}</Text>
          </View>
          <Text style={s.clientSleep}>{sleepLabel}</Text>
        </View>
        {insight.client_safe_summary ? (
          <Text style={s.clientSummary}>{insight.client_safe_summary}</Text>
        ) : null}
      </PremiumCard>
    );
  }

  // admin / mentor
  return (
    <PremiumCard style={s.card}>
      <View style={s.headRow}>
        <L>LECTURA BIOMÉTRICA</L>
        <View style={[s.levelPill, { borderColor: lvl.color }]}>
          <Text style={[s.levelText, { color: lvl.color }]}>{lvl.label}</Text>
        </View>
      </View>
      <View style={s.stateGrid}>
        <StatePill label="Sueño" value={(SLEEP_META[insight.sleep_state as SleepState] ?? SLEEP_META.fragile).label} color={(SLEEP_META[insight.sleep_state as SleepState] ?? SLEEP_META.fragile).color} />
        <StatePill label="Recuperación" value={rec.label} color={rec.color} />
        <StatePill label="Coherencia" value={(COHERENCE_META[insight.coherence_state as CoherenceState] ?? COHERENCE_META.slightly_disturbed).label} color={(COHERENCE_META[insight.coherence_state as CoherenceState] ?? COHERENCE_META.slightly_disturbed).color} />
        <StatePill label="Fatiga" value={(FATIGUE_META[insight.fatigue_risk as FatigueRisk] ?? FATIGUE_META.moderate).label} color={(FATIGUE_META[insight.fatigue_risk as FatigueRisk] ?? FATIGUE_META.moderate).color} />
        <StatePill label="Tendencia" value={(TREND_META[insight.trend_state as TrendState] ?? TREND_META.stable).label} color={(TREND_META[insight.trend_state as TrendState] ?? TREND_META.stable).color} />
      </View>
      {insight.drivers && insight.drivers.length > 0 && (
        <View style={s.driverWrap}>
          {insight.drivers.map((d, i) => (
            <View key={i} style={s.driverChip}>
              <Text style={s.driverText}>{d}</Text>
            </View>
          ))}
        </View>
      )}
      {insight.coach_safe_summary ? <Text style={s.coachSummary}>{insight.coach_safe_summary}</Text> : null}
    </PremiumCard>
  );
}

// ─── BiometricSparkline (recovery_score por día) ──────────────────────────────────
export function BiometricSparkline({
  series, title = 'RECUPERACIÓN (14d)',
}: {
  series: DailyMetrics[];
  title?: string;
}) {
  const vals = series.map((d) => (typeof d.recovery_score === 'number' ? d.recovery_score : null));
  const present = vals.filter((v): v is number => v !== null);
  if (present.length === 0) {
    return (
      <PremiumCard style={s.card}>
        <L>{title}</L>
        <Empty label="Sin serie de recuperación todavía." />
      </PremiumCard>
    );
  }
  return (
    <PremiumCard style={s.card}>
      <L>{title}</L>
      <View style={s.sparkRow}>
        {vals.map((v, i) => {
          const h = v === null ? 3 : Math.max(3, Math.round((v / 100) * 44));
          const color = v === null ? palette.charcoal : v >= 60 ? palette.success : v >= 40 ? palette.warning : palette.danger;
          return <View key={i} style={[s.sparkBar, { height: h, backgroundColor: color }]} />;
        })}
      </View>
      <View style={s.sparkScale}>
        <Text style={s.sparkScaleText}>{present[0]}</Text>
        <Text style={s.sparkScaleText}>→ {present[present.length - 1]}</Text>
      </View>
    </PremiumCard>
  );
}

// ─── ConnectionStatusCard ──────────────────────────────────────────────────────────
const PROVIDER_LABEL: Record<string, string> = { oura: '⬡ Oura Ring', whoop: '◈ WHOOP', synthetic: '◌ Datos sintéticos' };

export function ConnectionStatusCard({ connections }: { connections: ConnectionStatus[] }) {
  return (
    <PremiumCard style={s.card}>
      <L>FUENTES DE DATOS</L>
      {connections.length === 0 ? (
        <Empty label="Sin wearables conectados." />
      ) : (
        connections.map((c, i) => (
          <View key={i} style={s.connRow}>
            <Text style={s.connProvider}>{PROVIDER_LABEL[c.provider] ?? c.provider}</Text>
            <View style={s.connMeta}>
              {c.sync_mode === 'synthetic' && (
                <View style={s.synthTag}><Text style={s.synthTagText}>DEMO</Text></View>
              )}
              <View style={[s.connDot, { backgroundColor: c.is_active ? palette.success : palette.smoke }]} />
              <Text style={s.connStatus}>{c.is_active ? 'activo' : 'inactivo'}</Text>
            </View>
          </View>
        ))
      )}
    </PremiumCard>
  );
}

// ─── SeedSyntheticControls (admin / demo) ─────────────────────────────────────────
export function SeedSyntheticControls({
  onSeed, onClear, busy,
}: {
  onSeed: (scenario: Scenario) => void;
  onClear: () => void;
  busy?: boolean;
}) {
  const [selected, setSelected] = useState<Scenario>('good_week');
  return (
    <PremiumCard style={s.card}>
      <L>SIMULADOR DE DATOS (DEMO)</L>
      <Text style={s.empty}>
        Genera 14 días sintéticos para demostrar la lectura biométrica sin wearable real.
      </Text>
      <View style={s.chipWrap}>
        {SCENARIOS.map((sc) => {
          const active = sc === selected;
          return (
            <Pressable key={sc} onPress={() => setSelected(sc)} style={[s.selChip, active && s.selChipActive]}>
              <Text style={[s.selChipText, active && s.selChipTextActive]}>{SCENARIO_LABEL[sc]}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={s.seedBtnRow}>
        <Pressable onPress={() => onSeed(selected)} disabled={busy} style={[s.seedBtn, busy && s.btnDisabled]}>
          {busy ? <ActivityIndicator color={palette.ink} size="small" /> : (
            <>
              <MaterialIcons name="auto-graph" size={15} color={palette.ink} />
              <Text style={s.seedBtnText}>GENERAR</Text>
            </>
          )}
        </Pressable>
        <Pressable onPress={onClear} disabled={busy} style={[s.clearBtn, busy && s.btnDisabled]}>
          <Text style={s.clearBtnText}>LIMPIAR</Text>
        </Pressable>
      </View>
    </PremiumCard>
  );
}

// ─── ReflectionComposer (cliente) ─────────────────────────────────────────────────
const ENERGY_OPTS: { key: 'low' | 'medium' | 'high'; label: string }[] = [
  { key: 'low', label: 'Baja' }, { key: 'medium', label: 'Media' }, { key: 'high', label: 'Alta' },
];

export function ReflectionComposer({
  onSave, busy, linkedMetricDate,
}: {
  onSave: (r: ReflectionInput) => void;
  busy?: boolean;
  linkedMetricDate?: string | null;
}) {
  const [content, setContent] = useState('');
  const [energy, setEnergy] = useState<'low' | 'medium' | 'high' | null>(null);

  const submit = () => {
    if (!content.trim()) return;
    onSave({
      content: content.trim(),
      entry_type: 'wellness',
      energy_tag: energy,
      linked_metric_date: linkedMetricDate ?? null,
    });
    setContent('');
    setEnergy(null);
  };

  return (
    <PremiumCard style={s.card}>
      <L>CÓMO TE SENTISTE HOY</L>
      <Text style={s.empty}>Tu reflexión alimenta la memoria de Norman — la conecta con lo que dice tu cuerpo.</Text>
      <TextInput
        value={content}
        onChangeText={setContent}
        placeholder="Energía, foco, ánimo, lo que notaste…"
        placeholderTextColor={palette.smoke}
        multiline
        style={s.reflectInput}
      />
      <View style={s.energyRow}>
        <Text style={s.energyLabel}>ENERGÍA</Text>
        {ENERGY_OPTS.map((o) => {
          const active = energy === o.key;
          return (
            <Pressable key={o.key} onPress={() => setEnergy(active ? null : o.key)} style={[s.selChip, active && s.selChipActive]}>
              <Text style={[s.selChipText, active && s.selChipTextActive]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Pressable onPress={submit} disabled={busy || !content.trim()} style={[s.seedBtn, (busy || !content.trim()) && s.btnDisabled]}>
        {busy ? <ActivityIndicator color={palette.ink} size="small" /> : <Text style={s.seedBtnText}>GUARDAR REFLEXIÓN</Text>}
      </Pressable>
    </PremiumCard>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  card: { gap: spacing.sm, marginBottom: spacing.md },
  label: { ...typography.label, color: palette.goldText, fontSize: 11, letterSpacing: 1.8 },
  empty: { ...typography.caption, color: palette.smoke, fontSize: 12, fontStyle: 'italic' },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  // states
  stateGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statePill: { borderWidth: 1, borderColor: palette.line, borderRadius: radii.sm, paddingHorizontal: 9, paddingVertical: 5, minWidth: 96 },
  stateLabel: { ...typography.caption, color: palette.smoke, fontSize: 9, letterSpacing: 0.8 },
  stateValue: { ...typography.label, fontSize: 12, marginTop: 1 },
  levelPill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  levelText: { ...typography.label, fontSize: 10, letterSpacing: 1 },
  driverWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  driverChip: { backgroundColor: palette.goldLight, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  driverText: { ...typography.caption, color: palette.goldText, fontSize: 11 },
  coachSummary: { ...typography.body, color: palette.ash, fontSize: 13, lineHeight: 19 },
  // client
  clientHeadRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  clientBadge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  clientBadgeText: { ...typography.label, fontSize: 12, letterSpacing: 1 },
  clientSleep: { ...typography.body, color: palette.ivory, fontSize: 14, fontFamily: Fonts.displayMedium },
  clientSummary: { ...typography.body, color: palette.ash, fontSize: 14, lineHeight: 21 },
  // sparkline
  sparkRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 48 },
  sparkBar: { flex: 1, borderRadius: 2, minWidth: 4 },
  sparkScale: { flexDirection: 'row', justifyContent: 'space-between' },
  sparkScaleText: { ...typography.mono, color: palette.smoke, fontSize: 10 },
  // connections
  connRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  connProvider: { ...typography.body, color: palette.ivory, fontSize: 13 },
  connMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  connDot: { width: 7, height: 7, borderRadius: 4 },
  connStatus: { ...typography.caption, color: palette.smoke, fontSize: 11 },
  synthTag: { borderWidth: 1, borderColor: palette.goldText, borderRadius: radii.sm, paddingHorizontal: 5, paddingVertical: 1 },
  synthTagText: { ...typography.label, color: palette.goldText, fontSize: 8, letterSpacing: 0.8 },
  // chips
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  selChip: { borderWidth: 1, borderColor: palette.line, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  selChipActive: { backgroundColor: palette.gold, borderColor: palette.gold },
  selChipText: { ...typography.label, color: palette.ash, fontSize: 11 },
  selChipTextActive: { color: palette.ink },
  // seed buttons
  seedBtnRow: { flexDirection: 'row', gap: spacing.sm },
  seedBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: palette.gold, borderRadius: radii.sm, paddingVertical: spacing.md },
  seedBtnText: { ...typography.label, color: palette.ink, fontSize: 12, letterSpacing: 1 },
  clearBtn: { borderWidth: 1, borderColor: palette.line, borderRadius: radii.sm, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, alignItems: 'center', justifyContent: 'center' },
  clearBtnText: { ...typography.label, color: palette.smoke, fontSize: 12, letterSpacing: 1 },
  btnDisabled: { opacity: 0.5 },
  // reflection
  reflectInput: { ...typography.body, color: palette.ivory, fontSize: 14, backgroundColor: palette.charcoal, borderRadius: radii.sm, padding: spacing.md, minHeight: 80, textAlignVertical: 'top' },
  energyRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  energyLabel: { ...typography.caption, color: palette.smoke, fontSize: 10, letterSpacing: 1, marginRight: 4 },
});
