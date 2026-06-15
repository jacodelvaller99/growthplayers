/**
 * components/memory — tarjetas reutilizables del Memory OS.
 *
 * Presentacionales (sin IO). Usadas por la vista admin (variant='admin', muestra
 * todo) y la vista cliente (variant='client', oculta lo clínico/estratégico).
 * Solo tokens `palette.*`/`goldText` (regla oro/ink) para light+dark.
 */
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { PremiumCard } from '@/components/polaris';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import type { AdminBriefing, AdminNote, MemoryProfile, MemorySummaryRow } from '@/lib/memory';
import type { Commitment } from '@/lib/memoryLogic';

type Variant = 'admin' | 'client';

// ─── Helpers de presentación ──────────────────────────────────────────────────────
function SectionLabel({ children }: { children: string }) {
  return <Text style={s.label}>{children}</Text>;
}

function Bullets({ items, color }: { items?: string[]; color?: string }) {
  if (!items || items.length === 0) return null;
  return (
    <View style={{ gap: 4 }}>
      {items.map((t, i) => (
        <View key={i} style={s.bulletRow}>
          <Text style={[s.bulletDot, color ? { color } : null]}>•</Text>
          <Text style={s.bulletText}>{t}</Text>
        </View>
      ))}
    </View>
  );
}

function Empty({ label }: { label: string }) {
  return <Text style={s.empty}>{label}</Text>;
}

// ─── ProfileSynopsisCard ────────────────────────────────────────────────────────
export function ProfileSynopsisCard({
  profile,
  variant = 'admin',
}: {
  profile: MemoryProfile | null;
  variant?: Variant;
}) {
  const p = profile ?? {};
  const hasAny =
    p.identity_summary || p.current_goal || p.transformation_goal || p.mentorship_focus;
  return (
    <PremiumCard style={s.card}>
      <SectionLabel>{variant === 'client' ? 'MI RESUMEN' : 'SÍNTESIS DEL CLIENTE'}</SectionLabel>
      {!hasAny ? (
        <Empty label="Aún sin síntesis. Se genera tras las primeras sesiones." />
      ) : (
        <View style={{ gap: spacing.sm }}>
          {!!p.identity_summary && <Text style={s.body}>{p.identity_summary}</Text>}
          {!!p.current_goal && (
            <Text style={s.kv}><Text style={s.k}>Meta actual: </Text>{p.current_goal}</Text>
          )}
          {!!p.transformation_goal && (
            <Text style={s.kv}><Text style={s.k}>Transformación: </Text>{p.transformation_goal}</Text>
          )}
          {!!p.mentorship_focus && (
            <Text style={s.kv}><Text style={s.k}>Foco mentoría: </Text>{p.mentorship_focus}</Text>
          )}
          {variant === 'admin' && !!p.decision_style && (
            <Text style={s.kv}><Text style={s.k}>Estilo de decisión: </Text>{p.decision_style}</Text>
          )}
          {variant === 'admin' && (p.recurring_blockers?.length ?? 0) > 0 && (
            <View style={{ marginTop: 4 }}>
              <SectionLabel>BLOQUEOS RECURRENTES</SectionLabel>
              <Bullets items={p.recurring_blockers} color={palette.danger} />
            </View>
          )}
          {variant === 'admin' && (p.current_risks?.length ?? 0) > 0 && (
            <View style={{ marginTop: 4 }}>
              <SectionLabel>RIESGOS</SectionLabel>
              <Bullets items={p.current_risks} color={palette.warning} />
            </View>
          )}
        </View>
      )}
    </PremiumCard>
  );
}

