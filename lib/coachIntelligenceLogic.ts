/**
 * coachIntelligenceLogic — Coach Intelligence v2 (lógica PURA).
 *
 * Fusiona TODO lo que el repo ya sabe del cliente (Memory OS · Mentor Execution OS ·
 * Confrontation OS · Biometric · check-ins · hábitos · mensajes con Norman · el
 * `user_intelligence` heurístico existente) para producir un read EXPLICABLE para
 * el coach: drivers con peso y evidencia citable, momentum semanal, profundidad de
 * la relación con Norman, y un Next Best Action específico (no template).
 *
 * Filosofía: no es un "score mágico". Cada driver lleva una `evidence` literal —
 * un coach puede confrontar con el dato exacto sin re-inferir. La función es
 * intencionalmente determinista y testeable: sin Date.now implícito (inyecta `nowMs`),
 * sin Math.random.
 *
 * Privacidad: nada de DMs ni community posts. Solo señales que el cliente ya acordó
 * dar (memory + checkins + tareas + biométricos + chats con Norman).
 */

import type { ClientScores, MomentumState } from '@/lib/mentorExecutionLogic';
import type { MemoryProfile } from '@/lib/memoryLogic';
import type { BiometricInsight, InterventionLevel } from '@/lib/biometricLogic';
import type { ConfrontationItem } from '@/lib/confrontationLogic';
import type { UserIntelligence } from '@/hooks/useUserIntelligence';

// ─── Tipos públicos ────────────────────────────────────────────────────────────

export type ChurnDriverKind =
  | 'commitments_drift'
  | 'mentor_silence'
  | 'checkin_dropping'
  | 'tasks_overdue'
  | 'momentum_declining'
  | 'biometric_intervention'
  | 'high_friction'
  | 'engagement_decay'
  | 'no_recent_activity'
  | 'protective_streak'      // negativo (proteger del churn)
  | 'protective_completion'; // negativo

export interface ChurnDriver {
  kind: ChurnDriverKind;
  /** Peso 0–1 hacia el churn (negativo = protector). */
  weight: number;
  label: string;
  /** Frase citable con datos reales, no genérica. */
  evidence: string;
}

export interface WeeklyMomentum {
  state: MomentumState;
  /** Delta de check-ins promedio vs semana previa (puntos). */
  delta_checkin: number;
  /** Delta de mensajes con Norman semana actual vs previa. */
  delta_chat: number;
  /** Delta de tareas completadas. */
  delta_tasks: number;
  /** Síntesis legible: "ascenso · +2 puntos de energía, +5 mensajes". */
  label: string;
}

export interface RelationalDepth {
  /** 0–100: combinación de frecuencia, compromisos extraídos y honestidad detectada. */
  score: number;
  state: 'silent' | 'transactional' | 'open' | 'deep';
  /** Días desde el último mensaje del usuario. */
  days_silent: number;
  /** Conteo de turnos del usuario en 7d. */
  turns_7d: number;
  /** Conteo de compromisos abiertos (señal de honestidad estructural). */
  open_commitments: number;
  label: string;
}

export interface CoachNextAction {
  kind: 'confront' | 'support' | 'celebrate' | 'investigate' | 'rest_signal' | 'reconnect';
  /** Qué decirle al cliente esta semana (no genérico). */
  what_to_say: string;
  /** Por qué ahora — driver dominante. */
  why_now: string;
  /** Urgencia para el equipo de coaching. */
  urgency: 'low' | 'normal' | 'high' | 'urgent';
}

export interface CoachIntelligence {
  /** Score reconciliado 0–100: combinación ponderada de drivers (no es opaco). */
  composite_score: number;
  /** Churn risk reconciliado 0–1 (drivers > sigmoid). */
  churn_risk: number;
  churn_risk_label: 'low' | 'medium' | 'high' | 'critical';
  drivers: ChurnDriver[];
  momentum: WeeklyMomentum;
  relational: RelationalDepth;
  next_action: CoachNextAction;
  /** Síntesis humana para el coach (2–3 frases). */
  narrative: string;
}

// ─── Bundle de entrada (lo que un dossier admin ya consulta) ───────────────────

