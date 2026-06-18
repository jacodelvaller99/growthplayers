/**
 * internistLogic — clasificación PURA de marcadores y disparo de red-flags.
 *
 * Sin IO, sin React, sin Date(): testeable y determinista. Su salida es lo que
 * `lib/internist.ts` inyecta como contexto del system prompt — el internista
 * NUNCA decide solo: la lógica clasifica, el prompt explica.
 *
 * Reglas:
 *  - `classifyLabValue` etiqueta low/normal/high/critical y compone una nota
 *    educativa con la cita del marcador. Nunca dice "tienes X" — es descriptivo.
 *  - `detectRedFlags` recorre el texto del usuario contra los triggers de
 *    `RED_FLAGS` con keywords explícitas y devuelve los que aplican.
 *  - `assembleEducationalContext` empaqueta lo anterior + lifestyle facts en un
 *    bloque que el internista cita verbatim (no parafrasea).
 */

import {
  LAB_MARKERS,
  LIFESTYLE_FACTS,
  RED_FLAGS,
  findLabMarker,
  type LabMarker,
  type LifestyleFact,
  type RedFlagRule,
  type Severity,
} from '@/data/internistKnowledge';

// ─── Clasificación de marcadores ───────────────────────────────────────────────

export type LabBand = 'critical_low' | 'low' | 'normal' | 'high' | 'critical_high' | 'unknown';

export interface ClassifiedLab {
  marker: LabMarker;
  value: number;
  unit: string;
  band: LabBand;
  educationalNote: string;
  citation: string;
}

const num = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;

/**
 * Clasifica un valor de laboratorio contra su rango de referencia.
 * Si no encuentra el marcador, devuelve null (el caller decide qué hacer).
 * Si el marcador existe pero el valor es inválido, band = 'unknown'.
 */
export function classifyLabValue(markerQuery: string, value: number): ClassifiedLab | null {
  const marker = findLabMarker(markerQuery);
  if (!marker) return null;

  const v = num(value);
  if (v === null) {
    return {
      marker,
      value: NaN,
      unit: marker.unit,
      band: 'unknown',
      educationalNote: `No reconozco el valor reportado para ${marker.name}. Si lo tienes a la mano en ${marker.unit}, compártelo de nuevo.`,
      citation: marker.citation,
    };
  }

  let band: LabBand;
  let note: string;

  if (marker.criticalLow !== null && marker.criticalLow !== undefined && v < marker.criticalLow) {
    band = 'critical_low';
    note = `${marker.name} reportado: ${v} ${marker.unit}. Es un valor por debajo del umbral que típicamente requiere atención médica pronta. ${marker.educationalLow} Conviene contactar a tu médico esta semana o, si tienes síntomas marcados, antes.`;
  } else if (v < marker.low) {
    band = 'low';
    note = `${marker.name} reportado: ${v} ${marker.unit}. Está por debajo del rango de referencia típico (${marker.low}–${marker.high} ${marker.unit}). ${marker.educationalLow}`;
  } else if (
    marker.criticalHigh !== null && marker.criticalHigh !== undefined && v > marker.criticalHigh
  ) {
    band = 'critical_high';
    note = `${marker.name} reportado: ${v} ${marker.unit}. Es un valor por encima del umbral que típicamente requiere atención médica pronta. ${marker.educationalHigh} Conviene contactar a tu médico esta semana o, si tienes síntomas marcados, antes.`;
  } else if (v > marker.high) {
    band = 'high';
    note = `${marker.name} reportado: ${v} ${marker.unit}. Está por encima del rango de referencia típico (${marker.low}–${marker.high} ${marker.unit}). ${marker.educationalHigh}`;
  } else {
    band = 'normal';
    note = `${marker.name} reportado: ${v} ${marker.unit}. Cae dentro del rango de referencia típico (${marker.low}–${marker.high} ${marker.unit}). Un valor en rango es contexto positivo, no certeza de "está todo bien" — la interpretación clínica requiere el conjunto.`;
  }

  return {
    marker,
    value: v,
    unit: marker.unit,
    band,
    educationalNote: note,
    citation: marker.citation,
  };
}

/** ¿La banda es una banda de alerta (low/high/critical_*)? */
export function isAbnormal(band: LabBand): boolean {
  return band === 'low' || band === 'high' || band === 'critical_low' || band === 'critical_high';
}

