/**
 * use-mentorship.tsx — Estado de la mentoría: notas de sesión + plan de acción IA.
 *
 * El Navegador toma notas en cada sesión semanal; Norman (la IA) construye desde
 * esas notas un plan de acción accionable para la siguiente semana. Persistido
 * localmente bajo el namespace lifeflow:v2 (mismo patrón que el resto del app).
 */
import { useCallback, useEffect, useState } from 'react';

import { readLocal, writeLocal } from '@/storage/local';
import { streamMentorResponse, type MentorContext } from '@/lib/mentor';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { currentWeekNumber } from '@/data/mentorship';

export interface SessionNote {
  id: string;
  week: number;
  date: string;       // ISO
  notes: string;      // notas del Navegador en la sesión
  audioUrl?: string;  // grabación de la sesión (Zoom u otra)
}

export interface ActionItem {
  id: string;
  week: number;
  text: string;
  done: boolean;
  source: 'ia' | 'manual';
}

const NOTES_KEY = 'mentorship_notes';
const PLAN_KEY  = 'mentorship_plan';

let _seq = 0;
function uid(prefix: string): string {
  _seq += 1;
  return `${prefix}-${Date.now()}-${_seq}`;
}

/** Construye un MentorContext mínimo y válido a partir del estado global. */
function buildContext(
  state: ReturnType<typeof useLifeFlow>['state'],
  protocolDay: number,
): MentorContext {
  const latest = state.checkIns[state.checkIns.length - 1] ?? null;
  return {
    userName: state.profile.name ?? 'Operador',
    role: state.profile.role ?? 'Empresario',
    totalDays: protocolDay,
    streak: Math.max(state.checkIns.length, protocolDay),
    sovereignScore: 0,
    tier: state.subscriptionTier,
    activeModuleTitle: '',
    activeModuleProgress: 0,
    northStar: state.northStar,
    todayCheckIn: latest,
    recentCheckIns: state.checkIns.slice(-14).reverse(),
    messageCount: state.mentorMessages.length,
  };
}

export function useMentorship() {
  const { state, protocolDay } = useLifeFlow();
  const [notes, setNotes] = useState<SessionNote[]>([]);
  const [plan, setPlan] = useState<ActionItem[]>([]);
  const [generating, setGenerating] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // ── Hidratar desde almacenamiento local ──────────────────────────────────────
  useEffect(() => {
    let alive = true;
    (async () => {
      const [n, p] = await Promise.all([
        readLocal<SessionNote[]>(NOTES_KEY),
        readLocal<ActionItem[]>(PLAN_KEY),
      ]);
      if (!alive) return;
      if (n) setNotes(n);
      if (p) setPlan(p);
      setLoaded(true);
    })();
    return () => { alive = false; };
  }, []);

  const persistNotes = useCallback((next: SessionNote[]) => {
    setNotes(next);
    writeLocal(NOTES_KEY, next).catch(() => {});
  }, []);
  const persistPlan = useCallback((next: ActionItem[]) => {
    setPlan(next);
    writeLocal(PLAN_KEY, next).catch(() => {});
  }, []);

  // ── Notas de sesión ──────────────────────────────────────────────────────────
  const addNote = useCallback((week: number, text: string, audioUrl?: string) => {
    if (!text.trim()) return;
    const note: SessionNote = {
      id: uid('note'),
      week,
      date: new Date().toISOString(),
      notes: text.trim(),
      audioUrl: audioUrl?.trim() || undefined,
    };
    persistNotes([note, ...notes]);
  }, [notes, persistNotes]);

  const removeNote = useCallback((id: string) => {
    persistNotes(notes.filter((n) => n.id !== id));
  }, [notes, persistNotes]);

  // ── Plan de acción ───────────────────────────────────────────────────────────
  const toggleItem = useCallback((id: string) => {
    persistPlan(plan.map((it) => (it.id === id ? { ...it, done: !it.done } : it)));
  }, [plan, persistPlan]);

  const addManualItem = useCallback((text: string) => {
    if (!text.trim()) return;
    const item: ActionItem = {
      id: uid('man'),
      week: currentWeekNumber(protocolDay),
      text: text.trim(),
      done: false,
      source: 'manual',
    };
    persistPlan([item, ...plan]);
  }, [plan, protocolDay, persistPlan]);

  const removeItem = useCallback((id: string) => {
    persistPlan(plan.filter((it) => it.id !== id));
  }, [plan, persistPlan]);

  /** Norman lee las notas de sesión y construye el plan de acción de la semana. */
  const generatePlan = useCallback(async () => {
    if (generating) return;
    if (notes.length === 0) return;
    setGenerating(true);
    try {
      const notesText = notes
        .slice(0, 12)
        .map((n) => `Semana ${n.week}: ${n.notes}`)
        .join('\n');

      const ctx = buildContext(state, protocolDay);
      const prompt =
        'A partir de estas notas de mis sesiones de mentoría, construye mi PLAN DE ACCIÓN para la próxima semana. ' +
        'Devuelve entre 3 y 5 acciones concretas, medibles y en imperativo, una por línea, sin numerar ni explicar. ' +
        'Alinéalas con mi Norte y el método Polaris.\n\nNOTAS:\n' + notesText;

      let out = '';
      await streamMentorResponse(ctx, prompt, [], (delta) => { out += delta; });

      const items: ActionItem[] = out
        .split('\n')
        .map((l) => l.replace(/^[-*•\d.)\s]+/, '').trim())
        .filter((l) => l.length > 3)
        .slice(0, 5)
        .map((text) => ({
          id: uid('ia'),
          week: currentWeekNumber(protocolDay),
          text,
          done: false,
          source: 'ia' as const,
        }));

      if (items.length) {
        // Reemplaza el plan IA previo de la semana actual, conserva lo manual
        const wk = currentWeekNumber(protocolDay);
        const keep = plan.filter((it) => !(it.source === 'ia' && it.week === wk));
        persistPlan([...items, ...keep]);
      }
    } finally {
      setGenerating(false);
    }
  }, [generating, notes, plan, state, protocolDay, persistPlan]);

  return {
    loaded,
    notes,
    plan,
    generating,
    addNote,
    removeNote,
    toggleItem,
    addManualItem,
    removeItem,
    generatePlan,
  };
}