// ─── CommitmentsCard ────────────────────────────────────────────────────────────
export function CommitmentsCard({
  open,
  completed,
  variant = 'admin',
}: {
  open?: Commitment[];
  completed?: Commitment[];
  variant?: Variant;
}) {
  const openItems = (open ?? []).map((c) => c.text).filter(Boolean);
  const doneItems = (completed ?? []).map((c) => c.text).filter(Boolean);
  return (
    <PremiumCard style={s.card}>
      <SectionLabel>{variant === 'client' ? 'MIS COMPROMISOS' : 'COMPROMISOS'}</SectionLabel>
      {openItems.length === 0 && doneItems.length === 0 ? (
        <Empty label="Sin compromisos registrados todavía." />
      ) : (
        <View style={{ gap: spacing.sm }}>
          {openItems.length > 0 && (
            <View>
              <Text style={s.subLabel}>Abiertos</Text>
              {openItems.map((t, i) => (
                <View key={i} style={s.bulletRow}>
                  <MaterialIcons name="radio-button-unchecked" size={15} color={palette.goldText} />
                  <Text style={s.bulletText}>{t}</Text>
                </View>
              ))}
            </View>
          )}
          {doneItems.length > 0 && (
            <View>
              <Text style={s.subLabel}>Cumplidos</Text>
              {doneItems.map((t, i) => (
                <View key={i} style={s.bulletRow}>
                  <MaterialIcons name="check-circle" size={15} color={palette.success} />
                  <Text style={[s.bulletText, { color: palette.smoke }]}>{t}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </PremiumCard>
  );
}

// ─── RepeatedThemesCard ─────────────────────────────────────────────────────────
export function RepeatedThemesCard({ themes }: { themes?: string[] }) {
  const items = (themes ?? []).filter(Boolean);
  return (
    <PremiumCard style={s.card}>
      <SectionLabel>TEMAS RECURRENTES</SectionLabel>
      {items.length === 0 ? (
        <Empty label="Aún sin patrón de temas." />
      ) : (
        <View style={s.chipWrap}>
          {items.map((t, i) => (
            <View key={i} style={s.chip}>
              <Text style={s.chipText}>{t}</Text>
            </View>
          ))}
        </View>
      )}
    </PremiumCard>
  );
}

// ─── MemorySummaryCard + ConversationTimeline ───────────────────────────────────
const SOURCE_LABEL: Record<string, string> = {
  chat: 'CHAT', mentorship: 'MENTORÍA', plaud: 'LLAMADA', manual: 'MANUAL', aggregate: 'SÍNTESIS',
};

export function MemorySummaryCard({ summary }: { summary: MemorySummaryRow }) {
  const date = summary.created_at ? new Date(summary.created_at).toLocaleDateString('es') : '';
  return (
    <View style={s.timelineItem}>
      <View style={s.timelineHead}>
        <View style={s.sourceBadge}>
          <Text style={s.sourceBadgeText}>{SOURCE_LABEL[summary.source_type ?? 'chat'] ?? 'CHAT'}</Text>
        </View>
        <Text style={s.timelineDate}>{date}</Text>
      </View>
      {!!summary.summary && <Text style={s.body}>{summary.summary}</Text>}
      {(summary.key_topics?.length ?? 0) > 0 && (
        <View style={[s.chipWrap, { marginTop: 6 }]}>
          {summary.key_topics!.slice(0, 6).map((t, i) => (
            <View key={i} style={s.chipSm}><Text style={s.chipTextSm}>{t}</Text></View>
          ))}
        </View>
      )}
      {!!summary.suggested_next_focus && (
        <Text style={[s.kv, { marginTop: 6 }]}>
          <Text style={s.k}>Foco: </Text>{summary.suggested_next_focus}
        </Text>
      )}
    </View>
  );
}

export function ConversationTimeline({
  summaries,
  variant = 'admin',
}: {
  summaries?: MemorySummaryRow[];
  variant?: Variant;
}) {
  const items = summaries ?? [];
  return (
    <PremiumCard style={s.card}>
      <SectionLabel>{variant === 'client' ? 'MIS CONVERSACIONES CLAVE' : 'LÍNEA DE TIEMPO'}</SectionLabel>
      {items.length === 0 ? (
        <Empty label="Sin resúmenes registrados." />
      ) : (
        <View style={{ gap: spacing.md }}>
          {items.map((sm, i) => <MemorySummaryCard key={sm.id ?? i} summary={sm} />)}
        </View>
      )}
    </PremiumCard>
  );
}

// ─── AdminBriefingCard (admin-only) ─────────────────────────────────────────────
const RISK_COLOR: Record<string, string> = {
  low: palette.success, medium: palette.warning, high: palette.danger,
};

export function AdminBriefingCard({
  briefing,
  generating,
  onGenerate,
}: {
  briefing: AdminBriefing | null;
  generating?: boolean;
  onGenerate?: () => void;
}) {
  return (
    <PremiumCard style={[s.card, { borderColor: palette.lineGold }]}>
      <View style={s.briefHead}>
        <SectionLabel>BRIEFING DE MENTORÍA</SectionLabel>
        {!!onGenerate && (
          <Pressable
            onPress={onGenerate}
            disabled={generating}
            style={({ pressed }) => [s.genBtn, pressed && { opacity: 0.8 }, generating && { opacity: 0.5 }]}>
            <MaterialIcons name="auto-awesome" size={14} color={palette.ink} />
            <Text style={s.genBtnText}>{generating ? 'GENERANDO…' : briefing ? 'REGENERAR' : 'GENERAR'}</Text>
          </Pressable>
        )}
      </View>
      {!briefing ? (
        <Empty label="Genera un briefing para preparar la próxima sesión." />
      ) : (
        <View style={{ gap: spacing.sm }}>
          {!!briefing.risk_level && (
            <View style={[s.riskPill, { borderColor: RISK_COLOR[briefing.risk_level] ?? palette.smoke }]}>
              <Text style={[s.riskText, { color: RISK_COLOR[briefing.risk_level] ?? palette.smoke }]}>
                RIESGO {briefing.risk_level.toUpperCase()}
              </Text>
            </View>
          )}
          {!!briefing.summary && <Text style={s.body}>{briefing.summary}</Text>}
          {(briefing.challenge_points?.length ?? 0) > 0 && (
            <View>
              <Text style={s.subLabel}>Para confrontar</Text>
              <Bullets items={briefing.challenge_points} color={palette.goldText} />
            </View>
          )}
          {(briefing.suggested_mentorship_topics?.length ?? 0) > 0 && (
            <View>
              <Text style={s.subLabel}>Temas sugeridos</Text>
              <Bullets items={briefing.suggested_mentorship_topics} />
            </View>
          )}
          {(briefing.open_loops?.length ?? 0) > 0 && (
            <View>
              <Text style={s.subLabel}>Loops abiertos</Text>
              <Bullets items={briefing.open_loops} color={palette.warning} />
            </View>
          )}
          {(briefing.recent_progress?.length ?? 0) > 0 && (
            <View>
              <Text style={s.subLabel}>Progreso</Text>
              <Bullets items={briefing.recent_progress} color={palette.success} />
            </View>
          )}
        </View>
      )}
    </PremiumCard>
  );
}

// ─── AdminNotesCard (admin-only) ────────────────────────────────────────────────
export function AdminNotesCard({
  notes,
  busy,
  onAdd,
}: {
  notes?: AdminNote[];
  busy?: boolean;
  onAdd?: (note: string) => void;
}) {
  const [text, setText] = useState('');
  const list = notes ?? [];
  return (
    <PremiumCard style={s.card}>
      <SectionLabel>NOTAS PRIVADAS DEL COACH</SectionLabel>
      {!!onAdd && (
        <View style={s.noteInputRow}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Añadir una nota privada…"
            placeholderTextColor={palette.smoke}
            style={s.noteInput}
            multiline
          />
          <Pressable
            onPress={() => { if (text.trim()) { onAdd(text.trim()); setText(''); } }}
            disabled={busy || !text.trim()}
            style={({ pressed }) => [s.noteAddBtn, (pressed) && { opacity: 0.8 }, (busy || !text.trim()) && { opacity: 0.4 }]}>
            <MaterialIcons name="add" size={18} color={palette.ink} />
          </Pressable>
        </View>
      )}
      {list.length === 0 ? (
        <Empty label="Sin notas privadas." />
      ) : (
        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          {list.map((n, i) => (
            <View key={n.id ?? i} style={s.noteItem}>
              <Text style={s.body}>{n.note}</Text>
              {!!n.created_at && (
                <Text style={s.noteDate}>{new Date(n.created_at).toLocaleDateString('es')}</Text>
              )}
            </View>
          ))}
        </View>
      )}
    </PremiumCard>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  card: { gap: spacing.sm, marginBottom: spacing.md },
  label: { ...typography.label, color: palette.goldText, fontSize: 11, letterSpacing: 1.8 },
  subLabel: { ...typography.label, color: palette.smoke, fontSize: 10, letterSpacing: 1.2, marginBottom: 4 },
  body: { ...typography.body, color: palette.ash, fontSize: 13, lineHeight: 19 },
  kv: { ...typography.body, color: palette.ash, fontSize: 13, lineHeight: 19 },
  k: { color: palette.ivory, fontFamily: Fonts.displayMedium },
  empty: { ...typography.caption, color: palette.smoke, fontSize: 12, fontStyle: 'italic' },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  bulletDot: { color: palette.goldText, fontSize: 14, lineHeight: 19 },
  bulletText: { ...typography.body, color: palette.ash, fontSize: 13, lineHeight: 19, flex: 1 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { backgroundColor: palette.goldLight, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  chipText: { ...typography.label, color: palette.goldText, fontSize: 11, letterSpacing: 0.5 },
  chipSm: { backgroundColor: palette.charcoal, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  chipTextSm: { ...typography.label, color: palette.ash, fontSize: 10, letterSpacing: 0.4 },
  timelineItem: { borderLeftWidth: 2, borderLeftColor: palette.lineGold, paddingLeft: spacing.md, gap: 4 },
  timelineHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timelineDate: { ...typography.mono, color: palette.smoke, fontSize: 11 },
  sourceBadge: { backgroundColor: palette.charcoal, borderRadius: radii.sm, paddingHorizontal: 7, paddingVertical: 2 },
  sourceBadgeText: { ...typography.label, color: palette.goldText, fontSize: 9, letterSpacing: 1 },
  briefHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  genBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: palette.gold,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: radii.sm,
  },
  genBtnText: { ...typography.label, color: palette.ink, fontSize: 11, letterSpacing: 1 },
  riskPill: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  riskText: { ...typography.label, fontSize: 10, letterSpacing: 1 },
  noteInputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  noteInput: {
    flex: 1, ...typography.body, color: palette.ivory, fontSize: 13, backgroundColor: palette.charcoal,
    borderRadius: radii.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, minHeight: 40,
  },
  noteAddBtn: {
    width: 40, height: 40, borderRadius: radii.sm, backgroundColor: palette.gold,
    alignItems: 'center', justifyContent: 'center',
  },
  noteItem: { backgroundColor: palette.charcoal, borderRadius: radii.sm, padding: spacing.md, gap: 4 },
  noteDate: { ...typography.mono, color: palette.smoke, fontSize: 10 },
});
