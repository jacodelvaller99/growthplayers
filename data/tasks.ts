import type { LessonTask } from '@/types/lifeflow';

export const LESSON_TASKS: Record<string, LessonTask> = {

  // ─── MÓDULO 1 ──────────────────────────────────────────────────────────────

  'm1-1': {
    id: 'task-m1-1',
    lessonId: 'm1-1',
    title: 'Reflexión: Nunca es Suficiente',
    description: 'Responde con honestidad. No hay respuestas correctas — solo las tuyas.',
    type: 'reflection',
    fields: [
      {
        id: 'fear',
        label: '¿Qué heridas del pasado te están impidiendo avanzar hoy?',
        type: 'textarea',
        placeholder: 'Escribe sin filtro...',
        required: true,
      },
      {
        id: 'roles',
        label: '¿En qué rol de tu vida sientes que "nunca eres suficiente"?',
        type: 'textarea',
        placeholder: 'Como profesional, como padre/madre, como pareja...',
        required: true,
      },
      {
        id: 'commitment',
        label: '¿Cuántas veces vas a ver este módulo? (mínimo 3)',
        type: 'text',
        placeholder: 'Escribe tu compromiso...',
        required: true,
      },
    ],
  },

  'm1-2': {
    id: 'task-m1-2',
    lessonId: 'm1-2',
    title: 'Resultados de Trabajar tu Mindset',
    description: 'El cambio no es perfección — es autenticidad. Define qué quieres transformar.',
    type: 'reflection',
    fields: [
      {
        id: 'resultado_esperado',
        label: '¿Qué resultado concreto esperas ver en tu vida al trabajar tu mentalidad?',
        type: 'textarea',
        placeholder: 'Sé específico: en qué área, en cuánto tiempo...',
        required: true,
      },
      {
        id: 'pera_urgente',
        label: '¿Cuál de tus 5 PERAS (Paz, Energía, Relaciones, Abundancia, Salud) es la más urgente de transformar?',
        type: 'textarea',
        placeholder: 'Describe qué está pasando en esa área ahora mismo...',
        required: true,
      },
      {
        id: 'evidencia_cambio',
        label: '¿Qué evidencia pequeña tienes de que tu mentalidad ya está cambiando?',
        type: 'textarea',
        placeholder: 'Busca algo real, aunque parezca insignificante...',
        required: false,
      },
    ],
  },

  'm1-3': {
    id: 'task-m1-3',
    lessonId: 'm1-3',
    title: 'Detecta Tus Creencias Limitantes',
    description: 'Identifica creencias que te frenan en cada área de tus PERAS.',
    type: 'exercise',
    fields: [
      {
        id: 'paz',
        label: 'Creencia limitante en PAZ (bienestar interior)',
        type: 'textarea',
        placeholder: 'Ej: "No merezco estar tranquilo si no he logrado X"',
        required: true,
      },
      {
        id: 'energia',
        label: 'Creencia limitante en ENERGÍA',
        type: 'textarea',
        placeholder: 'Ej: "Para tener éxito hay que sacrificar el descanso"',
        required: true,
      },
      {
        id: 'relaciones',
        label: 'Creencia limitante en RELACIONES',
        type: 'textarea',
        placeholder: 'Ej: "Si confío en las personas, me traicionan"',
        required: true,
      },
      {
        id: 'abundancia',
        label: 'Creencia limitante en ABUNDANCIA',
        type: 'textarea',
        placeholder: 'Ej: "El dinero es la raíz de todo mal"',
        required: true,
      },
      {
        id: 'salud',
        label: 'Creencia limitante en SALUD',
        type: 'textarea',
        placeholder: 'Ej: "No tengo tiempo para cuidarme"',
        required: true,
      },
    ],
  },

  'm1-4': {
    id: 'task-m1-4',
    lessonId: 'm1-4',
    title: 'Desmonta una Creencia Limitante',
    description: 'Elige una creencia y trabájala en profundidad: origen, impacto y reescritura.',
    type: 'exercise',
    fields: [
      {
        id: 'creencia',
        label: 'Escribe una creencia limitante que identificas en ti (en primera persona, presente)',
        type: 'text',
        placeholder: 'Ej: "No soy suficientemente bueno para..."',
        required: true,
      },
      {
        id: 'origen',
        label: '¿Cuándo aprendiste esa creencia? ¿Quién o qué experiencia te la enseñó?',
        type: 'textarea',
        placeholder: 'Un momento, persona o ambiente específico...',
        required: true,
      },
      {
        id: 'impacto',
        label: '¿Cómo esta creencia ha limitado tus decisiones o resultados?',
        type: 'textarea',
        required: true,
      },
      {
        id: 'nueva_creencia',
        label: 'Escribe la nueva creencia que la reemplaza (verdadera, posible, en primera persona)',
        type: 'textarea',
        placeholder: 'Ej: "Tengo exactamente lo que necesito para aprender y crecer."',
        required: true,
      },
    ],
  },

  'm1-5': {
    id: 'task-m1-5',
    lessonId: 'm1-5',
    title: 'Declaración de Nueva Identidad',
    description: 'Escribe tu nueva identidad en tiempo presente, como si ya fuera cierta.',
    type: 'writing',
    fields: [
      {
        id: 'identity',
        label: 'Yo soy...',
        type: 'textarea',
        placeholder:
          'Escribe al menos 5 afirmaciones en tiempo presente. Ej: "Soy alguien que actúa con claridad y decisión."',
        required: true,
      },
      {
        id: 'evidence',
        label: '¿Qué evidencia pequeña de hoy muestra que esta identidad ya existe en ti?',
        type: 'textarea',
        placeholder: 'Busca algo real, aunque sea pequeño...',
        required: true,
      },
    ],
  },

  'm1-6': {
    id: 'task-m1-6',
    lessonId: 'm1-6',
    title: 'Integra tu Nueva Identidad',
    description: 'La integración no es mental — es conductual. La repetición construye la nueva red neuronal.',
    type: 'action',
    fields: [
      {
        id: 'accion_hoy',
        label: '¿Qué acción pequeña puedes hacer HOY que demuestre tu nueva identidad?',
        type: 'textarea',
        placeholder: 'Una acción concreta, no una intención...',
        required: true,
      },
      {
        id: 'habito_diario',
        label: '¿Qué hábito diario (5-10 min) instalarás para consolidar quien estás eligiendo ser?',
        type: 'textarea',
        placeholder: 'Define el momento del día y la acción exacta...',
        required: true,
      },
      {
        id: 'respuesta_nueva',
        label: '¿Cómo respondería tu nueva identidad a la situación que más te ha retado esta semana?',
        type: 'textarea',
        required: true,
      },
    ],
  },

  'm1-7': {
    id: 'task-m1-7',
    lessonId: 'm1-7',
    title: 'Cierre del Módulo 1 — Recupera tu Inversión',
    description: 'Tu inversión se recupera con cada aplicación del método. Define cómo lo harás.',
    type: 'reflection',
    fields: [
      {
        id: 'mayor_aprendizaje',
        label: '¿Cuál es tu mayor aprendizaje del Módulo 1?',
        type: 'textarea',
        placeholder: 'El insight que más cambió tu perspectiva...',
        required: true,
      },
      {
        id: 'aplicacion',
        label: '¿Cómo vas a aplicar lo aprendido en las próximas 2 semanas? (3 acciones concretas)',
        type: 'textarea',
        placeholder: '1.\n2.\n3.',
        required: true,
      },
      {
        id: 'compromiso',
        label: 'Escríbete un mensaje de compromiso contigo mismo para el resto del programa',
        type: 'textarea',
        placeholder: 'Como una carta breve, sin filtro...',
        required: true,
      },
    ],
  },

  // ─── MÓDULO 2 — EMOCIONES ─────────────────────────────────────────────────

  'm2-1': {
    id: 'task-m2-1',
    lessonId: 'm2-1',
    title: 'Lee el Mensaje de tus Emociones',
    description: 'Las emociones son mensajeras, no enemigas. Aprende a leer el mensaje antes de reaccionar.',
    type: 'reflection',
    fields: [
      {
        id: 'emocion_semana',
        label: '¿Qué emoción predominó en ti esta semana?',
        type: 'text',
        placeholder: 'Nombra una: ansiedad, frustración, tristeza, enojo...',
        required: true,
      },
      {
        id: 'mensaje',
        label: '¿Cuál es el mensaje que esa emoción te está enviando?',
        type: 'textarea',
        placeholder: '¿Qué necesita tu sistema que no está recibiendo?',
        required: true,
      },
      {
        id: 'respuesta_habitual',
        label: '¿Cómo respondes habitualmente a esa emoción? ¿Qué quisieras hacer diferente?',
        type: 'textarea',
        required: true,
      },
    ],
  },

  'm2-2': {
    id: 'task-m2-2',
    lessonId: 'm2-2',
    title: 'Activa tu Energía Ahora',
    description: 'El cuerpo almacena lo que la mente no procesa. Elige una herramienta y aplícala.',
    type: 'action',
    fields: [
      {
        id: 'herramienta',
        label: '¿Cuál de las herramientas vistas aplicarás hoy para subir tu energía?',
        type: 'text',
        placeholder: 'Ej: Respiración, movimiento, escritura, música, naturaleza...',
        required: true,
      },
      {
        id: 'situacion',
        label: '¿En qué momento del día la usarás y bajo qué circunstancia?',
        type: 'textarea',
        placeholder: 'Cuándo, dónde y por qué ese momento...',
        required: true,
      },
      {
        id: 'resultado',
        label: 'Después de aplicarla: ¿cómo cambió tu nivel de energía? (escribe en retrospectiva)',
        type: 'textarea',
        placeholder: 'Si aún no la aplicaste, escribe qué esperas que suceda...',
        required: false,
      },
    ],
  },

  'm2-3': {
    id: 'task-m2-3',
    lessonId: 'm2-3',
    title: 'Escritura Terapéutica',
    description: '10 minutos. Sin filtro. No es para releer — es para liberar.',
    type: 'writing',
    fields: [
      {
        id: 'emocion',
        label: '¿Qué emoción sientes ahora mismo? Nómbrala.',
        type: 'text',
        placeholder: 'Ira, ansiedad, tristeza, miedo...',
        required: true,
      },
      {
        id: 'escritura',
        label: 'Escribe 10 minutos sin parar sobre esa emoción.',
        type: 'multiline',
        placeholder: 'Escribe todo lo que venga. Sin corrección, sin juicio...',
        required: true,
      },
      {
        id: 'after',
        label: '¿Cómo te sientes después de escribir?',
        type: 'textarea',
        required: false,
      },
    ],
  },

  'm2-4': {
    id: 'task-m2-4',
    lessonId: 'm2-4',
    title: 'Tu Nivel de Consciencia Hoy',
    description: 'Ubícate honestamente en la escala.',
    type: 'reflection',
    fields: [
      {
        id: 'nivel',
        label: '¿En qué nivel de consciencia estás operando en este momento de tu vida?',
        type: 'textarea',
        placeholder:
          'Vergüenza, Culpa, Apatía, Miedo, Deseo, Ira, Orgullo, Valentía, Neutralidad, Voluntad, Aceptación, Amor, Alegría, Paz...',
        required: true,
      },
      {
        id: 'por_que',
        label: '¿Qué situación te tiene en ese nivel?',
        type: 'textarea',
        required: true,
      },
      {
        id: 'siguiente',
        label: '¿Qué necesitas soltar para subir un nivel?',
        type: 'textarea',
        required: true,
      },
    ],
  },

  // ─── MÓDULO 3 — MADURACIÓN ────────────────────────────────────────────────


  'm3-1': {
    id: 'task-m3-1',
    lessonId: 'm3-1',
    title: 'Encuentra Tu IKIGAI',
    description: 'El ejercicio más importante del programa. Tómate el tiempo que necesites.',
    type: 'exercise',
    fields: [
      {
        id: 'amas',
        label: '¿Qué amas hacer? (Lista todo, sin filtro)',
        type: 'textarea',
        placeholder: 'Aquello que harías aunque nadie te lo pidiera y sin pago...',
        required: true,
      },
      {
        id: 'bueno',
        label: '¿En qué eres bueno?',
        type: 'textarea',
        placeholder: 'Habilidades naturales, talentos, lo que los demás te piden...',
        required: true,
      },
      {
        id: 'pagarian',
        label: '¿Por qué te pagarían?',
        type: 'textarea',
        placeholder: 'Lo que ya genera o podría generar ingresos...',
        required: true,
      },
      {
        id: 'mundo',
        label: '¿Qué necesita el mundo que tú puedes dar?',
        type: 'textarea',
        placeholder: 'El problema que resuelves para otros desde tu ser...',
        required: true,
      },
      {
        id: 'mision',
        label: 'Con base en lo anterior: ¿cuál es tu misión de vida en una frase?',
        type: 'textarea',
        placeholder: 'Mi misión es...',
        required: true,
      },
      {
        id: 'funcion',
        label: '¿Tu función actual (trabajo) está alineada con tu misión? ¿Qué brecha hay?',
        type: 'textarea',
        placeholder: 'Sé honesto...',
        required: false,
      },
    ],
  },

  'm3-2': {
    id: 'task-m3-2',
    lessonId: 'm3-2',
    title: 'HISAR — Balancea tus PERAS',
    description: 'El estrés es información, no enemigo. Usa el modelo para leer tu sistema.',
    type: 'exercise',
    fields: [
      {
        id: 'pera_desbalanceada',
        label: '¿Cuál de tus PERAS está más desbalanceada ahora? ¿Por qué?',
        type: 'textarea',
        placeholder: 'Paz, Energía, Relaciones, Abundancia o Salud — y qué está pasando...',
        required: true,
      },
      {
        id: 'senal',
        label: '¿Qué señal (física, emocional o mental) te está dando esa área?',
        type: 'textarea',
        placeholder: 'Síntomas concretos: insomnio, irritabilidad, falta de enfoque...',
        required: true,
      },
      {
        id: 'accion_reequilibrio',
        label: '¿Qué acción concreta esta semana reequilibra ese PERA?',
        type: 'textarea',
        placeholder: 'Una sola acción, lo más específica posible...',
        required: true,
      },
    ],
  },

  'm3-3': {
    id: 'task-m3-3',
    lessonId: 'm3-3',
    title: 'Conecta con las Leyes Universales',
    description: 'El universo opera con leyes exactas. Quien las conoce puede fluir con ellas.',
    type: 'reflection',
    fields: [
      {
        id: 'ley_resonante',
        label: '¿Qué Ley Universal resonó más contigo en esta lección?',
        type: 'text',
        placeholder: 'Ej: Ley de Causa y Efecto, Ley de Correspondencia...',
        required: true,
      },
      {
        id: 'en_mi_vida',
        label: '¿En qué situación actual de tu vida puedes ver esa ley operando?',
        type: 'textarea',
        required: true,
      },
      {
        id: 'cambio',
        label: '¿Qué cambia en tus decisiones si realmente confías en esa ley?',
        type: 'textarea',
        required: true,
      },
    ],
  },

  'm3-4': {
    id: 'task-m3-4',
    lessonId: 'm3-4',
    title: 'Lo que Resistes Persiste',
    description: 'Practica la aceptación como punto de partida. Sin aceptación, solo hay resistencia disfrazada de esfuerzo.',
    type: 'exercise',
    fields: [
      {
        id: 'resistencia',
        label: '¿Qué situación, persona o emoción estás resistiendo actualmente?',
        type: 'textarea',
        placeholder: 'Sé honesto — lo que evitas nombrar es lo que más necesita ser visto.',
        required: true,
      },
      {
        id: 'aprendizaje',
        label: '¿Qué aprendizaje o mensaje te trae esa situación?',
        type: 'textarea',
        placeholder: '"El afuera es siempre el espejo del adentro." ¿Qué te refleja?',
        required: true,
      },
      {
        id: 'aceptacion',
        label: '¿Qué necesitas aceptar para poder transformar (no tolerar — transformar)?',
        type: 'textarea',
        required: true,
      },
    ],
  },

  'm3-5': {
    id: 'task-m3-5',
    lessonId: 'm3-5',
    title: 'Practica C.A.D.A.V.R.A.',
    description:
      'Elige una situación actual donde sientes resistencia hacia alguien o algo. Aplica el proceso.',
    type: 'exercise',
    fields: [
      {
        id: 'situacion',
        label: '¿Cuál es la situación o persona donde sientes resistencia?',
        type: 'textarea',
        required: true,
      },
      {
        id: 'comprendo',
        label: 'C — COMPRENDO: ¿Qué comprendo del proceso de esa persona?',
        type: 'textarea',
        placeholder: 'Busca entender, no justificar...',
        required: true,
      },
      {
        id: 'acepto',
        label: 'A — ACEPTO: ¿Qué estás dispuesto a aceptar, incluyendo el error?',
        type: 'textarea',
        required: true,
      },
      {
        id: 'doy',
        label: 'D — DOY: ¿Qué puedes dar desde tus valores en esta situación?',
        type: 'textarea',
        required: true,
      },
      {
        id: 'asumo',
        label: 'A — ASUMO: ¿Qué emoción tuya necesitas asumir como propia (no del otro)?',
        type: 'textarea',
        required: true,
      },
      {
        id: 'valoro',
        label: 'V — VALORO: ¿Qué valoras de esa persona o situación, aunque sea difícil?',
        type: 'textarea',
        placeholder: 'Busca algo genuino, aunque sea pequeño...',
        required: true,
      },
      {
        id: 'respeto',
        label: 'R — RESPETO: ¿Cómo puedes honrar el proceso de esa persona, aunque no lo compartas?',
        type: 'textarea',
        placeholder: 'Respetar no es aprobar — es reconocer su camino...',
        required: true,
      },
      {
        id: 'agradezco',
        label: 'A — AGRADEZCO: ¿Qué aprendizaje te deja esta situación?',
        type: 'textarea',
        required: true,
      },
    ],
  },

  // ─── MÓDULO 4 — PONTÍFICE: FLOW ───────────────────────────────────────────

  'm4-1': {
    id: 'task-m4-1',
    lessonId: 'm4-1',
    title: 'Tu Experiencia de Flow',
    description: 'El Flow no es accidente — es un estado que se puede inducir con protocolo.',
    type: 'reflection',
    fields: [
      {
        id: 'ultimo_flow',
        label: '¿Cuándo fue la última vez que estuviste en estado de Flow? Descríbelo.',
        type: 'textarea',
        placeholder: '¿Qué hacías? ¿Cómo se sentía? ¿Cuánto duró?',
        required: true,
      },
      {
        id: 'condiciones',
        label: '¿Qué condiciones internas y externas necesitas para entrar en Flow?',
        type: 'textarea',
        placeholder: 'Hora del día, entorno, estado emocional, tipo de tarea...',
        required: true,
      },
      {
        id: 'integracion',
        label: '¿En qué área de tu vida quieres integrar el estado de Flow esta semana?',
        type: 'textarea',
        required: true,
      },
    ],
  },

  'm4-2': {
    id: 'task-m4-2',
    lessonId: 'm4-2',
    title: 'La Neurociencia a tu Favor',
    description: 'Tu cerebro en Flow produce ondas alpha/theta. Aprende a crear las condiciones para activarlas.',
    type: 'reflection',
    fields: [
      {
        id: 'sorpresa',
        label: '¿Qué te sorprendió de la neurociencia del Flow?',
        type: 'textarea',
        placeholder: 'Un insight que no esperabas...',
        required: true,
      },
      {
        id: 'habito_alpha',
        label: '¿Qué hábito o práctica instalarás para favorecer las ondas alpha/theta en tu rutina?',
        type: 'textarea',
        placeholder: 'Meditación, música, movimiento, respiración, naturaleza...',
        required: true,
      },
    ],
  },

  'm4-3': {
    id: 'task-m4-3',
    lessonId: 'm4-3',
    title: 'Practica la Coherencia Cardíaca',
    description: '9 puntos. 3 minutos. Tu sistema nervioso en modo recuperación.',
    type: 'exercise',
    fields: [
      {
        id: 'practica',
        label: 'Practica la secuencia de Tapping EFT. ¿Cómo te sentiste durante y después?',
        type: 'textarea',
        placeholder: 'Karate → ceja → lateral ojo → bajo ojo → bajo nariz → bajo boca → clavícula → bajo brazo → coronilla',
        required: true,
      },
      {
        id: 'momento_diario',
        label: '¿En qué momento del día integrarás esta práctica como rutina?',
        type: 'text',
        placeholder: 'Ej: "Al despertar, antes de revisar el teléfono"',
        required: true,
      },
      {
        id: 'emocion_liberada',
        label: '¿Qué emoción o tensión liberaste con la práctica?',
        type: 'textarea',
        required: false,
      },
    ],
  },

  'm4-4': {
    id: 'task-m4-4',
    lessonId: 'm4-4',
    title: 'Diseña tu Protocolo de Flow',
    description: 'Aprende a reconocer el Flow cuando está presente — y diseña las condiciones para reproducirlo.',
    type: 'action',
    fields: [
      {
        id: 'indicadores',
        label: '¿Cuáles de los indicadores subjetivos del Flow has experimentado tú? (pérdida de noción del tiempo, claridad mental alta, acción sin esfuerzo, etc.)',
        type: 'textarea',
        required: true,
      },
      {
        id: 'actividad_flow',
        label: '¿Qué actividad tuya genera más indicadores de Flow simultáneamente?',
        type: 'textarea',
        required: true,
      },
      {
        id: 'protocolo',
        label: 'Diseña una rutina de 30 minutos al día específicamente para inducir tu estado de Flow',
        type: 'multiline',
        placeholder: 'Qué harás, en qué orden, en qué entorno, con qué preparación previa...',
        required: true,
      },
    ],
  },

  // ─── MÓDULO 5 ──────────────────────────────────────────────────────────────

  'm5-2': {
    id: 'task-m5-2',
    lessonId: 'm5-2',
    title: 'Llave 1 — Tu Intención con el Dinero',
    description: 'Honestidad radical. Sin esto, las demás llaves no abren.',
    type: 'reflection',
    fields: [
      {
        id: 'valoria',
        label: '¿Estás buscando dinero para demostrar tu valía? (sé brutalmente honesto)',
        type: 'textarea',
        required: true,
      },
      {
        id: 'miedo',
        label: '¿Estás buscando dinero para quitarte el miedo o sentirte seguro?',
        type: 'textarea',
        required: true,
      },
      {
        id: 'salvador',
        label:
          '¿Estás interrumpiendo el proceso de alguien dándole lo que podría conseguir solo?',
        type: 'textarea',
        required: true,
      },
      {
        id: 'intencion_real',
        label: '¿Cuál es tu intención real y correcta con la abundancia?',
        type: 'textarea',
        placeholder: 'No para valorarme, no para quitarme el miedo, sino para...',
        required: true,
      },
    ],
  },

  'm5-3': {
    id: 'task-m5-3',
    lessonId: 'm5-3',
    title: 'Llave 2 — Libera tu Pasado con el Dinero',
    description:
      'Ejercicio de las creencias limitantes. Lee la lista completa de 70 creencias y marca las tuyas.',
    type: 'checklist',
    fields: [
      {
        id: 'creencias',
        label: 'De las 70 creencias del PDF, escribe las 5 que más resonaron contigo',
        type: 'textarea',
        required: true,
      },
      {
        id: 'origen',
        label: '¿De quién heredaste esas creencias? (padres, entorno, experiencias)',
        type: 'textarea',
        required: true,
      },
      {
        id: 'nueva',
        label: 'Escribe la creencia nueva y correcta para reemplazar cada una',
        type: 'textarea',
        placeholder:
          'Creencia vieja → Nueva creencia:\n"El dinero es malo" → "El dinero es energía que fluye hacia quienes saben recibirla"',
        required: true,
      },
    ],
  },

  // ─── MÓDULO 6 ──────────────────────────────────────────────────────────────

  'm6-1': {
    id: 'task-m6-1',
    lessonId: 'm6-1',
    title: 'Tu Planeación de Esta Semana',
    description: 'Aplicación directa del método de gestión del tiempo.',
    type: 'action',
    fields: [
      {
        id: 'prioridades',
        label: 'Tus 3 prioridades de esta semana (por impacto en PERAS)',
        type: 'textarea',
        placeholder: '1.\n2.\n3.',
        required: true,
      },
      {
        id: 'energia',
        label: '¿Qué harás esta semana para tu energía?',
        type: 'textarea',
        required: true,
      },
      {
        id: 'paz',
        label: '¿Qué situación podría quitarte la paz esta semana? ¿Cuál es tu plan?',
        type: 'textarea',
        required: true,
      },
      {
        id: 'mensaje',
        label: 'Déjate un mensaje de ti para ti esta semana',
        type: 'text',
        placeholder: 'Ej: "Sin prisa, disfrutando el momento presente"',
        required: true,
      },
    ],
  },

  // ─── MÓDULO 5 (extra tasks) ───────────────────────────────────────────────

  'm5-1': {
    id: 'task-m5-1',
    lessonId: 'm5-1',
    title: 'Los 7 Niveles de Consciencia',
    description: 'Ubícate honestamente. La mayoría vive entre el nivel 1 y el 3 sin saberlo.',
    type: 'reflection',
    fields: [
      {
        id: 'nivel_actual',
        label: '¿En qué nivel de consciencia estás operando en tu vida profesional ahora?',
        type: 'textarea',
        placeholder:
          '1-Caníbal (supervivencia) · 2-Asesino (poder) · 3-Competencia (éxito) · 4-Cooperación (justicia) · 5-Amor (servicio) · 6-Paz (gracia) · 7-Iluminación',
        required: true,
      },
      {
        id: 'evidencia',
        label: '¿Qué conducta concreta de esta semana revela ese nivel?',
        type: 'textarea',
        placeholder: 'Una decisión, una reacción, una conversación...',
        required: true,
      },
      {
        id: 'objetivo',
        label: '¿A qué nivel quieres llegar? ¿Qué necesitas soltar para subir?',
        type: 'textarea',
        placeholder: 'El nivel 4 (Cooperación) es el objetivo del método Polaris.',
        required: true,
      },
    ],
  },

  'm5-4': {
    id: 'task-m5-4',
    lessonId: 'm5-4',
    title: 'Llave 3 — Saber Vivir con lo que Tienes',
    description: '"Rico es una persona que sabe vivir con lo que tiene." — Norman Capuozzo',
    type: 'reflection',
    fields: [
      {
        id: 'riqueza_actual',
        label: '¿Qué tienes ahora mismo que, si lo perdieras, lo llamarías riqueza?',
        type: 'textarea',
        placeholder: 'Lista todo: relaciones, salud, tiempo, conocimiento, libertad...',
        required: true,
      },
      {
        id: 'queja_dinero',
        label: '¿Cuál es tu queja más frecuente relacionada con el dinero o lo que tienes?',
        type: 'textarea',
        placeholder: '"Me falta...", "Si tuviera X podría..."',
        required: true,
      },
      {
        id: 'riqueza_hoy',
        label: '¿Cómo cambiaría tu día si vivieras hoy desde la riqueza de lo que ya tienes?',
        type: 'textarea',
        required: true,
      },
    ],
  },

  'm5-5': {
    id: 'task-m5-5',
    lessonId: 'm5-5',
    title: 'Llave 4 — Sueña sin Límites',
    description: 'El sueño mínimo alcanzable + el sueño sin límites + el plan concreto.',
    type: 'exercise',
    fields: [
      {
        id: 'sueno_minimo',
        label: 'Tu sueño mínimo alcanzable (en los próximos 12 meses, si todo va bien)',
        type: 'textarea',
        placeholder: 'Específico, medible, con fecha...',
        required: true,
      },
      {
        id: 'sueno_sin_limites',
        label: 'Tu sueño sin límites (en 5 años, si el dinero y el tiempo no fueran obstáculo)',
        type: 'textarea',
        placeholder: 'Escribe sin autocensura. El universo no se intimida con la ambición del que sirve.',
        required: true,
      },
      {
        id: 'primer_paso',
        label: '¿Cuál es el primer paso concreto hacia el sueño mínimo que puedes hacer esta semana?',
        type: 'textarea',
        required: true,
      },
    ],
  },

  'm5-6': {
    id: 'task-m5-6',
    lessonId: 'm5-6',
    title: 'Llave 5 — El Camino: RECREO y CLASES',
    description: 'Todo en tu vida es o RECREO (lo que amas) o CLASES (donde aprendes). Nada es castigo.',
    type: 'exercise',
    fields: [
      {
        id: 'recreo',
        label: '¿Qué actividades en tu vida son RECREO? (lo que haces con plena energía y amor)',
        type: 'textarea',
        placeholder: 'Aquello que harías aunque nadie te lo pagara...',
        required: true,
      },
      {
        id: 'clases',
        label: '¿Qué situaciones difíciles actuales reconoces como CLASES? ¿Qué te están enseñando?',
        type: 'textarea',
        placeholder: 'Un problema, un conflicto, una pérdida — ¿cuál es la clase?',
        required: true,
      },
      {
        id: 'cascada',
        label: 'Aplica la Cascada del Camino a una decisión que tienes pendiente: Pienso → Digo sí → Abro → Evalúo con PERAS → Acciono',
        type: 'multiline',
        placeholder: 'Decisión:\nPENSAR:\nDECIR SÍ:\nABRIR:\nEVALUAR (¿mejora mis PERAS?):\nACCIONAR (qué, cuándo, cómo):',
        required: true,
      },
    ],
  },

  'm5-7': {
    id: 'task-m5-7',
    lessonId: 'm5-7',
    title: 'Llave 6 — El Servicio Incondicional',
    description: 'El verdadero propósito de trabajar es servir. Las 4 columnas del servicio.',
    type: 'reflection',
    fields: [
      {
        id: 'incondicionalidad',
        label: 'INCONDICIONALIDAD: ¿Dónde en tu trabajo estás sirviendo con condiciones?',
        type: 'textarea',
        placeholder: '"Solo ayudo si...", "Solo doy si me dan..."',
        required: true,
      },
      {
        id: 'confianza',
        label: 'CONFIANZA: ¿Confías en que el universo retribuye el servicio genuino? ¿Dónde lo dudas?',
        type: 'textarea',
        required: true,
      },
      {
        id: 'idoneidad',
        label: 'IDONEIDAD: ¿Estás sirviendo desde tus verdaderas fortalezas o desde lo que otros esperan de ti?',
        type: 'textarea',
        required: true,
      },
      {
        id: 'compromiso',
        label: 'COMPROMISO: ¿Qué acción concreta muestra tu compromiso con el servicio esta semana?',
        type: 'textarea',
        required: true,
      },
    ],
  },

  'm5-8': {
    id: 'task-m5-8',
    lessonId: 'm5-8',
    title: 'Llave 7 — La Administración',
    description: 'No es cuánto ganas. Es cuánto quedas con lo que ganas.',
    type: 'action',
    fields: [
      {
        id: 'costo_de_vida',
        label: '¿Cuánto es tu costo de vida mensual real? (sin inflarlo ni reducirlo)',
        type: 'text',
        placeholder: 'Sé exacto. El sistema financiero necesita números reales.',
        required: true,
      },
      {
        id: 'pagarte',
        label: 'El 10% que te pagas a ti primero: ¿lo estás haciendo? Si no, ¿qué lo impide?',
        type: 'textarea',
        required: true,
      },
      {
        id: 'deuda_activa',
        label: '¿Tienes deudas de consumo activas? ¿Son de un negocio probado o de un deseo?',
        type: 'textarea',
        placeholder: 'Solo se endeuda si es un negocio que ya probaste que funciona.',
        required: true,
      },
      {
        id: 'plan_administracion',
        label: 'Diseña tu distribución ideal: 1) costo de vida, 2) págate 10%, 3) ahorra, 4) ayuda, 5) invierte, 6) gustos',
        type: 'multiline',
        placeholder: '1) Costo de vida: ____\n2) Me pago (10%): ____\n3) Ahorro: ____\n4) Ayuda: ____\n5) Inversión: ____\n6) Gustos: ____',
        required: true,
      },
    ],
  },

  // ─── MÓDULO 6 (extra tasks) ───────────────────────────────────────────────

  'm6-2': {
    id: 'task-m6-2',
    lessonId: 'm6-2',
    title: 'Planeación Diaria: Las 6 Preguntas',
    description: 'Un día sin las 6 preguntas es un día de otros. Un día con ellas es tuyo.',
    type: 'action',
    fields: [
      {
        id: 'p1_prioridades',
        label: '1. Mis 3 prioridades de HOY por impacto en PERAS',
        type: 'textarea',
        placeholder: '1.\n2.\n3.',
        required: true,
      },
      {
        id: 'p2_energia',
        label: '2. ¿Qué haré HOY para mi energía?',
        type: 'text',
        placeholder: 'Movimiento, descanso, alimentación, respiración...',
        required: true,
      },
      {
        id: 'p3_mision',
        label: '3. ¿Qué hay hoy para mi disfrute y misión?',
        type: 'text',
        placeholder: 'Algo que conecte con tu IKIGAI...',
        required: false,
      },
      {
        id: 'p4_paz',
        label: '4. ¿Qué podría quitarme la paz hoy? ¿Cuál es mi plan previo?',
        type: 'textarea',
        placeholder: 'Situación: ____\nMi plan: ____',
        required: true,
      },
      {
        id: 'p5_relaciones',
        label: '5. ¿Qué haré por mis relaciones hoy?',
        type: 'text',
        placeholder: 'Una acción concreta hacia alguien que importa...',
        required: false,
      },
      {
        id: 'p6_funcion',
        label: '6. ¿Qué haré extraordinario en mi función hoy?',
        type: 'textarea',
        placeholder: 'Lo que te diferencia de quien solo cumple el mínimo...',
        required: true,
      },
    ],
  },

  'm6-3': {
    id: 'task-m6-3',
    lessonId: 'm6-3',
    title: 'Cierre del Día: Las 4 Preguntas',
    description: 'El día que no se cierra, se carga al siguiente. Ciérralo ahora.',
    type: 'reflection',
    fields: [
      {
        id: 'aprendi',
        label: '¿Qué aprendí hoy?',
        type: 'textarea',
        placeholder: 'Un insight de negocio, una emoción procesada, una habilidad mejorada...',
        required: true,
      },
      {
        id: 'disfrute',
        label: '¿Qué disfruté hoy?',
        type: 'textarea',
        placeholder: 'Un momento, una conversación, un logro, algo pequeño...',
        required: true,
      },
      {
        id: 'mejor',
        label: '¿Cómo lo hubiera hecho mejor?',
        type: 'textarea',
        placeholder: 'Sin autocrítica — solo calibración. ¿Qué harías diferente?',
        required: true,
      },
      {
        id: 'senales',
        label: 'Señales de vida: ¿Qué momento de hoy merece ser recordado?',
        type: 'textarea',
        placeholder: 'Una pequeña gran evidencia de que tu norte está operando...',
        required: false,
      },
    ],
  },

  // ─── MÓDULO 7 ──────────────────────────────────────────────────────────────

  'm7-1': {
    id: 'task-m7-1',
    lessonId: 'm7-1',
    title: 'Tus 3 Personajes Internos',
    description: '¿Desde cuál estás construyendo tus relaciones hoy?',
    type: 'reflection',
    fields: [
      {
        id: 'dominante',
        label: '¿Cuál personaje domina en ti? (Materia, Instrumento o Escultor)',
        type: 'textarea',
        required: true,
      },
      {
        id: 'relacion',
        label: '¿Cómo se manifiesta ese personaje en tu relación más importante ahora?',
        type: 'textarea',
        required: true,
      },
      {
        id: 'integracion',
        label: '¿Qué aportaría cada personaje si actuaran juntos en esa relación?',
        type: 'textarea',
        placeholder: 'Escultor → Determinación:\nInstrumento → Voluntad:\nMateria → Acción:',
        required: true,
      },
    ],
  },

  'm7-2': {
    id: 'task-m7-2',
    lessonId: 'm7-2',
    title: 'La Gran Obra: Integración de los 3 Personajes',
    description: 'Los 3 personajes integrados no se contradicen — se multiplican.',
    type: 'exercise',
    fields: [
      {
        id: 'situacion_actual',
        label: '¿En qué relación o situación actual sientes que un personaje "secuestra" a los otros dos?',
        type: 'textarea',
        placeholder: 'Describe la situación y cuál personaje domina de forma desbalanceada...',
        required: true,
      },
      {
        id: 'escultor',
        label: 'Desde el Escultor (visión, diseño): ¿Qué quieres crear en esa relación?',
        type: 'textarea',
        required: true,
      },
      {
        id: 'instrumento',
        label: 'Desde el Instrumento (acción, fuerza): ¿Qué acción concreta tomarás?',
        type: 'textarea',
        required: true,
      },
      {
        id: 'materia',
        label: 'Desde la Materia (adaptación, flexibilidad): ¿Qué estás dispuesto a soltar?',
        type: 'textarea',
        required: true,
      },
      {
        id: 'obra',
        label: 'Con los 3 integrados: ¿Cómo se ve tu Gran Obra en esa relación en 90 días?',
        type: 'textarea',
        placeholder: 'Describe el resultado con los 3 personajes actuando en sinergia...',
        required: true,
      },
    ],
  },

  'm7-3': {
    id: 'task-m7-3',
    lessonId: 'm7-3',
    title: 'Relaciones desde el Escultor',
    description: 'El Escultor no reacciona — diseña. Aprende a relacionarte desde la visión.',
    type: 'action',
    fields: [
      {
        id: 'relacion_clave',
        label: '¿Cuál es la relación más importante que necesita ser "esculpida" ahora?',
        type: 'text',
        placeholder: 'Pareja, socio, equipo, hijo, amigo...',
        required: true,
      },
      {
        id: 'patron_materia',
        label: '¿Cuándo en esa relación te conviertes en Materia (víctima, cedes sin límites)?',
        type: 'textarea',
        required: true,
      },
      {
        id: 'patron_instrumento',
        label: '¿Cuándo en esa relación te conviertes en Instrumento (aleja, actúas sin escuchar)?',
        type: 'textarea',
        required: true,
      },
      {
        id: 'accion_escultor',
        label: 'Desde el Escultor: ¿Qué conversación o acción concreta harás en las próximas 48 horas?',
        type: 'textarea',
        placeholder: 'Concreta. Con quién, sobre qué, cuándo, desde qué intención...',
        required: true,
      },
    ],
  },
};
