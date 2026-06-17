/**
 * components/admin-activity — tarjetas para el dossier de actividad del cliente.
 *
 * Cierre del gap "historia completa": el coach ve LO QUE EL CLIENTE HACE (no solo
 * lo que dice). Cuerpo & Protocolo (hábitos/ayuno/cuerpo/nutrición/suplementos) y
 * Reflexiones & Comunidad (journal/posts/engagement/DMs metadata).
 *
 * Presentacional; toma todo del bundle. Solo tokens de tema.
 */
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PremiumCard } from '@/components/polaris';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import type { UserActivityBundle } from '@/lib/admin/queries';

function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtTime(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
function daysAgo(iso?: string | null) {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}
function L({ children }: { children: ReactNode }) {
  return <Text style={s.label}>{children}</Text>;
}
function Empty({ label }: { label: string }) {
  return <Text style={s.empty}>{label}</Text>;
}

// ─── HÁBITOS ──────────────────────────────────────────────────────────────────────
export function HabitsCard({
  habits, logs,
}: { habits: UserActivityBundle['habits']; logs: UserActivityBundle['habitLogs'] }) {
  // últimos 14 días completados por hábito (count rápido).
  const completedByHabit = new Map<string, number>();
  const cutoff = Date.now() - 14 * 86_400_000;
  for (const l of logs) {
    if (!l.completed) continue;
    if (new Date(l.date).getTime() < cutoff) continue;
    completedByHabit.set(l.habit_id, (completedByHabit.get(l.habit_id) ?? 0) + 1);
  }
  const active = habits.filter((h) => h.is_active);
  return (
    <PremiumCard style={s.card}>
      <L>HÁBITOS ({active.length} activos · {logs.length} logs)</L>
      {active.length === 0 ? (
        <Empty label="Sin hábitos activos." />
      ) : (
        active.slice(0, 12).map((h) => {
          const done14 = completedByHabit.get(h.id) ?? 0;
          return (
            <View key={h.id} style={s.row}>
              <Text style={s.rowMain}>{h.name}</Text>
              <Text style={s.rowMeta}>{h.streak}d · {done14}/14 últimos</Text>
            </View>
          );
        })
      )}
    </PremiumCard>
  );
}

// ─── AYUNO ────────────────────────────────────────────────────────────────────────
export function FastingCard({ sessions }: { sessions: UserActivityBundle['fasting'] }) {
  const completed = sessions.filter((f) => f.completed).length;
  return (
    <PremiumCard style={s.card}>
      <L>AYUNO ({completed}/{sessions.length} completados)</L>
      {sessions.length === 0 ? (
        <Empty label="Sin sesiones de ayuno." />
      ) : (
        sessions.slice(0, 8).map((f) => (
          <View key={f.id} style={s.row}>
            <Text style={s.rowMain}>
              {f.type} · {f.target_hours}h
              {f.actual_hours != null && ` (real ${f.actual_hours.toFixed(1)}h)`}
            </Text>
            <Text style={[s.rowMeta, { color: f.completed ? palette.success : palette.warning }]}>
              {f.completed ? '✓' : '·'} {fmtDate(f.started_at)}
            </Text>
          </View>
        ))
      )}
    </PremiumCard>
  );
}

// ─── CUERPO ───────────────────────────────────────────────────────────────────────
export function BodyCard({ measurements }: { measurements: UserActivityBundle['body'] }) {
  const latest = measurements[0];
  const first = measurements[measurements.length - 1];
  const deltaKg = latest && first && first !== latest ? latest.weight_kg - first.weight_kg : null;
  return (
    <PremiumCard style={s.card}>
      <L>CUERPO ({measurements.length} registros)</L>
      {measurements.length === 0 ? (
        <Empty label="Sin medidas corporales." />
      ) : (
        <>
          <View style={s.row}>
            <Text style={s.rowMain}>Peso actual: {latest.weight_kg.toFixed(1)} kg</Text>
            {deltaKg !== null && (
              <Text style={[s.rowMeta, { color: deltaKg < 0 ? palette.success : deltaKg > 0 ? palette.warning : palette.smoke }]}>
                {deltaKg > 0 ? '+' : ''}{deltaKg.toFixed(1)} kg total
              </Text>
            )}
          </View>
          {latest.bmi != null && (
            <View style={s.row}><Text style={s.rowMain}>BMI</Text><Text style={s.rowMeta}>{latest.bmi.toFixed(1)}</Text></View>
          )}
          <Text style={s.sub}>Última: {fmtDate(latest.measured_at)}</Text>
        </>
      )}
    </PremiumCard>
  );
}

// ─── NUTRICIÓN ────────────────────────────────────────────────────────────────────
export function NutritionCard({ profile }: { profile: UserActivityBundle['nutrition'] }) {
  return (
    <PremiumCard style={s.card}>
      <L>NUTRICIÓN</L>
      {!profile ? (
        <Empty label="Sin perfil nutricional." />
      ) : (
        <>
          <View style={s.row}><Text style={s.rowMain}>Dieta</Text><Text style={s.rowMeta}>{profile.diet_type}</Text></View>
          {profile.daily_cal_goal != null && (
            <View style={s.row}><Text style={s.rowMain}>Meta calórica</Text><Text style={s.rowMeta}>{profile.daily_cal_goal} kcal</Text></View>
          )}
          {profile.restrictions && profile.restrictions.length > 0 && (
            <Text style={s.sub}>Restricciones: {profile.restrictions.join(' · ')}</Text>
          )}
          {profile.allergies && profile.allergies.length > 0 && (
            <Text style={s.sub}>Alergias: {profile.allergies.join(' · ')}</Text>
          )}
          {profile.goals && profile.goals.length > 0 && (
            <Text style={s.sub}>Objetivos: {profile.goals.join(' · ')}</Text>
          )}
        </>
      )}
    </PremiumCard>
  );
}

// ─── SUPLEMENTOS ──────────────────────────────────────────────────────────────────
export function SupplementsCard({ stacks }: { stacks: UserActivityBundle['supplements'] }) {
  const active = stacks.filter((s_) => s_.is_active);
  return (
    <PremiumCard style={s.card}>
      <L>SUPLEMENTOS ({active.length} stacks activos)</L>
      {active.length === 0 ? (
        <Empty label="Sin stacks activos." />
      ) : (
        active.map((stk) => (
          <View key={stk.id} style={s.row}>
            <Text style={s.rowMain}>{stk.name}{stk.goal ? ` · ${stk.goal}` : ''}</Text>
            <Text style={s.rowMeta}>{(stk.supplements ?? []).length} ítems</Text>
          </View>
        ))
      )}
    </PremiumCard>
  );
}

// ─── PRÁCTICAS DE WELLNESS ────────────────────────────────────────────────────────
const TYPE_LABEL: Record<string, string> = {
  binaural: 'Binaural', meditation: 'Meditación', breathing: 'Respiración', sleep: 'Sueño',
};
export function WellnessSessionsCard({ sessions }: { sessions: UserActivityBundle['wellness'] }) {
  const totalMin = Math.round(sessions.reduce((sum, x) => sum + (x.duration_seconds ?? 0), 0) / 60);
  const byType = new Map<string, number>();
  for (const x of sessions) byType.set(x.type, (byType.get(x.type) ?? 0) + 1);
  return (
    <PremiumCard style={s.card}>
      <L>PRÁCTICAS ({sessions.length} sesiones · {totalMin} min)</L>
      {sessions.length === 0 ? (
        <Empty label="Sin sesiones de práctica registradas." />
      ) : (
        <>
          <View style={s.chipWrap}>
            {[...byType.entries()].map(([t, n]) => (
              <View key={t} style={s.chip}>
                <Text style={s.chipText}>{TYPE_LABEL[t] ?? t}: {n}</Text>
              </View>
            ))}
          </View>
          {sessions.slice(0, 6).map((x) => (
            <View key={x.id} style={s.row}>
              <Text style={s.rowMain}>{x.session_name ?? TYPE_LABEL[x.type] ?? x.type}</Text>
              <Text style={s.rowMeta}>{Math.round((x.duration_seconds ?? 0) / 60)}m · {fmtTime(x.completed_at)}</Text>
            </View>
          ))}
        </>
      )}
    </PremiumCard>
  );
}

// ─── DIARIO / REFLEXIONES ─────────────────────────────────────────────────────────
export function JournalCard({ entries }: { entries: UserActivityBundle['journal'] }) {
  return (
    <PremiumCard style={s.card}>
      <L>REFLEXIONES — DIARIO ({entries.length})</L>
      {entries.length === 0 ? (
        <Empty label="Sin entradas de diario." />
      ) : (
        entries.slice(0, 8).map((e) => (
          <View key={e.id} style={s.journalEntry}>
            <View style={s.journalHead}>
              <Text style={s.journalType}>{(e.entry_type ?? 'reflection').toUpperCase()}</Text>
              {e.mood_score != null && (
                <Text style={s.journalMood}>ánimo {e.mood_score}/10</Text>
              )}
              <Text style={s.journalDate}>{fmtTime(e.created_at)}</Text>
            </View>
            <Text style={s.journalBody} numberOfLines={3}>{e.content}</Text>
          </View>
        ))
      )}
    </PremiumCard>
  );
}

// ─── COMUNIDAD ────────────────────────────────────────────────────────────────────
export function CommunityCard({
  posts, reactionsGiven, dmsSent, dmLastActivity,
}: {
  posts: UserActivityBundle['posts'];
  reactionsGiven: number;
  dmsSent: number;
  dmLastActivity: string | null;
}) {
  const dmDays = daysAgo(dmLastActivity);
  return (
    <PremiumCard style={s.card}>
      <L>COMUNIDAD</L>
      <View style={s.statsRow}>
        <View style={s.stat}><Text style={s.statN}>{posts.length}</Text><Text style={s.statL}>POSTS</Text></View>
        <View style={s.stat}><Text style={s.statN}>{reactionsGiven}</Text><Text style={s.statL}>LIKES DADOS</Text></View>
        <View style={s.stat}><Text style={s.statN}>{dmsSent}</Text><Text style={s.statL}>DMs ENVIADOS</Text></View>
        <View style={s.stat}>
          <Text style={s.statN}>{dmDays != null ? `${dmDays}d` : '—'}</Text>
          <Text style={s.statL}>ÚLT. DM</Text>
        </View>
      </View>
      {posts.length > 0 && (
        <>
          <Text style={[s.sub, { marginTop: spacing.sm }]}>Últimas publicaciones</Text>
          {posts.slice(0, 4).map((p) => (
            <View key={p.id} style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.rowMain} numberOfLines={2}>{p.content}</Text>
                <Text style={s.rowSub}>{fmtTime(p.created_at)}</Text>
              </View>
              <Text style={s.rowMeta}>
                <MaterialIcons name="favorite" size={11} color={palette.goldText} /> {p.likes_count}
              </Text>
            </View>
          ))}
        </>
      )}
      <Text style={s.privacyNote}>
        Mensajes directos entre pares: solo metadata (conteo + última actividad), nunca contenido.
      </Text>
    </PremiumCard>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  card: { gap: spacing.sm, marginBottom: spacing.md },
  label: { ...typography.label, color: palette.goldText, fontSize: 11, letterSpacing: 1.8 },
  sub: { ...typography.caption, color: palette.smoke, fontSize: 12 },
  empty: { ...typography.caption, color: palette.smoke, fontSize: 12, fontStyle: 'italic' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, paddingVertical: 4 },
  rowMain: { ...typography.body, color: palette.ivory, fontSize: 13, flex: 1 },
  rowMeta: { ...typography.label, color: palette.ash, fontSize: 11 },
  rowSub: { ...typography.caption, color: palette.smoke, fontSize: 11, marginTop: 2 },
  // chips
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { backgroundColor: palette.goldLight, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  chipText: { ...typography.label, color: palette.goldText, fontSize: 11 },
  // journal
  journalEntry: { borderTopWidth: 1, borderTopColor: palette.lineSoft, paddingTop: spacing.sm, marginTop: spacing.xs, gap: 4 },
  journalHead: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  journalType: { ...typography.label, color: palette.goldText, fontSize: 9, letterSpacing: 1 },
  journalMood: { ...typography.label, color: palette.ash, fontSize: 10 },
  journalDate: { ...typography.caption, color: palette.smoke, fontSize: 10, marginLeft: 'auto' },
  journalBody: { ...typography.body, color: palette.ash, fontSize: 13, lineHeight: 19, fontFamily: Fonts.sans },
  // community stats
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  stat: { borderWidth: 1, borderColor: palette.line, borderRadius: radii.sm, paddingHorizontal: spacing.sm, paddingVertical: 6, minWidth: 76, alignItems: 'center' },
  statN: { ...typography.section, color: palette.ivory, fontSize: 16 },
  statL: { ...typography.label, color: palette.smoke, fontSize: 9, letterSpacing: 0.8, marginTop: 1 },
  privacyNote: { ...typography.caption, color: palette.smoke, fontSize: 10, fontStyle: 'italic', marginTop: spacing.sm },
});
