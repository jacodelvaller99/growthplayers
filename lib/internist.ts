/**
 * internist — IA INTERNISTA EDUCATIVA de Polaris (Cluster B).
 *
 * NO es Norman (el mentor). NO diagnostica. NO prescribe. Educa sobre fisiología,
 * marcadores y lifestyle medicine basado en evidencia, citando guías reales.
 * Ante cualquier red-flag, deja de educar y deriva a un médico/urgencias.
 *
 * Reusa la cadena de proveedores endurecida (createStreamGuard) y el mismo
 * ai-proxy que mentor/adminCopilot, pero con un system prompt completamente
 * distinto y conservador.
 *
 * Estructura:
 *  - buildInternistPrompt  → system prompt completo (educativo + reglas duras + contexto)
 *  - streamInternistResponse → orquestación con fallback (mismo patrón que el mentor)
 *  - persistInternistTurn  → guarda turno + red-flags detectados en internist_sessions
 *  - fetchInternistContext → ensambla labs guardados + check-ins + biométricos para el prompt
 */

import { ENV } from '@/app/config/env';
import { supabase } from '@/lib/supabase';
import { logSilentError } from '@/lib/observability';
import { streamAnthropic } from './anthropic';
import { streamNvidia, type ChatMessage } from './nvidia';
import { streamGroq } from './groq';
import { streamOpenAI } from './openai';
import {
  assembleEducationalContext,
  classifyLabValue,
  detectRedFlags,
  hasUrgentRedFlag,
  type ClassifiedLab,
  type DetectedRedFlag,
  type InternistContext,
} from '@/lib/internistLogic';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supa: any = supabase;

// ─── Tipos ─────────────────────────────────────────────────────────────────────

export type InternistTurn = { role: 'user' | 'assistant'; text: string };

export interface PatientContext {
  /** Nombre del usuario (para tono cálido — el internista NO lo usa para diagnosticar). */
  name?: string;
  /** Edad estimada (opcional) — rangos varían con edad para algunos marcadores. */
  ageYears?: number | null;
  /** Sexo biológico reportado (opcional) — necesario para algunos rangos (Hb, ferritina). */
  sexBiological?: 'male' | 'female' | 'other' | null;
  /** Tópicos lifestyle que el usuario está consultando este turno. */
  lifestyleTopics?: string[];
  /** Labs históricos del usuario (de medical_lab_values). */
  recentLabs?: Array<{ marker_key: string; value: number; unit: string; measured_at?: string | null }>;
  /** Datos biométricos recientes (HRV/RHR/recovery) — contexto, NO diagnóstico. */
  biometric?: { hrv?: number | null; restingHr?: number | null; recovery?: number | null } | null;
}

// ─── System prompt ─────────────────────────────────────────────────────────────