/** ¿La banda dispara derivación urgente? */
export function isCritical(band: LabBand): boolean {
  return band === 'critical_low' || band === 'critical_high';
}

// ─── Detección de red-flags por texto del usuario ─────────────────────────────
// Mantenemos las keywords SEPARADAS de los triggers para poder afinarlas sin
// reescribir el texto educativo de la fuente.

interface RedFlagDetector {
  /** Índice en RED_FLAGS para preservar identidad. */
  ruleIndex: number;
  /** Keywords (lowercase, sin acentos) — al menos UNA debe aparecer Y el contexto debe coincidir. */
  keywords: string[];
  /** Si está presente, todas las keywords secundarias deben coincidir (refuerzo de precisión). */
  requireAll?: string[];
  /** Bloquea el match si alguna de estas aparece (descarte de falsos positivos). */
  exclude?: string[];
}

const RED_FLAG_DETECTORS: RedFlagDetector[] = [
  { ruleIndex: 0,  keywords: ['dolor en el pecho', 'dolor toracico', 'opresion en el pecho', 'aprieta el pecho', 'irradia al brazo', 'irradia a la mandibula'] },
  { ruleIndex: 1,  keywords: ['no puedo respirar', 'me falta el aire', 'disnea subita', 'tos con sangre', 'esputo con sangre'] },
  { ruleIndex: 2,  keywords: ['no puedo mover', 'no siento medio cuerpo', 'no puedo hablar', 'perdi la vision', 'ictus', 'derrame'], exclude: ['tuve un ictus', 'tuve ictus', 'tuvo un ictus', 'ya me recupere', 'ya me recuperé', 'historico'] },
  { ruleIndex: 3,  keywords: ['peor dolor de cabeza de mi vida', 'cefalea subita', 'rigidez en el cuello con fiebre'] },
  { ruleIndex: 4,  keywords: ['me desmaye', 'perdi el conocimiento', 'sincope'] },
  { ruleIndex: 5,  keywords: ['quiero morir', 'no quiero seguir viviendo', 'pensamientos suicidas', 'hacerme dano', 'hacerme daño', 'autolesion'] },
  { ruleIndex: 6,  keywords: ['atracon', 'purga', 'vomito despues de comer', 'restriccion severa', 'conteo obsesivo de calorias', 'me peso cada dia', 'anorexia', 'bulimia'] },
  { ruleIndex: 7,  keywords: ['glucosa 300', 'glucosa de 30', 'glucemia muy alta', 'cetoacidosis', 'aliento afrutado'] },
  { ruleIndex: 8,  keywords: ['potasio bajo', 'potasio alto', 'k de 2', 'k de 6', 'hipokalemia', 'hiperkalemia'] },
  { ruleIndex: 9,  keywords: ['180/120', '190/120', '200/110', 'presion muy alta', 'crisis hipertensiva'] },
  { ruleIndex: 10, keywords: ['embarazo', 'embarazada', 'estoy embarazada', 'gestacion'], exclude: ['no estoy embarazada', 'descarto embarazo'] },
];

/** Quita acentos y baja a minúsculas para matching robusto. */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    // eslint-disable-next-line no-misleading-character-class
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

export interface DetectedRedFlag {
  rule: RedFlagRule;
  severity: Severity;
  matchedKeyword: string;
}

/** Recorre el texto del usuario y devuelve los red-flags que aplican. */
export function detectRedFlags(userText: string): DetectedRedFlag[] {
  if (!userText || !userText.trim()) return [];
  const text = normalize(userText);
  const hits: DetectedRedFlag[] = [];

  for (const det of RED_FLAG_DETECTORS) {
    if (det.exclude?.some((e) => text.includes(normalize(e)))) continue;
    const matched = det.keywords.find((kw) => text.includes(normalize(kw)));
    if (!matched) continue;
    if (det.requireAll && !det.requireAll.every((kw) => text.includes(normalize(kw)))) continue;
    const rule = RED_FLAGS[det.ruleIndex];
    if (!rule) continue;
    hits.push({ rule, severity: rule.severity, matchedKeyword: matched });
  }

  // Dedup por trigger (no repetir la misma regla).
  const seen = new Set<string>();
  return hits.filter((h) => {
    if (seen.has(h.rule.trigger)) return false;
    seen.add(h.rule.trigger);
    return true;
  });
}

