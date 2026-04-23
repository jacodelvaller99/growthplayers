export type DolorType = 'esfuerzo' | 'claridad' | 'ejecucion' | 'miedo';
export type DeseoType = 'libertad' | 'referente' | 'familia' | 'impacto';
export type PatronType = 'procrastinacion' | 'perfeccionismo' | 'opinion' | 'disciplina';
export type ObjecionType = 'listo' | 'resultados' | 'retorno' | 'dinero';

export interface PolarisProfile {
  dolor: DolorType;
  deseo: DeseoType;
  patron: PatronType;
  objecion: ObjecionType;
  completed_at?: string;
}

export const PREGUNTAS_DIAGNOSTICO = [
  {
    id: 'dolor',
    numero: 1,
    pregunta: '¿Qué es lo que más te frustra?',
    subtitulo: 'Elige tu dolor principal',
    opciones: [
      { valor: 'esfuerzo' as DolorType, texto: 'No avanzo aunque me esfuerzo' },
      { valor: 'claridad' as DolorType, texto: 'Me falta claridad, no sé qué hacer' },
      { valor: 'ejecucion' as DolorType, texto: 'Sé qué hacer pero no lo ejecuto' },
      { valor: 'miedo' as DolorType, texto: 'Me frena el dinero o el miedo' }
    ]
  },
  {
    id: 'deseo',
    numero: 2,
    pregunta: '¿Qué cambiaría si todo fuera perfecto?',
    subtitulo: 'Tu deseo profundo',
    opciones: [
      { valor: 'libertad' as DeseoType, texto: 'Libertad financiera real' },
      { valor: 'referente' as DeseoType, texto: 'Ser referente en mi industria' },
      { valor: 'familia' as DeseoType, texto: 'Tiempo con mi familia sin culpa' },
      { valor: 'impacto' as DeseoType, texto: 'Impacto masivo en otros' }
    ]
  },
  {
    id: 'patron',
    numero: 3,
    pregunta: '¿Cuál es tu mayor enemigo interno?',
    subtitulo: 'Tu patrón de sabotaje',
    opciones: [
      { valor: 'procrastinacion' as PatronType, texto: 'La procrastinación' },
      { valor: 'perfeccionismo' as PatronType, texto: 'El perfeccionismo' },
      { valor: 'opinion' as PatronType, texto: 'El miedo al qué dirán' },
      { valor: 'disciplina' as PatronType, texto: 'La falta de disciplina' }
    ]
  },
  {
    id: 'objecion',
    numero: 4,
    pregunta: 'Cuando piensas en invertir en ti mismo...',
    subtitulo: 'Tu objeción principal',
    opciones: [
      { valor: 'listo' as ObjecionType, texto: 'Es lo mejor que puedo hacer' },
      { valor: 'resultados' as ObjecionType, texto: 'Necesito ver resultados primero' },
      { valor: 'retorno' as ObjecionType, texto: 'Me da miedo no ver retorno' },
      { valor: 'dinero' as ObjecionType, texto: 'No tengo el dinero ahora mismo' }
    ]
  }
];
