import type {
  AreaVida,
  ArquetipoMotivacion,
  WheelOfLife,
  MotivacionProfile,
} from '../store';

/**
 * Calcula el área con mayor GAP (brecha entre importancia y satisfacción)
 * GAP = importancia - satisfacción
 * Representa el área donde hay más potencial de crecimiento
 */
export function getAreaDominante(wheel: WheelOfLife | null): AreaVida {
  if (!wheel) return 'carrera';

  const areas: AreaVida[] = [
    'salud',
    'carrera',
    'finanzas',
    'relaciones',
    'familia',
    'mente',
    'espiritualidad',
    'diversion',
  ];

  let maxGap = 0;
  let areaDominante: AreaVida = 'carrera';

  areas.forEach((area) => {
    const score = wheel[area];
    if (score) {
      const gap = score.importancia - score.satisfaccion;
      if (gap > maxGap) {
        maxGap = gap;
        areaDominante = area;
      }
    }
  });

  return areaDominante;
}

/**
 * Calcula el área ancla (alta satisfacción + alta importancia)
 * Energía = satisfacción + importancia
 * Representa el área donde el usuario tiene más energía y recursos
 */
export function getAreaAncla(wheel: WheelOfLife | null): AreaVida {
  if (!wheel) return 'salud';

  const areas: AreaVida[] = [
    'salud',
    'carrera',
    'finanzas',
    'relaciones',
    'familia',
    'mente',
    'espiritualidad',
    'diversion',
  ];

  let maxEnergia = 0;
  let areaAncla: AreaVida = 'salud';

  areas.forEach((area) => {
    const score = wheel[area];
    if (score) {
      const energia = score.satisfaccion + score.importancia;
      if (energia > maxEnergia) {
        maxEnergia = energia;
        areaAncla = area;
      }
    }
  });

  return areaAncla;
}

/**
 * Calcula el área "punto ciego" (menor atención)
 * Es el área que tiene menor puntuación combinada (satisfacción + importancia)
 */
export function getPuntoCiego(wheel: WheelOfLife | null): AreaVida {
  if (!wheel) return 'espiritualidad';

  const areas: AreaVida[] = [
    'salud',
    'carrera',
    'finanzas',
    'relaciones',
    'familia',
    'mente',
    'espiritualidad',
    'diversion',
  ];

  let minEnergia = 20; // máximo es 20 (10+10)
  let puntoCiego: AreaVida = 'espiritualidad';

  areas.forEach((area) => {
    const score = wheel[area];
    if (score) {
      const energia = score.satisfaccion + score.importancia;
      if (energia < minEnergia) {
        minEnergia = energia;
        puntoCiego = area;
      }
    }
  });

  return puntoCiego;
}

/**
 * Asigna arquetipo de motivación basado en:
 * 1. Área dominante (mayor GAP)
 * 2. Deseo del usuario (desde Polaris)
 */
export function calcularArquetipo(
  wheel: WheelOfLife | null,
  deseoPolaris: string | undefined,
): ArquetipoMotivacion {
  const areaDominante = getAreaDominante(wheel);

  // Constructor: enfocado en resultados, métricas, crecimiento
  if (
    ['carrera', 'finanzas'].includes(areaDominante) ||
    ['libertad', 'referente', 'dominio'].includes(deseoPolaris || '')
  ) {
    return 'constructor';
  }

  // Conector: enfocado en relaciones, impacto, otros
  if (
    ['relaciones', 'familia'].includes(areaDominante) ||
    ['familia', 'impacto'].includes(deseoPolaris || '')
  ) {
    return 'conector';
  }

  // Explorador: enfocado en aprendizaje, novedad, placer
  if (['mente', 'diversion'].includes(areaDominante)) {
    return 'explorador';
  }

  // Guardian: enfocado en seguridad, estabilidad, paz
  return 'guardian';
}

/**
 * Prompts de gratitud personalizados por área
 * Usados en el ritual diario de journaling
 */
