/**
 * components/mentor-prep — tarjetas de "Preparar sesión" del dossier.
 *
 * Lo que un mentor necesita en los 2 minutos antes de la llamada, en orden:
 * cómo viene el cliente, qué pasó la última vez, qué prometió y qué llevar a
 * la sesión. Presentacionales: sin IO.
 *
 * Tono callado a propósito ("mucho ruido visual y cosas desgastantes para
 * evaluar"): sin píldoras ni etiquetas por fila, sin íconos por viñeta, pocas
 * líneas a la vista y el resto tras un "Ver…".
 */
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { PremiumCard } from '@/components/polaris';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import type { AdminBriefing } from '@/lib/memory';
import type { SessionDigest } from '@/lib/memoryLogic';
import type { PrepCommitment, PrepSignals, SignalTone } from '@/lib/mentorPrepLogic';

const TONE_COLOR: Record<SignalTone, string> = {
  ok: palette.success,
  watch: palette.warning,
  alert: palette.danger,
};

function Title({ children, meta }: { children: string; meta?: string }) {
  return (
    <View style={s.titleRow}>
      <Text style={s.title}>{children}</Text>
      {!!meta && <Text style={s.meta}>{meta}</Text>}
    </View>
  );
}

function More({ open, count, label, onPress }: { open: boolean; count: number; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button" accessibilityState={{ expanded: open }} style={s.more}>
      <Text style={s.moreText}>{open ? 'Ver menos' : `${label} (${count})`}</Text>
    </Pressable>
  );
}

function Lines({ items, max }: { items: string[]; max?: number }) {
  const [all, setAll] = useState(false);
  const shown = max && !all ? items.slice(0, max) : items;
  return (
    <View style={s.lines}>
      {shown.map((t, i) => <Text key={i} style={s.line}>· {t}</Text>)}
      {!!max && items.length > max && (
        <More open={all} count={items.length} label="Ver todo" onPress={() => setAll((v) => !v)} />
      )}
    </View>
  );
}

// ─── Cómo viene ──────────────────────────────────────────────────────────────
export function PrepSignalsCard({ signals }: { signals: PrepSignals }) {
  return (
    <PremiumCard
      style={[s.card, { borderLeftWidth: 3, borderLeftColor: TONE_COLOR[signals.tone] }]}
      accessibilityLabel={`Cómo viene: ${signals.headline}`}>
      <Title>Cómo viene</Title>
      <Text style={s.headline}>{signals.headline}</Text>
    </PremiumCard>
  );
}

