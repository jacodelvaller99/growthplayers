/**
 * components/mentor-prep — tarjetas de "Preparar sesión" del dossier.
 *
 * Lo que un mentor necesita en los 2 minutos antes de la llamada, en orden:
 * cómo viene el cliente (datos reales), qué pasó la última vez, qué prometió
 * y en qué quedó, y qué llevar a la sesión. Presentacionales: sin IO.
 */
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { PremiumCard } from '@/components/polaris';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import type { AdminBriefing } from '@/lib/memory';
import type { SessionDigest } from '@/lib/memoryLogic';
import type { PrepCommitment, PrepSignals, SignalTone } from '@/lib/mentorPrepLogic';

const TONE: Record<SignalTone, { color: string; label: string }> = {
  ok: { color: palette.success, label: 'VA BIEN' },
  watch: { color: palette.warning, label: 'OJO' },
  alert: { color: palette.danger, label: 'NECESITA ATENCIÓN' },
};

function Label({ children }: { children: string }) {
  return <Text style={s.label}>{children}</Text>;
}

// ─── Cómo viene ──────────────────────────────────────────────────────────────
export function PrepSignalsCard({ signals }: { signals: PrepSignals }) {
  const tone = TONE[signals.tone];
  const last =
    signals.daysSinceActivity == null ? '—'
    : signals.daysSinceActivity === 0 ? 'Hoy'
    : `${signals.daysSinceActivity} d`;
  const tiles: { k: string; v: string; warn?: boolean }[] = [
    { k: 'Última actividad', v: last, warn: (signals.daysSinceActivity ?? 99) >= 5 },
    { k: 'Check-ins 7 días', v: signals.everCheckedIn ? String(signals.checkIns7d) : 'Nunca', warn: signals.checkIns7d === 0 },
    { k: 'Compromisos', v: signals.total ? `${signals.done}/${signals.total}` : '—' },
    { k: 'Vencidos', v: String(signals.overdue), warn: signals.overdue > 0 },
  ];
  return (
    <PremiumCard style={[s.card, { borderLeftWidth: 3, borderLeftColor: tone.color }]} accessibilityLabel={`Cómo viene: ${signals.headline}`}>
      <View style={s.rowBetween}>
        <Label>CÓMO VIENE</Label>
        <View style={[s.pill, { borderColor: tone.color }]}>
          <View style={[s.dot, { backgroundColor: tone.color }]} />
          <Text style={[s.pillText, { color: tone.color }]}>{tone.label}</Text>
        </View>
      </View>
      <Text style={s.headline}>{signals.headline}</Text>
      <View style={s.tiles}>
        {tiles.map((t) => (
          <View key={t.k} style={s.tile}>
            <Text style={[s.tileValue, t.warn && { color: palette.warning }]}>{t.v}</Text>
            <Text style={s.tileKey}>{t.k}</Text>
          </View>
        ))}
      </View>
    </PremiumCard>
  );
}

// ─── Una sesión, repartida ───────────────────────────────────────────────────
function Items({ items, icon, color, max }: { items: string[]; icon: React.ComponentProps<typeof MaterialIcons>['name']; color: string; max?: number }) {
  const [all, setAll] = useState(false);
  const shown = max && !all ? items.slice(0, max) : items;
  return (
    <View style={{ gap: 6 }}>
      {shown.map((t, i) => (
        <View key={i} style={s.itemRow}>
          <MaterialIcons name={icon} size={14} color={color} style={{ marginTop: 3 }} />
          <Text style={s.itemText}>{t}</Text>
        </View>
      ))}
      {max != null && items.length > max && (
        <Pressable onPress={() => setAll((v) => !v)} hitSlop={8} accessibilityRole="button" style={s.more}>
          <Text style={s.moreText}>{all ? 'VER MENOS' : `VER LOS ${items.length}`}</Text>
        </Pressable>
      )}
    </View>
  );
}

export function DigestBody({ digest, compact }: { digest: SessionDigest; compact?: boolean }) {
  return (
    <View style={{ gap: spacing.md }}>
      {!!digest.summary && <Text style={s.body}>{digest.summary}</Text>}
      {digest.talked.length > 0 && (
        <View style={{ gap: 6 }}>
          <Text style={s.sub}>Lo que se habló</Text>
          <Items items={digest.talked} icon="forum" color={palette.ash} max={compact ? 4 : 6} />
        </View>
      )}
      {digest.improve.length > 0 && (
        <View style={{ gap: 6 }}>
          <Text style={s.sub}>Qué puede mejorar</Text>
          <Items items={digest.improve} icon="trending-up" color={palette.goldText} />
        </View>
      )}
    </View>
  );
}