export function buildInternistPrompt(
  patient: PatientContext,
  userTurnText: string,
): string {
  // Clasifica los labs del usuario (los más recientes por marcador)
  const dedup: Record<string, ClassifiedLab> = {};
  for (const l of patient.recentLabs ?? []) {
    const c = classifyLabValue(l.marker_key, l.value);
    if (!c) continue;
    if (!dedup[c.marker.key]) dedup[c.marker.key] = c;
  }
  const labs = Object.values(dedup);

  const ctxLogic: InternistContext = {
    labs,
    lifestyleTopics: patient.lifestyleTopics ?? [],
    userTurnText,
    biometric: patient.biometric ?? null,
  };
  const block = assembleEducationalContext(ctxLogic);

  const bioLines: string[] = [];
  if (patient.biometric) {
    const b = patient.biometric;
    if (b.hrv != null) bioLines.push(`  - HRV últimos días: ~${b.hrv} ms`);
    if (b.restingHr != null) bioLines.push(`  - FC reposo: ~${b.restingHr} lpm`);
    if (b.recovery != null) bioLines.push(`  - Recovery: ~${b.recovery}/100`);
  }

  return [
    'Eres el INTERNISTA EDUCATIVO de Polaris Growth Institute.',
    'Hablas con un usuario adulto que tiene curiosidad por entender su salud.',
    '',
    '═══ IDENTIDAD ════════════════════════════════════════════════════════════',
    'Eres un internista (medicina interna) con espíritu de educador clínico:',
    'cálido, claro, riguroso. Tu objetivo es que el usuario ENTIENDA qué significan',
    'sus marcadores, su fisiología y la evidencia detrás de las recomendaciones de',
    'estilo de vida — para que pueda ser un mejor interlocutor con su médico real.',
    '',
    '═══ ENFOQUE POLARIS (marco, NO prescripción) ═══════════════════════════════',
    'El usuario es miembro de Polaris Growth Institute y sigue el "Protocolo Soberano"',
    '(programa de 90 días). Polaris se apoya en la MEDICINA DEL ESTILO DE VIDA: los',
    'pilares de sueño, nutrición, movimiento, manejo del estrés/recuperación, evitar',
    'sustancias de riesgo y conexión social (marco del American College of Lifestyle',
    'Medicine, ACLM). Cuando eduques, CONECTA lo que el usuario pregunta con estos',
    'pilares — ese es el lente de Polaris, y le ayuda a ver su salud como un sistema.',
    'PERO: esto es ENCUADRE, no contenido médico nuevo ni un permiso para recomendar.',
    'NO le dices "haz el protocolo", no prescribes hábitos al individuo, y el encuadre',
    'JAMÁS debilita las REGLAS INVIOLABLES de abajo (que mandan sobre todo). Si el',
    'marco Polaris chocara con la seguridad o la honestidad, gana la seguridad.',
    '',
    '═══ REGLAS INVIOLABLES (no son sugerencias) ════════════════════════════════',
    '1. NO ERES MÉDICO TRATANTE DEL USUARIO. No haces diagnóstico. No prescribes.',
    '   No ajustas dosis. No ordenas estudios. No reemplazas al médico real.',
    '   Frases como "tienes X", "te diagnostico", "te receto" están PROHIBIDAS.',
    '   En su lugar: "este patrón se asocia educativamente a X — un médico es quien',
    '   confirma o descarta", "esta es la categoría que tal guía describe", etc.',
    '',
    '2. CITAS LA FUENTE de cualquier afirmación clínica que hagas. Si no tienes',
    '   una fuente confiable a mano para algo específico, DI QUE NO LO SABES y',
    '   sugiere preguntar al médico. NO INVENTES papers, cifras ni guías.',
    '',
    '3. RED-FLAGS → PARAS DE EDUCAR Y DERIVAS. Cuando detectes cualquiera de las',
    '   señales del bloque RED-FLAGS abajo, NO continúas con educación adicional:',
    '   reconoces lo serio, das la acción de derivación, y solo eso. Salud mental,',
    '   dolor torácico, ictus, embarazo + medicación, TCA: derivación inmediata.',
    '',
    '4. SUPLEMENTOS Y AYUNOS: solo información general basada en evidencia con',
    '   cita. Nunca recomiendas iniciar uno específico al usuario individual —',
    '   eso lo decide su médico considerando sus condiciones y medicación.',
    '',
    '5. RECONOCES INCERTIDUMBRE. Cuando la evidencia es mixta, lo dices ("la',
    '   evidencia es probable, no establecida"). Conservador por diseño.',
    '',
    '6. CASTELLANO claro, frases cortas, sin jerga innecesaria. Cuando uses un',
    '   tecnicismo, lo defines en una línea.',
    '',
    '═══ FLUJO ESPERADO DE UNA SESIÓN ═══════════════════════════════════════════',
    '- Si el usuario te comparte un resultado de lab → explicas qué es, cita el',
    '  rango de referencia con su fuente, dices qué SE ASOCIA educativamente con',
    '  estar alto/bajo, e invitas a llevar el resultado al médico para interpretar.',
    '- Si pregunta sobre lifestyle (sueño, ejercicio, dieta, suplemento) → das',
    '  la evidencia con cita y grado (establecido/probable/incierto), aplicada a',
    '  adultos sanos.',
    '- Si describe un síntoma → no diagnosticas. Si es red-flag, derivas. Si no,',
    '  ofreces educación general sobre qué puede asociarse con eso y sugieres',
    '  evaluación médica si persiste.',
    '- CIERRE: al final de la respuesta, recuerda brevemente que esta es educación',
    '  general — no reemplaza consejo médico personal.',
    '',
    '═══ CONTEXTO DEL USUARIO ═══════════════════════════════════════════════════',
    `- Nombre: ${patient.name ?? 'usuario'}`,
    patient.ageYears != null ? `- Edad: ${patient.ageYears} años` : '- Edad: no reportada',
    patient.sexBiological
      ? `- Sexo biológico (para rangos): ${patient.sexBiological}`
      : '- Sexo biológico: no reportado (algunos rangos varían por sexo — pídelo si es relevante)',
    ...(bioLines.length ? ['', 'BIOMÉTRICOS RECIENTES (contexto, NO diagnóstico):', ...bioLines] : []),
    '',
    '═══ MARCADORES DE LAB DEL USUARIO (clasificados por la base) ═══════════════',
    block.labsBlock,
    '',
    '═══ EVIDENCIA DE LIFESTYLE APLICABLE A ESTE TURNO ══════════════════════════',
    block.lifestyleBlock,
    '',
    '═══ RED-FLAGS DETECTADAS EN ESTE TURNO ═════════════════════════════════════',
    block.redFlagsBlock,
    '',
    '═══ DISCLAIMER QUE CIERRA CADA RESPUESTA ═══════════════════════════════════',
    'Termina toda respuesta sustantiva con una variante breve de:',
    '"Esto es educación general — no reemplaza la consulta con tu médico tratante."',
    '',
    '═══ TONO ═══════════════════════════════════════════════════════════════════',
    'Riguroso pero cercano. No condescendiente. No alarmista. No minimizador.',
    'Si el usuario está asustado, primero contiene (1 frase), luego educa.',
  ].join('\n');
}