/** ¿Alguno de los red-flags es urgente? */
export function hasUrgentRedFlag(flags: DetectedRedFlag[]): boolean {
  return flags.some((f) => f.severity === 'urgent');
}

// ─── Ensamblaje del contexto educativo para el system prompt ──────────────────

export interface InternistContext {
  /** Marcadores parseados del usuario (subida manual o resultado de exámenes). */
  labs?: ClassifiedLab[];
  /** Tópicos de lifestyle que el usuario está consultando (sleep/nutrition/etc.). */
  lifestyleTopics?: string[];
  /** Texto libre del usuario en este turno (para detección de red-flags). */
  userTurnText?: string;
  /** Datos de check-ins recientes (para personalizar — opcional). */
  recentCheckIns?: Array<{ date: string; energy?: number | null; sleep?: number | null; stress?: number | null }>;
  /** Snapshot biométrico (HRV/RHR/recovery) si está disponible — para contexto, NO para diagnóstico. */
  biometric?: { hrv?: number | null; restingHr?: number | null; recovery?: number | null } | null;
}

export interface EducationalBlock {
  labsBlock: string;
  lifestyleBlock: string;
  redFlagsBlock: string;
  redFlags: DetectedRedFlag[];
}

const MAX_LIFESTYLE_FACTS = 4;

function lifestyleFactsMatching(topics: string[]): LifestyleFact[] {
  if (!topics.length) return [];
  const norm = topics.map(normalize);
  return LIFESTYLE_FACTS.filter((f) => {
    const t = normalize(f.topic);
    return norm.some((q) => t.includes(q) || q.includes(t.split(' ')[0] ?? ''));
  }).slice(0, MAX_LIFESTYLE_FACTS);
}

/**
 * Compone el bloque que se inyecta al system prompt. Cada sección es un
 * "fact-pack" citable — el internista debe parafrasear esto, no inventar.
 */
export function assembleEducationalContext(ctx: InternistContext): EducationalBlock {
  const labLines: string[] = [];
  for (const c of ctx.labs ?? []) {
    if (!c) continue;
    labLines.push(`- ${c.educationalNote} [Fuente: ${c.citation}]`);
  }

  const lifestyle = lifestyleFactsMatching(ctx.lifestyleTopics ?? []);
  const lifestyleLines = lifestyle.map(
    (f) => `- ${f.topic}: ${f.educationalExplanation} [Evidencia: ${f.evidence}; ${f.citation}]`,
  );

  const flags = detectRedFlags(ctx.userTurnText ?? '');
  const flagLines = flags.map(
    (f) => `- [${f.severity.toUpperCase()}] ${f.rule.trigger} → ${f.rule.action} [${f.rule.citation}]`,
  );

  return {
    labsBlock: labLines.length
      ? labLines.join('\n')
      : '  (el usuario no ha compartido resultados de laboratorio en este turno)',
    lifestyleBlock: lifestyleLines.length
      ? lifestyleLines.join('\n')
      : '  (no se pidió evidencia de un tópico específico de lifestyle en este turno)',
    redFlagsBlock: flagLines.length
      ? flagLines.join('\n')
      : '  (no se detectaron señales de derivación en el texto del usuario)',
    redFlags: flags,
  };
}

// ─── Sanitización defensiva del output del internista ─────────────────────────
// El system prompt manda no diagnosticar/prescribir; este filtro pasivo detecta
// fugas evidentes en el último mensaje del modelo y permite al caller añadir un
// recordatorio inline (no se censura el texto — se anota la advertencia).

const FORBIDDEN_PHRASES = [
  'tienes diabetes',
  'tienes hipotiroidismo',
  'tienes hipertension',
  'tienes hipertensión',
  'tienes cancer',
  'tienes cáncer',
  'te diagnostico',
  'mi diagnostico es',
  'mi diagnóstico es',
  'te receto',
  'toma esta dosis',
  'sube la dosis',
  'baja la dosis',
];

export function detectForbiddenLanguage(modelText: string): string[] {
  const n = normalize(modelText);
  return FORBIDDEN_PHRASES.filter((p) => n.includes(normalize(p)));
}