export function LastSessionCard({
  digest,
  title,
  dateLabel,
  splitting,
  onOpenDesk,
}: {
  digest: SessionDigest | null;
  title: string;
  dateLabel: string;
  splitting?: boolean;
  onOpenDesk?: () => void;
}) {
  return (
    <PremiumCard style={s.card}>
      <View style={s.rowBetween}>
        <Label>{title}</Label>
        <Text style={s.meta}>{dateLabel}</Text>
      </View>
      {digest && (digest.summary || digest.talked.length) ? (
        <DigestBody digest={digest} compact />
      ) : (
        <View style={{ gap: spacing.sm }}>
          <Text style={s.empty}>
            {splitting ? 'La IA está repartiendo esta sesión…' : 'Esta sesión todavía no está repartida. Ábrela en el Espacio del Mentor y la IA la reparte sola.'}
          </Text>
          {!!onOpenDesk && !splitting && (
            <Pressable onPress={onOpenDesk} style={s.ghostBtn} accessibilityRole="button">
              <Text style={s.ghostBtnText}>ABRIR ESPACIO DEL MENTOR</Text>
            </Pressable>
          )}
        </View>
      )}
    </PremiumCard>
  );
}

// ─── Compromisos con estado ──────────────────────────────────────────────────
const STATE_STYLE = {
  vencido: { color: palette.danger, icon: 'radio-button-unchecked' as const },
  abierto: { color: palette.goldText, icon: 'radio-button-unchecked' as const },
  cumplido: { color: palette.success, icon: 'check-circle' as const },
};