// ─── Orquestación con fallback ─────────────────────────────────────────────────

export async function streamInternistResponse(
  patient: PatientContext,
  userMessage: string,
  history: InternistTurn[],
  onChunk: (delta: string) => void,
  signal?: AbortSignal,
): Promise<{ text: string; redFlags: DetectedRedFlag[] }> {
  const redFlags = detectRedFlags(userMessage);

  if (signal?.aborted) return { text: '', redFlags };
  const isAbort = (err: unknown) => signal?.aborted || (err as Error)?.name === 'AbortError';

  // Si hay red-flag URGENT, respondemos con derivación directa sin ir al modelo.
  // La seguridad la da la lógica pura — el modelo solo puede añadir, no quitar.
  if (hasUrgentRedFlag(redFlags)) {
    const action = redFlags.find((f) => f.severity === 'urgent')!;
    const safe = [
      'Antes de cualquier otra cosa: lo que describes encaja con una situación que',
      'no debo intentar acompañar como educación general — necesita atención médica.',
      '',
      `${action.rule.action}`,
      '',
      `Razón: ${action.rule.rationale} [Fuente: ${action.rule.citation}]`,
      '',
      'Cuando estés a salvo, podemos retomar la conversación educativa.',
    ].join('\n');
    // emitimos el bloque por chunks suaves para que la UI reciba algo (5 partes).
    const parts = safe.match(/[^]{1,60}/g) ?? [safe];
    for (const p of parts) {
      if (signal?.aborted) break;
      onChunk(p);
    }
    return { text: safe, redFlags };
  }

  const messages: ChatMessage[] = [
    { role: 'system', content: buildInternistPrompt(patient, userMessage) },
    ...history.slice(-8).map((m) => ({ role: m.role, content: m.text })),
    { role: 'user', content: userMessage },
  ];

  let collected = '';
  const sink = (d: string) => { collected += d; onChunk(d); };

  // 1. Claude (vía ai-proxy si está activo).
  if (ENV.aiProxyUrl) {
    try { const t = await streamAnthropic(messages, sink, signal); return { text: t, redFlags }; }
    catch (err) { if (isAbort(err)) throw err; }
  }
  // 2. NVIDIA (web requiere ai-proxy por CORS).
  const isWeb = typeof window !== 'undefined' && typeof document !== 'undefined';
  if (ENV.aiProxyUrl || (ENV.nvidiaApiKey && !isWeb)) {
    try { const t = await streamNvidia(messages, sink, signal); return { text: t, redFlags }; }
    catch (err) { if (isAbort(err)) throw err; }
  }
  // 3. Groq.
  if (ENV.groqApiKey || ENV.aiProxyUrl) {
    try { const t = await streamGroq(messages, sink, signal); return { text: t, redFlags }; }
    catch (err) { if (isAbort(err)) throw err; }
  }
  // 4. OpenAI (descarta si la "clave openai" es en realidad de Groq).
  if ((ENV.openaiApiKey && !ENV.openaiApiKey.startsWith('gsk_')) || ENV.aiProxyUrl) {
    try { const t = await streamOpenAI(messages, sink, signal); return { text: t, redFlags }; }
    catch (err) { if (isAbort(err)) throw err; }
  }

  // Degradación honesta — sin proveedor.
  const msg =
    'El internista educativo necesita un proveedor de IA activo. Pídele a tu equipo activar el ai-proxy ' +
    'o configurar una clave de IA. Mientras tanto, te recomiendo llevar tus dudas directamente a tu médico tratante.';
  onChunk(msg);
  return { text: msg, redFlags };
}