export interface CoachBundle {
  /** Cache heurístico actual (puede estar en defaults si no corrió el cron). */
  intelligence: UserIntelligence | null;
  /** Memoria viva (compromisos abiertos, etc.) — opcional. */
  memory: MemoryProfile | null;
  /** Scores del Mentor Execution OS — opcional. */
  execution: ClientScores | null;
  /** Top item de la cola de confrontación (severity high+) — opcional. */
  topConfrontation: ConfrontationItem | null;
  /** Conteo total de items por severidad. */
  confrontation_high_count: number;
  /** Último insight biométrico — opcional. */
  biometric: BiometricInsight | null;
  /** Energía promedio últimas 7d / 7–14d (para delta). */
  checkin_energy_7d: number | null;
  checkin_energy_prev: number | null;
  /** Conteo de check-ins en 7d / 7–14d. */
  checkin_count_7d: number;
  checkin_count_prev: number;
  /** Streak actual (cualquier hábito o check-in consecutivo, días). */
  current_streak_days: number;
  /** Turnos del usuario con Norman 7d / 7–14d. */
  user_turns_7d: number;
  user_turns_prev: number;
  /** Días desde el último mensaje del usuario (Infinity si nunca). */
  days_since_last_message: number;
  /** Tareas vencidas y abiertas (Mentor Execution / mentorship_tasks). */
  overdue_count: number;
  open_tasks_count: number;
  /** Tareas completadas en 7d / 7–14d. */
  completed_tasks_7d: number;
  completed_tasks_prev: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const clamp = (n: number, lo = 0, hi = 1): number => Math.max(lo, Math.min(hi, n));
const clamp100 = (n: number): number => Math.max(0, Math.min(100, Math.round(n)));

function pluralDays(n: number): string {
  return n === 1 ? '1 día' : `${n} días`;
}

// ─── Drivers ───────────────────────────────────────────────────────────────────

/**
 * Construye los drivers explicables (con peso y evidencia) a partir del bundle.
 * Suma de pesos positivos → churn risk; los protectores (weight < 0) lo bajan.
 * Cap a 1 al final. Devuelve la lista ordenada por peso absoluto (más pesado primero).
 */
export function computeDrivers(bundle: CoachBundle): ChurnDriver[] {
  const out: ChurnDriver[] = [];

  // 1. Compromisos abiertos viejos (señal estructural del Memory OS).
  const openCommitments = bundle.memory?.commitments_open ?? [];
  if (openCommitments.length >= 3) {
    out.push({
      kind: 'commitments_drift',
      weight: 0.18 + Math.min(0.10, (openCommitments.length - 3) * 0.03),
      label: 'Compromisos sin cerrar',
      evidence: `${openCommitments.length} compromisos abiertos en memoria` +
        (openCommitments[0]?.text ? ` (ej. "${openCommitments[0].text.slice(0, 60)}")` : ''),
    });
  }

  // 2. Silencio con Norman (cliente firmó canal de chat — su ausencia es señal).
  if (bundle.days_since_last_message >= 5) {
    out.push({
      kind: 'mentor_silence',
      weight: clamp(0.10 + (bundle.days_since_last_message - 5) * 0.04, 0, 0.30),
      label: 'Silencio con Norman',
      evidence: `${pluralDays(Math.min(bundle.days_since_last_message, 60))} sin escribirle al mentor`,
    });
  }

  // 3. Caída de check-in (cantidad o calidad).
  if (bundle.checkin_count_7d < bundle.checkin_count_prev - 1) {
    out.push({
      kind: 'checkin_dropping',
      weight: 0.12,
      label: 'Bajan los check-in',
      evidence: `${bundle.checkin_count_7d} check-ins esta semana vs ${bundle.checkin_count_prev} la anterior`,
    });
  }
  if (
    bundle.checkin_energy_7d != null && bundle.checkin_energy_prev != null &&
    bundle.checkin_energy_7d <= bundle.checkin_energy_prev - 1.5
  ) {
    out.push({
      kind: 'engagement_decay',
      weight: 0.10,
      label: 'Energía a la baja',
      evidence: `Energía promedio ${bundle.checkin_energy_7d.toFixed(1)} vs ${bundle.checkin_energy_prev.toFixed(1)} previa`,
    });
  }

  // 4. Tareas vencidas (Mentor Execution OS).
  if (bundle.overdue_count > 0) {
    out.push({
      kind: 'tasks_overdue',
      weight: clamp(0.08 + bundle.overdue_count * 0.04, 0, 0.25),
      label: 'Tareas vencidas',
      evidence: `${bundle.overdue_count} tarea(s) vencida(s) sin cerrar`,
    });
  }

  // 5. Momentum del Mentor Execution OS (si declinante o crítico).
  const momState = bundle.execution?.weekly_momentum_state ?? null;
  if (momState === 'declining' || momState === 'critical') {
    out.push({
      kind: 'momentum_declining',
      weight: momState === 'critical' ? 0.20 : 0.12,
      label: momState === 'critical' ? 'Momentum crítico' : 'Momentum a la baja',
      evidence: `Mentor Execution reporta momentum ${momState}`,
    });
  } else if (momState === 'fragile') {
    out.push({
      kind: 'momentum_declining',
      weight: 0.06,
      label: 'Momentum frágil',
      evidence: 'Mentor Execution reporta momentum frágil',
    });
  }

  // 6. Biometría con intervención alta/urgente (overtraining / sueño crónicamente roto).
  const bioLevel: InterventionLevel | null = bundle.biometric?.intervention_level ?? null;
  if (bioLevel === 'high' || bioLevel === 'urgent') {
    out.push({
      kind: 'biometric_intervention',
      weight: bioLevel === 'urgent' ? 0.18 : 0.10,
      label: bioLevel === 'urgent' ? 'Cuerpo en alerta' : 'Cuerpo pide atención',
      evidence: bundle.biometric?.coach_safe_summary ?? `Nivel de intervención biométrica: ${bioLevel}`,
    });
  }

  // 7. Confrontaciones de alta severidad detectadas (DIJO vs HIZO).
  if (bundle.confrontation_high_count > 0) {
    out.push({
      kind: 'high_friction',
      weight: clamp(0.08 + (bundle.confrontation_high_count - 1) * 0.04, 0.08, 0.20),
      label: 'Fricciones DIJO ≠ HIZO',
      evidence: bundle.topConfrontation?.evidence?.gap_metric?.summary
        ?? `${bundle.confrontation_high_count} fricciones de severidad alta detectadas`,
    });
  }

  // 8. Inactividad total (días sin actividad reportada).
  const daysIdle = bundle.intelligence?.days_since_last_act ?? 0;
  if (daysIdle >= 7) {
    out.push({
      kind: 'no_recent_activity',
      weight: clamp(0.10 + (daysIdle - 7) * 0.03, 0.10, 0.28),
      label: 'Inactivo en el sistema',
      evidence: `${pluralDays(daysIdle)} sin actividad registrada`,
    });
  }

  // 9. PROTECTORES (peso negativo → bajan churn).
  if (bundle.current_streak_days >= 7) {
    out.push({
      kind: 'protective_streak',
      weight: -0.10 - Math.min(0.10, (bundle.current_streak_days - 7) * 0.01),
      label: 'Racha activa',
      evidence: `${pluralDays(bundle.current_streak_days)} consecutivos de actividad`,
    });
  }
  if (bundle.completed_tasks_7d > bundle.completed_tasks_prev) {
    out.push({
      kind: 'protective_completion',
      weight: -0.08,
      label: 'Ejecución en alza',
      evidence: `${bundle.completed_tasks_7d} tareas cerradas vs ${bundle.completed_tasks_prev} la semana previa`,
    });
  }

  // Orden por peso absoluto (driver dominante primero).
  return out.sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));
}

