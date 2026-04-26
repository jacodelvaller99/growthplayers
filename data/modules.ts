import type { PolarisModule } from '@/types/lifeflow';

export const POLARIS_MODULES: PolarisModule[] = [
  {
    id: 'soberania-interior',
    number: 1,
    title: 'Soberania Interior',
    subtitle: 'Criterio, direccion y gobierno interno.',
    status: 'completed',
    progress: 100,
    lessons: [
      { id: 'm1-l1', title: 'Auditoria del ruido interno', duration: '18 MIN', status: 'completed' },
      { id: 'm1-l2', title: 'Decision soberana', duration: '22 MIN', status: 'completed' },
      { id: 'm1-l3', title: 'Protocolo de cierre', duration: '16 MIN', status: 'completed' },
    ],
  },
  {
    id: 'cuerpo-fisico',
    number: 2,
    title: 'Cuerpo Fisico',
    subtitle: 'Energia, recuperacion y presencia ejecutiva.',
    status: 'completed',
    progress: 100,
    lessons: [
      { id: 'm2-l1', title: 'Energia medible', duration: '20 MIN', status: 'completed' },
      { id: 'm2-l2', title: 'Bloques de recuperacion', duration: '15 MIN', status: 'completed' },
    ],
  },
  {
    id: 'cuerpo-mental',
    number: 3,
    title: 'Cuerpo Mental',
    subtitle: 'Foco, pensamiento y arquitectura de prioridades.',
    status: 'completed',
    progress: 100,
    lessons: [
      { id: 'm3-l1', title: 'Higiene cognitiva', duration: '17 MIN', status: 'completed' },
      { id: 'm3-l2', title: 'Mapeo de friccion', duration: '24 MIN', status: 'completed' },
    ],
  },
  {
    id: 'cuerpo-emocional',
    number: 4,
    title: 'Cuerpo Emocional',
    subtitle: 'Regulacion, conversaciones y resistencia.',
    status: 'completed',
    progress: 100,
    lessons: [
      { id: 'm4-l1', title: 'Regulacion bajo presion', duration: '21 MIN', status: 'completed' },
      { id: 'm4-l2', title: 'Lenguaje de mando', duration: '19 MIN', status: 'completed' },
    ],
  },
  {
    id: 'cuerpo-energetico',
    number: 5,
    title: 'Cuerpo Energetico',
    subtitle: 'Ritmo, ciclos y proteccion de energia.',
    status: 'completed',
    progress: 100,
    lessons: [
      { id: 'm5-l1', title: 'Lectura de energia semanal', duration: '18 MIN', status: 'completed' },
      { id: 'm5-l2', title: 'No negociables energeticos', duration: '20 MIN', status: 'completed' },
    ],
  },
  {
    id: 'mercader-tiempo',
    number: 6,
    title: 'Mercader: Gestion del Tiempo',
    subtitle: 'Tiempo, capital, atencion y ejecucion rentable.',
    status: 'active',
    progress: 42,
    lessons: [
      { id: 'm6-l1', title: 'Inventario de fugas de tiempo', duration: '16 MIN', status: 'completed' },
      { id: 'm6-l2', title: 'Bloque mercader profundo', duration: '25 MIN', status: 'active' },
      { id: 'm6-l3', title: 'Delegacion y cierre', duration: '21 MIN', status: 'locked' },
      { id: 'm6-l4', title: 'Sistema semanal de mando', duration: '28 MIN', status: 'locked' },
    ],
  },
];

export const ACTIVE_MODULE = POLARIS_MODULES.find((module) => module.status === 'active') ?? POLARIS_MODULES[0];