// ─── Persistencia de la conversación + red-flags ───────────────────────────────

export async function persistInternistTurn(
  userId: string,
  role: 'user' | 'assistant',
  content: string,
  redFlags?: DetectedRedFlag[],
): Promise<void> {
  if (!userId || !content.trim()) return;
  try {
    await supa.from('internist_sessions').insert({
      user_id: userId,
      role,
      content,
      red_flags: redFlags?.length
        ? redFlags.map((f) => ({
            trigger: f.rule.trigger,
            severity: f.severity,
            keyword: f.matchedKeyword,
          }))
        : null,
    });
  } catch (e) {
    logSilentError('internist.persist', e);
  }
}

export async function fetchInternistHistory(
  userId: string,
  limit = 40,
): Promise<InternistTurn[]> {
  if (!userId) return [];
  try {
    const { data } = await supa
      .from('internist_sessions')
      .select('role,content,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(limit);
    return ((data ?? []) as Array<{ role: 'user' | 'assistant'; content: string }>).map((r) => ({
      role: r.role,
      text: r.content,
    }));
  } catch (e) {
    logSilentError('internist.history', e);
    return [];
  }
}

// ─── Ensamblaje del contexto del paciente desde sus tablas ────────────────────

export async function fetchPatientContext(userId: string): Promise<PatientContext> {
  if (!userId) return {};

  // 1. Perfil (nombre + edad/sexo si están).
  let name: string | undefined;
  let ageYears: number | null = null;
  let sexBiological: PatientContext['sexBiological'] = null;
  try {
    const { data } = await supa
      .from('user_profiles')
      .select('name,age,sex_biological')
      .eq('id', userId)
      .maybeSingle();
    if (data) {
      name = (data as { name?: string }).name;
      ageYears = (data as { age?: number | null }).age ?? null;
      sexBiological =
        (data as { sex_biological?: PatientContext['sexBiological'] }).sex_biological ?? null;
    }
  } catch (e) {
    logSilentError('internist.profile', e);
  }

  // 2. Labs recientes (último valor por marcador).
  let recentLabs: PatientContext['recentLabs'] = [];
  try {
    const { data } = await supa
      .from('medical_lab_values')
      .select('marker_key,value,unit,measured_at')
      .eq('user_id', userId)
      .order('measured_at', { ascending: false })
      .limit(40);
    const seen = new Set<string>();
    recentLabs = ((data ?? []) as PatientContext['recentLabs'])!.filter((l) => {
      if (seen.has(l.marker_key)) return false;
      seen.add(l.marker_key);
      return true;
    });
  } catch (e) {
    logSilentError('internist.labs', e);
  }

  // 3. Snapshot biométrico (último día con datos — best-effort).
  let biometric: PatientContext['biometric'] = null;
  try {
    const { data } = await supa
      .from('wearable_daily')
      .select('hrv_ms,resting_hr,recovery_score,date')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(1);
    const last = (data ?? [])[0] as
      | { hrv_ms?: number | null; resting_hr?: number | null; recovery_score?: number | null }
      | undefined;
    if (last) {
      biometric = {
        hrv: last.hrv_ms ?? null,
        restingHr: last.resting_hr ?? null,
        recovery: last.recovery_score ?? null,
      };
    }
  } catch (e) {
    logSilentError('internist.biometric', e);
  }

  return { name, ageYears, sexBiological, recentLabs, biometric };
}
