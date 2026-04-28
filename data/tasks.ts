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

  // ─── MÓDULO 2 — EMOCIONES ─────────────────────────────────────────────────

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
        id: 'agradezco',
        label: 'A — AGRADEZCO: ¿Qué aprendizaje te deja esta situación?',
        type: 'textarea',
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
};
