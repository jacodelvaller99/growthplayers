/**
 * narrativeLogic — la voz del arco. Lógica pura, sin IO ni Date.now().
 *
 * POR QUÉ EXISTE: esta voz ya estaba escrita, pero vivía inline dentro de
 * `app/(tabs)/progreso.tsx` — enterrada en la cuarta posición de una pestaña
 * secundaria, invisible desde el home. Al extraerla, el mismo guion puede
 * hablar en Comando, Progreso y Check-in sin duplicar strings, y se edita en
 * un solo sitio.
 *
 * EL MODELO (tres tiempos, dos escalas anidadas):
 *   SETUP   → ¿dónde estoy?           → `arcForDay` (día N · acto)
 *   TENSIÓN → ¿qué está en juego?     → la capa de CTA, fuera de aquí
 *   PAYOFF  → ¿qué cambió porque actué? → `consequenceOf`
 *
 * El bucle que hoy no engancha es el que no tiene payoff: el usuario registra
 * un check-in y no recibe nada que no supiera antes de registrarlo. Eso es lo
 * que cierra `consequenceOf`.
 */

export type ArcAct = 'inicio' | 'filtro' | 'grabado' | 'automatico' | 'profundidad' | 'identidad';

export interface Arc {
  /** Identificador estable del acto — para estilos/tests, no para mostrar. */
  act: ArcAct;
  /** Número romano del acto, 1-3. El usuario piensa en tres actos, no en seis escalones. */
  actNumber: 1 | 2 | 3;
  /** Etiqueta corta en mayúsculas para el eyebrow. Ej: "ACTO II · PROFUNDIDAD". */
  actLabel: string;
  /** La línea narrativa principal. Una sola frase, en segunda persona. */
  line: string;
}

/**
 * El arco del protocolo según el día. Escalonado en 6 tramos que se agrupan
 * en 3 actos — los mismos cortes que ya usaba `progreso.tsx`, preservados
 * deliberadamente para no cambiar la voz al mover el código.
 *
 * `protocolDay` se clampa a >= 1: un día 0 o negativo viene de un perfil sin
 * fecha de inicio, y es mejor mostrar el acto de arranque que una frase rota.
 */
