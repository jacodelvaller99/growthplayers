/**
 * components/mentor-execution — tarjetas del Mentor Execution OS.
 *
 * Presentacionales. El lenguaje "duro" de scoring es para admin/mentor; la versión
 * cliente vive en perfil/cliente con tono de apoyo. Solo tokens de tema (oro/ink).
 */
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { PremiumCard } from '@/components/polaris';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { deriveStatus } from '@/lib/mentorExecutionLogic';
import type {
  ClientScores, InterventionItem, MentorPrep, MentorTask, TaskReview, TaskStatus,
} from '@/lib/mentorExecution';

// ─── Tokens de presentación ─────────────────────────────────────────────────────
const STATUS_META: Record<TaskStatus, { label: string; color: string; icon: React.ComponentProps<typeof MaterialIcons>['name'] }> = {
  not_started: { label: 'Sin iniciar', color: palette.smoke,   icon: 'radio-button-unchecked' },
  in_progress: { label: 'En curso',    color: palette.goldText, icon: 'pending' },
  completed:   { label: 'Hecha',       color: palette.success,  icon: 'check-circle' },
  blocked:     { label: 'Bloqueada',   color: palette.danger,   icon: 'block' },
  avoided:     { label: 'Evitada',     color: palette.danger,   icon: 'visibility-off' },
  overdue:     { label: 'Vencida',     color: palette.warning,  icon: 'schedule' },
  canceled:    { label: 'Cancelada',   color: palette.muted,    icon: 'cancel' },
};
const SEV_COLOR: Record<string, string> = { low: palette.smoke, medium: palette.warning, high: palette.danger, critical: palette.danger };