export function getGratitudPrompt(area: AreaVida): string {
  const prompts: Record<AreaVida, string> = {
    salud:
      '¿Recuerdas un momento en que tu cuerpo te respondió perfectamente? ¿Qué hiciste? ¿Cómo se sintió esa energía?',
    carrera:
      '¿Recuerdas un momento en que tu trabajo impactó a alguien? ¿Qué lograste? ¿Cómo se sintió esa persona?',
    finanzas:
      '¿Qué decisión financiera pasada te enorgullece? Siente la seguridad que eso te da hoy.',
    relaciones:
      '¿En quién confías profundamente? ¿Qué harías sin esa persona en tu vida?',
    familia:
      '¿Recuerdas un momento de conexión real con tu familia? ¿Qué lo hizo especial?',
    mente: '¿Qué has aprendido recientemente que cambió tu perspectiva? Siente la expansión de eso.',
    espiritualidad:
      '¿En qué momento reciente sentiste que algo más grande que tú te guiaba? Habita ese momento.',
    diversion:
      '¿Cuándo fue la última vez que reíste sin control? ¿Qué estabas haciendo?',
  };

  return prompts[area];
}

/**
 * Prompts de intención diaria personalizados por área
 * Usados para la intención del día en el check-in
 */
export function getIntencionPrompt(area: AreaVida, objetivo: string): string {
  const intenciones: Record<AreaVida, string> = {
    salud: `Cuando suene mi alarma mañana, me levantaré directo y completaré mi protocolo físico antes de tocar el teléfono. Esto me acerca a: ${objetivo}`,
    carrera: `Cuando abra mi laptop esta mañana, lo primero será trabajar 25 minutos en mi tarea de mayor impacto. Sin correos. Sin redes. Solo: ${objetivo}`,
    finanzas: `Hoy revisaré mis números durante 10 minutos y tomaré una decisión concreta que me acerque a: ${objetivo}`,
    relaciones: `Hoy enviaré un mensaje real y específico a alguien importante. No un like. Una conexión. Esto alimenta mi visión de: ${objetivo}`,
    familia: `Hoy estaré presente, sin teléfono, al menos 30 minutos con mi familia. Esto es parte de lograr: ${objetivo}`,
    mente: `Hoy aprenderé algo nuevo relacionado con ${objetivo}. Leeré, escucharé o practicaré algo concreto.`,
    espiritualidad: `Hoy tomaré 5 minutos de silencio intencional para conectar con mi propósito más profundo: ${objetivo}`,
    diversion: `Hoy incluiré al menos un momento de juego o placer genuino. El descanso activo es parte del protocolo.`,
  };

  return intenciones[area];
}

/**
 * Voz y tono por arquetipo
 * Define cómo el Mentor Polaris se comunica según la motivación del usuario
 */
export function getArquetipoVoz(arquetipo: ArquetipoMotivacion): string {
  const voces: Record<ArquetipoMotivacion, string> = {
    constructor:
      'directo, orientado a resultados, usa métricas y metas concretas, habla de velocidad y progreso',
    conector:
      'cálido, menciona impacto en otros, usa lenguaje de relaciones y comunidad, habla de significado',
    explorador:
      'curioso, usa preguntas, menciona aprendizaje y maestría, habla de nuevas posibilidades',
    guardian:
      'estable, usa lenguaje de seguridad, paz y protección, habla de sostenibilidad y bienestar',
  };

  return voces[arquetipo];
}

/**
 * Construye el system prompt completo para el Mentor IA.
 * Soporta dos programas: Polaris (transformación integral) y Growth Players (negocios/ventas).
 */
