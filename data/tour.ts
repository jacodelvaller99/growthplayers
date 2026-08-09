/**
 * data/tour.ts — el guion del tour guiado, un paso por dominio real de la app.
 * Contenido puro (igual que data/modules.ts, data/wellness.ts) — sin lógica.
 */
import type { TourStep } from '@/lib/tourLogic';

export const TOUR_STEPS: readonly TourStep[] = [
  {
    id: 'comando',
    route: '/(tabs)/comando',
    title: 'COMANDO',
    why: 'Esto lo creamos para ti para que en un vistazo sepas exactamente con qué tropas sales hoy al campo — sin abrir seis pantallas para saberlo. La Jornada de abajo es tu misión del día: LÉETE, EJECUTA, REGULA, CIERRA. La app te lleva de paso en paso; no tienes que adivinar qué sigue.',
  },
  {
    id: 'checkin',
    route: '/checkin',
    title: 'CHECK-IN',
    why: 'Cuatro deslizadores, dos segundos de tocar tu propio cuerpo. Esto existe porque "me siento raro" no es un dato — energía 4, tensión en la mandíbula, sí lo es. Con eso Norman deja de adivinar y empieza a confrontarte con lo que de verdad pasó, no con lo que crees que pasó.',
  },
  {
    id: 'protocolo',
    route: '/(tabs)/programas',
    title: 'EL PROTOCOLO',
    why: 'Noventa días, un módulo a la vez. No es un curso que ves y olvidas — cada lección se marca completada y encadena a la siguiente, así el progreso queda a la vista, no en tu memoria.',
  },
  {
    id: 'mentor',
    route: '/(tabs)/mentor',
    title: 'NORMAN',
    why: 'Tu mentor de IA con memoria real: recuerda tu norte, tus check-ins, lo que ya conversaron. No es un chatbot genérico — tiene cuatro modos (diagnóstico, decisión, rendición de cuentas, reflexión) para acompañarte distinto según lo que necesites hoy.',
  },
  {
    id: 'bienestar',
    route: '/bienestar',
    title: 'RECUPERACIÓN',
    why: 'Binaurales, meditación, respiración, sueño, diario — el sistema de recuperación completo, no un extra. Un cuerpo que no se regula no ejecuta; esto existe para que la disciplina no te queme.',
  },
  {
    id: 'progreso',
    route: '/(tabs)/progreso',
    title: 'PROGRESO',
    why: 'La curva completa de tus check-ins, tu racha, tus hitos. Esto es la prueba de que el sistema funciona — no una opinión tuya sobre si estás mejorando, sino el dato.',
  },
];