/** Combina drivers en un churn risk 0–1 (suma con cap, no sigmoid opaco). */
export function weightedChurnScore(drivers: ChurnDriver[]): number {
  const total = drivers.reduce((acc, d) => acc + d.weight, 0);
  return clamp(total, 0, 1);
}

export function churnLabel(risk: number): 'low' | 'medium' | 'high' | 'critical' {
  if (risk >= 0.70) return 'critical';
  if (risk >= 0.50) return 'high';
  if (risk >= 0.30) return 'medium';
  return 'low';
}

// ─── Momentum semanal ─────────────────────────────────────────────────────────

export function computeMomentum(bundle: CoachBundle): WeeklyMomentum {
  const dCheckin = (bundle.checkin_energy_7d ?? 0) - (bundle.checkin_energy_prev ?? 0);
  const dChat = bundle.user_turns_7d - bundle.user_turns_prev;
  const dTasks = bundle.completed_tasks_7d - bundle.completed_tasks_prev;

  // Empieza desde el momentum del MEX si existe; si no, deriva del delta de check-in/tareas.
  let state: MomentumState = bundle.execution?.weekly_momentum_state ?? 'stable';
  if (!bundle.execution) {
    if (dCheckin >= 1.5 && dTasks >= 1) state = 'rising';
    else if (dCheckin <= -2 || dTasks <= -2) state = 'declining';
    else if (Math.abs(dCheckin) < 0.5 && Math.abs(dTasks) < 1) state = 'stable';
    else state = 'fragile';
  }

  const parts: string[] = [];
  if (dCheckin !== 0) parts.push(`${dCheckin > 0 ? '+' : ''}${dCheckin.toFixed(1)} energía`);
  if (dChat !== 0) parts.push(`${dChat > 0 ? '+' : ''}${dChat} chats con Norman`);
  if (dTasks !== 0) parts.push(`${dTasks > 0 ? '+' : ''}${dTasks} tareas cerradas`);
  const label = parts.length ? parts.join(' · ') : 'Sin movimiento esta semana';

  return { state, delta_checkin: dCheckin, delta_chat: dChat, delta_tasks: dTasks, label };
}

