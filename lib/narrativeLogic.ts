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
  /**
   * Dónde va en los 90 días. Vive en el eyebrow y no dentro de `line` porque
   * el móvil perdió esta información entera al pasar a `compact`: el dato de
   * posición no puede depender de si la frase narrativa cabe o no.
   */
  dayLabel: string;
  /** La línea narrativa principal. UNA sola frase, en segunda persona. */
  line: string;
  /**
   * `true` cuando `line` cita palabras del usuario.
   *
   * Lo consume `ArcHeader` para pintarla en oro: el oro marca lo que es suyo,
   * igual que en el Umbral y en el mapa corporal. Sin esta bandera el
   * componente no puede distinguir una cita de una frase de la app, y acabaría
   * dándoles el mismo color — que es lo que hace que la continuidad no se note.
   */
  quoted: boolean;
}

/**
 * El arco del protocolo según el día. Escalonado en 6 tramos que se agrupan
 * en 3 actos — los mismos cortes que ya usaba `progreso.tsx`, preservados
 * deliberadamente para no cambiar la voz al mover el código.
 *
 * `protocolDay` se clampa a >= 1: un día 0 o negativo viene de un perfil sin
 * fecha de inicio, y es mejor mostrar el acto de arranque que una frase rota.
 */
export function arcForDay(
  protocolDay: number,
  /**
   * Lo que el usuario declaro al cruzar el Umbral. Mismo contrato que
   * `milestoneCrossed`: si no escribio nada, el arco se dice igual y NO se
   * inventa una frase suya.
   *
   * POR QUE: estas seis ramas son la unica voz que narra los 90 dias, y eran
   * identicas para todo el mundo. El dia 0 la app le lee sus palabras con una
   * puesta en escena entera; el dia 12 le habla como a nadie. La continuidad
   * no es una funcion nueva — es este argumento.
   */
  suyas?: { painPoint?: string; purpose?: string; identity?: string },
): Arc {
  const day = Math.max(1, Math.floor(protocolDay || 1));
  const plural = day === 1 ? '' : 's';
  const cita = (t?: string) => {
    const limpio = (t ?? '').trim().replace(/[.!?…\s]+$/, '');
    return limpio.length > 60 ? `${limpio.slice(0, 60).trimEnd()}…` : limpio;
  };
  const obstaculo = cita(suyas?.painPoint);
  const norte = cita(suyas?.purpose);
  const quien = cita(suyas?.identity);

  if (day <= 3) {
    return {
      act: 'inicio',
      actNumber: 1,
      actLabel: 'ACTO I · BASE',
      dayLabel: `DÍA ${day} · 90`,
      quoted: !!obstaculo,
      line: obstaculo
        ? `Dijiste que lo que se interpone es «${obstaculo}». Sigue ahí, y tú también.`
        : `Llevas ${day} día${plural}. La mayoría abandona en los primeros siete.`,
    };
  }
  if (day <= 7) {
    return {
      act: 'filtro',
      actNumber: 1,
      actLabel: 'ACTO I · BASE',
      dayLabel: `DÍA ${day} · 90`,
      quoted: !!quien,
      line: quien
        ? `Dijiste que decides ser «${quien}». Cada check-in es esa declaración.`
        : 'Cada check-in es una declaración de quién eres, no de lo que sientes.',
    };
  }
  if (day <= 14) {
    return {
      act: 'grabado',
      actNumber: 2,
      actLabel: 'ACTO II · PROFUNDIDAD',
      dayLabel: `DÍA ${day} · 90`,
      quoted: !!obstaculo,
      line: obstaculo
        ? `${day} días desde que dijiste «${obstaculo}».`
        : 'Superaste el punto donde la mayoría desaparece.',
    };
  }
  if (day <= 30) {
    return {
      act: 'automatico',
      actNumber: 2,
      actLabel: 'ACTO II · PROFUNDIDAD',
      dayLabel: `DÍA ${day} · 90`,
      quoted: !!norte,
      line: norte
        ? `${day} días hacia «${norte}».`
        : 'Ya no decides cada día si aparecer. Apareces.',
    };
  }
  if (day <= 60) {
    return {
      act: 'profundidad',
      actNumber: 2,
      actLabel: 'ACTO II · PROFUNDIDAD',
      dayLabel: `DÍA ${day} · 90`,
      quoted: !!norte,
      line: norte
        ? `«${norte}» ya no es algo que dijiste: son ${day} días haciéndolo.`
        : 'Los cambios dejan de ser visibles y empiezan a ser estructurales.',
    };
  }
  return {
    act: 'identidad',
    actNumber: 3,
    actLabel: 'ACTO III · IDENTIDAD',
    dayLabel: `DÍA ${day} · 90`,
    quoted: !!quien,
    line: quien
      ? `Dijiste que decides ser «${quien}». Ya no lo decides: lo eres.`
      : 'Eso no es disciplina. Es quién eres ahora.',
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
 * ⚠️ Fórmula IDÉNTICA a la de `app/checkin.tsx` a propósito. Si divergen,
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
 * resuelta en `app/checkin.tsx` (con icono, ruta y CTA). Duplicarla
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
  /**
   * Lo que el usuario declaró al cruzar el Umbral, en sus palabras.
   *
   * El Umbral le lee sus frases el día 0 y después la app no volvía a citarlo
   * NUNCA: los hitos hablaban en genérico ("Completaste el acto de base") con
   * `painPoint` a una interpolación de distancia. Contar su historia un día y
   * rellenar campos los otros ochenta y nueve es peor que no contarla.
   *
   * Opcional: si no escribió nada, el hito se dice igual, sin cita. Nunca se
   * inventa una frase suya.
   */
  suyas?: { painPoint?: string; purpose?: string },
): Milestone | null {
  if (!prev) return null;
  const cita = (t?: string) => {
    const limpio = (t ?? '').trim().replace(/[.!?…\s]+$/, '');
    return limpio.length > 70 ? `${limpio.slice(0, 70).trimEnd()}…` : limpio;
  };

  if (prev.streak < 7 && next.streak >= 7) {
    const obstaculo = cita(suyas?.painPoint);
    return {
      id: 'streak-7',
      title: '7 DÍAS SEGUIDOS',
      line: obstaculo
        ? `Hace una semana dijiste que lo que se interponía era «${obstaculo}». Llevas siete días apareciendo de todos modos.`
        : 'Cruzaste la zona donde la mayoría abandona. A partir de aquí el sistema empieza a sostenerte a ti.',
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
    const norte = cita(suyas?.purpose);
    return {
      id: 'day-30',
      title: 'PRIMER TERCIO',
      line: norte
        ? `Día 30 de 90. Escribiste que tu norte era «${norte}». Un tercio del camino hecho hacia eso.`
        : 'Día 30 de 90. Completaste el acto de base. Lo que viene ya no construye el hábito: lo profundiza.',
    };
  }
  if (prev.protocolDay < 90 && next.protocolDay >= 90) {
    const obstaculo = cita(suyas?.painPoint);
    return {
      id: 'day-90',
      title: 'PROTOCOLO COMPLETO',
      line: obstaculo
        ? `90 días. El día 0 dijiste «${obstaculo}». Vuelve a leerlo hoy.`
        : '90 días. Terminaste lo que la mayoría no empieza.',
    };
  }
  return null;
}

// ─── La historia completa ─────────────────────────────────────────────────────

export interface HistoriaInput {
  protocolDay: number;
  painPoint?: string;
  purpose?: string;
  identity?: string;
  completedLessonCount: number;
  taskCount: number;
  checkInsCount: number;
  /** Promedio de energía 1..10 (0 si no hay lecturas). */
  avgEnergy: number;
  /** Nombres de arquetipos ya conquistados (módulo completo). */
  archetypesEarned: string[];
}

export interface HistoriaChapter {
  /** Rótulo en versalitas del capítulo. */
  label: string;
  text: string;
}

/**
 * La historia completa del cliente, en capítulos — la MISMA voz para
 * Progreso, Perfil propio y el perfil de cliente. Antes vivía incrustada en
 * progreso.tsx (3 líneas sin rótulo); extraerla es la regla de gobernanza
 * "un solo módulo por mensaje": si dos pantallas cuentan la historia, la
 * cuentan desde aquí.
 *
 * Cada capítulo solo aparece si su dato existe — la historia no se infla
 * con relleno: un usuario del día 2 tiene una historia corta, y eso es
 * verdad, no un defecto.
 */
export function buildHistoria(input: HistoriaInput): HistoriaChapter[] {
  const chapters: HistoriaChapter[] = [];
  const cap = (s: string, n: number) => (s.length > n ? `${s.slice(0, n).trimEnd()}…` : s);

  if (input.painPoint?.trim()) {
    chapters.push({
      label: 'EL UMBRAL',
      text: `Llegaste diciendo: «${cap(input.painPoint.trim(), 120)}». Ese fue el punto de partida — todo lo demás se mide contra eso.`,
    });
  }

  if (input.identity?.trim() && input.protocolDay >= 7) {
    chapters.push({
      label: 'LA DECLARACIÓN',
      text: `Tu identidad declarada: «${cap(input.identity.trim(), 100)}». Cada acción que tomaste en el protocolo es evidencia de que eso ya es real.`,
    });
  }

  const arc = arcForDay(input.protocolDay, {
    painPoint: input.painPoint,
    purpose: input.purpose,
    identity: input.identity,
  });
  chapters.push({ label: 'EL ARCO', text: arc.line });

  const evidencia: string[] = [];
  if (input.completedLessonCount > 0) {
    // "lección" pierde la tilde en plural: lecciones, no "lecciónes".
    evidencia.push(`${input.completedLessonCount} ${input.completedLessonCount === 1 ? 'lección' : 'lecciones'}`);
  }
  if (input.taskCount > 0) {
    evidencia.push(`${input.taskCount} tarea${input.taskCount === 1 ? '' : 's'} de reflexión escrita${input.taskCount === 1 ? '' : 's'}`);
  }
  if (input.checkInsCount > 0) {
    evidencia.push(`${input.checkInsCount} lectura${input.checkInsCount === 1 ? '' : 's'} de estado`);
  }
  if (input.archetypesEarned.length > 0) {
    evidencia.push(`el arquetipo del ${input.archetypesEarned.join(', el ')} conquistado`);
  }
  if (evidencia.length > 0) {
    chapters.push({
      label: 'LA EVIDENCIA',
      text: `Lo que queda registrado: ${evidencia.join(' · ')}. Nada de esto es opinión — es lo que hiciste.`,
    });
  }

  if (input.avgEnergy >= 7 && input.checkInsCount >= 5) {
    chapters.push({
      label: 'HOY',
      text: `Tu energía promedio es ${Math.round(input.avgEnergy)}/10. El sistema está funcionando.`,
    });
  }

  return chapters;
}