export function arcForDay(protocolDay: number): Arc {
  const day = Math.max(1, Math.floor(protocolDay || 1));
  const plural = day === 1 ? '' : 's';

  if (day <= 3) {
    return {
      act: 'inicio',
      actNumber: 1,
      actLabel: 'ACTO I · BASE',
      line: `Llevas ${day} día${plural} en el protocolo. Esto acaba de comenzar — la mayoría abandona en los primeros 7 días. Tú no eres la mayoría.`,
    };
  }
  if (day <= 7) {
    return {
      act: 'filtro',
      actNumber: 1,
      actLabel: 'ACTO I · BASE',
      line: `${day} días. Estás cruzando la primera zona de filtro. Cada check-in es una declaración de quién eres — no de lo que sientes.`,
    };
  }
  if (day <= 14) {
    return {
      act: 'grabado',
      actNumber: 2,
      actLabel: 'ACTO II · PROFUNDIDAD',
      line: `Día ${day}. Superaste el punto donde la mayoría desaparece. El hábito ya está grabándose en tu sistema nervioso.`,
    };
  }
  if (day <= 30) {
    return {
      act: 'automatico',
      actNumber: 2,
      actLabel: 'ACTO II · PROFUNDIDAD',
      line: `${day} días. Los estudios sobre formación de hábitos sugieren que, alrededor de esta etapa, una conducta empieza a volverse automática. Ya cruzaste ese umbral.`,
    };
  }
  if (day <= 60) {
    return {
      act: 'profundidad',
      actNumber: 2,
      actLabel: 'ACTO II · PROFUNDIDAD',
      line: `Día ${day} de 90. Estás en el arco de profundidad — donde los cambios dejan de ser visibles y empiezan a ser estructurales.`,
    };
  }
  return {
    act: 'identidad',
    actNumber: 3,
    actLabel: 'ACTO III · IDENTIDAD',
    line: `Día ${day} de 90. Eso no es disciplina — es quién eres ahora. El protocolo ya vive en ti.`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PAYOFF — la consecuencia de haber actuado
// ─────────────────────────────────────────────────────────────────────────────

export interface CheckInReading {
  energy: number;
  clarity: number;
  stress: number;
  sleep: number;
}

/**
 * Coherencia 0-10 a partir de las cuatro lecturas. La carga (`stress`) se
 * invierte porque más carga = peor estado, al contrario que las otras tres.
 *
 * ⚠️ Fórmula IDÉNTICA a la de `app/checkin.tsx:284` a propósito. Si divergen,
 * el usuario ve dos números distintos para lo mismo en la misma pantalla.
 * El objetivo es que checkin.tsx acabe consumiendo esta y quede una sola.
 */
export function coherenceOf(r: CheckInReading): number {
  return Math.round((r.energy + r.clarity + r.sleep + (11 - r.stress)) / 4);
}

/**
 * El delta contra el registro anterior — la ÚNICA información que el usuario
 * no puede tener antes de guardar.
 *
 * Este es el núcleo del arreglo. Hoy `checkin.tsx` muestra la coherencia en
 * vivo mientras mueves los sliders (`:284`), así que pulsar "guardar" no
 * revela nada nuevo y la acción se siente vacía — el "¿pero para qué?".
 * La comparación con el pasado solo existe DESPUÉS de guardar, y por eso es
 * lo que convierte el guardado en un acto con recompensa.
 *
 * La recomendación accionable NO se recalcula aquí: ya existe y está bien
 * resuelta en `app/checkin.tsx:336-385` (con icono, ruta y CTA). Duplicarla
 * sería crear una segunda voz que se desincroniza con la primera.
 *
 * Devuelve `null` sin comparación previa: en el primer check-in no hay contra
 * qué comparar, y una comparación inventada es peor que ninguna.
 */
export function deltaSince(current: CheckInReading, previous: CheckInReading | null): string | null {
  if (!previous) return null;
  const delta = coherenceOf(current) - coherenceOf(previous);
  if (delta > 0) {
    return `Tu coherencia subió ${delta} punto${delta === 1 ? '' : 's'} desde tu último registro.`;
  }
  if (delta < 0) {
    const abs = Math.abs(delta);
    return `Tu coherencia bajó ${abs} punto${abs === 1 ? '' : 's'} desde tu último registro. Es dato, no fracaso.`;
  }
  return 'Tu coherencia está igual que en tu último registro. Estable.';
}

// ─────────────────────────────────────────────────────────────────────────────
// HITOS — lo que hoy pasa en silencio
// ─────────────────────────────────────────────────────────────────────────────

export interface Milestone {
  id: string;
  title: string;
  line: string;
}

/**
 * Detecta si el estado que ACABA de alcanzarse es un hito que merece decirse.
 * Hoy racha de 7, primer mes y umbrales de score pasan sin que nadie lo diga.
 *
 * Compara contra el valor previo para disparar solo en el cruce, no en cada
 * render — de lo contrario el hito se convierte en ruido diario.
 */
export function milestoneCrossed(
  prev: { streak: number; protocolDay: number } | null,
  next: { streak: number; protocolDay: number },
): Milestone | null {
  if (!prev) return null;

  if (prev.streak < 7 && next.streak >= 7) {
    return {
      id: 'streak-7',
      title: '7 DÍAS SEGUIDOS',
      line: 'Cruzaste la zona donde la mayoría abandona. A partir de aquí el sistema empieza a sostenerte a ti.',
    };
  }
  if (prev.streak < 30 && next.streak >= 30) {
    return {
      id: 'streak-30',
      title: '30 DÍAS SEGUIDOS',
      line: 'Un mes sin fallar. Esto ya no es motivación — es estructura.',
    };
  }
  if (prev.protocolDay < 30 && next.protocolDay >= 30) {
    return {
      id: 'day-30',
      title: 'PRIMER TERCIO',
      line: 'Día 30 de 90. Completaste el acto de base. Lo que viene ya no construye el hábito: lo profundiza.',
    };
  }
  if (prev.protocolDay < 90 && next.protocolDay >= 90) {
    return {
      id: 'day-90',
      title: 'PROTOCOLO COMPLETO',
      line: '90 días. Terminaste lo que la mayoría no empieza.',
    };
  }
  return null;
}