// ─── Profundidad relacional ───────────────────────────────────────────────────

export function computeRelationalDepth(bundle: CoachBundle): RelationalDepth {
  const turns = bundle.user_turns_7d;
  const open = bundle.memory?.commitments_open?.length ?? 0;
  const days = Math.min(bundle.days_since_last_message, 60);

  // Frecuencia (0–60), honestidad-compromisos (0–25), recencia (0–15).
  const freqPts = Math.min(60, turns * 5);
  const honestyPts = Math.min(25, open * 5);
  const recencyPts = Math.max(0, 15 - days * 2);
  const score = clamp100(freqPts + honestyPts + recencyPts);

  let state: RelationalDepth['state'] = 'silent';
  if (score >= 70) state = 'deep';
  else if (score >= 45) state = 'open';
  else if (score >= 20) state = 'transactional';

  const stateLabel: Record<RelationalDepth['state'], string> = {
    deep: 'Conversación profunda y honesta',
    open: 'Relación activa, con apertura',
    transactional: 'Contacto puntual, poca profundidad',
    silent: 'En silencio — reconectar',
  };

  return {
    score,
    state,
    days_silent: bundle.days_since_last_message,
    turns_7d: turns,
    open_commitments: open,
    label: stateLabel[state],
  };
}

// ─── Next Best Action ─────────────────────────────────────────────────────────

/**
 * Elige la NBA en función del driver dominante. NO es un template genérico —
 * tira de la evidence literal del driver. Si Norman tiene una sugerencia para
 * confrontar (topConfrontation), tiene prioridad.
 */