export function buildFullSystemPrompt(params: {
  userName: string
  programType: 'polaris' | 'growth_players'
  archetypeId: string
  currentModuleTitle: string
  currentModuleSubtitle: string
  streak: number
  totalDays: number
  sovereigntyScore?: number
  polarisDolor?: string
  polarisDeseo?: string
  criticalArea?: string
}): string {
  const {
    userName,
    programType,
    archetypeId,
    currentModuleTitle,
    currentModuleSubtitle,
    streak,
    totalDays,
    sovereigntyScore,
    polarisDolor,
    polarisDeseo,
    criticalArea,
  } = params

  if (programType === 'polaris') {
    return `Eres el MENTOR POLARIS — guía de transformación integral para el programa Polaris.

Tu misión es acompañar a ${userName} en su proceso de evolución cuerpo-mente-espíritu, ayudándole a convertirse en la versión más soberana de sí mismo.

━━━ VALORES POLARIS ━━━
- Soberanía: Ser dueño de tu cuerpo, mente y tiempo
- Presencia: Estar 100% aquí antes de expandirte
- Integridad: Coherencia entre lo que piensas, dices y haces
- Transformación: Cambio real, no performance
- Legado: Lo que construyes que te sobrevive

━━━ TU ESTILO ━━━
- Cálido pero directo. Nunca blando.
- Preguntas que abren, no que cierran.
- Metáforas del cuerpo, la naturaleza, el silencio.
- Máximo 4 párrafos por respuesta.
- Cada respuesta conecta con el módulo actual.

━━━ MÓDULO ACTUAL ━━━
${currentModuleTitle}: ${currentModuleSubtitle}
Conecta SIEMPRE tu respuesta a este módulo específico.

━━━ CONTEXTO DEL USUARIO ━━━
Nombre: ${userName}
Racha: ${streak} días consecutivos
Días en programa: ${totalDays}${sovereigntyScore !== undefined ? `\nScore de Soberanía: ${sovereigntyScore}/100` : ''}${polarisDolor ? `\nDolor declarado: ${polarisDolor}` : ''}${polarisDeseo ? `\nDeseo profundo: ${polarisDeseo}` : ''}${criticalArea ? `\nÁrea crítica: ${criticalArea}` : ''}

━━━ REGLA DE ORO ━━━
Nunca menciones precios, upgrades ni planes de pago.
Termina CADA respuesta con 1 acción concreta y ejecutable en las próximas 24 horas.
La acción debe estar directamente relacionada con el módulo actual.`
  }

  // Growth Players program
  return `Eres POLARIS, el mentor de alto rendimiento de Growth Players.

Tu identidad es la de un empresario senior con 25+ años cerrando
tratos de 7 y 8 cifras. Has construido empresas desde cero,
has fallado, te has levantado y sabes exactamente qué separa
a los que ganan millones de los que solo sueñan con hacerlo.

No eres un coach motivacional. Eres el mentor que nadie
quiere escuchar pero todos necesitan.

━━━ TU EXPERTISE ━━━

VENTAS Y CIERRE:
- Psicología del comprador de alto valor
- Manejo de objeciones sin fricción (el "no" es solo el inicio)
- Técnica de silencio estratégico después del precio
- Cierre por urgencia real, nunca falsa
- Cómo vender transformación, no productos
- Discovery profundo: preguntas que revelan el dolor real
- Propuesta de valor irrechazable en 60 segundos

GROWTH MENTALITY:
- Sistemas de alta performance (no motivación, sistemas)
- Identidad antes que comportamiento (ser antes que hacer)
- Toma de decisiones bajo presión e incertidumbre
- Tolerancia al riesgo calculado
- Cómo pensar en décadas y ejecutar en semanas
- El costo real de no actuar (oportunidad perdida)

NEGOCIOS Y DEALS:
- Estructuración de ofertas de alto ticket
- Negociación win-win sin ceder en lo esencial
- Cómo posicionarte para que el cliente te persiga a ti
- Due diligence y lectura de personas en una reunión
- Partnerships estratégicos y joint ventures
- Cuándo escalar, cuándo pivotar, cuándo cortar

━━━ TU ESTILO DE COMUNICACIÓN ━━━
- Directo al hueso. Sin rodeos, sin relleno.
- Haces preguntas incómodas que nadie más hace.
- Das frameworks accionables, no teoría.
- Usas historias reales de negocios para ilustrar puntos.
- Celebras las victorias sin bajar la guardia.
- Confrontas las excusas con datos y lógica fría.
- Cuando algo está mal, lo dices. Con respeto, pero lo dices.
- Máximo 4-5 párrafos por respuesta. Denso, no largo.

━━━ TUS FRASES CARACTERÍSTICAS ━━━
- "El mercado no te debe nada. ¿Qué le estás dando tú?"
- "Eso no es un problema, es una decisión que no has tomado."
- "¿Cuánto te está costando NO resolver esto hoy?"
- "El precio nunca es el problema. El valor percibido sí."
- "Los amateurs esperan motivación. Los pros crean sistemas."

━━━ MÓDULO ACTUAL ━━━
${currentModuleTitle}: ${currentModuleSubtitle}
Conecta SIEMPRE tu respuesta a este módulo específico.

━━━ CONTEXTO DEL USUARIO ━━━
Nombre: ${userName}
Arquetipo: ${archetypeId}
Área crítica: ${criticalArea || 'Sin definir'}
Racha: ${streak} días${polarisDolor ? `\nDolor principal: ${polarisDolor}` : ''}

━━━ REGLA DE ORO ━━━
Nunca menciones precios, upgrades ni planes de pago.
Siempre conecta tu respuesta al contexto específico del usuario.
No des consejos genéricos. Si no sabes su situación exacta,
pregunta UNA pregunta clave antes de responder.
Termina CADA respuesta con 1 acción concreta ejecutable en las próximas 24 horas.`
}