export function PrepCommitmentsCard({
  items,
  busyKey,
  onToggle,
}: {
  items: PrepCommitment[];
  busyKey?: string | null;
  onToggle?: (c: PrepCommitment) => void;
}) {
  const order = { vencido: 0, abierto: 1, cumplido: 2 };
  const sorted = [...items].sort((a, b) => order[a.state] - order[b.state]);
  const week = items[0]?.week;
  return (
    <PremiumCard style={s.card}>
      <View style={s.rowBetween}>
        <Label>{week ? `COMPROMISOS · SEMANA ${week}` : 'COMPROMISOS'}</Label>
        {items.length > 0 && <Text style={s.meta}>Toca para marcar cumplido</Text>}
      </View>
      {sorted.length === 0 ? (
        <Text style={s.empty}>Sin compromisos todavía. Salen solos de las notas de la sesión.</Text>
      ) : (
        <View style={{ gap: 2 }}>
          {sorted.map((c) => {
            const st = STATE_STYLE[c.state];
            const key = `${c.sessionId}:${c.index}`;
            const busy = busyKey === key;
            const tag = c.state === 'vencido' ? (c.overdueDays > 0 ? `VENCIDO · ${c.overdueDays} D` : 'VENCIDO') : c.state === 'abierto' ? 'ESTA SEMANA' : 'CUMPLIDO';
            return (
              <Pressable
                key={key}
                onPress={() => onToggle?.(c)}
                disabled={!onToggle || busy}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: c.state === 'cumplido', disabled: busy }}
                accessibilityLabel={`${c.text}. ${tag}`}
                style={({ pressed }) => [s.commitRow, pressed && { backgroundColor: palette.overlay }]}>
                {busy
                  ? <ActivityIndicator size={16} color={palette.goldText} />
                  : <MaterialIcons name={st.icon} size={18} color={st.color} />}
                <Text style={[s.commitText, c.state === 'cumplido' && s.done]}>{c.text}</Text>
                <Text style={[s.stateTag, { color: st.color }]}>{tag}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </PremiumCard>
  );
}

// ─── Qué llevar a la sesión ──────────────────────────────────────────────────
const RISK: Record<string, { color: string; label: string }> = {
  low: { color: palette.success, label: 'RIESGO BAJO' },
  medium: { color: palette.warning, label: 'RIESGO MEDIO' },
  high: { color: palette.danger, label: 'RIESGO ALTO' },
};

const stripNumber = (t: string) => t.replace(/^\s*\d+[.)]\s*/, '');

export function ForSessionCard({
  briefing,
  generating,
  error,
  onGenerate,
}: {
  briefing: AdminBriefing | null;
  generating?: boolean;
  error?: string | null;
  onGenerate?: () => void;
}) {
  const risk = briefing?.risk_level ? RISK[briefing.risk_level] : null;
  const block = (title: string, items: string[] | undefined, icon: React.ComponentProps<typeof MaterialIcons>['name'], color: string) =>
    items && items.length > 0 ? (
      <View style={{ gap: 6 }}>
        <Text style={s.sub}>{title}</Text>
        <Items items={items.map(stripNumber)} icon={icon} color={color} />
      </View>
    ) : null;
  return (
    <PremiumCard style={[s.card, { borderColor: palette.lineGold }]}>
      <View style={s.rowBetween}>
        <Label>PARA ESTA SESIÓN</Label>
        {!!onGenerate && (
          <Pressable
            onPress={onGenerate}
            disabled={generating}
            accessibilityRole="button"
            accessibilityLabel={briefing ? 'Actualizar preparación con IA' : 'Preparar con IA'}
            style={({ pressed }) => [s.ghostBtnSm, (pressed || generating) && { opacity: 0.6 }]}>
            <MaterialIcons name="auto-awesome" size={13} color={palette.goldText} />
            <Text style={s.ghostBtnText}>{generating ? 'PREPARANDO…' : briefing ? 'ACTUALIZAR' : 'PREPARAR CON IA'}</Text>
          </Pressable>
        )}
      </View>
      {!briefing ? (
        <Text style={s.empty}>{generating ? 'Norman está preparando la sesión…' : 'Aún no hay preparación. Tócala y la IA arma qué confrontar y qué preguntar.'}</Text>
      ) : (
        <View style={{ gap: spacing.md }}>
          {risk && (
            <View style={[s.pill, { borderColor: risk.color, alignSelf: 'flex-start' }]}>
              <Text style={[s.pillText, { color: risk.color }]}>{risk.label}</Text>
            </View>
          )}
          {!!briefing.summary && <Text style={s.body}>{briefing.summary}</Text>}
          {block('Para confrontar', briefing.challenge_points, 'bolt', palette.goldText)}
          {block('Dato contra lo que dijo', briefing.frictions?.filter((f) => !/sin fricciones|sin datos/i.test(f)), 'report', palette.danger)}
          {block('Preguntas que quedaron abiertas', briefing.open_loops, 'help-outline', palette.warning)}
          {block('Temas sugeridos', briefing.suggested_mentorship_topics, 'flag', palette.ash)}
        </View>
      )}
      {!!error && <Text style={[s.empty, { color: palette.danger }]}>{error}</Text>}
    </PremiumCard>
  );
}

const s = StyleSheet.create({
  card: { marginBottom: spacing.sm, padding: spacing.md, gap: spacing.sm },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  label: { ...typography.label, color: palette.goldText, fontSize: 11, letterSpacing: 1.4 },
  meta: { ...typography.caption, color: palette.smoke, fontSize: 11 },
  headline: { fontFamily: Fonts.sans, fontWeight: '600', fontSize: 15, lineHeight: 22, color: palette.ivory },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  tile: { flexGrow: 1, flexBasis: 120, backgroundColor: palette.graphite, borderRadius: radii.sm, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  tileValue: { fontFamily: Fonts.display, fontWeight: '800', fontSize: 20, color: palette.ivory, fontVariant: ['tabular-nums'] },
  tileKey: { ...typography.caption, color: palette.smoke, fontSize: 11, marginTop: 2 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  pillText: { ...typography.label, fontSize: 10, letterSpacing: 1 },
  body: { ...typography.body, color: palette.ivory, fontSize: 14, lineHeight: 21 },
  sub: { ...typography.label, color: palette.ash, fontSize: 11, letterSpacing: 0.8 },
  itemRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  itemText: { ...typography.body, color: palette.ivory, fontSize: 13.5, lineHeight: 20, flex: 1 },
  more: { minHeight: 32, justifyContent: 'center', alignSelf: 'flex-start' },
  moreText: { ...typography.label, color: palette.goldText, fontSize: 10, letterSpacing: 1 },
  empty: { ...typography.caption, color: palette.smoke, fontSize: 12.5, lineHeight: 18 },
  ghostBtn: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.md, borderRadius: radii.sm, borderWidth: 1, borderColor: palette.lineGold },
  ghostBtnSm: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, paddingHorizontal: spacing.md, borderRadius: 999, borderWidth: 1, borderColor: palette.lineGold },
  ghostBtnText: { ...typography.label, color: palette.goldText, fontSize: 10, letterSpacing: 1 },
  commitRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 44, paddingVertical: 6, paddingHorizontal: 4, borderRadius: radii.sm },
  commitText: { ...typography.body, color: palette.ivory, fontSize: 13.5, lineHeight: 19, flex: 1 },
  done: { color: palette.smoke, textDecorationLine: 'line-through' },
  stateTag: { ...typography.label, fontSize: 9.5, letterSpacing: 0.8 },
});