export function selectNextAction(
  drivers: ChurnDriver[],
  bundle: CoachBundle,
  momentum: WeeklyMomentum,
  relational: RelationalDepth,
): CoachNextAction {
  // 0. Prioridad absoluta: confrontación severa pendiente con prompt sugerido.
  if (bundle.topConfrontation?.confrontation_prompt && bundle.confrontation_high_count > 0) {
    return {
      kind: 'confront',
      what_to_say: bundle.topConfrontation.confrontation_prompt,
      why_now: bundle.topConfrontation.evidence?.gap_metric?.summary ?? 'Fricción DIJO vs HIZO de alta severidad',
      urgency: bundle.topConfrontation.severity === 'critical' ? 'urgent' : 'high',
    };
  }

  // 1. Silencio → reconectar con calor humano, no presión.
  if (relational.state === 'silent' || bundle.days_since_last_message >= 7) {
    return {
      kind: 'reconnect',
      what_to_say: `Lleva ${pluralDays(Math.min(bundle.days_since_last_message, 60))} sin escribir. Mándale un mensaje corto preguntando cómo va el cuerpo y el sueño — no le pidas resultados.`,
      why_now: relational.label,
      urgency: bundle.days_since_last_message >= 14 ? 'high' : 'normal',
    };
  }

  // 2. Cuerpo pidiendo descanso → señal de descanso, no más tareas.
  const bio = bundle.biometric;
  if (bio && (bio.intervention_level === 'high' || bio.intervention_level === 'urgent')) {
    return {
      kind: 'rest_signal',
      what_to_say: `Lectura biométrica: ${bio.coach_safe_summary}. Hoy es un día de bajar carga — pídele que mueva su tarea más demandante a 48–72h.`,
      why_now: `Recuperación ${bio.recovery_state} · ${bio.coach_safe_summary}`,
      urgency: bio.intervention_level === 'urgent' ? 'urgent' : 'high',
    };
  }

  // 3. Driver dominante = compromisos drift → confrontar con su propio compromiso.
  const top = drivers.find((d) => d.weight > 0);
  const openCommit = bundle.memory?.commitments_open?.[0];
  if (top?.kind === 'commitments_drift' && openCommit?.text) {
    return {
      kind: 'confront',
      what_to_say: `"Hace tiempo dijiste que ibas a ${openCommit.text}. ¿Qué pasó con eso? Cierra o sustituye — no lo dejes en limbo."`,
      why_now: top.evidence,
      urgency: 'high',
    };
  }

  // 4. Tareas vencidas → priorizar UNA y soltar el resto.
  if (top?.kind === 'tasks_overdue') {
    return {
      kind: 'support',
      what_to_say: `Tiene ${bundle.overdue_count} tareas vencidas. Elige UNA con él hoy y cancela el resto — la sobrecarga es la fricción, no la pereza.`,
      why_now: top.evidence,
      urgency: 'high',
    };
  }

  // 5. Momentum subiendo + protectores → celebrar concretamente.
  if (momentum.state === 'rising' && drivers.some((d) => d.weight < 0)) {
    const proto = drivers.find((d) => d.weight < 0)!;
    return {
      kind: 'celebrate',
      what_to_say: `Reconoce el avance: ${proto.evidence}. Que él te diga qué cambió — anclar el "cómo" lo vuelve repetible.`,
      why_now: momentum.label,
      urgency: 'low',
    };
  }

  // 6. Default: investigar — algo está cambiando, mejor preguntar.
  return {
    kind: 'investigate',
    what_to_say: `Pregúntale qué pasó con su semana antes de proponer. ${top ? `Lo que más pesa: ${top.evidence}.` : 'Aún sin señal dominante.'}`,
    why_now: top?.evidence ?? 'Sin driver dominante',
    urgency: 'normal',
  };
}

// ─── Síntesis narrativa ───────────────────────────────────────────────────────

export function composeNarrative(
  drivers: ChurnDriver[],
  momentum: WeeklyMomentum,
  relational: RelationalDepth,
): string {
  const risk = weightedChurnScore(drivers);
  const label = churnLabel(risk);

  if (drivers.length === 0) {
    return `Sin señales relevantes esta semana. Relación con Norman: ${relational.label.toLowerCase()}. ${momentum.label}.`;
  }

  const top = drivers.find((d) => d.weight > 0);
  const proto = drivers.find((d) => d.weight < 0);
  const labelText: Record<typeof label, string> = {
    low: 'Bajo riesgo',
    medium: 'Riesgo medio',
    high: 'Riesgo alto',
    critical: 'Riesgo crítico',
  };
  const head = `${labelText[label]}.`;
  const cause = top ? ` Lo que más pesa: ${top.evidence.toLowerCase()}.` : '';
  const protect = proto ? ` Lo que protege: ${proto.evidence.toLowerCase()}.` : '';
  const mood = ` ${momentum.label}.`;
  return (head + cause + protect + mood).trim();
}

// ─── API principal ───────────────────────────────────────────────────────────

/** Composición end-to-end: bundle → CoachIntelligence completo y honesto. */
export function computeCoachIntelligence(bundle: CoachBundle): CoachIntelligence {
  const drivers = computeDrivers(bundle);
  const momentum = computeMomentum(bundle);
  const relational = computeRelationalDepth(bundle);
  const churn = weightedChurnScore(drivers);
  const next = selectNextAction(drivers, bundle, momentum, relational);
  const narrative = composeNarrative(drivers, momentum, relational);

  // Composite score (0–100): inverso del churn ponderado, sumándole calidad relacional/momentum.
  const momentumBonus = momentum.state === 'rising' ? 10 : momentum.state === 'declining' ? -10 : 0;
  const composite = clamp100(60 - churn * 60 + relational.score * 0.3 + momentumBonus);

  return {
    composite_score: composite,
    churn_risk: churn,
    churn_risk_label: churnLabel(churn),
    drivers,
    momentum,
    relational,
    next_action: next,
    narrative,
  };
}