function L({ children }: { children: string }) {
  return <Text style={s.label}>{children}</Text>;
}
function Empty({ label }: { label: string }) {
  return <Text style={s.empty}>{label}</Text>;
}
function Bullets({ items, color }: { items?: string[]; color?: string }) {
  if (!items?.length) return null;
  return (
    <View style={{ gap: 4 }}>
      {items.map((t, i) => (
        <View key={i} style={s.bulletRow}>
          <Text style={[s.dot, color ? { color } : null]}>•</Text>
          <Text style={s.bulletText}>{t}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── ExecutionScoreCard (admin) ──────────────────────────────────────────────────
function ScoreBar({ label, value, invert }: { label: string; value: number; invert?: boolean }) {
  // invert: mayor = peor (fricción/atención) → rojo cuando alto.
  const good = invert ? value < 40 : value >= 60;
  const mid = invert ? value < 65 : value >= 40;
  const color = good ? palette.success : mid ? palette.warning : palette.danger;
  return (
    <View style={s.scoreRow}>
      <Text style={s.scoreLabel}>{label}</Text>
      <View style={s.scoreTrack}>
        <View style={[s.scoreFill, { width: `${Math.max(2, value)}%`, backgroundColor: color }]} />
      </View>
      <Text style={[s.scoreVal, { color }]}>{value}</Text>
    </View>
  );
}

const MOMENTUM_META: Record<string, { label: string; color: string }> = {
  rising:    { label: 'EN ASCENSO', color: palette.success },
  stable:    { label: 'ESTABLE',    color: palette.goldText },
  fragile:   { label: 'FRÁGIL',     color: palette.warning },
  declining: { label: 'EN CAÍDA',   color: palette.danger },
  critical:  { label: 'CRÍTICO',    color: palette.danger },
};

export function ExecutionScoreCard({ scores }: { scores: ClientScores | null }) {
  return (
    <PremiumCard style={s.card}>
      <L>SCORES DE EJECUCIÓN</L>
      {!scores ? (
        <Empty label="Sin datos suficientes todavía." />
      ) : (
        <View style={{ gap: spacing.sm }}>
          {(() => {
            const m = MOMENTUM_META[scores.weekly_momentum_state] ?? MOMENTUM_META.stable;
            return (
              <View style={[s.momentumPill, { borderColor: m.color }]}>
                <Text style={[s.momentumText, { color: m.color }]}>MOMENTUM · {m.label}</Text>
              </View>
            );
          })()}
          <ScoreBar label="Adherencia" value={scores.adherence_score} />
          <ScoreBar label="Calidad" value={scores.execution_quality_score} />
          <ScoreBar label="Follow-through" value={scores.follow_through_score} />
          <ScoreBar label="Fricción" value={scores.friction_score} invert />
          <ScoreBar label="Atención mentor" value={scores.mentor_attention_score} invert />
        </View>
      )}
    </PremiumCard>
  );
}

// ─── TaskStatusBadge + ClientTaskList ────────────────────────────────────────────
export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const m = STATUS_META[status];
  return (
    <View style={[s.badge, { borderColor: m.color }]}>
      <MaterialIcons name={m.icon} size={12} color={m.color} />
      <Text style={[s.badgeText, { color: m.color }]}>{m.label}</Text>
    </View>
  );
}

export function ClientTaskList({
  tasks, onReview, title = 'TAREAS', emptyLabel = 'Sin tareas.',
}: {
  tasks: MentorTask[];
  onReview?: (task: MentorTask) => void;
  title?: string;
  emptyLabel?: string;
}) {
  const now = Date.now();
  return (
    <PremiumCard style={s.card}>
      <L>{title}</L>
      {tasks.length === 0 ? (
        <Empty label={emptyLabel} />
      ) : (
        <View style={{ gap: spacing.sm }}>
          {tasks.map((t, i) => {
            const st = deriveStatus(t, now);
            const ai = t.mentor_review_status === 'ai_suggested';
            const row = (
              <View style={s.taskRow}>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={s.taskTitle}>{t.title}</Text>
                  <View style={s.taskMeta}>
                    <TaskStatusBadge status={st} />
                    {!!t.category && <Text style={s.taskCat}>{t.category}</Text>}
                    {t.priority === 'critical' && <Text style={[s.taskCat, { color: palette.danger }]}>crítica</Text>}
                    {ai && <Text style={[s.taskCat, { color: palette.goldText }]}>IA sugerida</Text>}
                  </View>
                </View>
                {!!onReview && <MaterialIcons name="rate-review" size={18} color={palette.goldText} />}
              </View>
            );
            return onReview ? (
              <Pressable key={t.id ?? i} onPress={() => onReview(t)} style={({ pressed }) => pressed && { opacity: 0.7 }}>
                {row}
              </Pressable>
            ) : (
              <View key={t.id ?? i}>{row}</View>
            );
          })}
        </View>
      )}
    </PremiumCard>
  );
}

// ─── InterventionQueueCard ────────────────────────────────────────────────────────
export function InterventionQueueCard({ items, title = 'INTERVENCIÓN' }: { items: InterventionItem[]; title?: string }) {
  return (
    <PremiumCard style={[s.card, items.length ? { borderColor: palette.lineGold } : null]}>
      <L>{title}</L>
      {items.length === 0 ? (
        <Empty label="Sin alertas. Cliente en buen estado." />
      ) : (
        <View style={{ gap: spacing.sm }}>
          {items.map((it, i) => (
            <View key={i} style={s.ivItem}>
              <View style={[s.sevPill, { borderColor: SEV_COLOR[it.severity] ?? palette.smoke }]}>
                <Text style={[s.sevText, { color: SEV_COLOR[it.severity] ?? palette.smoke }]}>{it.severity.toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.ivSummary}>{it.summary}</Text>
                <Text style={s.ivAction}>→ {it.recommended_action}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </PremiumCard>
  );
}

// ─── NextMentorshipAgendaCard (mentor prep) ───────────────────────────────────────
export function NextMentorshipAgendaCard({ prep }: { prep: MentorPrep | null }) {
  return (
    <PremiumCard style={[s.card, { borderColor: palette.lineGold }]}>
      <L>AGENDA PRÓXIMA MENTORÍA</L>
      {!prep ? (
        <Empty label="Se genera con tareas y memoria del cliente." />
      ) : (
        <View style={{ gap: spacing.sm }}>
          <Text style={s.prepState}>{prep.execution_state}</Text>
          {prep.said_would_do.length > 0 && (
            <View><Text style={s.sub}>Dijo que haría</Text><Bullets items={prep.said_would_do} color={palette.goldText} /></View>
          )}
          {prep.actually_did.length > 0 && (
            <View><Text style={s.sub}>Hizo</Text><Bullets items={prep.actually_did} color={palette.success} /></View>
          )}
          {!!prep.highest_friction_area && (
            <Text style={s.kv}><Text style={s.k}>Mayor fricción: </Text>{prep.highest_friction_area}</Text>
          )}
          {!!prep.challenge && <Text style={s.kv}><Text style={s.k}>Confrontar: </Text>{prep.challenge}</Text>}
          {!!prep.simplify && <Text style={s.kv}><Text style={s.k}>Simplificar: </Text>{prep.simplify}</Text>}
          {!!prep.celebrate && <Text style={s.kv}><Text style={s.k}>Celebrar: </Text>{prep.celebrate}</Text>}
          {prep.top_questions.length > 0 && (
            <View><Text style={s.sub}>Preguntas</Text><Bullets items={prep.top_questions} /></View>
          )}
          {prep.tasks_to_review.length > 0 && (
            <View><Text style={s.sub}>Revisar en vivo</Text><Bullets items={prep.tasks_to_review} color={palette.warning} /></View>
          )}
        </View>
      )}
    </PremiumCard>
  );
}

// ─── FailurePatternCard ───────────────────────────────────────────────────────────
const FAILURE_LABEL: Record<string, string> = {
  forgot: 'olvido', no_clarity: 'sin claridad', resistance: 'resistencia', fear: 'miedo',
  perfectionism: 'perfeccionismo', time_chaos: 'caos de tiempo', identity_conflict: 'conflicto de identidad',
  low_energy: 'baja energía', external_dependency: 'dependencia externa', false_compliance: 'cumplimiento aparente',
};

export function FailurePatternCard({ reviews }: { reviews: TaskReview[] }) {
  const tally = new Map<string, number>();
  for (const r of reviews) {
    if (r.failure_type) tally.set(r.failure_type, (tally.get(r.failure_type) ?? 0) + 1);
  }
  const items = [...tally.entries()].sort((a, b) => b[1] - a[1]);
  return (
    <PremiumCard style={s.card}>
      <L>PATRONES DE NO-CUMPLIMIENTO</L>
      {items.length === 0 ? (
        <Empty label="Aún sin patrón clasificado." />
      ) : (
        <View style={s.chipWrap}>
          {items.map(([k, n]) => (
            <View key={k} style={s.chip}>
              <Text style={s.chipText}>{FAILURE_LABEL[k] ?? k} · {n}</Text>
            </View>
          ))}
        </View>
      )}
    </PremiumCard>
  );
}

// ─── MentorReviewDrawer (rúbrica de evaluación) ───────────────────────────────────
const RUBRIC = {
  review_status: ['not_started', 'partial', 'completed', 'blocked', 'avoided'],
  quality: ['low', 'acceptable', 'strong', 'exceptional'],
  evidence_confidence: ['none', 'weak', 'moderate', 'strong'],
  failure_type: ['forgot', 'no_clarity', 'resistance', 'fear', 'perfectionism', 'time_chaos', 'identity_conflict', 'low_energy', 'external_dependency', 'false_compliance'],
  mentor_action: ['reinforce', 'simplify', 'confront', 'redefine', 'follow_up', 'escalate'],
} as const;
const RUBRIC_LABEL: Record<string, string> = {
  not_started: 'sin iniciar', partial: 'parcial', completed: 'completada', blocked: 'bloqueada', avoided: 'evitada',
  low: 'baja', acceptable: 'aceptable', strong: 'fuerte', exceptional: 'excepcional',
  none: 'ninguna', weak: 'débil', moderate: 'moderada',
  reinforce: 'reforzar', simplify: 'simplificar', confront: 'confrontar', redefine: 'redefinir', follow_up: 'seguir', escalate: 'escalar',
  ...FAILURE_LABEL,
};

function ChipRow({ label, options, value, onPick }: { label: string; options: readonly string[]; value: string; onPick: (v: string) => void }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={s.sub}>{label}</Text>
      <View style={s.chipWrap}>
        {options.map((o) => {
          const active = value === o;
          return (
            <Pressable key={o} onPress={() => onPick(o)} style={[s.selChip, active && s.selChipActive]}>
              <Text style={[s.selChipText, active && s.selChipTextActive]}>{RUBRIC_LABEL[o] ?? o}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function MentorReviewDrawer({
  task, visible, busy, onClose, onSubmit,
}: {
  task: MentorTask | null;
  visible: boolean;
  busy?: boolean;
  onClose: () => void;
  onSubmit: (review: { review_status: string; quality: string; evidence_confidence: string; failure_type: string; mentor_action: string; notes: string }) => void;
}) {
  const [r, setR] = useState({ review_status: '', quality: '', evidence_confidence: '', failure_type: '', mentor_action: '', notes: '' });
  const set = (k: keyof typeof r) => (v: string) => setR((p) => ({ ...p, [k]: v }));

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.drawerBackdrop}>
        <View style={s.drawer}>
          <View style={s.drawerHead}>
            <Text style={s.drawerTitle} numberOfLines={2}>{task?.title ?? 'Revisar tarea'}</Text>
            <Pressable onPress={onClose}><MaterialIcons name="close" size={22} color={palette.smoke} /></Pressable>
          </View>
          <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.md }}>
            <ChipRow label="ESTADO" options={RUBRIC.review_status} value={r.review_status} onPick={set('review_status')} />
            <ChipRow label="CALIDAD" options={RUBRIC.quality} value={r.quality} onPick={set('quality')} />
            <ChipRow label="EVIDENCIA" options={RUBRIC.evidence_confidence} value={r.evidence_confidence} onPick={set('evidence_confidence')} />
            <ChipRow label="TIPO DE FALLO" options={RUBRIC.failure_type} value={r.failure_type} onPick={set('failure_type')} />
            <ChipRow label="ACCIÓN DEL MENTOR" options={RUBRIC.mentor_action} value={r.mentor_action} onPick={set('mentor_action')} />
            <View style={{ gap: 6 }}>
              <Text style={s.sub}>NOTAS</Text>
              <TextInput
                value={r.notes} onChangeText={set('notes')} multiline textAlignVertical="top"
                placeholder="Notas de evaluación…" placeholderTextColor={palette.smoke} style={s.notesInput}
              />
            </View>
          </ScrollView>
          <Pressable
            onPress={() => onSubmit(r)}
            disabled={busy || !r.review_status}
            style={({ pressed }) => [s.submitBtn, pressed && { opacity: 0.85 }, (busy || !r.review_status) && { opacity: 0.4 }]}>
            <Text style={s.submitText}>{busy ? 'GUARDANDO…' : 'GUARDAR EVALUACIÓN'}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  card: { gap: spacing.sm, marginBottom: spacing.md },
  label: { ...typography.label, color: palette.goldText, fontSize: 11, letterSpacing: 1.8 },
  sub: { ...typography.label, color: palette.smoke, fontSize: 10, letterSpacing: 1.2 },
  empty: { ...typography.caption, color: palette.smoke, fontSize: 12, fontStyle: 'italic' },
  kv: { ...typography.body, color: palette.ash, fontSize: 13, lineHeight: 19 },
  k: { color: palette.ivory, fontFamily: Fonts.displayMedium },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  dot: { color: palette.goldText, fontSize: 14, lineHeight: 19 },
  bulletText: { ...typography.body, color: palette.ash, fontSize: 13, lineHeight: 19, flex: 1 },
  // scores
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  scoreLabel: { ...typography.caption, color: palette.ash, fontSize: 11, width: 96 },
  scoreTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: palette.charcoal, overflow: 'hidden' },
  scoreFill: { height: 6, borderRadius: 3 },
  scoreVal: { ...typography.mono, fontSize: 12, width: 28, textAlign: 'right' },
  momentumPill: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  momentumText: { ...typography.label, fontSize: 10, letterSpacing: 1 },
  // tasks
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderBottomWidth: 1, borderBottomColor: palette.lineSoft, paddingBottom: spacing.sm },
  taskTitle: { ...typography.body, color: palette.ivory, fontSize: 13 },
  taskMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  taskCat: { ...typography.caption, color: palette.smoke, fontSize: 10 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 3, borderWidth: 1, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText: { ...typography.label, fontSize: 9, letterSpacing: 0.5 },
  // intervention
  ivItem: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  sevPill: { borderWidth: 1, borderRadius: radii.sm, paddingHorizontal: 6, paddingVertical: 2, marginTop: 1 },
  sevText: { ...typography.label, fontSize: 9, letterSpacing: 0.8 },
  ivSummary: { ...typography.body, color: palette.ash, fontSize: 13, lineHeight: 18 },
  ivAction: { ...typography.caption, color: palette.goldText, fontSize: 11, marginTop: 2 },
  // prep
  prepState: { ...typography.caption, color: palette.smoke, fontSize: 12 },
  // chips
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { backgroundColor: palette.goldLight, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  chipText: { ...typography.label, color: palette.goldText, fontSize: 11 },
  selChip: { borderWidth: 1, borderColor: palette.line, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  selChipActive: { backgroundColor: palette.gold, borderColor: palette.gold },
  selChipText: { ...typography.label, color: palette.ash, fontSize: 11 },
  selChipTextActive: { color: palette.ink },
  // drawer
  drawerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  drawer: { backgroundColor: palette.graphiteLight, borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg, padding: spacing.xl, gap: spacing.md },
  drawerHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  drawerTitle: { ...typography.section, color: palette.ivory, fontSize: 15, flex: 1 },
  notesInput: { ...typography.body, color: palette.ivory, fontSize: 13, backgroundColor: palette.charcoal, borderRadius: radii.sm, padding: spacing.md, minHeight: 70 },
  submitBtn: { backgroundColor: palette.gold, borderRadius: radii.sm, paddingVertical: spacing.md, alignItems: 'center' },
  submitText: { ...typography.label, color: palette.ink, fontSize: 13, letterSpacing: 1 },
});
