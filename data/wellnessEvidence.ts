/**
 * Evidencia científica de las prácticas de bienestar.
 *
 * POR QUÉ EXISTE: el catálogo de bienestar (41 meditaciones, 9 sesiones de
 * sueño, 5 guías binaurales, 8 técnicas de respiración) no tenía UNA sola cita.
 * El único archivo del repo con fuentes reales es `internistKnowledge.ts`, y
 * sobre meditación tiene exactamente una entrada que además no se muestra en
 * ninguna pantalla de práctica.
 *
 * REUSA EL MISMO TIPO `EvidenceGrade` que el internista, a propósito: una app
 * que gradúa la evidencia de un marcador de laboratorio con un criterio y la de
 * una meditación con otro no está graduando nada.
 *
 * LA REGLA QUE HACE ESTO ÚTIL: solo se cita lo que tiene respaldo real, y las
 * prácticas sin respaldo SE QUEDAN SIN CAMPO. Un catálogo donde todo lleva
 * sello no informa nada — el valor está justamente en que se note la
 * diferencia. Ver `docs/launch/EVIDENCIA_BIENESTAR.md` para el detalle de qué
 * se conserva sin evidencia y por qué.
 *
 * NO SE CITA lo que no corresponde:
 *   · La escala de Hawkins (`consciencia.tsx`) no lleva ni llevará sello: es
 *     autoexploración, no ciencia, y su SafetyWarning ya lo dice.
 *   · El tapping/EFT tampoco: la literatura existe pero está dominada por sus
 *     propios proponentes y los estudios de desmantelamiento que atribuyen el
 *     efecto a los puntos de acupuntura vienen de los mismos grupos.
 */

import type { EvidenceGrade } from './internistKnowledge';

export interface EvidenceRef {
  /** Fuente real: autores, revista y año. Nunca "estudios demuestran". */
  citation: string;
  grade: EvidenceGrade;
  /** Qué se midió exactamente. Evita que la cita se lea como más de lo que dice. */
  finding: string;
}

/**
 * Citas canónicas. Las sesiones referencian estas constantes en vez de
 * repetir el texto: con ~15 sesiones citadas, escribir la misma fuente a mano
 * seis veces garantiza que en tres meses digan cosas distintas.
 */
export const EVIDENCE = {
  /**
   * El resultado más fuerte del campo: MBSR no fue inferior a un ISRS a dosis
   * terapéutica en trastornos de ansiedad.
   */
  MBSR_ANXIETY: {
    citation: 'Hoge et al., JAMA Psychiatry 2023 (N=276)',
    grade: 'established',
    finding: 'MBSR de 8 semanas no fue inferior a escitalopram 10–20 mg en trastornos de ansiedad.',
  },

  /**
   * La práctica breve mejor evidenciada que existe: superó a la meditación
   * mindfulness en el mismo ensayo, con 5 minutos al día.
   */
  CYCLIC_SIGHING: {
    citation: 'Balban et al., Cell Reports Medicine 2023 (Stanford)',
    grade: 'established',
    finding: '5 min/día de suspiro fisiológico mejoraron el ánimo y bajaron la frecuencia respiratoria más que la meditación mindfulness a 28 días.',
  },

  /** Jacobson 1938, con meta-análisis modernos detrás. */
  PMR_ANXIETY: {
    citation: 'Meta-análisis de RCT, Complementary Therapies in Clinical Practice 2022 · Revisión sistemática, Psychol Res Behav Manag 2023',
    grade: 'established',
    finding: 'Efecto grande sobre ansiedad (SMD −1.32) y sobre calidad de sueño frente a control.',
  },

  /**
   * El paraguas general. Se cita con su límite explícito porque el mismo
   * meta-análisis que encuentra efecto en ansiedad NO lo encuentra en ánimo
   * positivo, atención, sueño ni peso — y esa mitad se omite casi siempre.
   */
  MINDFULNESS_GENERAL: {
    citation: 'Goyal et al., JAMA Internal Medicine 2014 (47 ensayos, N=3.515)',
    grade: 'established',
    finding: 'Ansiedad d=0.38, depresión d=0.30, dolor d=0.33 a 8 semanas. Sin evidencia para ánimo positivo, atención, sueño o peso.',
  },

  /** Sueño: mejoras reales, pero con riesgo de sesgo que hay que declarar. */
  YOGA_NIDRA_SLEEP: {
    citation: 'Dutta et al., revisión sistemática de 6 RCT 2026 · RCT en insomnio crónico, Sleep and Vigilance 2021',
    grade: 'probable',
    finding: 'Mejoras en latencia de sueño, tiempo total y eficiencia. Riesgo de sesgo moderado-alto en los estudios incluidos.',
  },

  /**
   * Compasión: efecto medio en emociones positivas, pero el de satisfacción
   * vital se cae al comparar contra control activo. Se gradúa 'probable', no
   * 'established', justamente por eso.
   */
  LKM_POSITIVE_AFFECT: {
    citation: 'Zeng et al., Frontiers in Psychology 2015 · Gu et al., Applied Psychology: Health and Well-Being 2022',
    grade: 'probable',
    finding: 'Efecto medio sobre emociones positivas. El efecto sobre satisfacción vital desaparece frente a control activo (g=0.106, ns).',
  },

  /** Respiración lenta, la base fisiológica de media app. */
  SLOW_BREATHING: {
    citation: 'AHA — Meditation and Cardiovascular Risk Reduction (Levine et al., JAHA 2017)',
    grade: 'probable',
    finding: 'Respiración diafragmática lenta (~6/min) muestra reducciones modestas pero consistentes en presión arterial y marcadores inflamatorios.',
  },

  /**
   * Se incluye para poder ser honestos EN la pantalla de binaurales, que ya
   * dice "evidencia mixta" en el copy. Grado 'uncertain' a propósito.
   */
  BINAURAL_BEATS: {
    citation: 'Garcia-Argibay et al., Psychological Research 2019 (meta-análisis)',
    grade: 'uncertain',
    finding: 'Efecto global g=0.45; g=0.69 en ansiedad para bandas theta/delta. Heterogeneidad alta y calidad metodológica variable.',
  },
} as const satisfies Record<string, EvidenceRef>;

export type EvidenceKey = keyof typeof EVIDENCE;

/**
 * Qué significa cada grado para el usuario, en una línea y sin jerga.
 * La UI muestra esto, no la palabra en inglés.
 */
export const EVIDENCE_GRADE_LABEL: Record<EvidenceGrade, string> = {
  established: 'Evidencia sólida',
  probable:    'Evidencia moderada',
  uncertain:   'Evidencia mixta',
};