// ─── Una sesión, repartida ───────────────────────────────────────────────────
export function DigestBody({ digest }: { digest: SessionDigest; compact?: boolean }) {
  const [talked, setTalked] = useState(false);
  return (
    <View style={s.body}>
      {!!digest.summary && <Text style={s.text}>{digest.summary}</Text>}
      {digest.improve.length > 0 && (
        <View style={s.block}>
          <Text style={s.sub}>Qué puede mejorar</Text>
          <Lines items={digest.improve} />
        </View>
      )}
      {digest.talked.length > 0 && (
        <>
          <More open={talked} count={digest.talked.length} label="Lo que se habló" onPress={() => setTalked((v) => !v)} />
          {talked && <Lines items={digest.talked} />}
        </>
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
  const has = !!digest && (!!digest.summary || digest.talked.length > 0);
  return (
    <PremiumCard style={s.card}>
      <Title meta={dateLabel}>{title}</Title>
      {has ? (
        <DigestBody digest={digest!} />
      ) : (
        <View style={s.body}>
          <Text style={s.muted}>
            {splitting ? 'La IA está repartiendo esta sesión…' : 'Aún no está repartida. Ábrela en Tomar notas y la IA la reparte sola.'}
          </Text>
          {!!onOpenDesk && !splitting && (
            <Pressable onPress={onOpenDesk} hitSlop={8} accessibilityRole="button" style={s.more}>
              <Text style={s.moreText}>Tomar notas</Text>
            </Pressable>
          )}
        </View>
      )}
    </PremiumCard>
  );
}

// ─── Compromisos ─────────────────────────────────────────────────────────────
const VISIBLE_COMMITMENTS = 4;

export function PrepCommitmentsCard({
  items,
  busyKey,
  onToggle,
}: {
  items: PrepCommitment[];
  busyKey?: string | null;
  onToggle?: (c: PrepCommitment) => void;
}) {
  const [all, setAll] = useState(false);
  const order = { vencido: 0, abierto: 1, cumplido: 2 };
  const sorted = [...items].sort((a, b) => order[a.state] - order[b.state]);
  const shown = all ? sorted : sorted.slice(0, VISIBLE_COMMITMENTS);
  const overdue = items.filter((c) => c.state === 'vencido');
  const meta = overdue.length
    ? `${overdue.length} vencido${overdue.length === 1 ? '' : 's'} hace ${overdue[0].overdueDays} días`
    : undefined;
  return (
    <PremiumCard style={s.card}>
      <Title meta={meta}>Compromisos</Title>
      {sorted.length === 0 ? (
        <Text style={s.muted}>Sin compromisos todavía. Salen solos de las notas de la sesión.</Text>
      ) : (
        <View>
          {shown.map((c) => {
            const key = `${c.sessionId}:${c.index}`;
            const busy = busyKey === key;
            const done = c.state === 'cumplido';
            return (
              <Pressable
                key={key}
                onPress={() => onToggle?.(c)}
                disabled={!onToggle || busy}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: done, disabled: busy }}
                accessibilityLabel={`${c.text}${c.state === 'vencido' ? ', vencido' : ''}`}
                style={({ pressed }) => [s.commitRow, pressed && { opacity: 0.6 }]}>
                {busy
                  ? <ActivityIndicator size={16} color={palette.goldText} />
                  : <MaterialIcons name={done ? 'check-circle' : 'radio-button-unchecked'} size={18} color={done ? palette.success : palette.smoke} />}
                <Text style={[s.commitText, done && s.done]}>{c.text}</Text>
              </Pressable>
            );
          })}
          {sorted.length > VISIBLE_COMMITMENTS && (
            <More open={all} count={sorted.length} label="Ver todos" onPress={() => setAll((v) => !v)} />
          )}
        </View>
      )}
    </PremiumCard>
  );
}

// ─── Qué llevar a la sesión ──────────────────────────────────────────────────
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
  const [more, setMore] = useState(false);
  const confront = (briefing?.challenge_points ?? []).slice(0, 2);
  const questions = (briefing?.open_loops ?? []).slice(0, 3);
  const topics = (briefing?.suggested_mentorship_topics ?? []).map(stripNumber);
  // Sin nada que confrontar ni preguntar (cliente nuevo), los temas SON la guía.
  const topicsUpfront = confront.length === 0 && questions.length === 0;
  return (
    <PremiumCard style={s.card}>
      <View style={s.titleRow}>
        <Text style={s.title}>Para esta sesión</Text>
        {!!onGenerate && (
          <Pressable onPress={onGenerate} disabled={generating} hitSlop={8} accessibilityRole="button" style={s.more}>
            <Text style={s.moreText}>{generating ? 'Preparando…' : briefing ? 'Actualizar' : 'Preparar con IA'}</Text>
          </Pressable>
        )}
      </View>
      {!briefing ? (
        <Text style={s.muted}>{generating ? 'Norman está preparando la sesión…' : 'Aún no hay preparación.'}</Text>
      ) : (
        <View style={s.body}>
          {!!briefing.summary && <Text style={s.text}>{briefing.summary}</Text>}
          {confront.length > 0 && (
            <View style={s.block}>
              <Text style={s.sub}>Para confrontar</Text>
              <Lines items={confront} />
            </View>
          )}
          {questions.length > 0 && (
            <View style={s.block}>
              <Text style={s.sub}>Preguntas abiertas</Text>
              <Lines items={questions} />
            </View>
          )}
          {topics.length > 0 && (topicsUpfront ? (
            <View style={s.block}>
              <Text style={s.sub}>Para la conversación</Text>
              <Lines items={topics} />
            </View>
          ) : (
            <>
              <More open={more} count={topics.length} label="Más ideas" onPress={() => setMore((v) => !v)} />
              {more && <Lines items={topics} />}
            </>
          ))}
        </View>
      )}
      {!!error && <Text style={[s.muted, { color: palette.danger }]}>{error}</Text>}
    </PremiumCard>
  );
}

const s = StyleSheet.create({
  card: { marginBottom: spacing.sm, padding: spacing.lg, gap: spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.sm, flexWrap: 'wrap' },
  title: { fontFamily: Fonts.sans, fontWeight: '700', fontSize: 15, color: palette.ivory },
  meta: { ...typography.caption, color: palette.smoke, fontSize: 12.5 },
  headline: { ...typography.body, color: palette.ash, fontSize: 14, lineHeight: 21 },
  body: { gap: spacing.md },
  block: { gap: 4 },
  text: { ...typography.body, color: palette.ivory, fontSize: 14, lineHeight: 21 },
  sub: { ...typography.caption, color: palette.smoke, fontSize: 12.5 },
  lines: { gap: 4 },
  line: { ...typography.body, color: palette.ivory, fontSize: 14, lineHeight: 21 },
  muted: { ...typography.body, color: palette.smoke, fontSize: 13.5, lineHeight: 20 },
  more: { minHeight: 32, justifyContent: 'center', alignSelf: 'flex-start' },
  moreText: { ...typography.caption, color: palette.goldText, fontSize: 13 },
  commitRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 44, borderRadius: radii.sm },
  commitText: { ...typography.body, color: palette.ivory, fontSize: 14, lineHeight: 20, flex: 1 },
  done: { color: palette.smoke, textDecorationLine: 'line-through' },
});
